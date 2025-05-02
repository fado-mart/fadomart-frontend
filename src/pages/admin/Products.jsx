import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from '../../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    price: '',
    category: '',
    quantity: '',
    image: null,
    stockStatus: 'In Stock'
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (err) {
      setError('Failed to fetch categories');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product = null) => {
    setSelectedProduct(product);
    if (product) {
      setFormData({
        productName: product.productName || product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        quantity: product.quantity,
        image: null,
        stockStatus: product.stockStatus || 'In Stock'
      });
    } else {
      setFormData({
        productName: '',
        description: '',
        price: '',
        category: '',
        quantity: '',
        image: null,
        stockStatus: 'In Stock'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
    setFormData({
      productName: '',
      description: '',
      price: '',
      category: '',
      quantity: '',
      image: null,
      stockStatus: 'In Stock'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    setFormData(prev => ({
      ...prev,
      image: e.target.files[0]
    }));
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      category: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Create product data object
      const productData = {};
      
      // For updates, start with existing product data
      if (selectedProduct) {
        // Always include required fields from existing product
        productData.productName = selectedProduct.productName || selectedProduct.name;
        productData.description = selectedProduct.description;
        productData.price = selectedProduct.price;
        productData.category = selectedProduct.category?._id || selectedProduct.category;
        productData.quantity = selectedProduct.quantity;
        productData.stockStatus = selectedProduct.stockStatus || 'In Stock';
        
        // Update with form values if they exist
        if (formData.productName) productData.productName = formData.productName.trim();
        if (formData.description) productData.description = formData.description.trim();
        if (formData.price) productData.price = parseFloat(formData.price);
        if (formData.category) productData.category = formData.category;
        if (formData.quantity) productData.quantity = parseInt(formData.quantity);
        if (formData.stockStatus) productData.stockStatus = formData.stockStatus;
      } else {
        // For new products, only include fields that have values
        if (formData.productName) productData.productName = formData.productName.trim();
        if (formData.description) productData.description = formData.description.trim();
        if (formData.price) productData.price = parseFloat(formData.price);
        if (formData.category) productData.category = formData.category;
        if (formData.quantity) productData.quantity = parseInt(formData.quantity);
        if (formData.stockStatus) productData.stockStatus = formData.stockStatus;
      }

      // Handle image validation and inclusion
      if (formData.image) {
        // Validate image file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(formData.image.type)) {
          setError('Invalid image format. Please upload a JPEG, PNG, or WebP image.');
          return;
        }
        
        // Validate image size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (formData.image.size > maxSize) {
          setError('Image size exceeds 5MB limit');
          return;
        }
        
        productData.image = formData.image;
      }
      
      if (selectedProduct) {
        // For updates, ensure we have the product ID
        const productId = selectedProduct._id || selectedProduct.id;
        if (!productId) {
          setError('Invalid product ID');
          return;
        }
        await updateProduct(productId, productData);
        setError('Product updated successfully');
      } else {
        // For new products, validate required fields
        if (!formData.productName) {
          setError('Product name is required for new products');
          return;
        }
        if (!formData.price) {
          setError('Price is required for new products');
          return;
        }
        if (!formData.category) {
          setError('Category is required for new products');
          return;
        }
        if (!formData.image) {
          setError('Product image is required for new products');
          return;
        }
        await createProduct(productData);
        setError('Product created successfully');
      }
      
      // Reset form and refresh products
      setFormData({
        productName: '',
        description: '',
        price: '',
        category: '',
        quantity: '',
        image: null,
        stockStatus: 'In Stock'
      });
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      if (err.response) {
        const errorData = err.response.data;
        if (err.response.status === 400) {
          if (errorData.field === 'image') {
            setError('Product image is required');
          } else {
            setError(errorData.message || 'Invalid data provided');
          }
        } else if (err.response.status === 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(errorData.message || 'An error occurred');
        }
      } else {
        setError('Failed to submit product. Please try again.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        setLoading(true);
        await deleteProduct(id);
        fetchProducts();
      } catch (err) {
        setError('Failed to delete product');
        console.error('Error deleting product:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const selectCategory = (categoryId, categoryName) => {
    // Make sure we have a valid ID
    if (!categoryId && categoryId !== 0) {
      console.error('Invalid category ID:', categoryId);
      // Try to find the category by name as a fallback
      const foundCategory = categories.find(c => c.name === categoryName);
      if (foundCategory) {
        const id = foundCategory._id || foundCategory.id;
        console.log('Found category by name:', foundCategory);
        console.log('Using ID:', id);
        setFormData(prev => ({
          ...prev,
          category: id
        }));
      } else {
        console.error('Could not find category by name either');
      }
      return;
    }
    
    console.log('Category selected manually:', categoryId, categoryName);
    setFormData(prev => ({
      ...prev,
      category: categoryId
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Products Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Product
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Stock Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id || product.id}>
                <TableCell>
                  <img
                    src={product.image}
                    alt={product.productName || product.name}
                    style={{ width: 50, height: 50, objectFit: 'cover' }}
                  />
                </TableCell>
                <TableCell>{product.productName || product.name}</TableCell>
                <TableCell>
                  {typeof product.category === 'object' 
                    ? product.category.name || product.category._id 
                    : product.category}
                </TableCell>
                <TableCell>${product.price}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>
                  <Chip 
                    label={product.stockStatus || 'In Stock'} 
                    color={product.stockStatus === 'In Stock' ? 'success' : 'error'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(product)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(product._id || product.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Category <span style={{ color: 'red' }}>*</span>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {categories.length > 0 ? (
                      categories.map(category => {
                        const categoryId = category._id || category.id;
                        const isSelected = formData.category === categoryId;
                        
                        return (
                          <Button
                            key={categoryId}
                            variant={isSelected ? "contained" : "outlined"}
                            color={isSelected ? "primary" : "secondary"}
                            onClick={() => selectCategory(categoryId, category.name)}
                            sx={{ mb: 1, textTransform: 'none' }}
                          >
                            {category.name}
                          </Button>
                        );
                      })
                    ) : (
                      <Typography color="error">No categories available. Please create categories first.</Typography>
                    )}
                  </Box>
                  {error && error.includes('category') && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                      {error}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Stock Status</InputLabel>
                  <Select
                    name="stockStatus"
                    value={formData.stockStatus}
                    onChange={handleInputChange}
                    label="Stock Status"
                  >
                    <MenuItem value="In Stock">In Stock</MenuItem>
                    <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Product Image
                  </Typography>
                  {selectedProduct && !formData.image && (
                    <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.productName || selectedProduct.name}
                        style={{ 
                          width: 200, 
                          height: 200, 
                          objectFit: 'cover',
                          borderRadius: 4
                        }}
                      />
                      <IconButton
                        onClick={handleRemoveImage}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          }
                        }}
                      >
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </Box>
                  )}
                  {formData.image && (
                    <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                      <img
                        src={URL.createObjectURL(formData.image)}
                        alt="Preview"
                        style={{ 
                          width: 200, 
                          height: 200, 
                          objectFit: 'cover',
                          borderRadius: 4
                        }}
                      />
                      <IconButton
                        onClick={handleRemoveImage}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          }
                        }}
                      >
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<ImageIcon />}
                    sx={{ mt: 1 }}
                  >
                    {formData.image ? 'Change Image' : 'Upload Image'}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Products; 