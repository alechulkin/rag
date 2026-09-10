import { useAuth } from "../auth/useAuth";

export function HomePage() {
  const { user, loading, error, login, logout } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <h1>RAG Knowledge Assistant</h1>
        <p>Restoring session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">Workspace context required after login</p>
          <h1>RAG Knowledge Assistant</h1>
          <p className="lede">
            Sign in with your organization identity provider to open the permission-aware
            knowledge assistant.
          </p>
        </header>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <button type="button" className="button-primary" onClick={() => void login()}>
          Sign in with OIDC
        </button>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Signed in</p>
        <h1>RAG Knowledge Assistant</h1>
        <p className="lede">
          Authenticated as {user.profile.email ?? user.profile.preferred_username ?? user.profile.sub}
        </p>
      </header>
      <p className="meta">Workspace list arrives in task 8.2.</p>
      <button type="button" className="button-secondary" onClick={() => void logout()}>
        Sign out
      </button>
    </main>
  );
}
