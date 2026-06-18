import {
  Alert,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { Link } from "react-router";
import { useOrders } from "../hooks/useOrders";
import { PageHeader } from "../../../shared/components/PageHeader";
import { LoadingState } from "../../../shared/components/LoadingState";

export function OrdersPage() {
  const query = useOrders();

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.error instanceof Error) {
    return <Alert severity="error">{query.error.message}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Orders"
        subtitle="Your current and historical orders"
      />
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
                    ? new Date(order.delivery_date).toLocaleDateString("es-MX")
                    : "-"}
                </TableCell>
                <TableCell align="right">
                  {Number(order.total_amount).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </TableCell>
                <TableCell align="right">
                  <Chip
                    component={Link}
                    clickable
                    to={`/portal/orders/${order.id}`}
                    size="small"
                    label="View"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
