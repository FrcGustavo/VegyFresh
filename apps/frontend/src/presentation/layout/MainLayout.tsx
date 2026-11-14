import { Box, AppBar, Toolbar, IconButton, Tooltip, Chip } from "@mui/material";
import { Logout } from "@mui/icons-material";
import { Outlet } from "react-router";
import type { ReactNode } from "react";
import { useAppNavigate } from "@/presentation/router/useAppNavigation";
import Sidebar from "./Sidebar";
import { useAuth } from "@/auth/useAuth";

export default function MainLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useAppNavigate();

  const handleLogout = async () => {
    await logout();
    void navigate("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
        elevation={0}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ fontWeight: 600, fontSize: "1.2rem", color: "text" }}>
            VegyFresh
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {user && (
              <Chip
                label={user.email}
                size="small"
                sx={{
                  bgcolor: "primary.dark",
                  color: "primary.contrastText",
                  fontSize: "0.85rem",
                }}
              />
            )}
            {user && (
              <Tooltip title="Cerrar sesión">
                <IconButton
                  color="inherit"
                  aria-label="Cerrar sesión"
                  onClick={() => {
                    void handleLogout();
                  }}
                  size="small"
                >
                  <Logout fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          px: 0,
          pt: { xs: "calc(56px)", sm: "calc(64px)" },
          bgcolor: "background.paper",
          minHeight: "100vh",
        }}
      >
        <Box>
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  );
}
