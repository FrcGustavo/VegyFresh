import { Card, CardContent, Grid, Typography } from '@mui/material';
import { usePortalSession } from '../../auth/hooks/usePortalSession';
import { PageHeader } from '../../../shared/components/PageHeader';

export function DashboardPage() {
  const session = usePortalSession();

  return (
    <>
      <PageHeader
        title={`Welcome, ${session.client?.name ?? 'Client'}`}
        subtitle="Customer portal dashboard"
      />
      <Grid container spacing={2}>
        {[
          'Active orders',
          'Pending review',
          'Approved',
          'Delivered',
          'Recent spend',
          'Next delivery',
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
