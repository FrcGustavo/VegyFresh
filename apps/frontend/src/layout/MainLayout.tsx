import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { Outlet } from 'react-router';
import { useCallback, useState } from 'react';
import Sidebar from './Sidebar';
import ListSearchField from '../components/ListSearchField';
import type { ListPageToolbarConfig } from './useListPageToolbar';

export default function MainLayout() {
  const [listPageToolbarConfig, setListPageToolbarConfig] = useState<ListPageToolbarConfig | null>(null);
  const handleSetListPageToolbarConfig = useCallback((config: ListPageToolbarConfig | null) => {
    setListPageToolbarConfig(config);
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        color="transparent"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
        elevation={0}
      >
        <Toolbar>
          {listPageToolbarConfig && (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <Button
                variant="contained"
                color="primary"
                disableElevation
                onClick={listPageToolbarConfig.onCreate}
              >
                {listPageToolbarConfig.createLabel}
              </Button>
              {listPageToolbarConfig.onCreatedFilterChange && (
                <>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="toolbar-created-filter-label">Filtro fecha</InputLabel>
                    <Select
                      labelId="toolbar-created-filter-label"
                      label="Filtro fecha"
                      value={listPageToolbarConfig.createdFilter ?? 'all'}
                      onChange={(event) =>
                        listPageToolbarConfig.onCreatedFilterChange?.(
                          event.target.value as 'all' | 'today' | 'range',
                        )
                      }
                    >
                      <MenuItem value="all">Todas</MenuItem>
                      <MenuItem value="today">Hoy</MenuItem>
                      <MenuItem value="range">Rango</MenuItem>
                    </Select>
                  </FormControl>
                  {listPageToolbarConfig.createdFilter === 'range' && (
                    <>
                      <TextField
                        size="small"
                        type="date"
                        label="Desde"
                        value={listPageToolbarConfig.createdFrom ?? ''}
                        onChange={(event) =>
                          listPageToolbarConfig.onCreatedFromChange?.(
                            event.target.value,
                          )
                        }
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        size="small"
                        type="date"
                        label="Hasta"
                        value={listPageToolbarConfig.createdTo ?? ''}
                        onChange={(event) =>
                          listPageToolbarConfig.onCreatedToChange?.(
                            event.target.value,
                          )
                        }
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </>
                  )}
                </>
              )}
              {listPageToolbarConfig.onSearchChange && (
                <ListSearchField
                  placeholder={listPageToolbarConfig.searchPlaceholder ?? 'Buscar...'}
                  value={listPageToolbarConfig.searchValue ?? ''}
                  onChange={listPageToolbarConfig.onSearchChange}
                />
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          px: 0,
          pt: { xs: 'calc(56px)', sm: 'calc(64px)' },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        <Box>
          <Outlet context={{ setListPageToolbarConfig: handleSetListPageToolbarConfig }} />
        </Box>
      </Box>
    </Box>
  );
}
