import { Toolbar } from '@mui/material';
import type { ReactNode } from 'react';

interface ListPageToolbarProps {
  children: ReactNode;
}

export default function ListPageToolbar({ children }: ListPageToolbarProps) {
  return (
    <Toolbar
      disableGutters
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        p: 1,
        mb: 3,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
        position: 'sticky',
        top: { xs: '56px', sm: '64px' },
        zIndex: (theme) => theme.zIndex.appBar - 1,
        minHeight: 'unset !important',
        height: 'auto',
      }}
    >
      {children}
    </Toolbar>
  );
}
