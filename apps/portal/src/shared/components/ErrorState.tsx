import { Alert, Box } from "@mui/material";

export function ErrorState({ message }: { message: string }) {
  return (
    <Box sx={{ py: 2 }}>
      <Alert severity="error">{message}</Alert>
    </Box>
  );
}
