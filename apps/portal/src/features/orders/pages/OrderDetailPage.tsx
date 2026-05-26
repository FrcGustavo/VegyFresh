import { Alert, Button, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { useParams } from 'react-router';
import { useState } from 'react';
import { useOrderDetail } from '../hooks/useOrderDetail';
import { useCancelOrderMutation } from '../hooks/useCancelOrderMutation';
import { PageHeader } from '../../../shared/components/PageHeader';
import { LoadingState } from '../../../shared/components/LoadingState';

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const [reason, setReason] = useState('');
  const orderQuery = useOrderDetail(orderId);
  const cancelMutation = useCancelOrderMutation(orderId);

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

  const canCancel = order.status === 'PENDING_REVIEW' || order.status === 'APPROVED';

  return (
    <Stack spacing={2}>
      <PageHeader title={`Order ${order.folio}`} subtitle={`Status: ${order.status}`} />
      {cancelMutation.error instanceof Error ? (
        <Alert severity="error">{cancelMutation.error.message}</Alert>
      ) : null}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            label="Cancel reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            size="small"
            disabled={!canCancel || cancelMutation.isPending}
          />
          <Button
            variant="outlined"
            color="error"
            disabled={!canCancel || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate(reason || undefined)}
          >
            Cancel order
          </Button>
        </Stack>
      </Paper>
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
