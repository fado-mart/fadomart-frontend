import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getCategories } from '../services/api'
import { Container, Row, Col, Card, Button } from 'react-bootstrap'
import { FaShoppingCart, FaArrowRight } from 'react-icons/fa'

const HomePage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          getProducts(),
          getCategories()
        ])
        setProducts(productsResponse.data)
        setCategories(categoriesResponse.data)
      } catch (err) {
        setError('Failed to load data. Please try again later.')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="text-center py-5">Loading...</div>
  if (error) return <div className="text-center py-5 text-danger">{error}</div>

  const featuredProducts = products.slice(0, 4)

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section py-5 bg-light">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <h1 className="display-4 fw-bold mb-4">Welcome to FadoMart</h1>
              <p className="lead mb-4">
                Discover amazing products at unbeatable prices. Shop with confidence and enjoy a seamless shopping experience.
              </p>
              <Button variant="primary" size="lg" as={Link} to="/products">
                Shop Now <FaArrowRight className="ms-2" />
              </Button>
            </Col>
            <Col md={6}>
              <img
                src="/images/hero-banner.jpg"
                alt="Shopping"
                className="img-fluid rounded shadow"
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* Categories Section */}
      <section className="categories-section py-5">
        <Container>
          <h2 className="text-center mb-4">Shop by Category</h2>
          <Row>
            {categories.map((category) => (
              <Col key={category.id} xs={6} md={3} className="mb-4">
                <Card className="h-100 category-card">
                  <Card.Img
                    variant="top"
                    src={category.image || '/images/category-placeholder.jpg'}
                    alt={category.name}
                  />
                  <Card.Body className="text-center">
                    <Card.Title>{category.name}</Card.Title>
                    <Button
                      variant="outline-primary"
                      as={Link}
                      to={`/categories/${category.id}`}
                    >
                      View Products
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Featured Products Section */}
      <section className="featured-products py-5 bg-light">
        <Container>
          <h2 className="text-center mb-4">Featured Products</h2>
          <Row>
            {featuredProducts.map((product) => (
              <Col key={product.id} xs={12} sm={6} md={3} className="mb-4">
                <Card className="h-100 product-card">
                  <Card.Img
                    variant="top"
                    src={product.image || '/images/product-placeholder.jpg'}
                    alt={product.name}
                  />
                  <Card.Body>
                    <Card.Title>{product.name}</Card.Title>
                    <Card.Text className="text-muted">
                      ${product.price.toFixed(2)}
                    </Card.Text>
                    <Button
                      variant="primary"
                      as={Link}
                      to={`/products/${product.id}`}
                    >
                      View Details
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section py-5">
        <Container>
          <Row className="justify-content-center text-center">
            <Col md={8}>
              <h2 className="mb-4">Ready to Start Shopping?</h2>
              <p className="lead mb-4">
                Join thousands of satisfied customers who trust FadoMart for their shopping needs.
              </p>
              <Button
                variant="success"
                size="lg"
                as={Link}
                to="/products"
                className="me-3"
              >
                Browse Products
              </Button>
              <Button
                variant="outline-primary"
                size="lg"
                as={Link}
                to="/categories"
              >
                Explore Categories
              </Button>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  )
}

export default HomePage 