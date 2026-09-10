export const oidcConfig = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8081/realms/rag",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "rag-spa",
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
} as const;

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
