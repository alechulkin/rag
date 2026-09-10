import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";

const login = vi.fn();
const logout = vi.fn();

vi.mock("../auth/useAuth", () => ({
  useAuth: () => mockAuth,
}));

let mockAuth = {
  user: null as null | { profile: { email?: string } },
  loading: false,
  error: null as string | null,
  login,
  logout,
  handleCallback: vi.fn(),
};

describe("HomePage", () => {
  it("shows loading state", () => {
    mockAuth = { ...mockAuth, loading: true, user: null, error: null };
    render(<HomePage />);
    expect(screen.getByText("Restoring session…")).toBeInTheDocument();
  });

  it("shows OIDC CTA when signed out", () => {
    mockAuth = { ...mockAuth, loading: false, user: null, error: null };
    render(<HomePage />);
    expect(screen.getByRole("button", { name: "Sign in with OIDC" })).toBeInTheDocument();
  });

  it("shows identity when signed in", () => {
    mockAuth = {
      ...mockAuth,
      loading: false,
      user: { profile: { email: "demo.admin@example.com" } },
      error: null,
    };
    render(<HomePage />);
    expect(screen.getByText(/demo\.admin@example\.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
