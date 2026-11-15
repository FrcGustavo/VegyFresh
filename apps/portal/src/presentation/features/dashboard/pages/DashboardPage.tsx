import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { usePortalSession } from "../../../../infrastructure/auth/hooks/usePortalSession";

export function DashboardPage() {
  const session = usePortalSession();

  return (
    <>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h4">
          {`Welcome, ${session.client?.name ?? "Client"}`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Customer portal dashboard
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        {[
          "Active orders",
          "Pending review",
          "Approved",
          "Delivered",
          "Recent spend",
          "Next delivery",
        ].map((title) => (
          <Grid key={title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1">{title}</Typography>
                <Typography variant="h5">-</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
