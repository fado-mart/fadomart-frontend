import axios from 'axios'

const API_URL = 'https://fadomart-api.onrender.com'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Enable credentials to send cookies across domains if needed
  withCredentials: false,
})

// Initialize token from localStorage
const initialToken = localStorage.getItem('token')
if (initialToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`
}

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error information
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data
    })
    
    // Check for specific error types
    if (error.response) {
      // The request was made and the server responded with a status code
      // outside of the range of 2xx
      if (error.response.status === 401) {
        console.warn('Authentication error detected. Token may be invalid or expired.')
      } else if (error.response.status === 422) {
        console.warn('Validation error:', error.response.data)
      } else if (error.response.status === 403) {
        console.warn('Permission denied. User lacks necessary permissions.')
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server:', error.request)
    }
    
    return Promise.reject(error)
  }
)

// Helper to log current headers and token
const logAuthStatus = (message) => {
  console.log(`AUTH STATUS [${message}]:`, {
    hasAuthHeader: !!api.defaults.headers.common['Authorization'],
    storedToken: localStorage.getItem('token'),
    headerValue: api.defaults.headers.common['Authorization']
  })
}

// Ensure token is consistently set in headers
const ensureToken = () => {
  const token = localStorage.getItem('token')
  if (token && !api.defaults.headers.common['Authorization']) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    return true
  }
  return false
}

// Export setToken for backward compatibility
export const setToken = (token) => {
  console.log('Setting token:', token ? 'token-exists' : 'token-cleared')
  
  if (token) {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }
  
  logAuthStatus('After setToken')
  return token
}

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const updated = ensureToken()
    if (updated) {
      console.log('Interceptor restored missing Authorization header for:', config.url)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Cart endpoints
export const getCart = () => {
  ensureToken()
  return api.get('/cart')
}

export const clearCart = async () => {
  try {
    ensureToken()
    console.log('Manually clearing the cart')
    
    // Log auth status before making the request
    logAuthStatus('Before clearCart')
    
    // First get the current cart
    const cartResponse = await getCart()
    
    // Extract cart items based on response structure
    let cartItems = []
    if (cartResponse?.data?.items && Array.isArray(cartResponse.data.items)) {
      cartItems = cartResponse.data.items
    } else if (cartResponse?.data?.cart && Array.isArray(cartResponse.data.cart)) {
      cartItems = cartResponse.data.cart
    } else if (Array.isArray(cartResponse?.data)) {
      cartItems = cartResponse.data
    }
    
    console.log(`Found ${cartItems.length} items to remove from cart`)
    
    // Remove each item one by one
    for (const item of cartItems) {
      const itemId = item._id || item.id
      if (itemId) {
        try {
          console.log(`Removing item ${itemId} from cart`)
          await removeFromCart(itemId)
        } catch (itemError) {
          console.error(`Failed to remove item ${itemId}:`, itemError)
          // Continue with other items even if one fails
        }
      }
    }
    
    console.log('Cart cleared successfully by removing all items')
    return { data: { message: 'Cart cleared successfully' } }
  } catch (error) {
    console.error('Error clearing cart:', error)
    throw error
  }
}

export const addToCart = async (productId, quantity = 1) => {
  ensureToken()
  logAuthStatus('Before addToCart')
  
  if (!productId) {
    console.error('Invalid product ID:', productId)
    return Promise.reject(new Error('Invalid product ID'))
  }
  
  try {
    console.log('Sending cart request with:', { product: productId, quantity })
    const result = await api.post('/cart', { product: productId, quantity })
    console.log('Cart response:', result.data)
    return result
  } catch (error) {
    console.error('Cart error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: {
        authorization: api.defaults.headers.common.Authorization ? 'Bearer token exists' : 'No bearer token'
      },
      tokenInStorage: !!localStorage.getItem('token'),
      requestData: { product: productId, quantity }
    })
    throw error
  }
}

export const updateCartItem = async (itemId, quantity) => {
  try {
    ensureToken()
    console.log(`Updating cart item ${itemId} to quantity ${quantity}`)
    
    // Log auth status before making the request
    logAuthStatus('Before updateCartItem')
    
    // Validate inputs
    if (!itemId) {
      console.error('Invalid item ID:', itemId)
      return Promise.reject(new Error('Invalid item ID'))
    }
    
    if (quantity < 1) {
      console.error('Invalid quantity:', quantity)
      return Promise.reject(new Error('Quantity must be at least 1'))
    }
    
    const result = await api.put(`/cart/${itemId}`, { quantity })
    console.log('Update cart item response:', result.data)
    return result
  } catch (error) {
    console.error('Cart update error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: {
        authorization: api.defaults.headers.common.Authorization ? 'Bearer token exists' : 'No bearer token'
      },
      tokenInStorage: !!localStorage.getItem('token'),
      requestData: { quantity }
    })
    throw error
  }
}

export const removeFromCart = async (itemId) => {
  try {
    ensureToken()
    console.log(`Removing cart item ${itemId}`)
    
    // Log auth status before making the request
    logAuthStatus('Before removeFromCart')
    
    // Validate inputs
    if (!itemId) {
      console.error('Invalid item ID:', itemId)
      return Promise.reject(new Error('Invalid item ID'))
    }
    
    const result = await api.delete(`/cart/${itemId}`)
    console.log('Remove cart item response:', result.data)
    return result
  } catch (error) {
    console.error('Cart remove error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: {
        authorization: api.defaults.headers.common.Authorization ? 'Bearer token exists' : 'No bearer token'
      },
      tokenInStorage: !!localStorage.getItem('token')
    })
    throw error
  }
}

export const checkout = (orderData = {}) => {
  ensureToken()
  return api.post('/cart/checkout', orderData)
}

// Debug helper to inspect response structure
const inspectResponseStructure = (response) => {
  try {
    console.log('Response inspector:')
    console.log('- Status:', response.status)
    console.log('- Headers:', response.headers)
    console.log('- Data type:', typeof response.data)
    
    if (typeof response.data === 'object') {
      console.log('- Data keys:', Object.keys(response.data))
      
      if (response.data.data) {
        console.log('- Nested data keys:', Object.keys(response.data.data))
      }
      
      if (response.data.user) {
        console.log('- User keys:', Object.keys(response.data.user))
      }
    }
    
    console.log('- Full data:', JSON.stringify(response.data, null, 2))
  } catch (err) {
    console.error('Error inspecting response:', err)
  }
}

// Auth endpoints
export const login = async (credentials) => {
  try {
    logAuthStatus('Before login')
    const response = await api.post('/users/login', credentials)
    
    // Get token from the correct location (accessToken)
    const token = response.data?.accessToken || 
                  response.data?.data?.accessToken ||
                  response.data?.token || 
                  response.data?.data?.token || 
                  null
    
    if (token) {
      console.log('Token found in response, saving token')
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      console.warn('No standard token found. Checking for alternative token fields.')
      const foundToken = findTokenInObject(response.data)
      
      if (foundToken) {
        console.log('Found token in alternative location!')
        localStorage.setItem('token', foundToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${foundToken}`
      } else {
        console.warn('No token found anywhere in the response.')
      }
    }
    
    logAuthStatus('After login')
    return response
  } catch (error) {
    console.error('Login error:', error)
    throw error
  }
}

