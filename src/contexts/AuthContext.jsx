import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { 
  login as loginApi, 
  register as registerApi, 
  getUserProfile 
} from '../services/api'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch user profile data
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return null
    
    setProfileLoading(true)
    try {
      const response = await getUserProfile()
      console.log('AuthContext: Profile data fetched', response.data)
      
      // Handle different response structures
      const profileData = response.data?.user || response.data || {}
      
      // Update user state with profile data, maintaining the token
      setUser(prev => ({
        ...prev,
        ...profileData,
        token
      }))
      
      return profileData
    } catch (error) {
      console.error('AuthContext: Error fetching profile', error)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  // Check if user is logged in on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      if (token) {
        console.log('AuthContext: Found token in localStorage')
        
        // Set initial user state with token
        setUser({ token })
        
        // Fetch profile data
        await fetchProfile()
      } else {
        console.log('AuthContext: No token found in localStorage')
      }
      
      setLoading(false)
    }
    
    initializeAuth()
  }, [fetchProfile])

  const login = async (credentials) => {
    console.log('AuthContext: Login attempt')
    setError(null)
    
    try {
      const response = await loginApi(credentials)
      console.log('AuthContext: Login successful, response received')
      
      // Get token from the correct location (accessToken)
      const token = response.data?.accessToken || 
                    response.data?.data?.accessToken ||
                    response.data?.token || 
                    response.data?.data?.token || 
                    null
      
      if (token) {
        console.log('AuthContext: Token found, setting user with token')
        setUser({ token })
        
        // After successful login, fetch user profile
        await fetchProfile()
      } else {
        // Check if we have a JWT-like string in the response
        const jwtPattern = /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
        let tokenValue = null;
        
        // Check each property in the response for a JWT pattern
        for (const key in response.data) {
          const value = response.data[key];
          if (typeof value === 'string' && jwtPattern.test(value)) {
            console.log(`AuthContext: Found JWT-like token in field '${key}'`);
            tokenValue = value;
            break;
          }
        }
        
        if (tokenValue) {
          console.log('AuthContext: Setting user with found token');
          setUser({ token: tokenValue });
          
          // After successful login, fetch user profile
          await fetchProfile()
        } else {
          // If we can't find a token, store the user data anyway
          const userData = response.data;
          console.warn('AuthContext: No standard token found, setting user data', userData);
          setUser(userData);
        }
      }
      
      return response
    } catch (error) {
      console.error('AuthContext: Login failed', error)
      setError(error.response?.data?.message || 'Login failed')
      throw error
    }
  }

  const register = async (userData) => {
    setError(null)
    try {
      const response = await registerApi(userData)
      return response
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed')
      throw error
    }
  }

  const logout = () => {
    console.log('AuthContext: Logging out')
    localStorage.removeItem('token')
    localStorage.removeItem('pendingPaymentRef')
    localStorage.removeItem('pendingOrderId')
    setUser(null)
  }

  // Method to refresh user profile data
  const refreshUserProfile = async () => {
    return await fetchProfile()
  }

  // Debug useEffect to track user state changes
  useEffect(() => {
    console.log('AuthContext: User state changed', user)
  }, [user])

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        register, 
        logout, 
        loading, 
        profileLoading,
        error,
        refreshUserProfile 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 