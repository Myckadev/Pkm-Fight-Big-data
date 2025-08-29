import { Box, Typography } from '@mui/material';

export default function Teambuilder() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Teambuilder</Typography>
      <Typography color="text.secondary">À venir… (accès réservé aux utilisateurs connectés)</Typography>
    </Box>
  );
}