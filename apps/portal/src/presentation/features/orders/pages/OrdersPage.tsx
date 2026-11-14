import { Chip } from "@mui/material";
import { Link } from "react-router";
import { ordersApi } from "../../../../infrastructure/orders/api/ordersApi";
import { OrdersView } from "./OrdersView";

export function OrdersPage() {
  return <OrdersView ordersApi={ordersApi} orderLink={(id) => <Chip component={Link} clickable to={`/portal/orders/${encodeURIComponent(id)}`} size="small" label="View" />} />;
}
