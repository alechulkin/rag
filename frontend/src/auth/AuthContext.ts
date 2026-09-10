import type { User } from "oidc-client-ts";
import { createContext } from "react";

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  handleCallback: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);
