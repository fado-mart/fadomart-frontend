import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { getCart } from '../services/api'
import { useAuth } from './AuthContext'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([])
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([])
      setCartCount(0)
      return
    }

    setLoading(true)
    try {
      const response = await getCart()
      
      // Handle different cart response structures
      let items = []
      if (response?.data?.items && Array.isArray(response.data.items)) {
        items = response.data.items
      } else if (response?.data?.cart && Array.isArray(response.data.cart)) {
        items = response.data.cart
      } else if (Array.isArray(response?.data)) {
        items = response.data
      }
      
      // Calculate total items
      const totalItems = items.reduce((total, item) => {
        return total + (item.quantity || 1)
      }, 0)
      
      setCartItems(items)
      setCartCount(totalItems)
    } catch (error) {
      console.error('Error fetching cart:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch cart when user changes
  useEffect(() => {
    if (user) {
      fetchCart()
    } else {
      setCartItems([])
      setCartCount(0)
    }
  }, [user, fetchCart])

  // Update cart count immediately when cart items change
  useEffect(() => {
    const totalItems = cartItems.reduce((total, item) => {
      return total + (item.quantity || 1)
    }, 0)
    setCartCount(totalItems)
  }, [cartItems])

  const refreshCart = useCallback(async () => {
    await fetchCart()
  }, [fetchCart])

  const value = {
    cartItems,
    cartCount,
    loading,
    refreshCart,
    setCartItems // Expose setCartItems for immediate updates
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export default CartContext 