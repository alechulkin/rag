import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("./auth/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    handleCallback: vi.fn(),
  }),
}));

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

describe("App shell", () => {
  it("renders signed-out landing with OIDC CTA", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "RAG Knowledge Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with OIDC" })).toBeInTheDocument();
  });
});
