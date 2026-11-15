import {
  Alert,
  Box,
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
import type { PortalOrder } from "../../../../domain/orders/order.types";
import type { OrdersPort } from "../../../../application/orders/orders";
import { useOrderDetail } from "../../../../infrastructure/orders/hooks/useOrderDetail";

export function OrderDetailView({ ordersApi, orderId, initialOrder }: { ordersApi: OrdersPort; orderId: string; initialOrder?: PortalOrder }) {
  const orderQuery = useOrderDetail(ordersApi, orderId, initialOrder);

  if (orderQuery.isLoading) {
    return (
      <Box
        role="status"
        aria-label="Loading order"
        sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}
      >
        <CircularProgress aria-label="Loading order" />
      </Box>
    );
  }

  if (orderQuery.error instanceof Error) {
    return <Alert severity="error">{orderQuery.error.message}</Alert>;
  }

  const order = orderQuery.data;
  if (!order) {
    return <Alert severity="error">Order not found</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="h4">{`Order ${order.folio}`}</Typography>
        <Typography variant="body2" color="text.secondary">
          {`Status: ${order.status}`}
        </Typography>
      </Stack>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Unit price</TableCell>
              <TableCell>Subtotal</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.product?.name ?? item.product_id}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell>{Number(item.subtotal).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
