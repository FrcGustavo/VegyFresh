import { Alert, Button, Paper, Stack, TextField } from '@mui/material';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { useCreateOrderMutation } from '../hooks/useCreateOrderMutation';
import { PageHeader } from '../../../shared/components/PageHeader';

export function CreateOrderPage() {
  const navigate = useNavigate();
  const mutation = useCreateOrderMutation();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Stack spacing={2}>
      <PageHeader title="Create order" subtitle="Submit a new pending-review order" />
      {mutation.error instanceof Error ? (
        <Alert severity="error">{mutation.error.message}</Alert>
      ) : null}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="Product ID"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            placeholder="UUID of product"
          />
          <TextField
            label="Quantity"
            type="number"
            value={quantity}
            slotProps={{ htmlInput: { min: 1 } }}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
          <TextField
            label="Requested delivery date"
            type="date"
            value={requestedDeliveryDate}
            onChange={(event) => setRequestedDeliveryDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Notes"
            value={notes}
            multiline
            minRows={3}
            onChange={(event) => setNotes(event.target.value)}
          />
          <Button
            variant="contained"
            disabled={mutation.isPending || !productId}
            onClick={async () => {
              const response = await mutation.mutateAsync({
                requestedDeliveryDate: requestedDeliveryDate || undefined,
                notes: notes || undefined,
                items: [{ productId, quantity }],
              });
              navigate(`/portal/orders/${response.id}`);
            }}
          >
            Submit order
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
