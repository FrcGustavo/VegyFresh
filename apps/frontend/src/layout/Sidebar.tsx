import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography,
} from "@mui/material";
import {
  ShoppingCart,
  Inventory,
  People,
  LocalShipping,
  AdminPanelSettings,
  LocalOffer,
  Settings,
  Warehouse,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "../auth/useAuth";
import {
  canAccessUsersResource,
  canAccessOrganizationResource,
} from "../auth/authorization";

const drawerWidth = 260;

const menuItems = [
  { text: "Pedidos", icon: <ShoppingCart />, path: "/orders" },
  { text: "Productos", icon: <Inventory />, path: "/products" },
  { text: "Listas de Precios", icon: <LocalOffer />, path: "/price-lists" },
  { text: "Clientes", icon: <People />, path: "/clients" },
  { text: "Proveedores", icon: <LocalShipping />, path: "/suppliers" },
  { text: "Inventario", icon: <Warehouse />, path: "/inventory" },
  {
    text: "Usuarios y Roles",
    icon: <AdminPanelSettings />,
    path: "/users",
    canAccess: canAccessUsersResource,
  },
  {
    text: "Organización",
    icon: <Settings />,
    path: "/organization",
    canAccess: canAccessOrganizationResource,
  },
  { text: "Configuración", icon: <Settings />, path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, organization } = useAuth();

  const visibleMenuItems = menuItems.filter((item) => {
    if (!organization) {
      return item.path === "/organization";
    }

    if (!item.canAccess) {
      return true;
    }

    return item.canAccess(role);
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        ["& .MuiDrawer-paper"]: { width: drawerWidth, boxSizing: "border-box" },
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          VegyFresh
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: "auto" }}>
        <List>
          {visibleMenuItems.map((item) => {
            const isSelected = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => navigate(item.path)}
                  sx={{
                    "&.Mui-selected": {
                      backgroundColor: "primary.light",
                      color: "primary.contrastText",
                      "& .MuiListItemIcon-root": {
                        color: "primary.contrastText",
                      },
                    },
                    "&.Mui-selected:hover": {
                      backgroundColor: "primary.main",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{ color: isSelected ? "inherit" : "text.secondary" }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );
}
