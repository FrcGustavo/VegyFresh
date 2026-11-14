import { Button, CssBaseline, ThemeProvider } from "@mui/material";
import { Link, Outlet, useRouter } from "@tanstack/react-router";
import { createVegyTheme } from "@vegyfresh/ui";
import { useState } from "react";
import type { PortalSessionSnapshot } from "../../domain/auth/auth.types";
import { PortalSessionProvider } from "../../infrastructure/auth/hooks/PortalSessionProvider";
import { usePortalSession } from "../../infrastructure/auth/hooks/usePortalSession";
import { PortalShell } from "../layouts/PortalShell";

const theme = createVegyTheme();

export function StartPortal({ session }: { session: PortalSessionSnapshot }) {
  const router = useRouter();
  if (session.authenticated === null) return <main><p>We could not check your session. Please try again.</p><button type="button" onClick={() => void router.invalidate()}>Retry</button></main>;
  return <PortalSessionProvider key={JSON.stringify(session)} initialSession={session}>
    <ThemeProvider theme={theme}><CssBaseline /><StartPortalLayout /></ThemeProvider>
  </PortalSessionProvider>;
}

function StartPortalLayout() {
  const session = usePortalSession();
  const [logoutFailed, setLogoutFailed] = useState(false);
  return <PortalShell navigation={<>
    <Button color="inherit" component={Link} to="/portal/dashboard">Dashboard</Button>
    <Button color="inherit" component={Link} to="/portal/orders">Orders</Button>
    <Button color="inherit" onClick={async () => {
      setLogoutFailed(false);
      try { await session.logout(); } catch { setLogoutFailed(true); }
    }}>Logout</Button>
  </>}>
    {logoutFailed && <p role="alert">Sign out failed. Please try again.</p>}
    <Outlet />
  </PortalShell>;
}
