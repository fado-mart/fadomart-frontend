import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // You can also log the error to an error reporting service here
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <Paper elevation={3} sx={{ p: 4, maxWidth: 600, textAlign: 'center' }}>
            <Typography variant="h4" color="error" gutterBottom>
              Oops! Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              We're sorry, but something went wrong. Our team has been notified and we're working to fix it.
            </Typography>
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 2, textAlign: 'left' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Error details:
                </Typography>
                <Typography variant="body2" component="pre" sx={{ 
                  p: 2, 
                  bgcolor: 'background.default', 
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 200
                }}>
                  {this.state.error?.toString()}
                </Typography>
              </Box>
            )}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => window.location.reload()}
              sx={{ mt: 3 }}
            >
              Refresh Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 