import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuth } from "@/auth/useAuth";
import type { PublicSession } from "@/infrastructure/auth/serverSession";
import { StartAuthProvider } from "./StartAuthProvider";

function Profile() {
  const { user, organization } = useAuth();
  return <p>{user?.email} — {organization?.name}</p>;
}

const session = (name: string): PublicSession => ({
  provider: "keycloak", authenticated: true,
  user: { id: name, name, email: `${name}@example.test` },
  organization: { id: name, name: `Org ${name}` },
  role: { id: "admin", name: "admin", permissions: [] },
});

describe("Start session projection", () => {
  it("replaces the prior profile when the request session changes", () => {
    const { rerender } = render(<StartAuthProvider session={session("Alice")}><Profile /></StartAuthProvider>);
    expect(screen.getByText("Alice@example.test — Org Alice")).toBeInTheDocument();
    rerender(<StartAuthProvider session={session("Bob")}><Profile /></StartAuthProvider>);
    expect(screen.getByText("Bob@example.test — Org Bob")).toBeInTheDocument();
    expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
  });
});
