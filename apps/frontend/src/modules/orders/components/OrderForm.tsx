import type { KeyboardEvent } from "react";
import {
  Box,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";

type OrderChangeEvent = { target: { name: string; value: string } };
interface OrderFormData {
  client_id: string;
  user_id: string;
  status: string;
  origin: string;
  delivery_date: string;
  order_folio: string;
  created_at: string;
}
interface OrderFormItem {
  id?: string | number;
  clientRowId: string;
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
  folio: string;
  name: string;
  unit: string;
}

interface OrderFormProps {
  formData: OrderFormData;
  items: OrderFormItem[];
  clientLookup: { folio: string; name: string };
  totalGeneral: number;
  handleChange: (e: OrderChangeEvent) => void;
  updateClientLookup: (field: "folio" | "name", value: string) => void;
  addItemField: () => void;
  updateItemField: (
    index: number,
    field: string,
    value: string | number | null,
  ) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  isDisabled?: boolean;
}

export default function OrderForm({
  formData,
  items,
  clientLookup,
  totalGeneral,
  handleChange,
  updateClientLookup,
  addItemField,
  updateItemField,
  handleSubmit,
  isDisabled = false,
}: OrderFormProps) {
  const EDITABLE_COLUMNS = 5;

  const formatCurrency = (value: number | string) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return "$0.00";
    }
    return amount.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
  };

  const totalProducts = items.length;
  const cellSx = {
    "&.MuiTableCell-root": {
      padding: "0 !important",
      border: "1px solid",
      borderColor: "divider",
    },
  };
  const cellInputSx = {
    margin: 0,
    "& .MuiInputBase-input": { p: 0 },
    "& .MuiInput-underline:before": { borderBottom: "none" },
    "& .MuiInput-underline:after": { borderBottom: "none" },
    "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
      borderBottom: "none",
    },
  };

  const focusCell = (row: number, col: number) => {
    const target = document.querySelector<HTMLInputElement>(
      `input[data-row="${row}"][data-col="${col}"]`,
    );
    target?.focus();
    target?.select?.();
  };

  const handleArrowNavigation = (
    e: KeyboardEvent<HTMLElement>,
    row: number,
    col: number,
  ) => {
    if (e.key === "ArrowUp" && row > 0) {
      e.preventDefault();
      focusCell(row - 1, col);
      return;
    }

    if (e.key === "ArrowDown" && row < items.length - 1) {
      e.preventDefault();
      focusCell(row + 1, col);
      return;
    }

    if (e.key === "ArrowLeft" && col > 0) {
      e.preventDefault();
      focusCell(row, col - 1);
      return;
    }

    if (e.key === "ArrowRight" && col < EDITABLE_COLUMNS - 1) {
      e.preventDefault();
      focusCell(row, col + 1);
    }
  };

  const isAlphaNumericInput = (value: string) => /^[a-zA-Z0-9\s]*$/.test(value);
  const isDecimalQuantityInput = (value: string) =>
    /^\d*([.]\d{0,3})?$/.test(value);
  const isDecimalInput = (value: string) => /^\d*([.]\d{0,2})?$/.test(value);

  return (
    <Box sx={{ p: 3, height: "100%" }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("save");
        }}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            columnGap: 2,
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              fullWidth
              label="Client folio"
              value={clientLookup.folio}
              onChange={(e) => updateClientLookup("folio", e.target.value)}
              disabled={isDisabled}
            />
            <TextField
              fullWidth
              label="Client name"
              value={clientLookup.name}
              onChange={(e) => updateClientLookup("name", e.target.value)}
              required
              disabled={isDisabled}
            />
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="Created date"
                type="date"
                value={formData.created_at || ""}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: { readOnly: true },
                }}
              />
              <TextField
                fullWidth
                label="Folio"
                value={formData.order_folio || ""}
                slotProps={{ input: { readOnly: true } }}
              />
            </Box>
            <TextField
              fullWidth
              label="Delivery date"
              type="date"
              name="delivery_date"
              value={formData.delivery_date || ""}
              onChange={handleChange}
              disabled={isDisabled}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flex: 1,
          }}
        >
          <TableContainer
            sx={{ mb: 2, minHeight: 0, flex: 1, overflow: "auto" }}
          >
            <Table
              stickyHeader
              sx={{
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <TableHead
                sx={{
                  bgcolor: "primary.dark",
                  "& .MuiTableCell-root": {
                    color: "primary.contrastText",
                    fontWeight: 600,
                    bgcolor: "primary.dark",
                  },
                }}
              >
                <TableRow>
                  <TableCell sx={{ ...cellSx, width: "10%" }}>
                    Articulo
                  </TableCell>
                  <TableCell sx={{ ...cellSx, width: "47.5%" }}>
                    Nombre
                  </TableCell>
                  <TableCell sx={{ ...cellSx, width: "7.5%" }}>U.M.</TableCell>
                  <TableCell sx={{ ...cellSx, width: "10%" }}>
                    Unidades
                  </TableCell>
                  <TableCell sx={{ ...cellSx, width: "12.5%" }}>
                    Precio
                  </TableCell>
                  <TableCell sx={{ ...cellSx, width: "12.5%" }}>
                    Importe
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id ?? item.clientRowId}>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="text"
                        variant="standard"
                        value={item.folio || ""}
                        onChange={(e) => {
                          if (!isAlphaNumericInput(e.target.value)) return;
                          updateItemField(index, "folio", e.target.value);
                        }}
                        onKeyDown={(e) => handleArrowNavigation(e, index, 0)}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 0 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="text"
                        variant="standard"
                        value={item.name || ""}
                        onChange={(e) => {
                          if (!isAlphaNumericInput(e.target.value)) return;
                          updateItemField(index, "name", e.target.value);
                        }}
                        onKeyDown={(e) => handleArrowNavigation(e, index, 1)}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 1 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="text"
                        variant="standard"
                        value={item.unit.toUpperCase() || ""}
                        onChange={(e) => {
                          if (!isAlphaNumericInput(e.target.value)) return;
                          updateItemField(index, "unit", e.target.value);
                        }}
                        onKeyDown={(e) => handleArrowNavigation(e, index, 2)}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 2 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={item.quantity}
                        onChange={(e) => {
                          if (!isDecimalQuantityInput(e.target.value)) return;
                          updateItemField(index, "quantity", e.target.value);
                        }}
                        onKeyDown={(e) => handleArrowNavigation(e, index, 3)}
                        slotProps={{
                          htmlInput: {
                            min: 1,
                            "data-row": index,
                            "data-col": 3,
                          },
                          input: { disableUnderline: true },
                        }}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={item.unit_price}
                        onChange={(e) => {
                          if (!isDecimalInput(e.target.value)) return;
                          updateItemField(index, "unit_price", e.target.value);
                        }}
                        onKeyDown={(e) => {
                          handleArrowNavigation(e, index, 4);
                          const isLastRow = index === items.length - 1;
                          const hasProduct = Boolean(item.product_id);
                          if (
                            e.key === "Tab" &&
                            !e.shiftKey &&
                            isLastRow &&
                            hasProduct
                          ) {
                            addItemField();
                          }
                        }}
                        required
                        disabled={isDisabled}
                        sx={cellInputSx}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 4 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={formatCurrency(
                          Number(item.quantity) * Number(item.unit_price),
                        )}
                        disabled
                        sx={cellInputSx}
                        slotProps={{
                          input: { disableUnderline: true, readOnly: true },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box
          sx={{
            mt: "auto",
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            position: "sticky",
            bottom: 0,
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Typography variant="subtitle1">{totalProducts} Articulos</Typography>
          <Typography variant="subtitle1" color="primary">
            {formatCurrency(totalGeneral)}
          </Typography>
        </Box>
      </form>
    </Box>
  );
}
