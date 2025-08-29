import React from 'react';
import { useMeQuery } from '../api/auth';
import LoginDialog from '../components/LoginDialog';

type Ctx = {
  authed: boolean;
  ensureAuthed: () => Promise<boolean>;
  refetchMe: () => void;
};

const AuthCtx = React.createContext<Ctx | null>(null);

export function useAuth() {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const { data: me, refetch, isFetching } = useMeQuery(undefined, { skip: !token });
  const authed = Boolean(token && me);

  // Gestion d’une modale unique + promesse en attente
  const [open, setOpen] = React.useState(false);
  const resolverRef = React.useRef<((ok: boolean) => void) | null>(null);
  const pendingRef = React.useRef<Promise<boolean> | null>(null);

  const closeWith = (ok: boolean) => {
    setOpen(false);
    resolverRef.current?.(ok);
    resolverRef.current = null;
    pendingRef.current = null;
  };

  const ensureAuthed = React.useCallback((): Promise<boolean> => {
    if (authed) return Promise.resolve(true);
    if (pendingRef.current) return pendingRef.current;
    setOpen(true);
    pendingRef.current = new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
    return pendingRef.current;
  }, [authed]);

  const onSuccess = async () => {
    await refetch();
    closeWith(true);
  };

  const onClose = () => closeWith(false);

  return (
    <AuthCtx.Provider value={{ authed, ensureAuthed, refetchMe: refetch }}>
      {children}
      <LoginDialog open={open} onClose={onClose} onSuccess={onSuccess} />
    </AuthCtx.Provider>
  );
}
