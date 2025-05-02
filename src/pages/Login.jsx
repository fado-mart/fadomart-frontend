import React, { useState, useEffect } from 'react'
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Link,
  IconButton,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { testConnection } from '../services/api'
import axios from 'axios'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState('checking')
  const [apiError, setApiError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const api = axios.create()

  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const isConnected = await testConnection()
        setApiStatus(isConnected ? 'connected' : 'error')
      } catch (err) {
        console.error('API Connection Error:', err)
        setApiStatus('error')
        setApiError(err.message || 'Unknown error occurred')
      }
    }
    checkApiConnection()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (apiStatus !== 'connected') {
      setError('Cannot connect to the server. Please try again later.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await login({ email, password })
      console.log('Login Response:', response)
      
      // Get token from the correct location (accessToken)
      const token = response.data?.accessToken || 
                    response.data?.data?.accessToken ||
                    response.data?.token || 
                    response.data?.data?.token || 
                    null
      
      if (token) {
        console.log('Login successful with standard token, redirecting to home')
        // Set token in localStorage and API headers
        localStorage.setItem('token', token)
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        navigate('/')
      } else {
        console.warn('Login response did not contain any identifiable token')
        setError('Authentication issue. Please try again or contact support.')
      }
    } catch (error) {
      console.error('Login Error:', error)
      setError(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An error occurred during login'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            position: 'relative',
          }}
        >
          <IconButton
            sx={{ position: 'absolute', left: 16, top: 16 }}
            onClick={() => navigate('/')}
            aria-label="back to home"
          >
            <ArrowBack />
          </IconButton>

          <Typography component="h1" variant="h5">
            Sign in to FadoMart
          </Typography>

          {apiStatus === 'checking' && (
            <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
              Checking server connection...
            </Alert>
          )}

          {apiStatus === 'error' && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              Unable to connect to the server. Please check your internet connection and try again.
              {apiError && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Error details: {apiError}
                </Typography>
              )}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || apiStatus !== 'connected'}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || apiStatus !== 'connected'}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || apiStatus !== 'connected'}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                New to FadoMart?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/signup')}
                  sx={{ textDecoration: 'none' }}
                >
                  Create an account
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Login 