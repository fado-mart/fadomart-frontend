import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Button,
  Alert,
  Divider
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { getOrders, getOrderById, verifyPayment, clearCart, updateOrder } from '../services/api'
import { format } from 'date-fns'
import api from '../services/api'

const statusColors = {
  'Pending': 'warning',
  'Processing': 'info',
  'Paid': 'success',
  'Shipped': 'info',
  'Delivered': 'success',
  'Cancelled': 'error',
  'Refunded': 'error'
}

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const { user } = useAuth()
  const { refreshCart } = useCart()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    fetchOrders()
  }, [user, navigate])

  // Check URL for payment reference (for verification after redirect)
  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const reference = query.get('reference')
    const trxref = query.get('trxref') // Paystack also uses trxref sometimes
    
    if (reference || trxref) {
      console.log('Found payment reference in URL:', reference || trxref)
      const paymentRef = reference || trxref
      
      // Verify the payment
      handleVerifyPayment(paymentRef)
      
      // Remove reference from URL to prevent repeated verification attempts
      const url = new URL(window.location)
      url.searchParams.delete('reference')
      url.searchParams.delete('trxref')
      window.history.replaceState({}, '', url)
    }
  }, [location])

  const fetchOrders = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getOrders()
      console.log('Orders response:', response.data)
      
      // Handle different response formats
      let ordersList = []
      if (response.data) {
        if (Array.isArray(response.data)) {
          ordersList = response.data
        } else if (response.data.orders && Array.isArray(response.data.orders)) {
          ordersList = response.data.orders
        } else if (typeof response.data === 'object') {
          // If it's an object with numeric keys, convert to array
          ordersList = Object.values(response.data)
        }
      }
      
      // Sort orders by date (newest first)
      ordersList.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0)
        const dateB = new Date(b.createdAt || 0)
        return dateB - dateA
      })
      
      setOrders(ordersList)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Failed to load your orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Function to directly clear the cart for testing
  const handleClearCart = async () => {
    try {
      setLoading(true)
      await clearCart()
      refreshCart(true)
      alert('Cart cleared successfully')
    } catch (error) {
      console.error('Error clearing cart:', error)
      alert('Failed to clear cart')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPayment = async (reference) => {
    setLoading(true)
    setError('')
    
    try {
      console.log('Verifying payment with reference:', reference)
      const response = await verifyPayment(reference)
      console.log('Payment verification response:', response.data)
      
      // Check if verification was successful
      const isSuccess = 
        response.data?.status === 'success' || 
        response.data?.data?.status === 'success' ||
        (response.data?.message && response.data.message.toLowerCase().includes('success'))
      
      if (isSuccess) {
        setError('')
        
        // Extract order ID from the response
        let orderId = null;
        if (response.data?.order?._id) {
          orderId = response.data.order._id;
        } else if (response.data?.order?.id) {
          orderId = response.data.order.id;
        } else if (response.data?.data?.order?._id) {
          orderId = response.data.data.order._id;
        } else if (response.data?.data?.order?.id) {
          orderId = response.data.data.order.id;
        } else if (response.data?.orderId) {
          orderId = response.data.orderId;
        } else if (response.data?.data?.orderId) {
          orderId = response.data.data.orderId;
        } else if (response.data?.data?.metadata?.order_id) {
          orderId = response.data.data.metadata.order_id;
        } else if (response.data?.reference) {
          // Try to extract order ID from the reference, which might be in format "order_ORDERID_timestamp"
          const parts = response.data.reference.split('_');
          if (parts.length >= 2) {
            orderId = parts[1];
          }
        }
        
        if (orderId) {
          console.log('Found order ID in payment response:', orderId);
          
          // Force update order status in the UI immediately
          setOrders(prevOrders => 
            prevOrders.map(order => {
              if ((order.id === orderId || order._id === orderId)) {
                console.log(`Updating order ${orderId} status to Paid in UI`);
                return { ...order, status: 'Paid' };
              }
              return order;
            })
          );
          
          // Also update via API for persistence
          try {
            await updateOrder(orderId, { status: 'Paid' });
            console.log('Order status updated to Paid via API');
          } catch (updateError) {
            console.error('Failed to update order status via API:', updateError);
          }
        }
        
        // Try to clear cart with direct API call first
        try {
          await clearCart();
          console.log('Cart cleared directly via API call');
        } catch (clearError) {
          console.error('Failed to clear cart via direct API call:', clearError);
        }
        
        // Force clear cart in context as backup
        refreshCart(true);
        
        // Refresh orders to show updated status
        fetchOrders()
        
        // Show success message
        alert('Payment verified successfully! Your order has been updated.')
      } else {
        setError('Payment verification failed. Please contact support.')
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError('Failed to verify payment. Please contact support.')
    } finally {
      setLoading(false)
    }
  }

  const viewOrderDetails = async (orderId) => {
    try {
      setLoading(true)
      const response = await getOrderById(orderId)
      console.log('Order details:', response.data)
      
      const orderDetails = response.data
      setSelectedOrder(orderDetails)
    } catch (error) {
      console.error('Error fetching order details:', error)
      setError(`Failed to load order details for ${orderId}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch (error) {
      return dateString
    }
  }

  const calculateOrderTotal = (order) => {
    if (order.totalPrice) return order.totalPrice
    
    if (order.products && Array.isArray(order.products)) {
      return order.products.reduce((total, item) => {
        return total + ((item.price || 0) * (item.quantity || 1))
      }, 0)
    }
    
    return 0
  }

  const handleManualStatusUpdate = async (order, newStatus) => {
    if (!order || !order.id && !order._id) {
      console.error('Invalid order for status update');
      return;
    }
    
    const orderId = order.id || order._id;
    setLoading(true);
    setError('');
    
    try {
      console.log(`Manually updating order ${orderId} status to ${newStatus}`);
      
      // First try with the updateOrder function
      try {
        await updateOrder(orderId, { status: newStatus });
        console.log('Order status updated successfully via updateOrder');
      } catch (updateError) {
        console.error('Failed to update order via updateOrder:', updateError);
        
        // If that fails, try direct PATCH request
        try {
          console.log('Attempting direct PATCH as fallback');
          await api.patch(`/orders/${orderId}`, { status: newStatus });
          console.log('Order status updated successfully via direct PATCH');
        } catch (patchError) {
          console.error('Direct PATCH also failed:', patchError);
          throw patchError; // Re-throw to be caught by outer catch
        }
      }
      
      // Update UI immediately regardless of which method succeeded
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder._id === orderId)) {
        // Update the selected order state
        setSelectedOrder({...selectedOrder, status: newStatus});
      }
      
      // Also update the orders list
      setOrders(prevOrders => 
        prevOrders.map(prevOrder => {
          if (prevOrder.id === orderId || prevOrder._id === orderId) {
            return {...prevOrder, status: newStatus};
          }
          return prevOrder;
        })
      );
      
      // Show success message
      alert(`Order status successfully updated to ${newStatus}!`);
      
      // Also refresh orders from server to ensure consistency
      await fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      setError(`Failed to update order status to ${newStatus}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please login to view your orders
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/login')}
        >
          Login
        </Button>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchOrders}
        >
          Try Again
        </Button>
      </Container>
    )
  }

  // View order details
  if (selectedOrder) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Order Details
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setSelectedOrder(null)}
            >
              Back to Orders
            </Button>
          </Box>
          
          <Box sx={{ mt: 3, mb: 3 }}>
            <Typography variant="h6">Order Information</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Box>
                <Typography variant="body1">
                  <strong>Order ID:</strong> {selectedOrder.id || selectedOrder._id || 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Date:</strong> {formatDate(selectedOrder.createdAt)}
                </Typography>
                <Typography variant="body1">
                  <strong>Status:</strong> {' '}
                  <Chip 
                    label={selectedOrder.status || 'Pending'} 
                    color={statusColors[selectedOrder.status] || 'default'} 
                    size="small" 
                  />
                </Typography>
              </Box>
              <Box>
                <Typography variant="body1">
                  <strong>Payment Reference:</strong> {selectedOrder.paymentRef || 'N/A'}
                </Typography>
                <Typography variant="body1">
                  <strong>Tracking Number:</strong> {selectedOrder.trackingNumber || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mt: 3, mb: 3 }}>
            <Typography variant="h6">Shipping Address</Typography>
            {selectedOrder.shippingAddress ? (
              <Typography variant="body1" sx={{ mt: 1 }}>
                {selectedOrder.shippingAddress.street || 'N/A'}<br />
                {selectedOrder.shippingAddress.city || 'N/A'}{selectedOrder.shippingAddress.state ? `, ${selectedOrder.shippingAddress.state}` : ''}<br />
                Phone: {selectedOrder.shippingAddress.phone || 'N/A'}<br />
                Email: {selectedOrder.shippingAddress.email || 'N/A'}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">No shipping address available</Typography>
            )}
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Order Items</Typography>
            {selectedOrder.products && selectedOrder.products.length > 0 ? (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.products.map((item, index) => {
                      const product = item.product || {}
                      const price = item.price || product.price || 0
                      const quantity = item.quantity || 1
                      const name = product.name || product.productName || `Product ${index + 1}`
                      
                      return (
                        <TableRow key={item._id || item.id || index}>
                          <TableCell>{name}</TableCell>
                          <TableCell align="right">GH₵{price.toFixed(2)}</TableCell>
                          <TableCell align="center">{quantity}</TableCell>
                          <TableCell align="right">GH₵{(price * quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow>
                      <TableCell colSpan={3} align="right"><strong>Total</strong></TableCell>
                      <TableCell align="right"><strong>GH₵{calculateOrderTotal(selectedOrder).toFixed(2)}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">No items in this order</Typography>
            )}
          </Box>
          
          {selectedOrder.notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6">Notes</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedOrder.notes}
                </Typography>
              </Box>
            </>
          )}
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => setSelectedOrder(null)}
            >
              Back to Orders
            </Button>
            <Button 
              variant="contained"
              color="primary"
              onClick={() => navigate('/products')}
            >
              Continue Shopping
            </Button>
          </Box>
        </Paper>
      </Container>
    )
  }

  // Orders list view
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          My Orders
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchOrders}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          disabled={loading}
        >
          Refresh Orders
        </Button>
      </Box>
      
      {orders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            You don't have any orders yet
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/products')}
            sx={{ mt: 2 }}
          >
            Start Shopping
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id || order._id}>
                  <TableCell>
                    {(order.id || order._id || '').substring(0, 8)}...
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>GH₵{calculateOrderTotal(order).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status || 'Pending'} 
                      color={statusColors[order.status] || 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => viewOrderDetails(order.id || order._id)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}

export default Orders 