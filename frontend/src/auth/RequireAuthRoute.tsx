import { useAuth } from './AuthProvider';
import {type ReactNode, useEffect, useState} from "react";

export default function RequireAuthRoute({ children }: { children: ReactNode }) {
  const { authed, ensureAuthed } = useAuth();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = authed ? true : await ensureAuthed();
      if (mounted) setOk(res);
    })();
    return () => { mounted = false; };
  }, [authed, ensureAuthed]);

  if (ok === null) return null;
  return ok ? <>{children}</> : null;
}
