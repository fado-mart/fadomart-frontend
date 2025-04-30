import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material'
import { Delete as DeleteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { getCart, updateCartItem, removeFromCart, checkout, clearCart } from '../services/api'

const Cart = () => {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [updatingItems, setUpdatingItems] = useState({}) // Track which items are being updated
  const { user } = useAuth()
  const { refreshCart, setCartItems } = useCart()
  const navigate = useNavigate()
  const isUpdatingRef = useRef(false) // To prevent update loops

  // Debug the navigate function
  useEffect(() => {
    console.log('Navigate function available:', !!navigate);
  }, [navigate]);

  // Use callback to create a stable function reference that won't trigger 
  // unnecessary effect re-runs
  const fetchCart = useCallback(async (skipLoading = false) => {
    if (!user) {
      setError('Please login to view your cart')
      setLoading(false)
      return
    }

    // Prevent concurrent fetches
    if (isUpdatingRef.current) {
      console.log('Cart: Already fetching, skipping')
      return
    }

    isUpdatingRef.current = true;
    if (!skipLoading) {
      setLoading(true)
    }
    setError('')

    try {
      console.log('Fetching cart data with token:', localStorage.getItem('token') ? 'Token exists' : 'No token')
      
      // Make sure token is set before making the request
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await getCart()
      
      // Better handling of API response structures
      if (response?.data) {
        console.log('Cart data received:', JSON.stringify(response.data, null, 2))
        
        // Store the data based on its structure
        if (response.data.items || response.data.cart || Array.isArray(response.data)) {
          setCart(response.data)
          setCartItems(response.data.items || response.data.cart || response.data)
        } else if (response.data.data && (Array.isArray(response.data.data) || response.data.data.items)) {
          // Some APIs nest data in a "data" property
          setCart(response.data.data)
          setCartItems(response.data.data.items || response.data.data)
        } else {
          console.warn('Unexpected cart data format:', response.data)
          // Default to empty cart with the same structure
          setCart({ items: [] })
          setCartItems([])
        }
      } else {
        console.warn('Empty cart data received:', response)
        setCart({ items: [] })
        setCartItems([])
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load cart. Please try again.'
      
      setError(errorMessage)
      
      if (error.response?.status === 401) {
        setError('Your session has expired. Please login again.')
      }
    } finally {
      if (!skipLoading) {
        setLoading(false)
      }
      isUpdatingRef.current = false;
    }
  }, [user, setCartItems])

  // Fetch cart when user changes
  useEffect(() => {
    if (user) {
      fetchCart()
    } else {
      setCart(null)
      setLoading(false)
    }
  }, [user, fetchCart])

  // Add debugging log when cart state changes, but don't trigger refreshCart as it will cause loops
  useEffect(() => {
    if (cart) {
      console.log('Cart state updated:', {
        cartType: Array.isArray(cart) ? 'array' : typeof cart,
        isEmpty: isCartEmpty(),
        itemsCount: getCartItems()?.length || 0
      });
      
      // We don't call refreshCart here anymore to prevent circular updates
    }
  }, [cart]);

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return
    
    // Set this specific item as updating
    setUpdatingItems(prev => ({ ...prev, [itemId]: true }))
    setError('') // Clear any previous errors

    try {
      console.log('Updating cart item:', itemId, 'to quantity:', newQuantity)
      // Make sure the token is set before making the request
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await updateCartItem(itemId, newQuantity)
      console.log('Quantity update response:', response.data)
      
      // Update local cart state immediately
      setCart(prevCart => {
        // Handle different cart structures
        if (prevCart?.items && Array.isArray(prevCart.items)) {
          const updatedItems = prevCart.items.map(item => 
            item.id === itemId || item._id === itemId ? { ...item, quantity: newQuantity } : item
          )
          // Update cart context immediately
          setCartItems(updatedItems)
          return { ...prevCart, items: updatedItems }
        } else if (prevCart?.cart && Array.isArray(prevCart.cart)) {
          return {
            ...prevCart,
            cart: prevCart.cart.map(item => 
              item.id === itemId || item._id === itemId ? { ...item, quantity: newQuantity } : item
            )
          }
        } else if (Array.isArray(prevCart)) {
          return prevCart.map(item => 
            item.id === itemId || item._id === itemId ? { ...item, quantity: newQuantity } : item
          )
        }
        return prevCart
      })
      
      // Then fetch the fresh cart data from the server to ensure consistency
      await fetchCart(true)
      
      // Update global cart state once - after our local state is updated
      refreshCart(true)
    } catch (error) {
      console.error('Error updating cart:', error)
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Failed to update cart. Please try again.'
      setError(errorMessage)
      
      // Always re-fetch to ensure consistent state
      await fetchCart(true)
    } finally {
      // Clear the updating state for this item
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleRemoveItem = async (itemId) => {
    // Set this specific item as updating
    setUpdatingItems(prev => ({ ...prev, [itemId]: true }))
    setError('') // Clear any previous errors
    
    try {
      console.log('Removing cart item:', itemId)
      // Make sure the token is set before making the request
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      await removeFromCart(itemId)
      
      // Update local cart state immediately
      setCart(prevCart => {
        // Handle different cart structures
        if (prevCart?.items && Array.isArray(prevCart.items)) {
          const updatedItems = prevCart.items.filter(item => item.id !== itemId && item._id !== itemId)
          // Update cart context immediately
          setCartItems(updatedItems)
          return { ...prevCart, items: updatedItems }
        } else if (prevCart?.cart && Array.isArray(prevCart.cart)) {
          return {
            ...prevCart,
            cart: prevCart.cart.filter(item => item.id !== itemId && item._id !== itemId)
          }
        } else if (Array.isArray(prevCart)) {
          return prevCart.filter(item => item.id !== itemId && item._id !== itemId)
        }
        return prevCart
      })
      
      // Then fetch the fresh cart to ensure consistency
      await fetchCart(true)
      
      // Update global cart state once
      refreshCart(true)
    } catch (error) {
      console.error('Error removing item:', error)
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         error.message || 
                         'Failed to remove item. Please try again.'
      setError(errorMessage)
      
      // Always re-fetch to ensure consistent state
      await fetchCart(true)
    } finally {
      // Clear the updating state for this item
      setUpdatingItems(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleCheckout = async () => {
    // Create simple check to ensure we have a valid cart
    if (!cart || !cartItems.length) {
      console.error('Cannot checkout with empty cart');
      return;
    }
    
    // Set loading state to provide feedback
    setCheckoutLoading(true);
    
    try {
      // Refresh the cart one more time to ensure we have the latest data
      await fetchCart(true);
      
      // Log the checkout attempt and current cart state
      console.log('Cart validated, proceeding to checkout');
      
      // Update global cart context
      refreshCart(true);
      
      // Use navigate with absolute path to ensure correct routing
      navigate('/checkout', { replace: false });
    } catch (error) {
      console.error('Error preparing for checkout:', error);
    } finally {
      setCheckoutLoading(false);
    }
  }

  // Check if cart is empty
  const isCartEmpty = () => {
    if (!cart) return true;
    // Handle different possible API response structures
    if (cart.items && Array.isArray(cart.items) && cart.items.length > 0) return false;
    if (cart.cart && Array.isArray(cart.cart) && cart.cart.length > 0) return false;
    // Check if cart itself is an array (some APIs might directly return array of items)
    if (Array.isArray(cart) && cart.length > 0) return false;
    return true;
  }
  
  // Get cart items array
  const getCartItems = () => {
    if (!cart) return [];
    // Handle different possible API response structures
    if (cart.items && Array.isArray(cart.items)) return cart.items;
    if (cart.cart && Array.isArray(cart.cart)) return cart.cart;
    // If cart itself is an array, return it directly
    if (Array.isArray(cart)) return cart;
    // Log info about unknown structure for debugging
    console.warn('Unknown cart structure:', cart);
    return [];
  }
  
  // Get cart total
  const getCartTotal = () => {
    if (!cart) return 0;
    if (typeof cart.total === 'number') return cart.total;
    if (typeof cart.totalPrice === 'number') return cart.totalPrice;
    // Calculate from items if total is not provided
    return calculateTotal(getCartItems());
  }

  // Function to manually clear cart for debugging
  const handleManualClearCart = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('Manually clearing cart...')
      
      // Call API to clear cart
      await clearCart()
      
      // Reset local state
      setCart({ items: [] })
      
      // Update global cart context
      refreshCart(true)
      
      alert('Cart cleared successfully!')
    } catch (error) {
      console.error('Error clearing cart:', error)
      setError('Failed to clear cart. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Function to force refresh cart
  const handleForceRefresh = async () => {
    try {
      setLoading(true)
      await fetchCart(false)
      alert('Cart refreshed successfully!')
    } catch (error) {
      console.error('Error refreshing cart:', error)
      setError('Failed to refresh cart. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Please login to view your cart
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
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
          onClick={fetchCart}
          sx={{ mr: 2 }}
        >
          Retry
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/products')}
        >
          Continue Shopping
        </Button>
      </Container>
    )
  }

  if (isCartEmpty()) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Your cart is empty
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/products')}
        >
          Continue Shopping
        </Button>
      </Container>
    )
  }

  // Get the cart items for rendering
  const cartItems = getCartItems();
  const cartTotal = getCartTotal();
  
  // Debug the cart structure
  console.log("Cart structure for rendering:", { 
    cartItems, 
    cartTotal, 
    originalCart: cart,
    isEmpty: isCartEmpty()
  });

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 4,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Shopping Cart
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => navigate('/products')}
          startIcon={<ArrowBackIcon />}
        >
          Continue Shopping
        </Button>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          boxShadow: 3,
          borderRadius: 2,
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '40%' }}>Product</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Price</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Quantity</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cartItems.map((item) => {
              if (!item.product) {
                console.warn('Cart item missing product data:', item)
                return null
              }
              
              const product = item.product
              const productName = product.productName || product.name || 'Unknown Product'
              const price = product.price || 0
              const imageUrl = product.image || '/images/product-placeholder.jpg'
              const itemId = item._id || item.id
              const isUpdating = updatingItems[itemId] === true
              
              if (!itemId) {
                console.warn('Cart item missing ID:', item)
                return null
              }
              
              return (
                <TableRow 
                  key={itemId}
                  sx={{ 
                    '&:hover': { backgroundColor: 'action.hover' },
                    transition: 'background-color 0.2s',
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        component="img"
                        src={imageUrl}
                        alt={productName}
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = '/images/product-placeholder.jpg'
                        }}
                      />
                      <Box>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontWeight: 'medium',
                            mb: 0.5
                          }}
                        >
                          {productName}
                        </Typography>
                        {product.description && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {product.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      GH₵{price.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {isUpdating ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(itemId, parseInt(e.target.value))}
                        inputProps={{ 
                          min: 1,
                          style: { textAlign: 'center' }
                        }}
                        size="small"
                        sx={{ 
                          width: 80,
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'primary.main',
                            },
                            '&:hover fieldset': {
                              borderColor: 'primary.dark',
                            },
                          }
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      GH₵{(price * item.quantity).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveItem(itemId)}
                      disabled={isUpdating}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'error.light',
                          color: 'error.contrastText'
                        }
                      }}
                    >
                      {isUpdating ? <CircularProgress size={20} /> : <DeleteIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        gap: 3,
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 2
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            Order Summary
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Total: GH₵{(cartTotal).toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Including all taxes and fees
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleCheckout}
          disabled={checkoutLoading || !cartItems || cartItems.length === 0}
          sx={{
            minWidth: 200,
            py: 1.5,
            fontWeight: 'bold',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3
            }
          }}
        >
          {checkoutLoading ? <CircularProgress size={24} /> : 'Proceed to Checkout'}
        </Button>
      </Box>
    </Container>
  )
}

// Helper function to calculate total if not provided by the API
const calculateTotal = (items = []) => {
  return items.reduce((sum, item) => {
    if (!item.product || !item.product.price) return sum
    return sum + (item.product.price * item.quantity)
  }, 0)
}

export default Cart 