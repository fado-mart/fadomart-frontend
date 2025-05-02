import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Skeleton,
  Card,
  CardContent,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  People as PeopleIcon,
  ShoppingCart as OrderIcon,
  AttachMoney as RevenueIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getProducts,
  getAllUsers,
  getOrders,
} from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon, color, onClick }) => (
  <Paper 
    sx={{ 
      p: 3, 
      height: '100%',
      background: `linear-gradient(45deg, ${color} 30%, ${color}90 90%)`,
      color: 'white',
      transition: 'transform 0.2s',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': {
        transform: onClick ? 'scale(1.02)' : 'none',
      }
    }}
    onClick={onClick}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box sx={{ mr: 2, color: 'white' }}>{icon}</Box>
      <Typography variant="h6" sx={{ color: 'white' }}>
        {title}
      </Typography>
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
      {value}
    </Typography>
  </Paper>
);

const LoadingSkeleton = () => (
  <Grid container spacing={3}>
    {[1, 2, 3, 4].map((item) => (
      <Grid item xs={12} sm={6} md={3} key={item}>
        <Skeleton variant="rectangular" height={120} />
      </Grid>
    ))}
  </Grid>
);

const Overview = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    recentUsers: [],
    revenueData: [],
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, usersRes, ordersRes] = await Promise.all([
        getProducts(),
        getAllUsers(),
        getOrders(),
      ]);

      const ordersArray = Array.isArray(ordersRes.data?.orders) 
        ? ordersRes.data.orders 
        : Array.isArray(ordersRes.data?.data?.orders)
          ? ordersRes.data.data.orders
          : Array.isArray(ordersRes.data)
            ? ordersRes.data
            : [];

      let totalRevenue = 0;
      const paidOrders = ordersArray.filter(order => 
        order.status === 'Paid' || 
        order.status === 'paid' || 
        order.status === 'PAID' ||
        order.paymentStatus === 'Paid' ||
        order.paymentStatus === 'paid' ||
        order.paymentStatus === 'PAID'
      );

      totalRevenue = paidOrders.reduce((sum, order) => {
        const orderTotal = 
          typeof order.totalPrice === 'number' ? order.totalPrice :
          typeof order.totalPrice === 'string' ? parseFloat(order.totalPrice) :
          typeof order.price === 'number' ? order.price :
          typeof order.price === 'string' ? parseFloat(order.price) :
          0;
        return sum + orderTotal;
      }, 0);

      // Generate revenue data for chart
      const revenueData = paidOrders
        .map(order => ({
          date: new Date(order.createdAt).toLocaleDateString(),
          revenue: typeof order.totalPrice === 'number' ? order.totalPrice :
                  typeof order.totalPrice === 'string' ? parseFloat(order.totalPrice) :
                  typeof order.price === 'number' ? order.price :
                  typeof order.price === 'string' ? parseFloat(order.price) : 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setStats({
        totalProducts: Array.isArray(productsRes.data) ? productsRes.data.length : 0,
        totalUsers: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
        totalOrders: ordersArray.length,
        totalRevenue,
        recentUsers: Array.isArray(usersRes.data) ? usersRes.data.slice(0, 5) : [],
        revenueData,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatClick = (type) => {
    switch (type) {
      case 'products':
        navigate('/admin/products');
        break;
      case 'users':
        navigate('/admin/users');
        break;
      case 'orders':
        navigate('/admin/orders');
        break;
      default:
        break;
    }
  };

  if (loading && !lastUpdated) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <LoadingSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 'bold',
          color: theme.palette.primary.main,
        }}>
          Dashboard Overview
        </Typography>
        <IconButton onClick={fetchData} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {lastUpdated && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Typography>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<InventoryIcon fontSize="large" />}
            color={theme.palette.primary.main}
            onClick={() => handleStatClick('products')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PeopleIcon fontSize="large" />}
            color={theme.palette.success.main}
            onClick={() => handleStatClick('users')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<OrderIcon fontSize="large" />}
            color={theme.palette.info.main}
            onClick={() => handleStatClick('orders')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`GH₵${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<RevenueIcon fontSize="large" />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* Revenue Chart */}
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
            Revenue Trend
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Users */}
      <Card sx={{ boxShadow: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: theme.palette.primary.main }}>
            Recent Users
          </Typography>
          <List>
            {stats.recentUsers.map((user) => (
              <ListItem 
                key={user._id} 
                component="div"
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  }
                }}
              >
                <ListItemText
                  primary={user.userName}
                  secondary={`Joined: ${new Date(user.createdAt).toLocaleDateString()}`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Overview; 