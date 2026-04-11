import { Component, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutlined, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <ErrorOutlined sx={{ fontSize: 48, color: 'error.main', opacity: 0.7 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {this.props.fallbackTitle ?? 'Une erreur est survenue'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: '0.78rem',
              maxWidth: 400,
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={this.handleReset}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Réessayer
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
