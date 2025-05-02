import React, { useState, useEffect } from 'react'
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  TableCell,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProducts, getCategories, addToCart } from '../services/api'

const Products = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          getProducts(),
          getCategories()
        ])
        setProducts(productsResponse.data)
        setCategories(categoriesResponse.data)
      } catch (error) {
        console.error('Error fetching data:', error)
        setSnackbar({
          open: true,
          message: 'Failed to load products. Please try again.',
          severity: 'error'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddToCart = async (product) => {
    console.log('Add to cart clicked', { product, authenticated: !!user })
    
    try {
      // Check authentication
      if (!user) {
        console.log('User not authenticated, showing message')
        setSnackbar({
          open: true,
          message: 'Please log in to add items to cart',
          severity: 'info'
        })
        // Give user option to continue without forcing navigation
        if (window.confirm('You need to be logged in to add items to cart. Go to login page?')) {
          navigate('/login')
        }
        return
      }

      // Check if token exists
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('Token missing despite user state being set')
        setSnackbar({
          open: true,
          message: 'Authentication issue. Please log in again.',
          severity: 'warning'
        })
        return
      }

      // Debug product structure to ensure we're using the right ID field
      console.log('Product structure:', product)
      
      // Find the ID field - it could be _id, id, productId, or something else
      const productId = product._id || product.id || product.productId
      
      if (!productId) {
        console.error('Product ID not found in product object:', product)
        setSnackbar({
          open: true,
          message: 'Error: Product ID not found. Please try another product.',
          severity: 'error'
        })
        return
      }
      
      console.log('Making add to cart request', { productId })
      const response = await addToCart(productId, 1)
      console.log('Cart response successful', response)
      
      setSnackbar({
        open: true,
        message: 'Item added to cart successfully',
        severity: 'success'
      })
    } catch (error) {
      console.error('Error adding to cart:', error)
      
      // Check for specific error messages in the response
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Failed to add item to cart. Please try again.'
      
      // Don't force logout or navigation for 401, just show a message
      if (error.response?.status === 401) {
        console.log('401 Unauthorized error, showing login prompt')
        setSnackbar({
          open: true,
          message: 'Authentication expired. Please log in again.',
          severity: 'warning'
        })
      } else if (error.response?.status === 400) {
        // Bad request - likely invalid product ID or missing required field
        console.log('400 Bad Request error:', error.response?.data)
        setSnackbar({
          open: true,
          message: `Bad request: ${errorMessage}`,
          severity: 'error'
        })
      } else {
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        })
      }
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category?._id === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography variant="h6">Loading products...</Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        gap: 2, 
        flexWrap: 'wrap',
        flexDirection: { xs: 'column', sm: 'row' }
      }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ 
            flex: 1, 
            minWidth: { xs: '100%', sm: 200 } 
          }}
        />
        
        <FormControl sx={{ 
          minWidth: { xs: '100%', sm: 200 },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category._id} value={category._id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {filteredProducts.length === 0 ? (
        <Typography variant="h6" align="center" sx={{ py: 4 }}>
          No products found matching your criteria
        </Typography>
      ) : (
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {filteredProducts.map((product) => (
            <Grid item key={product._id} xs={12} sm={6} md={4} lg={3}>
              <Card sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={product.image || '/images/product-placeholder.jpg'}
                  alt={product.productName}
                  sx={{ 
                    objectFit: 'cover',
                    borderBottom: '1px solid rgba(0,0,0,0.1)',
                    height: { xs: 180, sm: 200 }
                  }}
                />
                <CardContent sx={{ 
                  flexGrow: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  p: { xs: 2, sm: 3 }
                }}>
                  <Typography gutterBottom variant="h6" component="div" sx={{ 
                    fontWeight: 'bold',
                    minHeight: '3em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}>
                    {product.productName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mb: 2,
                    minHeight: '3em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {product.description}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2,
                    flexWrap: 'wrap',
                    gap: 1
                  }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      GH₵{product.price.toFixed(2)}
                    </Typography>
                    <Chip
                      label={product.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                      color={product.quantity > 0 ? 'success' : 'error'}
                      size="small"
                      sx={{ 
                        fontWeight: 'bold',
                        '&.MuiChip-colorSuccess': {
                          backgroundColor: 'success.light',
                          color: 'success.contrastText'
                        },
                        '&.MuiChip-colorError': {
                          backgroundColor: 'error.light',
                          color: 'error.contrastText'
                        }
                      }}
                    />
                  </Box>
                  {product.quantity > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      mb: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                      <span>Available:</span>
                      <Typography component="span" sx={{ 
                        fontWeight: 'bold',
                        color: 'primary.main'
                      }}>
                        {product.quantity} units
                      </Typography>
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={product.quantity <= 0}
                    onClick={() => handleAddToCart(product)}
                    sx={{
                      mt: 'auto',
                      py: 1,
                      fontWeight: 'bold',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    {product.quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}

export default Products 