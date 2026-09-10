import { UserManager } from "oidc-client-ts";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { oidcConfig } from "./oidcConfig";

export function AuthProvider({ children }: { children: ReactNode }) {
  const userManager = useMemo(() => new UserManager(oidcConfig), []);
  const [user, setUser] = useState<Awaited<ReturnType<UserManager["getUser"]>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    userManager
      .getUser()
      .then((current) => {
        if (!cancelled) {
          setUser(current && !current.expired ? current : null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to restore session");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userManager]);

  const login = useCallback(async () => {
    setError(null);
    await userManager.signinRedirect();
  }, [userManager]);

  const logout = useCallback(async () => {
    setError(null);
    await userManager.signoutRedirect();
  }, [userManager]);

  const handleCallback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = await userManager.signinRedirectCallback();
      setUser(current);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OIDC callback failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userManager]);

  const value = useMemo(
    () => ({ user, loading, error, login, logout, handleCallback }),
    [user, loading, error, login, logout, handleCallback],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
