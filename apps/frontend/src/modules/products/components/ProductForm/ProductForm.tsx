import {
  Box,
  TextField,
  MenuItem,
  Typography,
  IconButton,
  Paper,
  Button,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { productFormStyles } from "./ProductForm.styles";
import type { ProductFormProps } from "./ProductForm.types";

export default function ProductForm({
  formData,
  prices,
  suppliers,
  priceLists,
  handleChange,
  addPriceField,
  removePriceField,
  updatePriceField,
  handleSubmit,
  title,
  isDisabled = false,
}: ProductFormProps) {
  return (
    <Box sx={productFormStyles.root}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      <Paper sx={productFormStyles.paper}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("save");
          }}
        >
          <TextField
            fullWidth
            label="Nombre"
            name="name"
            margin="normal"
            value={formData.name || ""}
            onChange={handleChange}
            required
            disabled={isDisabled}
          />
          <TextField
            fullWidth
            label="Descripción"
            name="description"
            margin="normal"
            value={formData.description || ""}
            onChange={handleChange}
            disabled={isDisabled}
          />
          <TextField
            fullWidth
            label="Stock"
            name="stock"
            type="number"
            margin="normal"
            value={formData.stock || ""}
            onChange={handleChange}
            disabled={isDisabled}
          />
          <TextField
            select
            fullWidth
            label="Proveedor"
            name="supplier_id"
            margin="normal"
            value={formData.supplier_id || ""}
            onChange={handleChange}
            required
            disabled={isDisabled}
          >
            {suppliers.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="h6" sx={productFormStyles.pricesTitle}>
            Precios
          </Typography>
          {prices.map((p, index) => (
            <Box key={p.id ?? p.clientRowId} sx={productFormStyles.priceRow}>
              <TextField
                select
                label="Lista de Precio"
                value={p.price_list_id}
                onChange={(e) =>
                  updatePriceField(index, "price_list_id", e.target.value)
                }
                sx={productFormStyles.priceListField}
                required
                disabled={isDisabled}
              >
                {priceLists.map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {list.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                label="Precio ($)"
                value={p.price}
                onChange={(e) =>
                  updatePriceField(index, "price", e.target.value)
                }
                sx={productFormStyles.priceField}
                required
                disabled={isDisabled}
              />
              {!isDisabled && (
                <IconButton
                  color="error"
                  onClick={() => removePriceField(index)}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
          ))}
          {!isDisabled && (
            <Button startIcon={<AddIcon />} onClick={addPriceField}>
              Agregar precio en otra lista
            </Button>
          )}
        </form>
      </Paper>
    </Box>
  );
}
