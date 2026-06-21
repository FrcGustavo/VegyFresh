import type { KeyboardEvent } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  IconButton,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { priceListFormStyles } from "./PriceListForm.styles";
import type { PriceListFormProps } from "./PriceListForm.types";

export default function PriceListForm({
  name,
  setName,
  productsList,
  products,
  addProductField,
  updateProductField,
  selectProduct,
  removeProductField,
  handleSubmit,
  isDisabled = false,
}: PriceListFormProps) {
  const EDITABLE_COLUMNS = 2;

  const isDecimalInput = (value: string) => /^\d*([.]\d{0,2})?$/.test(value);

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

    if (e.key === "ArrowDown" && row < productsList.length - 1) {
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

  return (
    <Box sx={priceListFormStyles.root}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("save");
        }}
        style={priceListFormStyles.form}
      >
        <Box sx={priceListFormStyles.nameFieldContainer}>
          <TextField
            fullWidth
            label="Nombre de la Lista"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isDisabled}
          />
        </Box>

        <Box sx={priceListFormStyles.tableSection}>
          <TableContainer sx={priceListFormStyles.tableContainer}>
            <Table stickyHeader sx={priceListFormStyles.table}>
              <TableHead sx={priceListFormStyles.tableHead}>
                <TableRow>
                  <TableCell sx={priceListFormStyles.headerCell("65%")}>
                    Producto
                  </TableCell>
                  <TableCell sx={priceListFormStyles.headerCell("25%")}>
                    Precio Asignado
                  </TableCell>
                  <TableCell sx={priceListFormStyles.headerCell("10%")}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productsList.map((item, index) => (
                  <TableRow key={item.id ?? item.clientRowId}>
                    <TableCell sx={priceListFormStyles.cell}>
                      <Autocomplete
                        options={products}
                        value={
                          products.find(
                            (product) => product.id === item.product_id,
                          ) ?? null
                        }
                        getOptionLabel={(option) => option.name}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        onChange={(_event, product) => {
                          selectProduct(index, product);
                        }}
                        getOptionDisabled={(option) =>
                          productsList.some(
                            (row, rowIndex) =>
                              rowIndex !== index &&
                              row.product_id === option.id,
                          )
                        }
                        disabled={isDisabled}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            variant="standard"
                            required={item.price !== ""}
                            sx={priceListFormStyles.cellInput}
                            slotProps={{
                              htmlInput: {
                                ...params.slotProps.htmlInput,
                                "data-row": index,
                                "data-col": 0,
                              },
                              input: {
                                ...params.slotProps.input,
                                disableUnderline: true,
                              },
                            }}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell sx={priceListFormStyles.cell}>
                      <TextField
                        fullWidth
                        type="number"
                        variant="standard"
                        value={item.price}
                        onChange={(e) => {
                          if (!isDecimalInput(e.target.value)) return;
                          updateProductField(index, "price", e.target.value);
                        }}
                        onKeyDown={(e) => {
                          handleArrowNavigation(e, index, 1);
                          const isLastRow = index === productsList.length - 1;
                          const hasProduct = Boolean(item.product_id);
                          const hasValidPrice =
                            item.price !== "" &&
                            Number.isFinite(Number(item.price)) &&
                            Number(item.price) >= 0;
                          if (
                            e.key === "Tab" &&
                            !e.shiftKey &&
                            isLastRow &&
                            hasProduct &&
                            hasValidPrice
                          ) {
                            addProductField();
                          }
                        }}
                        required={Boolean(item.product_id)}
                        disabled={isDisabled}
                        sx={priceListFormStyles.cellInput}
                        slotProps={{
                          htmlInput: {
                            step: "0.01",
                            min: "0",
                            "data-row": index,
                            "data-col": 1,
                          },
                          input: { disableUnderline: true },
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        ...priceListFormStyles.cell,
                        ...priceListFormStyles.actionCell,
                      }}
                    >
                      {!isDisabled && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeProductField(index)}
                          sx={priceListFormStyles.deleteActionButton}
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
