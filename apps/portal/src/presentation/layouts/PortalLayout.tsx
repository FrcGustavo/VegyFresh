import { Button } from "@mui/material";
import { Link, Outlet, useNavigate } from "react-router";
import { usePortalSession } from "../../features/auth/hooks/usePortalSession";
import { PortalShell } from "./PortalShell";

export function PortalLayout() {
  const navigate = useNavigate();
  const session = usePortalSession();

  return (
    <PortalShell navigation={<>
      <Button color="inherit" component={Link} to="/portal/dashboard">Dashboard</Button>
      <Button color="inherit" component={Link} to="/portal/orders">Orders</Button>
      <Button color="inherit" onClick={async () => {
        await session.logout();
        navigate("/login", { replace: true });
      }}>Logout</Button>
    </>}><Outlet /></PortalShell>
  );
}
