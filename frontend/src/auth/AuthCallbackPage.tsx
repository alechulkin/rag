import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function AuthCallbackPage() {
  const { handleCallback, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    handleCallback()
      .then(() => {
        if (!cancelled) {
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        // error surfaced via auth state
      });
    return () => {
      cancelled = true;
    };
  }, [handleCallback, navigate]);

  if (error) {
    return (
      <main className="page">
        <h1>Sign-in failed</h1>
        <p role="alert">{error}</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Completing sign-in…</h1>
      <p>Exchanging authorization code with the identity provider.</p>
    </main>
  );
}
