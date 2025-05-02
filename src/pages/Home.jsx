import React, { useState, useEffect } from 'react'
import {
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Box,
  Paper,
  Chip,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { getProducts, getCategories } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          getProducts(),
          getCategories(),
        ])
        setFeaturedProducts(productsResponse.data.slice(0, 4))
        setCategories(categoriesResponse.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <Box>
      {/* Hero Section */}
      <Paper
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: `url(https://source.unsplash.com/random/1600x900/?shopping)`,
          height: '60vh',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,.5)',
          }}
        />
        <Container maxWidth="lg">
          <Grid container>
            <Grid item md={6}>
              <Box
                sx={{
                  position: 'relative',
                  p: { xs: 3, md: 6 },
                  pr: { md: 0 },
                }}
              >
                <Typography
                  component="h1"
                  variant="h3"
                  color="inherit"
                  gutterBottom
                >
                  Welcome to FadoMart
                </Typography>
                <Typography variant="h5" color="inherit" paragraph>
                  Discover amazing products at unbeatable prices. Shop with
                  confidence and enjoy a seamless shopping experience.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/products')}
                >
                  Shop Now
                </Button>
                {!user && (
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{ ml: 2 }}
                  >
                    Login
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Paper>

      {/* Categories Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          Shop by Category
        </Typography>
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid item xs={6} sm={4} md={3} key={category._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    transition: 'transform 0.2s',
                  },
                }}
                onClick={() => navigate(`/products?category=${category._id}`)}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={category.image || 'https://source.unsplash.com/random/300x200'}
                  alt={category.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="h2">
                    {category.name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Featured Products Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          Featured Products
        </Typography>
        <Grid container spacing={4}>
          {featuredProducts.map((product) => (
            <Grid item key={product._id} xs={12} sm={6} md={3}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    transition: 'transform 0.2s',
                  },
                }}
                onClick={() => navigate(`/products/${product._id}`)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={product.image}
                  alt={product.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="h2">
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.description}
                  </Typography>
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                      GH₵{product.price.toFixed(2)}
                    </Typography>
                    <Chip
                      label={product.category?.name || 'Uncategorized'}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Call to Action Section */}
      <Paper
        sx={{
          position: 'relative',
          backgroundColor: 'grey.800',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: `url(https://source.unsplash.com/random/1600x900/?shopping)`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,.5)',
          }}
        />
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              p: { xs: 3, md: 6 },
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" color="inherit" gutterBottom>
              Ready to Start Shopping?
            </Typography>
            <Typography variant="h6" color="inherit" paragraph>
              Join thousands of satisfied customers and discover amazing deals
              today.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/products')}
            >
              Explore Products
            </Button>
          </Box>
        </Container>
      </Paper>
    </Box>
  )
}

export default Home 