import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Paper,
  Box,
  Avatar,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  IconButton,
} from '@mui/material'
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { getUserProfile, updateUserProfile, getOrders, requestPasswordReset } from '../services/api'

// Tab panel component
const TabPanel = (props) => {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

const Profile = () => {
  const { user, logout, refreshUserProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState(null)
  const [orders, setOrders] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tabValue, setTabValue] = useState(0)
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    phone: '',
    address: '',
  })
  const [passwordResetDialog, setPasswordResetDialog] = useState(false)
  const [passwordResetEmail, setPasswordResetEmail] = useState('')
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        navigate('/login')
        return
      }

      setLoading(true)
      try {
        const response = await getUserProfile()
        console.log('Profile data:', response.data)
        
        // Handle different response structures
        const data = response.data?.user || response.data || {}
        setProfileData(data)
        
        // Initialize form data
        setFormData({
          userName: data.userName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
        })
      } catch (error) {
        console.error('Error fetching profile:', error)
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [user, navigate])

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return
      
      try {
        const response = await getOrders()
        console.log('Orders data:', response.data)
        
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
      }
    }

    fetchOrders()
  }, [user])

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Special handling for phone field - ensure only numbers
    if (name === 'phone') {
      // Remove any non-numeric characters
      const numericValue = value.replace(/\D/g, '')
      setFormData({
        ...formData,
        [name]: numericValue,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  // Handle profile update
  const handleProfileUpdate = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      // Validate data before sending
      const validatedData = { ...formData }
      
      // Ensure phone is a number or removed if empty
      if (validatedData.phone === '') {
        delete validatedData.phone
      } else if (validatedData.phone) {
        // Ensure it's a valid number
        if (!/^\d+$/.test(validatedData.phone)) {
          setError('Phone number must contain only digits')
          setLoading(false)
          return
        }
        // Convert to number for the validator
        validatedData.phone = Number(validatedData.phone)
      }
      
      // Ensure we have at least one field to update
      if (!validatedData.userName && !validatedData.phone && !validatedData.address) {
        setError('Please update at least one field')
        setLoading(false)
        return
      }
      
      console.log('Sending validated profile data:', validatedData)
      
      const response = await updateUserProfile(validatedData)
      console.log('Profile update response:', response.data)
      
      // Update profile data
      const updatedData = response.data?.user || response.data || {}
      setProfileData({
        ...profileData,
        ...updatedData,
      })
      
      // Refresh user profile in AuthContext
      await refreshUserProfile()
      
      setSuccess('Profile updated successfully')
      setEditMode(false)
      
      // Show snackbar
      setSnackbarMessage('Profile updated successfully')
      setSnackbarOpen(true)
    } catch (error) {
      console.error('Error updating profile:', error)
      
      // Display proper error message
      if (error.response?.data?.message) {
        setError(error.response.data.message)
      } else if (error.response?.status === 422) {
        setError('Validation error. Please check your input.')
      } else {
        setError('Failed to update profile')
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle password reset request
  const handlePasswordResetRequest = async () => {
    try {
      setLoading(true)
      await requestPasswordReset(passwordResetEmail || profileData?.email)
      setPasswordResetSent(true)
      
      // Show snackbar
      setSnackbarMessage('Password reset email sent')
      setSnackbarOpen(true)
    } catch (error) {
      console.error('Error requesting password reset:', error)
      setError('Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm')
    } catch (error) {
      return dateString
    }
  }

  // Calculate order total
  const calculateOrderTotal = (order) => {
    if (order.totalPrice) return order.totalPrice
    
    if (order.products && Array.isArray(order.products)) {
      return order.products.reduce((total, item) => {
        return total + ((item.price || 0) * (item.quantity || 1))
      }, 0)
    }
    
    return 0
  }

  if (loading && !profileData) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ mb: 4, overflow: 'hidden' }}>
        <Box sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          alignItems: { xs: 'center', sm: 'flex-start' },
          gap: 4,
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Avatar
            sx={{ width: 100, height: 100, border: '3px solid white' }}
            alt={profileData?.userName || profileData?.name || 'User'}
            src={profileData?.avatar}
          />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {profileData?.userName || profileData?.name || 'Welcome User'}
            </Typography>
            <Typography variant="subtitle1">
              {profileData?.email}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Member since: {formatDate(profileData?.createdAt || new Date())}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="profile tabs"
            variant="fullWidth"
          >
            <Tab label="Profile Information" />
            <Tab label="Order History" />
            <Tab label="Account Settings" />
          </Tabs>
        </Box>
        
        {/* Profile Information Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
              {!editMode ? (
                <Button 
                  startIcon={<EditIcon />} 
                  onClick={() => setEditMode(true)}
                >
                  Edit
                </Button>
              ) : (
                <Box>
                  <IconButton color="error" onClick={() => setEditMode(false)} sx={{ mr: 1 }}>
                    <CancelIcon />
                  </IconButton>
                  <IconButton 
                    color="primary" 
                    onClick={handleProfileUpdate}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : <SaveIcon />}
                  </IconButton>
                </Box>
              )}
            </Box>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                {editMode ? (
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {profileData?.userName || profileData?.name || 'Not provided'}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                {editMode ? (
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    margin="normal"
                    type="email"
                  />
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email Address
                    </Typography>
                    <Typography variant="body1">
                      {profileData?.email || 'Not provided'}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                {editMode ? (
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    margin="normal"
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                    helperText="Numbers only"
                  />
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      {profileData?.phone || 'Not provided'}
                    </Typography>
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                {editMode ? (
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">
                      {profileData?.address || 'Not provided'}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
        
        {/* Order History Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Your Order History
          </Typography>
          
          {orders.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                You haven't placed any orders yet.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => navigate('/products')}
              >
                Start Shopping
              </Button>
            </Box>
          ) : (
            <List sx={{ width: '100%' }}>
              {orders.map((order) => (
                <React.Fragment key={order.id || order._id}>
                  <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={5}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Order ID
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {(order.id || order._id || '').substring(0, 8)}...
                        </Typography>
                        
                        <Typography variant="subtitle2" color="text.secondary">
                          Date
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(order.createdAt)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Items
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {order.products?.length || 0} items
                        </Typography>
                        
                        <Typography variant="subtitle2" color="text.secondary">
                          Total
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          GH₵{calculateOrderTotal(order).toFixed(2)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={3} sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'row', md: 'column' },
                        justifyContent: { xs: 'space-between', md: 'center' },
                        alignItems: { xs: 'center', md: 'flex-end' },
                        gap: 1
                      }}>
                        <Chip 
                          label={order.status || 'Pending'} 
                          color={
                            order.status === 'Paid' || order.status === 'Delivered' 
                              ? 'success' 
                              : order.status === 'Pending' 
                                ? 'warning'
                                : 'default'
                          }
                          size="small"
                          sx={{ mb: { xs: 0, md: 1 } }}
                        />
                        
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => navigate(`/orders?id=${order.id || order._id}`)}
                        >
                          View Details
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button 
              variant="contained" 
              onClick={() => navigate('/orders')}
            >
              View All Orders
            </Button>
          </Box>
        </TabPanel>
        
        {/* Account Settings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Password Management
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => setPasswordResetDialog(true)}
                  sx={{ mt: 1 }}
                >
                  Reset Password
                </Button>
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Account Actions
                </Typography>
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to log out?')) {
                      logout()
                      navigate('/')
                    }
                  }}
                  sx={{ mt: 1 }}
                >
                  Log Out
                </Button>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Preferences
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Manage your notification preferences and account settings.
                </Typography>
                
                {/* Placeholder for future preference settings */}
                <Typography variant="body2" color="text.secondary">
                  More preference settings coming soon.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
      
      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialog} onClose={() => setPasswordResetDialog(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {!passwordResetSent ? (
            <>
              <DialogContentText>
                To reset your password, please enter your email address. We will send you an email with instructions.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={passwordResetEmail || profileData?.email || ''}
                onChange={(e) => setPasswordResetEmail(e.target.value)}
              />
            </>
          ) : (
            <DialogContentText>
              Password reset email has been sent. Please check your inbox and follow the instructions.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordResetDialog(false)
            setPasswordResetSent(false)
          }}>
            Close
          </Button>
          {!passwordResetSent && (
            <Button 
              onClick={handlePasswordResetRequest} 
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Send Reset Email'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  )
}

export default Profile 