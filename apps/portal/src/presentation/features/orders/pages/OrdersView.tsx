import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";
import type { PortalOrder } from "../../../../domain/orders/order.types";
import type { OrdersPort } from "../../../../application/orders/orders";
import { useOrders } from "../../../../infrastructure/orders/hooks/useOrders";

export function OrdersView({ ordersApi, orderLink, initialOrders }: { ordersApi: OrdersPort; orderLink: (id: string) => ReactNode; initialOrders?: PortalOrder[] }) {
  const query = useOrders(ordersApi, undefined, initialOrders);

  if (query.isLoading) {
    return (
      <Box
        role="status"
        aria-label="Loading orders"
        sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}
      >
        <CircularProgress aria-label="Loading orders" />
      </Box>
    );
  }

  if (query.error instanceof Error) {
    return <Alert severity="error">{query.error.message}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h4">Orders</Typography>
        <Typography variant="body2" color="text.secondary">
          Your current and historical orders
        </Typography>
      </Stack>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Folio</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Delivery date</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {query.data?.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.folio}</TableCell>
                <TableCell>
                  <Chip label={order.status} size="small" />
                </TableCell>
                <TableCell>
                  {order.delivery_date
                    ? new Date(order.delivery_date).toLocaleDateString("es-MX", { timeZone: "UTC" })
                    : "-"}
                </TableCell>
                <TableCell align="right">
                  {Number(order.total_amount).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </TableCell>
                <TableCell align="right">
                  {orderLink(order.id)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
