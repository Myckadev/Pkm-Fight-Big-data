import * as React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useMeQuery } from '../api/auth';
import LoginDialog from './LoginDialog';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const { data, isLoading, isError, refetch } = useMeQuery(undefined, { skip: !token });

  React.useEffect(() => {
    if (!token) setOpen(true);
  }, [token]);

  React.useEffect(() => {
    if (token && !isLoading && isError) {
      // token invalide
      localStorage.removeItem('authToken');
      setOpen(true);
    }
  }, [token, isLoading, isError]);

  if (token && isLoading) {
    return (
      <Box sx={{ flex:1, display:'grid', placeItems:'center', py:6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!token || !data) {
    return (
      <>
        <LoginDialog
          open={open}
          onClose={() => setOpen(false)}
          onSuccess={() => { setOpen(false); refetch(); }}
        />
      </>
    );
  }

  return <>{children}</>;
}
