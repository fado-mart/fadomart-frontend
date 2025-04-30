import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Container,
  Typography,
  Paper,
  Box,
  TextField,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { getCart, checkout, createOrder, initiatePayment, verifyPayment, clearCart, updateOrder } from '../services/api'
import api from '../services/api'

const steps = ['Shipping Information', 'Payment Method', 'Order Review']

const Checkout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { refreshCart } = useCart()
  const [activeStep, setActiveStep] = useState(0)
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [paymentReference, setPaymentReference] = useState('')

  // Form state
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Ghana',
    phone: '',
    email: '',
  })

  const [paymentMethod, setPaymentMethod] = useState('paystack')

  // Form validation state
  const [shippingErrors, setShippingErrors] = useState({})
  
  // Check URL for payment reference (for verification after redirect)
  useEffect(() => {
    const checkForPaymentReference = () => {
      // First check URL parameters
      const query = new URLSearchParams(location.search);
      const reference = query.get('reference');
      const trxref = query.get('trxref'); // Paystack also uses trxref sometimes
      
      // If we found a reference in the URL, use it
      if (reference || trxref) {
        console.log('Found payment reference in URL:', reference || trxref);
        const paymentRef = reference || trxref;
        setPaymentReference(paymentRef);
        
        // Verify the payment
        handleVerifyPayment(paymentRef);
        
        // Remove reference from URL to prevent repeated verification attempts
        const url = new URL(window.location);
        url.searchParams.delete('reference');
        url.searchParams.delete('trxref');
        window.history.replaceState({}, '', url);
        
        return true; // Reference was found and processed
      }
      
      // If no reference in URL, check localStorage as fallback
      const pendingPaymentRef = localStorage.getItem('pendingPaymentRef');
      const pendingOrderId = localStorage.getItem('pendingOrderId');
      
      if (pendingPaymentRef && pendingOrderId && activeStep !== 3) {
        console.log('Found pending payment reference in localStorage:', pendingPaymentRef);
        console.log('For order:', pendingOrderId);
        
        // Set order ID for display
        setOrderId(pendingOrderId);
        
        // Verify payment
        handleVerifyPayment(pendingPaymentRef);
        
        // Clear the localStorage items after use
        localStorage.removeItem('pendingPaymentRef');
        localStorage.removeItem('pendingOrderId');
        
        return true; // Reference was found and processed
      }
      
      return false; // No reference was found
    };
    
    // Run the check immediately
    checkForPaymentReference();
    
    // Also set up an interval to check periodically in case the user
    // returns to the app but the automatic redirect didn't trigger
    const checkInterval = setInterval(() => {
      if (activeStep !== 3) { // Only check if we're not already at confirmation
        const found = checkForPaymentReference();
        if (found) {
          clearInterval(checkInterval); // Stop checking if we found a reference
        }
      } else {
        clearInterval(checkInterval); // Stop checking if we're at confirmation
      }
    }, 3000); // Check every 3 seconds
    
    // Clean up interval on component unmount
    return () => clearInterval(checkInterval);
  }, [location, activeStep]);
  
  // Handle verifying a payment after redirect
  const handleVerifyPayment = async (reference) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Verifying payment with reference:', reference);
      const response = await verifyPayment(reference);
      console.log('Payment verification response:', response.data);
      
      // Check if verification was successful - handle different response formats
      const isSuccess = 
        response.data?.status === 'success' || 
        response.data?.data?.status === 'success' ||
        (response.data?.message && response.data.message.toLowerCase().includes('success'));
      
      if (isSuccess) {
        // Payment successful, get order details from the response
        let order = null;
        let orderId = null;
        
        if (response.data.order) {
          order = response.data.order;
          orderId = order.id || order._id;
        } else if (response.data.data?.order) {
          order = response.data.data.order;
          orderId = order.id || order._id;
        } else if (response.data.orderId) {
          orderId = response.data.orderId;
        } else if (response.data.data?.orderId) {
          orderId = response.data.data.orderId;
        } else if (response.data.data?.metadata?.order_id) {
          orderId = response.data.data.metadata.order_id;
        } else if (response.data?.reference) {
          // Try to extract order ID from the reference, which might be in format "order_ORDERID_timestamp"
          const parts = response.data.reference.split('_');
          if (parts.length >= 2) {
            orderId = parts[1];
          }
        }
        
        setOrderSuccess(true);
        
        // Get the order ID from the response
        if (orderId) {
          setOrderId(orderId);
          
          // Update order status directly
          try {
            await updateOrder(orderId, { status: 'Paid' });
            console.log('Order status updated to Paid via API');
          } catch (updateError) {
            console.error('Failed to update order status via API:', updateError);
            
            // Try an alternative method if the first one failed
            try {
              console.log('Attempting direct PATCH as fallback');
              await api.patch(`/orders/${orderId}`, { status: 'Paid' });
            } catch (directError) {
              console.error('Direct PATCH also failed:', directError);
            }
          }
        }
        
        // Try to clear cart with direct API call first
        try {
          await clearCart();
          console.log('Cart cleared directly via API call');
        } catch (clearError) {
          console.error('Failed to clear cart via direct API call:', clearError);
          
          // If clearing the entire cart fails, try to check what's in the cart
          try {
            const cartResponse = await getCart();
            console.log('Current cart after payment:', cartResponse.data);
            
            // Try to clear each item manually
            const cartItems = getItemsFromCartData(cartResponse.data);
            
            for (const item of cartItems) {
              const itemId = item._id || item.id;
              if (itemId) {
                try {
                  console.log(`Removing item ${itemId} from cart`);
                  await removeFromCart(itemId);
                } catch (itemError) {
                  console.error(`Failed to remove item ${itemId}:`, itemError);
                }
              }
            }
          } catch (cartError) {
            console.error('Failed to retrieve cart for manual clearing:', cartError);
          }
        }
        
        // Force clear cart in context as backup
        refreshCart(true);
        
        // Move to confirmation step
        setActiveStep(3);
        
        // Show success message
        alert('Payment successful! Your order has been placed.');
      } else {
        // Payment failed
        setError('Payment verification failed. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Failed to verify payment. Please contact support for assistance.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart data on component mount
  useEffect(() => {
    const fetchCartData = async () => {
      if (!user) {
        console.log('Checkout: No user found, redirecting to login');
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        console.log('Checkout: Fetching cart data');
        const response = await getCart();
        console.log('Checkout: Cart data received:', response.data);
        
        if (response?.data) {
          // Check if cart is actually empty
          const items = getItemsFromCartData(response.data);
          
          console.log(`Checkout: Found ${items.length} items in cart`);
          
          if (items.length === 0) {
            console.log('Checkout: Cart is empty, redirecting to cart page');
            navigate('/cart');
            return;
          }
          
          setCart(response.data);
        } else {
          console.log('Checkout: Empty cart response, redirecting to cart page');
          navigate('/cart');
        }
      } catch (error) {
        console.error('Checkout: Error fetching cart:', error);
        setError('Failed to load cart data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Execute the function
    fetchCartData();
    
  }, [user, navigate]);

  // Helper function to extract items from various cart response formats
  const getItemsFromCartData = (cartData) => {
    if (!cartData) return [];
    if (cartData.items && Array.isArray(cartData.items)) return cartData.items;
    if (cartData.cart && Array.isArray(cartData.cart)) return cartData.cart;
    if (Array.isArray(cartData)) return cartData;
    return [];
  };

  // Helper to get cart items
  const getCartItems = () => {
    const items = getItemsFromCartData(cart);
    
    // Debug the cart items we're getting
    console.log('Cart items for order:', {
      totalItems: items.length,
      firstItem: items[0] ? {
        id: items[0].id || items[0]._id,
        productId: items[0].product?._id || items[0].product?.id,
        productType: typeof items[0].product,
        quantity: items[0].quantity
      } : 'No items'
    });
    
    return items;
  };

  // Helper to get cart total
  const getCartTotal = () => {
    if (!cart) return 0;
    
    // Handle different possible API response structures
    if (typeof cart.total === 'number') return cart.total;
    if (typeof cart.totalPrice === 'number') return cart.totalPrice;
    
    // Calculate manually if not provided
    // Note: The backend schema stores totalPrice in cents internally (value * 100)
    // But represents it externally as dollars (value / 100)
    return getCartItems().reduce((sum, item) => {
      // Use the item's price or the product price
      const price = item.price || item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  };

  // Handle shipping form changes
  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user types
    if (shippingErrors[name]) {
      setShippingErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle payment method change
  const handlePaymentChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  // Validate shipping info
  const validateShippingInfo = () => {
    const errors = {};
    
    if (!shippingInfo.fullName) errors.fullName = 'Full name is required';
    if (!shippingInfo.address) errors.address = 'Address is required';
    if (!shippingInfo.city) errors.city = 'City is required';
    if (!shippingInfo.phone) errors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(shippingInfo.phone.replace(/\s/g, ''))) {
      errors.phone = 'Enter a valid phone number';
    }
    if (!shippingInfo.email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(shippingInfo.email)) {
      errors.email = 'Enter a valid email address';
    }
    
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle going to next step
  const handleNext = () => {
    if (activeStep === 0) {
      // Validate shipping info before proceeding
      if (!validateShippingInfo()) return;
    }
    
    setActiveStep(prevStep => prevStep + 1);
  };

  // Handle going back to previous step
  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Helper function to ensure we have a valid MongoDB ObjectID (24 hex chars)
  const ensureValidObjectId = (id) => {
    if (!id) return null;
    
    // Convert to string if not already
    const strId = String(id);
    
    // Check if it's already a valid 24-character hex string
    if (/^[0-9a-f]{24}$/i.test(strId)) {
      return strId;
    }
    
    // If it's longer, truncate; if shorter, return null
    if (strId.length > 24) {
      return strId.substring(0, 24);
    }
    
    console.error('Invalid product ID format:', strId);
    return null;
  };

  // Handle initializing Paystack payment
  const handleInitiatePayment = async () => {
    setCheckoutLoading(true);
    setError('');
    
    try {
      // First validate that we have all required information
      if (!validateShippingInfo()) {
        setActiveStep(0); // Go back to shipping info step
        setCheckoutLoading(false);
        return;
      }
      
      // Step 1: First create the order in our system according to the validator requirements
      // ONLY include fields explicitly allowed in the validator
      const orderData = {
        shippingAddress: {
          street: shippingInfo.address || ' ',
          city: shippingInfo.city || ' ', 
          state: shippingInfo.postalCode || ' ',
          phone: shippingInfo.phone || ' ',
          email: shippingInfo.email || 'customer@example.com'
        },
        // Products array according to validator (only product and quantity needed)
        products: getCartItems().map(item => {
          // Extract the product ID and ensure it's a valid MongoDB ObjectID
          const rawProductId = item.product?._id || item.product?.id || '';
          const productId = ensureValidObjectId(rawProductId);
          
          if (!productId) {
            console.error('Skipping item with invalid product ID:', item);
            return null;
          }
          
          return {
            product: productId,
            quantity: item.quantity
          };
        }).filter(Boolean), // Remove any null values
        status: 'Pending'
      };
      
      console.log('Prepared order data:', JSON.stringify(orderData, null, 2));
      
      // Create the order first
      const response = await createOrder(orderData);
      console.log('Order created:', response);
      
      // Extract the order ID, handling different response formats
      let orderId = null;
      if (response.data) {
        // Try to find the order ID in various possible locations
        if (response.data.id) {
          orderId = response.data.id;
        } else if (response.data._id) {
          orderId = response.data._id;
        } else if (response.data.orderId) {
          orderId = response.data.orderId;
        } else if (response.data.order && (response.data.order.id || response.data.order._id)) {
          orderId = response.data.order.id || response.data.order._id;
        } else if (typeof response.data === 'string' && response.data.length > 0) {
          // In case the API returns just the ID as a string
          orderId = response.data;
        }
      }
      
      // Log the response and the extracted ID for debugging
      console.log('Response data:', response.data);
      console.log('Extracted order ID:', orderId);
      
      if (!orderId) {
        throw new Error('Failed to create order, no order ID received');
      }
      
      // Store the order ID for reference
      setOrderId(orderId);
      
      // Step 2: Now initialize payment with the order ID
      console.log('Step 2: Initializing payment for order:', orderId);
      
      try {
        const paymentResponse = await initiatePayment(orderId);
        console.log('Payment initialization response:', paymentResponse.data);
        
        // Check if we have a valid payment URL
        let paymentUrl = null;
        
        if (paymentResponse.data && paymentResponse.data.paymentUrl) {
          paymentUrl = paymentResponse.data.paymentUrl;
        } else if (paymentResponse.data && paymentResponse.data.data && paymentResponse.data.data.authorization_url) {
          paymentUrl = paymentResponse.data.data.authorization_url;
        } else {
          throw new Error('Invalid payment initialization response: No payment URL found');
        }
        
        // Get the payment reference for verification
        const paymentRef = paymentResponse.data?.data?.reference || 
                           paymentResponse.data?.reference || 
                           `order_${orderId}_${Date.now()}`;
        
        // Store in localStorage for fallback verification
        localStorage.setItem('pendingPaymentRef', paymentRef);
        localStorage.setItem('pendingOrderId', orderId);
        
        // Start a polling mechanism to check payment status in case the redirect doesn't work
        let pollCount = 0;
        const maxPolls = 12; // Poll for a maximum of 2 minutes (12 * 10 seconds)
        
        const pollPaymentStatus = () => {
          // Set up a polling function to check payment status
          const pollInterval = setInterval(async () => {
            pollCount++;
            console.log(`Polling payment status (${pollCount}/${maxPolls})...`);
            
            try {
              // Check if the user has completed the payment
              const verifyResponse = await verifyPayment(paymentRef);
              
              // Check if verification was successful
              const isSuccess = 
                verifyResponse.data?.status === 'success' || 
                verifyResponse.data?.data?.status === 'success' ||
                (verifyResponse.data?.message && verifyResponse.data.message.toLowerCase().includes('success'));
              
              if (isSuccess) {
                console.log('Payment verified through polling!');
                clearInterval(pollInterval);
                
                // Update UI
                setOrderSuccess(true);
                setActiveStep(3);
                
                // Clear localStorage
                localStorage.removeItem('pendingPaymentRef');
                localStorage.removeItem('pendingOrderId');
              }
            } catch (error) {
              console.log('Polling error (this is often normal until payment is complete):', error.message);
            }
            
            // Stop polling after maxPolls attempts
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              console.log('Stopped polling payment status after max attempts');
            }
          }, 10000); // Poll every 10 seconds
          
          // Clean up interval if component unmounts
          return pollInterval;
        };
        
        // Start polling
        const paymentPollInterval = pollPaymentStatus();
        
        // Clean up function to stop polling if user cancels or completes payment
        const stopPolling = () => {
          if (paymentPollInterval) {
            clearInterval(paymentPollInterval);
            console.log('Stopped payment status polling');
          }
        };
        
        // Store the cleanup function
        window.stopPaymentPolling = stopPolling;
        
        // Redirect to Paystack checkout page in a new tab
        console.log('Opening payment URL in new tab:', paymentUrl);
        window.open(paymentUrl, '_blank');
      } catch (paymentError) {
        console.error('Payment initialization failed:', paymentError);
        
        // If payment initialization fails, we should let the user try again or use a different payment method
        // but keep the order created
        let errorMessage = 'Failed to initialize payment.';
        
        if (paymentError.response?.data?.message) {
          errorMessage = paymentError.response.data.message;
        } else if (paymentError.response?.data?.error) {
          errorMessage = paymentError.response.data.error;
        }
        
        setError(`${errorMessage} Please try again or choose a different payment method.`);
      }
    } catch (error) {
      console.error('Error in order creation process:', error);
      let errorMessage = 'Failed to create your order.';
      
      // Extract more specific error if available
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(`${errorMessage} Please try again.`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle order submission
  const handlePlaceOrder = async () => {
    if (paymentMethod === 'paystack') {
      // Initialize Paystack payment
      await handleInitiatePayment();
    } else {
      // For cash on delivery
      setCheckoutLoading(true);
      setError('');
      
      try {
        // Create order object with ONLY fields allowed in the validator
        const orderData = {
          shippingAddress: {
            street: shippingInfo.address || ' ',
            city: shippingInfo.city || ' ', 
            state: shippingInfo.postalCode || ' ',
            phone: shippingInfo.phone || ' ',
            email: shippingInfo.email || 'customer@example.com'
          },
          // Products array according to validator (only product and quantity needed)
          products: getCartItems().map(item => {
            // Extract the product ID and ensure it's a valid MongoDB ObjectID
            const rawProductId = item.product?._id || item.product?.id || '';
            const productId = ensureValidObjectId(rawProductId);
            
            if (!productId) {
              console.error('Skipping item with invalid product ID:', item);
              return null;
            }
            
            return {
              product: productId,
              quantity: item.quantity
            };
          }).filter(Boolean), // Remove any null values
          status: 'Pending'
        };
        
        console.log('Placing order with data:', orderData);
        
        const response = await createOrder(orderData);
        console.log('Order response:', response);
        
        // Extract the order ID, handling different response formats
        let orderId = null;
        if (response.data) {
          // Try to find the order ID in various possible locations
          if (response.data.id) {
            orderId = response.data.id;
          } else if (response.data._id) {
            orderId = response.data._id;
          } else if (response.data.orderId) {
            orderId = response.data.orderId;
          } else if (response.data.order && (response.data.order.id || response.data.order._id)) {
            orderId = response.data.order.id || response.data.order._id;
          } else if (typeof response.data === 'string' && response.data.length > 0) {
            // In case the API returns just the ID as a string
            orderId = response.data;
          }
        }
        
        // Log the response and the extracted ID for debugging
        console.log('Response data:', response.data);
        console.log('Extracted order ID:', orderId);
        
        // Handle successful checkout
        setOrderSuccess(true);
        setOrderId(orderId || 'N/A');
        
        // Update cart context to show empty cart
        refreshCart(true);
        
        // Move to confirmation step
        setActiveStep(3);
      } catch (error) {
        console.error('Error placing order:', error);
        setError('Failed to place your order. Please try again.');
      } finally {
        setCheckoutLoading(false);
      }
    }
  };

  // If not logged in or still loading, show loading state
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // If there was an error loading the cart
  if (error && !orderSuccess) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" color="primary" onClick={() => navigate('/cart')} sx={{ mr: 2 }}>
          Return to Cart
        </Button>
        {process.env.NODE_ENV !== 'production' && (
          <Button 
            variant="outlined" 
            color="info" 
            onClick={async () => {
              try {
                // Import api directly to test
                const api = (await import('../services/api')).default;
                
                // Test connection
                console.log('Testing API connection...');
                await api.get('/products?limit=1').then(response => {
                  console.log('Products endpoint works:', response.status);
                  alert(`API connection test successful: ${response.status}`);
                });
                
                // Now test payment endpoint with a GET request (safer than OPTIONS which can cause CORS issues)
                console.log('Testing payment endpoint...');
                const testOrderId = '12345';
                
                // First try direct API call with proper token
                try {
                  const token = localStorage.getItem('token');
                  if (!token) {
                    alert('No authentication token found. Please login first.');
                    return;
                  }
                  
                  console.log('Testing orders endpoint (GET)...');
                  await api.get('/orders').then(response => {
                    console.log('Orders endpoint works:', response.status);
                    alert(`Orders endpoint test: ${response.status} ${response.statusText}`);
                  });
                } catch (orderError) {
                  console.error('Orders endpoint test failed:', orderError);
                  alert(`Orders endpoint test failed: ${orderError.message}`);
                }
              } catch (error) {
                console.error('API test failed:', error);
                alert(`API test failed: ${error.message}`);
              }
            }}
          >
            Debug API Routes
          </Button>
        )}
      </Container>
    );
  }

  // Get cart items and total for display
  const cartItems = getCartItems();
  const cartTotal = getCartTotal();

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          Checkout
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          /* Shipping Information Form */
          <Box>
            <Typography variant="h6" gutterBottom>
              Shipping Address
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  id="fullName"
                  name="fullName"
                  label="Full Name"
                  fullWidth
                  value={shippingInfo.fullName}
                  onChange={handleShippingChange}
                  error={!!shippingErrors.fullName}
                  helperText={shippingErrors.fullName}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  id="email"
                  name="email"
                  label="Email Address"
                  fullWidth
                  type="email"
                  value={shippingInfo.email}
                  onChange={handleShippingChange}
                  error={!!shippingErrors.email}
                  helperText={shippingErrors.email}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  id="address"
                  name="address"
                  label="Address"
                  fullWidth
                  value={shippingInfo.address}
                  onChange={handleShippingChange}
                  error={!!shippingErrors.address}
                  helperText={shippingErrors.address}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  id="city"
                  name="city"
                  label="City"
                  fullWidth
                  value={shippingInfo.city}
                  onChange={handleShippingChange}
                  error={!!shippingErrors.city}
                  helperText={shippingErrors.city}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  id="postalCode"
                  name="postalCode"
                  label="Postal Code"
                  fullWidth
                  value={shippingInfo.postalCode}
                  onChange={handleShippingChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  id="country"
                  name="country"
                  label="Country"
                  fullWidth
                  value={shippingInfo.country}
                  onChange={handleShippingChange}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  id="phone"
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={shippingInfo.phone}
                  onChange={handleShippingChange}
                  error={!!shippingErrors.phone}
                  helperText={shippingErrors.phone}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 1 && (
          /* Payment Method Selection */
          <Box>
            <Typography variant="h6" gutterBottom>
              Payment Method
            </Typography>
            <FormControl component="fieldset">
              <FormLabel component="legend">Select a payment method</FormLabel>
              <RadioGroup
                name="paymentMethod"
                value={paymentMethod}
                onChange={handlePaymentChange}
              >
                <FormControlLabel 
                  value="paystack" 
                  control={<Radio />} 
                  label="Paystack (Credit/Debit Card, Mobile Money)" 
                />
                <FormControlLabel 
                  value="cash" 
                  control={<Radio />} 
                  label="Cash on Delivery" 
                />
              </RadioGroup>
            </FormControl>
            
            {paymentMethod === 'paystack' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                You will be redirected to Paystack's secure payment page to complete your transaction.
              </Alert>
            )}
          </Box>
        )}

        {activeStep === 2 && (
          /* Order Review */
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Shipping Address
                </Typography>
                <Typography>
                  {shippingInfo.fullName}<br />
                  {shippingInfo.email}<br />
                  {shippingInfo.address}<br />
                  {shippingInfo.city}, {shippingInfo.postalCode}<br />
                  {shippingInfo.country}<br />
                  Phone: {shippingInfo.phone}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Payment Method
                </Typography>
                <Typography>
                  {paymentMethod === 'paystack' ? 'Paystack (Credit/Debit Card, Mobile Money)' : 
                   'Cash on Delivery'}
                </Typography>
              </CardContent>
            </Card>
            
            <Typography variant="h6" gutterBottom>
              Items in Your Cart
            </Typography>
            
            <List>
              {cartItems.map((item) => {
                const product = item.product || {};
                const name = product.productName || product.name || 'Unknown Product';
                const price = product.price || 0;
                
                return (
                  <ListItem key={item._id || item.id}>
                    <ListItemText
                      primary={name}
                      secondary={`Quantity: ${item.quantity}`}
                    />
                    <Typography variant="body2">
                      GH₵{(price * item.quantity).toFixed(2)}
                    </Typography>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        )}

        {activeStep === 3 && (
          /* Order Confirmation */
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="primary" gutterBottom>
              Thank you for your order!
            </Typography>
            <Typography variant="body1" paragraph>
              Your order has been placed successfully.
            </Typography>
            <Typography variant="body1" paragraph>
              Order ID: {orderId}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You will receive a confirmation email shortly.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/orders')}
              sx={{ mt: 2 }}
            >
              View My Orders
            </Button>
          </Box>
        )}

        {activeStep < 3 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={activeStep === 0 ? () => navigate('/cart') : handleBack}
              variant="outlined"
            >
              {activeStep === 0 ? 'Back to Cart' : 'Back'}
            </Button>
            
            {activeStep === 2 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handlePlaceOrder}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? <CircularProgress size={24} /> : 'Place Order'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Checkout;