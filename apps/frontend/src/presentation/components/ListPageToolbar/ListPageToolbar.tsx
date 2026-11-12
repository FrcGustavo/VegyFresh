import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import ListSearchField from "../ListSearchField";
import { listPageToolbarStyles } from "./ListPageToolbar.styles";
import type { ListPageToolbarProps } from "./ListPageToolbar.types";

export default function ListPageToolbar({ config }: ListPageToolbarProps) {
  if (!config) return null;

  return (
    <Box sx={listPageToolbarStyles.container}>
      <Button
        variant="contained"
        color="primary"
        disableElevation
        onClick={config.onCreate}
      >
        {config.createLabel}
      </Button>
      {config.onCreatedFilterChange && (
        <>
          <FormControl
            size="small"
            sx={listPageToolbarStyles.createdFilterControl}
          >
            <InputLabel id="toolbar-created-filter-label">
              Filtro fecha
            </InputLabel>
            <Select
              labelId="toolbar-created-filter-label"
              label="Filtro fecha"
              value={config.createdFilter ?? "all"}
              onChange={(event) =>
                config.onCreatedFilterChange?.(
                  event.target.value as "all" | "today" | "range",
                )
              }
            >
              <MenuItem value="all">Todas</MenuItem>
              <MenuItem value="today">Hoy</MenuItem>
              <MenuItem value="range">Rango</MenuItem>
            </Select>
          </FormControl>
          {config.createdFilter === "range" && (
            <>
              <TextField
                size="small"
                type="date"
                label="Desde"
                value={config.createdFrom ?? ""}
                onChange={(event) =>
                  config.onCreatedFromChange?.(event.target.value)
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                type="date"
                label="Hasta"
                value={config.createdTo ?? ""}
                onChange={(event) =>
                  config.onCreatedToChange?.(event.target.value)
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          )}
        </>
      )}
      {config.onSearchChange && (
        <ListSearchField
          placeholder={config.searchPlaceholder ?? "Buscar..."}
          value={config.searchValue ?? ""}
          onChange={config.onSearchChange}
        />
      )}
    </Box>
  );
}
