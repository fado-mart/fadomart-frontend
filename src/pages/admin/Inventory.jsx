import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon, History as HistoryIcon } from '@mui/icons-material';
import { getProducts } from '../../services/api';
import { getInventoryStatus, updateInventory, getInventoryHistory } from '../../services/api';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inventoryHistory, setInventoryHistory] = useState([]);
  const [formData, setFormData] = useState({
    product: '',
    quantity: '',
    lowStockThreshold: '',
    location: 'Main-Shop'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, inventoryResponse] = await Promise.all([
        getProducts(),
        getInventoryStatus()
      ]);
      
      console.log('Raw Inventory Response:', JSON.stringify(inventoryResponse, null, 2));
      console.log('Raw Products Response:', JSON.stringify(productsResponse, null, 2));
      
      // Ensure we have valid data before setting state
      const productsData = productsResponse?.data || [];
      const inventoryData = Array.isArray(inventoryResponse) ? inventoryResponse : inventoryResponse?.data || [];
      
      console.log('Processed Inventory Data:', JSON.stringify(inventoryData, null, 2));
      console.log('Processed Products Data:', JSON.stringify(productsData, null, 2));
      
      // Map products to a lookup table for easier access
      const productsMap = productsData.reduce((acc, product) => {
        const productId = product.id || product._id;
        acc[productId] = product;
        return acc;
      }, {});
      
      console.log('Products Map:', JSON.stringify(productsMap, null, 2));
      
      // Enrich inventory data with product details
      const enrichedInventory = inventoryData.map(item => {
        const enrichedItem = {
          ...item,
          product: item.product ? {
            ...item.product,
            name: productsMap[item.product.id]?.productName || `Product (${item.product.id})`
          } : null
        };
        console.log('Enriched Item:', JSON.stringify(enrichedItem, null, 2));
        return enrichedItem;
      });
      
      console.log('Final Enriched Inventory:', JSON.stringify(enrichedInventory, null, 2));
      
      setProducts(productsData);
      setInventory(enrichedInventory);
      setError('');
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Failed to fetch inventory data');
      setInventory([]); // Reset inventory state on error
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    setSelectedItem(item);
    if (item && item.product) {
      setFormData({
        product: item.product.id || item.product._id,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        location: item.location
      });
    } else {
      setFormData({
        product: '',
        quantity: '',
        lowStockThreshold: '',
        location: 'Main-Shop'
      });
    }
    setOpenDialog(true);
  };

  const handleOpenHistoryDialog = async (item) => {
    try {
      setLoading(true);
      if (!item.product) {
        setError('No product associated with this inventory item');
        return;
      }

      const productId = item.product.id;
      console.log('Fetching history for product:', productId);
      
      const response = await getInventoryHistory(productId);
      console.log('History Response:', response);
      
      if (Array.isArray(response)) {
        setInventoryHistory(response);
        setOpenHistoryDialog(true);
      } else {
        setError('No history data available');
      }
    } catch (err) {
      console.error('Error fetching inventory history:', err);
      setError('Failed to fetch inventory history');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
    setFormData({
      product: '',
      quantity: '',
      lowStockThreshold: '',
      location: 'Main-Shop'
    });
  };

  const handleCloseHistoryDialog = () => {
    setOpenHistoryDialog(false);
    setInventoryHistory([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate required fields
      if (!formData.product || !formData.quantity || !formData.lowStockThreshold || !formData.location) {
        setError('All fields are required');
        return;
      }

      // Convert numeric fields and format the update data
      const updateData = {
        product: formData.product, // Send the product ID directly
        quantity: parseInt(formData.quantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold),
        location: formData.location
      };

      console.log('Updating inventory with data:', updateData);
      
      await updateInventory(updateData);
      setError('Inventory updated successfully');
      handleCloseDialog();
      fetchData(); // Refresh the inventory data
    } catch (err) {
      console.error('Error updating inventory:', err);
      if (err.response) {
        const errorData = err.response.data;
        if (err.response.status === 400) {
          setError(errorData.message || 'Invalid data provided');
        } else if (err.response.status === 500) {
          setError('Server error. Please try again later.');
        } else {
          setError(errorData.message || 'An error occurred');
        }
      } else {
        setError('Failed to update inventory. Please try again.');
      }
    }
  };

  const getStockStatus = (quantity, threshold) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: 'error' };
    if (quantity <= threshold) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Inventory Management</Typography>
      </Box>

      {error && (
        <Alert severity={error.includes('successfully') ? 'success' : 'error'} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Low Stock Threshold</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory && inventory.length > 0 ? (
              inventory.map((item) => {
                const status = getStockStatus(item.quantity, item.lowStockThreshold);
                const productName = item.product 
                  ? (item.product.name || `Product (${item.product.id})`)
                  : 'Unknown Product';
                
                return (
                  <TableRow key={item.id || item._id}>
                    <TableCell>{productName}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.lowStockThreshold}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={() => handleOpenDialog(item)}
                        disabled={!item.product}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleOpenHistoryDialog(item)}
                        disabled={!item.product}
                      >
                        <HistoryIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : (
                    <Typography>No inventory data available</Typography>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Update Inventory Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Update Inventory' : 'Add Inventory Item'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Product</InputLabel>
              <Select
                name="product"
                value={formData.product}
                onChange={handleInputChange}
                label="Product"
                required
              >
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Quantity"
              name="quantity"
              type="number"
              value={formData.quantity}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Low Stock Threshold"
              name="lowStockThreshold"
              type="number"
              value={formData.lowStockThreshold}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                label="Location"
                required
              >
                <MenuItem value="Main-Shop">Main Shop</MenuItem>
                <MenuItem value="Warehouse">Warehouse</MenuItem>
                <MenuItem value="Store-1">Store 1</MenuItem>
                <MenuItem value="Store-2">Store 2</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedItem ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Inventory History Dialog */}
      <Dialog open={openHistoryDialog} onClose={handleCloseHistoryDialog} maxWidth="md" fullWidth>
        <DialogTitle>Inventory History</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : inventoryHistory && inventoryHistory.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inventoryHistory.map((history) => (
                    <TableRow key={history._id || history.id}>
                      <TableCell>
                        {history.lastUpdated ? new Date(history.lastUpdated).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{history.quantity}</TableCell>
                      <TableCell>{history.location}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStockStatus(history.quantity, history.lowStockThreshold).label}
                          color={getStockStatus(history.quantity, history.lowStockThreshold).color}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ p: 3, textAlign: 'center' }}>
              No history data available
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory; 