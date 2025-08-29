import React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

type PokedexShellProps = {
  title?: string;
  rightTopBar?: React.ReactNode;
  /** Contenu de l’écran gauche (non sticky). */
  left: React.ReactNode;
  /** Contenu de l’écran droit (vous pouvez y mettre un header sticky). */
  right: React.ReactNode;
};

export default function PokedexShell({
                                       title = 'Poké-Lakehouse • Pokédex',
                                       rightTopBar,
                                       left,
                                       right,
                                     }: PokedexShellProps) {
  const shellSx = {
    background: 'linear-gradient(145deg, #ef5350 0%, #c62828 100%)',
    borderRadius: 10,
    p: 1.5,
    boxShadow: '0 12px 30px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.25)',
    border: '1px solid #8e0000',
    height: '100%',          // <-- prend tout l’espace disponible
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,            // <-- autorise la contraction (sinon overflow)
  } as const;

  const screenSx = {
    background: 'linear-gradient(180deg,#fdfdfd,#f4f6fb)',
    borderRadius: 12,
    border: '2px solid #b0bec5',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 6px 18px rgba(0,0,0,.18)',
    minHeight: 0,            // <-- obligatoire avec flex/grid
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',      // <-- on masque l’overflow et on ajoute un scroll interne
  } as const;

  return (
    <Container
      sx={{
        height: '100dvh',     // <-- hauteur viewport robuste (mobile friendly)
        overflow: 'hidden',   // <-- pas de scroll global
        display: 'flex',
        alignItems: 'stretch',
        py: 2,
        maxWidth: 'lg !important',
        minHeight: 0,
      }}
    >
      <Box sx={shellSx}>
        {/* Barre haute */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1.1,
            borderRadius: 4,
            color: '#fff',
            background: 'linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.12))',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 8px #4caf50' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#ffeb3b' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#e53935' }} />
            <Typography sx={{ ml: 1, fontWeight: 900, letterSpacing: .5 }}>{title}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {rightTopBar}
          </Stack>
        </Box>

        {/* Les deux écrans */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
            gap: 1.5,
            mt: 1,
            flex: 1,          // <-- occupe le restant
            minHeight: 0,     // <-- autorise la contraction
          }}
        >
          {/* Écran gauche : scroll interne dédié */}
          <Box sx={screenSx}>
            <Box sx={{ p: 2, flex: 1, overflow: 'auto', minHeight: 0 }}>
              {left}
            </Box>
          </Box>

          {/* Écran droit : scroll interne dédié */}
          <Box sx={screenSx}>
            <Box sx={{ p: 0, flex: 1, overflow: 'auto', minHeight: 0 }}>
              {right}
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
