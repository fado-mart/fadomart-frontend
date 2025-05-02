import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import {
  getSalesReport,
  getInventoryReport,
  getUserActivityReport,
  getProductPerformanceReport,
  getLowStockReport,
} from '../../services/api';

const Reports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reports, setReports] = useState({
    sales: null,
    inventory: null,
    userActivity: null,
    productPerformance: null,
    lowStock: null,
  });

  const fetchReport = async (reportType) => {
    setLoading(true);
    setError(null);
    try {
      let data;
      switch (reportType) {
        case 'sales':
          data = await getSalesReport(startDate, endDate);
          setReports(prev => ({ ...prev, sales: data }));
          break;
        case 'inventory':
          data = await getInventoryReport();
          setReports(prev => ({ ...prev, inventory: data }));
          break;
        case 'userActivity':
          data = await getUserActivityReport(startDate, endDate);
          setReports(prev => ({ ...prev, userActivity: data }));
          break;
        case 'productPerformance':
          data = await getProductPerformanceReport(startDate, endDate);
          setReports(prev => ({ ...prev, productPerformance: data }));
          break;
        case 'lowStock':
          data = await getLowStockReport();
          setReports(prev => ({ ...prev, lowStock: data }));
          break;
        default:
          break;
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const reportTypes = ['sales', 'inventory', 'userActivity', 'productPerformance', 'lowStock'];
    fetchReport(reportTypes[activeTab]);
  }, [activeTab, startDate, endDate]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderDateRangeSelector = () => {
    if (activeTab === 0 || activeTab === 2 || activeTab === 3) {
      return (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item>
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </Box>
      );
    }
    return null;
  };

  const renderSalesReport = () => {
    if (!reports.sales) return null;
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Total Sales</TableCell>
              <TableCell>Total Orders</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>GH₵{reports.sales.totalSales.toFixed(2)}</TableCell>
              <TableCell>{reports.sales.totalOrders}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderInventoryReport = () => {
    if (!reports.inventory) return null;
    
    // Ensure reports.inventory is an array
    const inventoryData = Array.isArray(reports.inventory) ? reports.inventory : [];
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Low Stock Threshold</TableCell>
              <TableCell>Location</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventoryData.length > 0 ? (
              inventoryData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.lowStockThreshold}</TableCell>
                  <TableCell>{item.location}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No inventory data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderUserActivityReport = () => {
    if (!reports.userActivity) return null;
    
    // Ensure reports.userActivity is an array
    const userActivityData = Array.isArray(reports.userActivity) ? reports.userActivity : [];
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Total Orders</TableCell>
              <TableCell>Total Spent</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {userActivityData.length > 0 ? (
              userActivityData.map((user, index) => (
                <TableRow key={index}>
                  <TableCell>{user.userName}</TableCell>
                  <TableCell>{user.totalOrders}</TableCell>
                  <TableCell>GH₵{user.totalSpent.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No user activity data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderProductPerformanceReport = () => {
    if (!reports.productPerformance) return null;
    
    // Ensure reports.productPerformance is an array
    const productData = Array.isArray(reports.productPerformance) ? reports.productPerformance : [];
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Quantity Sold</TableCell>
              <TableCell>Total Sales</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productData.length > 0 ? (
              productData.map((product, index) => (
                <TableRow key={index}>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell>{product.totalQuantitySold}</TableCell>
                  <TableCell>GH₵{product.totalSales.toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No product performance data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderLowStockReport = () => {
    if (!reports.lowStock) return null;
    
    // Ensure reports.lowStock is an array
    const lowStockData = Array.isArray(reports.lowStock) ? reports.lowStock : [];
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Current Stock</TableCell>
              <TableCell>Low Stock Threshold</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lowStockData.length > 0 ? (
              lowStockData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.productName || `Product (${item.productId || 'Unknown'})`}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.lowStockThreshold}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No low stock items found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Sales Report" />
          <Tab label="Inventory Report" />
          <Tab label="User Activity" />
          <Tab label="Product Performance" />
          <Tab label="Low Stock Alert" />
        </Tabs>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderDateRangeSelector()}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {activeTab === 0 && renderSalesReport()}
          {activeTab === 1 && renderInventoryReport()}
          {activeTab === 2 && renderUserActivityReport()}
          {activeTab === 3 && renderProductPerformanceReport()}
          {activeTab === 4 && renderLowStockReport()}
        </Box>
      )}
    </Box>
  );
};

export default Reports; 