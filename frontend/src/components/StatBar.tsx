import { Box, Typography, LinearProgress } from '@mui/material';

export default function StatBar({ label, value, max=200 }: {label:string; value:number; max?:number}) {
  const pct = Math.min(100, Math.round((value/max)*100));
  return (
    <Box sx={{ mb:1 }}>
      <Box sx={{ display:'flex', justifyContent:'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight:600 }}>{label}</Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={pct} />
    </Box>
  )
}
