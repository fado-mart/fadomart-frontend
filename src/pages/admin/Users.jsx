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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, PhotoCamera } from '@mui/icons-material';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    phone: '',
    address: '',
    role: 'User',
    password: '',
    avatar: null,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    setSelectedUser(user);
    if (user) {
      setFormData({
        userName: user.userName || user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        role: user.role || 'User',
        password: '', // Don't pre-fill password
        avatar: user.avatar || null,
      });
    } else {
      setFormData({
        userName: '',
        email: '',
        phone: '',
        address: '',
        role: 'User',
        password: '',
        avatar: null,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormData({
      userName: '',
      email: '',
      phone: '',
      address: '',
      role: 'User',
      password: '',
      avatar: null,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'phone' ? (value ? Number(value) : '') : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        avatar: file
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (selectedUser) {
        // Update existing user - exclude email from update data
        const { email, password, ...updateData } = formData;
        
        // Format the update data according to backend requirements
        const formattedData = {
          userName: updateData.userName,
          phone: updateData.phone ? Number(updateData.phone) : undefined,
          address: updateData.address,
          role: updateData.role,
          avatar: updateData.avatar
        };

        // Create FormData for file upload
        const formDataToSend = new FormData();
        Object.keys(formattedData).forEach(key => {
          if (formattedData[key] !== undefined && formattedData[key] !== null) {
            if (key === 'avatar' && formattedData[key] instanceof File) {
              formDataToSend.append('images', formattedData[key]);
            } else {
              formDataToSend.append(key, formattedData[key]);
            }
          }
        });

        await updateUser(selectedUser._id || selectedUser.id, formDataToSend);
        setError('User updated successfully');
      } else {
        // Create new user - include all fields
        const createData = {
          userName: formData.userName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone ? Number(formData.phone) : undefined,
          address: formData.address,
          role: formData.role,
          avatar: formData.avatar
        };

        // Create FormData for file upload
        const formDataToSend = new FormData();
        Object.keys(createData).forEach(key => {
          if (createData[key] !== undefined && createData[key] !== null) {
            if (key === 'avatar' && createData[key] instanceof File) {
              formDataToSend.append('images', createData[key]);
            } else {
              formDataToSend.append(key, createData[key]);
            }
          }
        });

        await createUser(formDataToSend);
        setError('User created successfully');
      }
      handleCloseDialog();
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        setLoading(true);
        await deleteUser(userId);
        setError('User deleted successfully');
        fetchUsers();
      } catch (err) {
        setError('Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
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
        <Typography variant="h4">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user._id}>
                <TableCell>{user.userName || user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role || 'User'} 
                    color={user.role === 'Admin' ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user._id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{selectedUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Avatar
              src={formData.avatar ? URL.createObjectURL(formData.avatar) : selectedUser?.avatar}
              sx={{ width: 100, height: 100 }}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="avatar-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="avatar-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<PhotoCamera />}
              >
                Upload Avatar
              </Button>
            </label>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            name="userName"
            label="Full Name"
            type="text"
            fullWidth
            value={formData.userName}
            onChange={handleInputChange}
          />
          {!selectedUser && (
            <>
              <TextField
                margin="dense"
                name="email"
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <TextField
                margin="dense"
                name="password"
                label="Password"
                type="password"
                fullWidth
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </>
          )}
          <TextField
            margin="dense"
            name="phone"
            label="Phone"
            type="number"
            fullWidth
            value={formData.phone}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="address"
            label="Address"
            type="text"
            fullWidth
            value={formData.address}
            onChange={handleInputChange}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              label="Role"
              onChange={handleInputChange}
            >
              <MenuItem value="User">User</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users; 