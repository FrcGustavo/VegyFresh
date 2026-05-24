import type { KeyboardEvent } from 'react';
import { Box, TextField, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

interface PriceListFormProps {
  name: string;
  setName: (name: string) => void;
  productsList: Array<{
    clientRowId: string;
    product_id: string;
    name?: string;
    price: number | string;
    id?: string;
  }>;
  addProductField: () => void;
  updateProductField: (index: number, field: string, value: string | number) => void;
  removeProductField: (index: number) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  isDisabled?: boolean;
}

export default function PriceListForm({
  name,
  setName,
  productsList,
  addProductField,
  updateProductField,
  removeProductField,
  handleSubmit,
  isDisabled = false
}: PriceListFormProps) {
  const EDITABLE_COLUMNS = 2;

  const isDecimalInput = (value: string) => /^\d*([.]\d{0,2})?$/.test(value);
  const cellSx = { '&.MuiTableCell-root': { padding: '0 !important', border: '1px solid', borderColor: 'divider' } };
  const cellInputSx = {
    margin: 0,
    '& .MuiInputBase-input': { p: 0 },
    '& .MuiInput-underline:before': { borderBottom: 'none' },
    '& .MuiInput-underline:after': { borderBottom: 'none' },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
      borderBottom: 'none',
    },
  };

  const focusCell = (row: number, col: number) => {
    const target = document.querySelector<HTMLInputElement>(
      `input[data-row="${row}"][data-col="${col}"]`,
    );
    target?.focus();
    target?.select?.();
  };

  const handleArrowNavigation = (e: KeyboardEvent<HTMLElement>, row: number, col: number) => {
    if (e.key === 'ArrowUp' && row > 0) {
      e.preventDefault();
      focusCell(row - 1, col);
      return;
    }

    if (e.key === 'ArrowDown' && row < productsList.length - 1) {
      e.preventDefault();
      focusCell(row + 1, col);
      return;
    }

    if (e.key === 'ArrowLeft' && col > 0) {
      e.preventDefault();
      focusCell(row, col - 1);
      return;
    }

    if (e.key === 'ArrowRight' && col < EDITABLE_COLUMNS - 1) {
      e.preventDefault();
      focusCell(row, col + 1);
    }
  };
  return (
    <Box sx={{ p: 3, height: '100%' }}>
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Nombre de la Lista"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isDisabled}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <TableContainer sx={{ mb: 2, minHeight: 0, flex: 1, overflow: 'auto' }}>
            <Table
              stickyHeader
              sx={{
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <TableHead
                sx={{
                  bgcolor: 'primary.dark',
                  '& .MuiTableCell-root': {
                    color: 'primary.contrastText',
                    fontWeight: 600,
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                <TableRow>
                  <TableCell sx={{ ...cellSx, width: '65%' }}>Producto</TableCell>
                  <TableCell sx={{ ...cellSx, width: '25%' }}>Precio Asignado</TableCell>
                  <TableCell sx={{ ...cellSx, width: '10%' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsList.map((item, index) => (
                  <TableRow key={item.clientRowId}>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="text"
                        variant="standard"
                        value={item.name || ''}
                        onChange={(e) => updateProductField(index, 'name', e.target.value)}
                        onKeyDown={(e) => handleArrowNavigation(e, index, 0)}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                        slotProps={{
                          htmlInput: { 'data-row': index, 'data-col': 0 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={item.price}
                        onChange={(e) => {
                          if (!isDecimalInput(e.target.value)) return;
                          updateProductField(index, 'price', e.target.value);
                        }}
                        onKeyDown={(e) => {
                          handleArrowNavigation(e, index, 1);
                          const isLastRow = index === productsList.length - 1;
                          const hasProduct = Boolean(item.product_id);
                          if (e.key === 'Tab' && !e.shiftKey && isLastRow && hasProduct) {
                            addProductField();
                          }
                        }}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                        slotProps={{
                          htmlInput: { step: '0.01', min: '0', 'data-row': index, 'data-col': 1 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ ...cellSx, textAlign: 'center' }}>
                      {!isDisabled && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeProductField(index)}
                          sx={{ m: 0, p: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </form>
    </Box>
  );
}
