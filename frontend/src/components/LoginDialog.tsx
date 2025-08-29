import * as React from 'react';
import {
  Dialog, DialogContent, TextField, Alert, Stack, Typography, Box, IconButton,
  InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockIcon from '@mui/icons-material/Lock';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PokeButton from './PokeButton';
import { useLoginMutation, useRegisterMutation } from '../api/auth';

type Props = { open: boolean; onClose: () => void; onSuccess?: () => void };

export default function LoginDialog({ open, onClose, onSuccess }: Props) {
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');

  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();

  const busy = loginState.isLoading || registerState.isLoading;
  const err =
    (loginState.error as any)?.data?.detail ||
    (registerState.error as any)?.data?.detail;

  const handleSubmit = async () => {
    try {
      if (mode === 'login') {
        const res = await login({ email, password }).unwrap();
        localStorage.setItem('authToken', res.access_token);
      } else {
        const res = await register({ email, password, username: username || undefined }).unwrap();
        localStorage.setItem('authToken', res.access_token);
      }
      onSuccess?.();
      onClose();
    } catch {
      /* handled by err */
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) handleSubmit();
  };

  // Styles “coque pokédex”
  const shell = {
    background: 'linear-gradient(145deg, #ef5350 0%, #c62828 100%)',
    borderRadius: 18,
    p: 1.5,
    border: '1px solid #8e0000',
    boxShadow: '0 16px 36px rgba(0,0,0,.38), inset 0 2px 0 rgba(255,255,255,.25)',
    width: 440,
    maxWidth: 'calc(100vw - 24px)',
  } as const;

  const screen = {
    background: 'linear-gradient(180deg,#fdfdfd,#f4f6fb)',
    borderRadius: 14,
    border: '2px solid #b0bec5',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9), 0 8px 20px rgba(0,0,0,.18)',
    p: 2,
  } as const;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: { background: 'transparent', boxShadow: 'none', overflow: 'visible' },
      }}
    >
      <Box sx={shell}>
        {/* Barre haute */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
            borderRadius: 2,
            color: '#fff',
            background: 'linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.12))',
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', background: '#4caf50', boxShadow: '0 0 8px #4caf50' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#ffeb3b' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#e53935' }} />
            <Typography
              sx={{
                ml: 1,
                fontWeight: 900,
                letterSpacing: .5,
                textShadow: '0 1px 0 rgba(0,0,0,.35)',
              }}
            >
              Pokédex — Connexion
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }} disabled={busy}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* “Écran” */}
        <Box sx={{ mt: 1 }}>
          <Box sx={screen}>
            {/* Switch login/register façon cartouche */}
            <Stack direction="row" spacing={1.25} justifyContent="center" sx={{ mb: 1.5 }}>
              <PokeButton
                pokestyle={mode === 'login' ? 'solid' : 'ghost'}
                colorHex="#6C5CE7"
                ghostColor="#3D4350"
                size="small"
                onClick={() => setMode('login')}
              >
                Se connecter
              </PokeButton>
              <PokeButton
                pokestyle={mode === 'register' ? 'solid' : 'ghost'}
                colorHex="#1E88E5"
                ghostColor="#3D4350"
                size="small"
                onClick={() => setMode('register')}
              >
                Créer un compte
              </PokeButton>
            </Stack>

            {err && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {String(err)}
              </Alert>
            )}

            <Stack spacing={1.25}>
              {mode === 'register' && (
                <TextField
                  label="Pseudo (optionnel)"
                  size="small"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onEnter}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              <TextField
                autoFocus
                label="Email"
                type="email"
                size="small"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onEnter}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                label="Mot de passe"
                type="password"
                size="small"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onEnter}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
              <PokeButton pokestyle="ghost" ghostColor="#3D4350" onClick={onClose} disabled={busy}>
                Annuler
              </PokeButton>
              <PokeButton
                pokestyle="solid"
                colorHex={mode === 'login' ? '#6C5CE7' : '#1E88E5'}
                onClick={handleSubmit}
                disabled={busy || !email || !password}
              >
                {mode === 'login' ? 'Connexion' : 'Créer'}
              </PokeButton>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Astuce : appuie sur Entrée pour valider
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Hack pour que le Dialog gère correctement le focus/scroll interne */}
      <DialogContent sx={{ p: 0, display: 'none' }} />
    </Dialog>
  );
}
