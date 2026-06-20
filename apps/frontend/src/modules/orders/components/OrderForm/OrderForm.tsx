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
import { orderFormStyles } from "./OrderForm.styles";
import type { OrderFormProps } from "./OrderForm.types";

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
    <Box sx={orderFormStyles.root}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("save");
        }}
        style={orderFormStyles.form}
      >
        <Box sx={orderFormStyles.headerGrid}>
          <Box sx={orderFormStyles.columnStack}>
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

          <Box sx={orderFormStyles.columnStack}>
            <Box sx={orderFormStyles.datesGrid}>
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

        <Box sx={orderFormStyles.tableSection}>
          <TableContainer sx={orderFormStyles.tableContainer}>
            <Table stickyHeader sx={orderFormStyles.table}>
              <TableHead sx={orderFormStyles.tableHead}>
                <TableRow>
                  <TableCell sx={orderFormStyles.headerCell("10%")}>
                    Articulo
                  </TableCell>
                  <TableCell sx={orderFormStyles.headerCell("47.5%")}>
                    Nombre
                  </TableCell>
                  <TableCell sx={orderFormStyles.headerCell("7.5%")}>
                    U.M.
                  </TableCell>
                  <TableCell sx={orderFormStyles.headerCell("10%")}>
                    Unidades
                  </TableCell>
                  <TableCell sx={orderFormStyles.headerCell("12.5%")}>
                    Precio
                  </TableCell>
                  <TableCell sx={orderFormStyles.headerCell("12.5%")}>
                    Importe
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id ?? item.clientRowId}>
                    <TableCell sx={orderFormStyles.cell}>
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
                        sx={orderFormStyles.cellInput}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 0 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={orderFormStyles.cell}>
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
                        sx={orderFormStyles.cellInput}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 1 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={orderFormStyles.cell}>
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
                        sx={orderFormStyles.cellInput}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 2 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={orderFormStyles.cell}>
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
                        sx={orderFormStyles.cellInput}
                      />
                    </TableCell>
                    <TableCell sx={orderFormStyles.cell}>
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
                        sx={orderFormStyles.cellInput}
                        slotProps={{
                          htmlInput: { "data-row": index, "data-col": 4 },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={orderFormStyles.cell}>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={formatCurrency(
                          Number(item.quantity) * Number(item.unit_price),
                        )}
                        disabled
                        sx={orderFormStyles.cellInput}
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

        <Box sx={orderFormStyles.summaryBar}>
          <Typography variant="subtitle1">{totalProducts} Articulos</Typography>
          <Typography variant="subtitle1" color="primary">
            {formatCurrency(totalGeneral)}
          </Typography>
        </Box>
      </form>
    </Box>
  );
}