// Helper to find token in response object
const findTokenInObject = (obj, path = '') => {
  if (!obj || typeof obj !== 'object') return null;
  
  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // Check if this property might be a token
    if (
      (key.toLowerCase().includes('token') || key.toLowerCase() === 'jwt') &&
      typeof obj[key] === 'string' &&
      obj[key].length > 20
    ) {
      console.log(`Potential token found at ${currentPath}`);
      return obj[key];
    }
    
    // Recurse into nested objects
    if (obj[key] && typeof obj[key] === 'object') {
      const nestedToken = findTokenInObject(obj[key], currentPath);
      if (nestedToken) return nestedToken;
    }
  }
  
  return null;
};

export const register = (userData) => api.post('/users/signUp', userData)

export const logout = () => {
  localStorage.removeItem('token')
}

// Test API connection
export const testConnection = async () => {
  try {
    // Try to get products first
    const productsResponse = await api.get('/products')
    console.log('Products API Test:', productsResponse.status)
    return true
  } catch (productsError) {
    console.error('Products API Test Failed:', productsError)
    return false
  }
}

// User endpoints
export const getUserProfile = () => api.get('/users/me')
export const updateUserProfile = (userData) => {
  const formData = new FormData()
  
  // Map the userData to match the validator schema
  const validFields = {
    userName: userData.userName || userData.name,
    phone: userData.phone ? Number(userData.phone) : undefined, // Convert to number for validator
    address: userData.address,
    avatar: userData.avatar
  }
  
  // Add each field to formData
  Object.keys(validFields).forEach(key => {
    if (validFields[key] !== undefined) {
      // Handle file upload for avatar
      if (key === 'avatar' && validFields[key] instanceof File) {
        formData.append('images', validFields[key])
      } else {
        formData.append(key, validFields[key])
      }
    }
  })
  
  console.log('Sending profile update with data:', 
    Object.fromEntries(formData.entries())
  )
  
  return api.patch('/users/update', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

// Password reset endpoints
export const requestPasswordReset = (email) => api.post('/request-password-reset', { email })
export const resetPassword = (token, newPassword) => api.post('/reset-password', { token, newPassword })

// Product endpoints
export const getProducts = () => api.get('/products')
export const getProductById = (id) => api.get(`/products/${id}`)
export const createProduct = (productData) => {
  const formData = new FormData()
  Object.keys(productData).forEach(key => {
    if (key === 'image' && productData[key]) {
      formData.append('image', productData[key])
    } else if (productData[key] !== undefined) {
      formData.append(key, productData[key])
    }
  })
  return api.post('/products', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
export const updateProduct = (id, productData) => {
  const formData = new FormData()
  Object.keys(productData).forEach(key => {
    if (key === 'image' && productData[key]) {
      formData.append('image', productData[key])
    } else if (productData[key] !== undefined) {
      formData.append(key, productData[key])
    }
  })
  return api.patch(`/products/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const countProducts = () => api.get('/products/count')
export const syncProductInventory = (productId) => api.put(`/${productId}/sync-inventory`)

// Category endpoints
export const getCategories = async () => {
  try {
    const response = await api.get('/categories')
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

export const getCategoryById = (id) => api.get(`/categories/${id}`)

// Order endpoints
export const createOrder = async (orderData) => {
  try {
    ensureToken();
    
    // Helper function to validate MongoDB ObjectID
    const isValidObjectId = (id) => {
      return id && typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
    };
    
    // Validate order data according to the backend validator
    if (!orderData.shippingAddress) {
      console.error('Missing shipping address in order data');
      return Promise.reject(new Error('Missing shipping address'));
    }
    
    if (!Array.isArray(orderData.products) || orderData.products.length === 0) {
      console.error('Missing or empty products array in order data');
      return Promise.reject(new Error('Order must contain products'));
    }
    
    // Log the products array for debugging
    console.log('Products being sent to API:', JSON.stringify(orderData.products, null, 2));
    
    // Check each product and filter out invalid ones
    const validatedProducts = orderData.products
      .filter(product => product && product.product)
      .map(product => {
        // Ensure product ID is valid
        if (!isValidObjectId(product.product)) {
          console.warn(`Invalid product ID format: ${product.product}`);
          return null;
        }
        
        // Ensure quantity is valid
        if (typeof product.quantity !== 'number' || product.quantity < 1) {
          console.warn(`Invalid quantity for product ${product.product}: ${product.quantity}`);
          return null;
        }
        
        return {
          product: product.product,
          quantity: product.quantity
        };
      })
      .filter(Boolean); // Remove null entries
    
    // Check if we have any valid products left
    if (validatedProducts.length === 0) {
      console.error('No valid products found in order data');
      return Promise.reject(new Error('Order must contain at least one valid product'));
    }
    
    // Create a clean order object with ONLY the fields in the validator
    const cleanOrderData = {
      products: validatedProducts,
      status: 'Pending'
    };
    
    // Only include shipping address if it exists
    if (orderData.shippingAddress) {
      const address = {
        street: orderData.shippingAddress.street || ' ',
        city: orderData.shippingAddress.city || ' ',
        state: orderData.shippingAddress.state || ' ',
        phone: orderData.shippingAddress.phone || ' ',
        email: orderData.shippingAddress.email || 'customer@example.com'
      };
      
      // Ensure all shipping address fields are strings
      Object.keys(address).forEach(key => {
        address[key] = String(address[key]);
      });
      
      cleanOrderData.shippingAddress = address;
    }
    
    // Only add payment reference if it exists
    if (orderData.paymentRef) {
      cleanOrderData.paymentRef = String(orderData.paymentRef);
    }
    
    console.log('Creating order with strictly validated data:', JSON.stringify(cleanOrderData, null, 2));
    
    const response = await api.post('/orders', cleanOrderData);
    console.log('Order creation response:', response.data);
    
    // Debug the response structure to help identify where the ID is
    console.log('Response structure info:', {
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      hasId: response.data?.id ? true : false,
      hasUnderscoreId: response.data?._id ? true : false,
      hasOrderId: response.data?.orderId ? true : false,
      keys: typeof response.data === 'object' ? Object.keys(response.data) : 'Not an object'
    });
    
    return response;
  } catch (error) {
    console.error('Order creation error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: {
        authorization: api.defaults.headers.common.Authorization ? 'Bearer token exists' : 'No bearer token'
      },
      tokenInStorage: !!localStorage.getItem('token'),
      requestSent: orderData
    });
    
    // Log more details about the validation error
    if (error.response?.status === 422) {
      console.error('VALIDATION ERROR DETAILS:');
      console.error('Error object:', error.response?.data);
      if (error.response?.data?.details) {
        error.response.data.details.forEach((detail, index) => {
          console.error(`Error ${index + 1}:`, detail);
        });
      }
      if (error.response?.data?.message) {
        console.error('Error message:', error.response.data.message);
      }
    }
    
    throw error;
  }
};

export const getOrders = () => {
  ensureToken();
  return api.get('/orders');
};

export const getOrderById = (id) => {
  ensureToken();
  return api.get(`/orders/${id}`);
};

export const updateOrder = async (id, updateData) => {
  try {
    ensureToken();
    console.log(`Updating order ${id} with data:`, updateData);
    
    // Log auth status before making the request
    logAuthStatus('Before updateOrder');
    
    // Make the API call with the update data
    const response = await api.patch(`/orders/${id}`, updateData);
    console.log('Order update response:', response.data);
    return response;
  } catch (error) {
    console.error('Error updating order:', error);
    console.error('Order update error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers,
      tokenInStorage: !!localStorage.getItem('token')
    });
    throw error;
  }
};

// Payment endpoints
export const initiatePayment = async (orderId) => {
  try {
    ensureToken();
    console.log('Initializing payment for order:', orderId);
    
    // Log auth status before making the request
    logAuthStatus('Before initiatePayment');
    
    // Make sure the orderId is provided
    if (!orderId) {
      console.error('Invalid order ID:', orderId);
      return Promise.reject(new Error('Invalid order ID'));
    }
    
    // First get the order details to extract customer email and amount
    const orderResponse = await getOrderById(orderId);
    const order = orderResponse.data;
    
    if (!order) {
      console.error('Order not found:', orderId);
      return Promise.reject(new Error('Order not found'));
    }
    
    console.log('Got order details for payment:', order);
    
    // Build a more complete payment initialization request
    // Handle totalPrice according to the schema (which uses get/set transformers)
    // The schema stores totalPrice as cents internally (value * 100)
    // But represents it externally as dollars (value / 100)
    const totalAmount = order.totalPrice || 0;
    
    // The totalPrice in the API response is already in decimal format due to the getter
    // But Paystack expects the amount in the smallest currency unit (pesewas/cents)
    // Make sure we're sending a reasonable amount (>= 100) in pesewas
    const amountInSmallestUnit = Math.max(100, Math.round(totalAmount * 100));
    
    // Get the base URL of the application for callbacks
    const appBaseUrl = window.location.origin;
    const successUrl = `${appBaseUrl}/checkout?reference=order_${orderId}_${Date.now()}`;
    const cancelUrl = `${appBaseUrl}/checkout`;
    
    console.log('Setting callback URLs:', {
      success: successUrl,
      cancel: cancelUrl
    });
    
    const paymentData = {
      orderId: orderId,
      // Essential fields for Paystack
      email: order.shippingAddress?.email || 'customer@example.com', // Ensure email is always provided
      amount: amountInSmallestUnit,
      currency: 'GHS', // Specify currency
      reference: `order_${orderId}_${Date.now()}`, // Generate unique reference
      callback_url: successUrl, // Primary callback URL
      success_url: successUrl, // Secondary callback in case primary isn't used
      cancel_url: cancelUrl, // URL if payment is cancelled
      return_url: successUrl, // Additional return URL field some gateways use
      callbackUrl: successUrl, // Alternative field name some implementations use
      metadata: {
        order_id: orderId,
        custom_fields: [
          {
            display_name: "Order ID",
            variable_name: "order_id",
            value: orderId
          },
          {
            display_name: "Return URL",
            variable_name: "return_url",
            value: successUrl
          }
        ]
      }
    };
    
    console.log('Sending payment initialization with data:', paymentData);
    
    // Get current token and ensure it's in the headers
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found for payment initialization');
    }
    
    // Add headers specifically for this request to avoid CORS issues
    const response = await api.post('/payment/initialize', paymentData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Payment initialization successful:', response.data);
    
    // Store the payment reference in localStorage so we can retrieve it
    // even if the callback fails
    try {
      const paymentRef = response.data?.data?.reference || 
                         response.data?.reference || 
                         paymentData.reference;
      
      if (paymentRef) {
        localStorage.setItem('pendingPaymentRef', paymentRef);
        localStorage.setItem('pendingOrderId', orderId);
        console.log('Stored payment reference for verification fallback:', paymentRef);
      }
    } catch (storageError) {
      console.warn('Could not store payment reference:', storageError);
    }
    
    return response;
  } catch (error) {
    console.error('Payment initialization error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers || 'No headers available',
      tokenInStorage: !!localStorage.getItem('token')
    });
    throw error;
  }
};

export const verifyPayment = async (reference) => {
  try {
    ensureToken();
    console.log('Verifying payment with reference:', reference);
    
    if (!reference) {
      console.error('Invalid payment reference');
      return Promise.reject(new Error('Invalid payment reference'));
    }
    
    // Log auth status before making the request
    logAuthStatus('Before verifyPayment');
    
    // Try to extract the order ID from the reference itself first
    // References are often in format: order_[orderId]_[timestamp]
    let orderIdFromReference = null;
    const refParts = reference.split('_');
    if (refParts.length >= 2) {
      // The second part might be the order ID
      orderIdFromReference = refParts[1];
      console.log('Extracted possible order ID from reference:', orderIdFromReference);
    }
    
    // Add query parameters to the URL
    const response = await api.get(`/payment/verify?reference=${reference}`);
    console.log('Full payment verification response:', JSON.stringify(response.data, null, 2));
    
    // Check if verification is successful
    const isSuccess = 
      response.data?.status === 'success' || 
      response.data?.data?.status === 'success' ||
      (response.data?.message && response.data.message.toLowerCase().includes('success'));
    
    if (isSuccess) {
      console.log('Payment verified successfully, now handling post-payment tasks');
      
      // Extract order ID from the response
      let orderId = null;
      
      // Try to find the order ID in known response locations
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
        // Try to extract order ID from the response reference
        const parts = response.data.reference.split('_');
        if (parts.length >= 2) {
          orderId = parts[1];
        }
      }
      
      // If we couldn't find an order ID in the response, use the one from the reference
      if (!orderId && orderIdFromReference) {
        orderId = orderIdFromReference;
        console.log('Using order ID extracted from reference:', orderId);
      }
      
      // TASK 1: UPDATE ORDER STATUS
      if (orderId) {
        console.log('Updating order status for order:', orderId);
        
        // Execute tasks in parallel
        const orderUpdatePromise = (async () => {
          try {
            // First try with the specific updateOrder function
            const updateResponse = await api.patch(`/orders/${orderId}`, { status: 'Paid' });
            console.log('Order status update response:', updateResponse?.data);
            return true;
          } catch (updateError) {
            console.error('Failed to update order status:', updateError);
            
            // Log more detailed error info
            if (updateError.response) {
              console.error('Update error response:', {
                status: updateError.response.status,
                data: updateError.response.data
              });
            }
            return false;
          }
        })();
        
        // TASK 2: CLEAR CART
        const clearCartPromise = (async () => {
          try {
            // Get current cart items
            const cartResponse = await getCart();
            
            // Extract cart items based on response structure
            let cartItems = [];
            if (cartResponse?.data?.items && Array.isArray(cartResponse.data.items)) {
              cartItems = cartResponse.data.items;
            } else if (cartResponse?.data?.cart && Array.isArray(cartResponse.data.cart)) {
              cartItems = cartResponse.data.cart;
            } else if (Array.isArray(cartResponse?.data)) {
              cartItems = cartResponse.data;
            }
            
            console.log(`Found ${cartItems.length} items to remove from cart`);
            
            // Remove each item one by one
            for (const item of cartItems) {
              const itemId = item._id || item.id;
              if (itemId) {
                try {
                  console.log(`Removing item ${itemId} from cart`);
                  await removeFromCart(itemId);
                } catch (itemError) {
                  console.error(`Failed to remove item ${itemId}:`, itemError);
                  // Continue with other items even if one fails
                }
              }
            }
            
            console.log('Cart cleared successfully after payment');
            return true;
          } catch (cartError) {
            console.warn('Could not clear cart after payment:', cartError);
            return false;
          }
        })();
        
        // Wait for both tasks to complete
        await Promise.allSettled([orderUpdatePromise, clearCartPromise]);
        console.log('Post-payment tasks completed');
      } else {
        console.error('Could not find order ID in payment verification response');
      }
    } else {
      console.warn('Payment verification was not successful');
    }
    
    return response;
  } catch (error) {
    console.error('Payment verification error:', error);
    console.error('Verification error details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.config?.headers || 'No headers available',
      tokenInStorage: !!localStorage.getItem('token')
    });
    throw error;
  }
};

export default api