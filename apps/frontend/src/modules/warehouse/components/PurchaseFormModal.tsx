import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import FloatingModal from "../../../components/FloatingModal";
import { fetchApi } from "../../../api";
import { createClientRowId } from "../../../utils/clientRowId";

type PurchaseItemRow = {
  clientRowId: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
};

type SupplierOption = { id: string; name?: string | null };
type ProductOption = {
  id: string;
  folio?: string | null;
  name?: string | null;
  unit?: string | null;
};

const createEmptyRow = (): PurchaseItemRow => ({
  clientRowId: createClientRowId(),
  product_id: "",
  quantity: "1",
  unit_cost: "0",
});

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseFormModal({
  isOpen,
  onClose,
  onSuccess,
}: PurchaseFormModalProps) {
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemRow[]>([createEmptyRow()]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => fetchApi("/suppliers"),
    enabled: isOpen,
  });
  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchApi("/products?limit=200&order_by=name&order=asc"),
    enabled: isOpen,
  });

  const suppliers = useMemo(
    () =>
      (Array.isArray(suppliersData)
        ? suppliersData
        : (suppliersData?.data ?? [])) as SupplierOption[],
    [suppliersData],
  );
  const products = useMemo(
    () =>
      (Array.isArray(productsData)
        ? productsData
        : (productsData?.data ?? [])) as ProductOption[],
    [productsData],
  );
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const validItems = useMemo(
    () =>
      items
        .filter((item) => item.product_id.trim())
        .map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.quantity) &&
            item.quantity > 0 &&
            Number.isFinite(item.unit_cost) &&
            item.unit_cost > 0,
        ),
    [items],
  );

  const total = useMemo(
    () =>
      validItems.reduce(
        (sum, item) =>
          sum + Number((item.quantity * item.unit_cost).toFixed(2)),
        0,
      ),
    [validItems],
  );

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      fetchApi("/purchases", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSupplierId("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setItems([createEmptyRow()]);
      setFormError(null);
      onSuccess();
      onClose();
    },
    onError: (error) => {
      setFormError((error as Error).message);
    },
  });

  const updateItem = (
    rowIndex: number,
    field: keyof PurchaseItemRow,
    value: string,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item, index) =>
        index === rowIndex ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSave = () => {
    if (!supplierId) {
      setFormError("Selecciona un proveedor.");
      return;
    }
    if (validItems.length === 0) {
      setFormError("Agrega al menos un producto válido.");
      return;
    }

    setFormError(null);
    mutation.mutate({
      supplier_id: supplierId,
      purchase_date: `${purchaseDate}T00:00:00.000Z`,
      notes: notes.trim() || null,
      items: validItems,
    });
  };

  const canSave = supplierId.trim() !== "" && validItems.length > 0;

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Compra"
      initialWidth={900}
      initialHeight={700}
      renderContent={() => (
        <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField
              select
              label="Proveedor"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              required
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>
                  {supplier.name ?? "Sin nombre"}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label="Fecha de compra"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>

          <TextField
            label="Notas"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
          />

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Costo unitario</TableCell>
                  <TableCell>Subtotal</TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      onClick={() =>
                        setItems((currentItems) => [
                          ...currentItems,
                          createEmptyRow(),
                        ])
                      }
                    >
                      <AddIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const quantity = Number(item.quantity);
                  const unitCost = Number(item.unit_cost);
                  const subtotal =
                    Number.isFinite(quantity) && Number.isFinite(unitCost)
                      ? Number((quantity * unitCost).toFixed(2))
                      : 0;
                  const product = productMap.get(item.product_id);
                  return (
                    <TableRow key={item.clientRowId}>
                      <TableCell>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={item.product_id}
                          onChange={(event) =>
                            updateItem(index, "product_id", event.target.value)
                          }
                        >
                          {products.map((productOption) => (
                            <MenuItem
                              key={productOption.id}
                              value={productOption.id}
                            >
                              {`${productOption.folio ?? "N/A"} - ${productOption.name ?? "Sin nombre"} (${(productOption.unit ?? "pz").toUpperCase()})`}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={item.quantity}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (!/^\d*([.]\d{0,3})?$/.test(value)) return;
                            updateItem(index, "quantity", value);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={item.unit_cost}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (!/^\d*([.]\d{0,2})?$/.test(value)) return;
                            updateItem(index, "unit_cost", value);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {subtotal.toLocaleString("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        })}
                        {product?.unit ? ` (${product.unit})` : ""}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          color="error"
                          onClick={() =>
                            setItems((currentItems) =>
                              currentItems.length === 1
                                ? [createEmptyRow()]
                                : currentItems.filter(
                                    (_, rowIndex) => rowIndex !== index,
                                  ),
                            )
                          }
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              Total:{" "}
              {total.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
              })}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button onClick={onClose}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!canSave || mutation.isPending}
              >
                Guardar compra
              </Button>
            </Box>
          </Box>

          {(formError || mutation.error) && (
            <Typography color="error">
              {formError ?? (mutation.error as Error).message}
            </Typography>
          )}
        </Box>
      )}
    />
  );
}
