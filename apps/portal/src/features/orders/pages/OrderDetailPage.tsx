import {
  Alert,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { useParams } from "react-router";
import { useOrderDetail } from "../hooks/useOrderDetail";
import { PageHeader } from "../../../shared/components/PageHeader";
import { LoadingState } from "../../../shared/components/LoadingState";

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const orderQuery = useOrderDetail(orderId);

  if (orderQuery.isLoading) {
    return <LoadingState />;
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
      <PageHeader
        title={`Order ${order.folio}`}
        subtitle={`Status: ${order.status}`}
      />
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
