import * as React from 'react';
import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';
import { alpha, darken, lighten } from '@mui/material/styles';

type PokeButtonProps = Omit<ButtonProps, 'variant' | 'color'> & {
  pokestyle?: 'solid' | 'ghost';
  /** Couleur de base pour le solid */
  colorHex?: string;
  /** Couleur du texte pour ghost (utile sur fond clair) */
  ghostColor?: string;
};

export default React.forwardRef<HTMLButtonElement, PokeButtonProps>(function PokeButton(
  { pokestyle = 'solid', colorHex = '#7E3FF2', ghostColor = '#3D4350', sx, children, ...rest },
  ref
) {
  const solid = {
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    px: 2.25,
    py: 0.9,
    borderRadius: 12,
    border: `1px solid ${darken(colorHex, 0.25)}`,
    background: `linear-gradient(180deg, ${lighten(colorHex, 0.08)} 0%, ${colorHex} 100%)`,
    boxShadow: `0 6px 14px ${alpha('#000', .25)}, inset 0 1px 0 ${alpha('#fff', .55)}`,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      background: 'linear-gradient(180deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 55%)',
      pointerEvents: 'none',
    },
    '&:hover': {
      background: `linear-gradient(180deg, ${lighten(colorHex, 0.16)} 0%, ${darken(colorHex, 0.05)} 100%)`,
      boxShadow: `0 10px 18px ${alpha('#000', .3)}, inset 0 1px 0 ${alpha('#fff', .65)}`,
      transform: 'translateY(-1px)',
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: `inset 0 2px 6px ${alpha('#000', .25)}`,
    },
    '&.Mui-disabled': {
      color: alpha('#fff', .75),
      background: `linear-gradient(180deg, ${alpha(colorHex, .55)} 0%, ${alpha(colorHex, .65)} 100%)`,
      borderColor: alpha('#000', .15),
      boxShadow: 'none',
      opacity: .7,
    },
  } as const;

  const ghost = {
    color: ghostColor,                         // ← lisible sur fond clair
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    px: 2.25,
    py: 0.9,
    borderRadius: 12,
    border: `1.5px solid ${alpha(ghostColor, .6)}`,
    background: 'linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.03))',
    boxShadow: `0 6px 14px ${alpha('#000', .12)}, inset 0 1px 0 ${alpha('#fff', .5)}`,
    '&:hover': {
      background: 'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.05))',
      transform: 'translateY(-1px)',
    },
    '&:active': { transform: 'translateY(0)' },
    '&.Mui-disabled': {
      color: alpha(ghostColor, .6),
      borderColor: alpha(ghostColor, .25),
      background: 'linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.02))',
      boxShadow: 'none',
      opacity: .8,
    },
  } as const;

  return (
    <Button
      ref={ref}
      variant="text"
      color="inherit"
      disableElevation
      sx={[{ fontWeight: 900, borderRadius: 12, minHeight: 36 }, pokestyle === 'solid' ? solid : ghost, sx]}
      {...rest}
    >
      {children}
    </Button>
  );
});
