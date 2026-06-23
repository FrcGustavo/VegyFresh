import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  CircularProgress,
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
import FloatingModal from "../../../../components/FloatingModal";
import ModalToolbar from "../../../../components/ModalToolbar";
import {
  productsQueryOptions,
  purchasesMutationOptions,
  purchasesQueryOptions,
  suppliersQueryOptions,
  type CreatePurchaseInput,
} from "../../../../api";
import { createClientRowId } from "../../../../utils/clientRowId";
import type { PurchaseFormModalProps } from "./PurchaseFormModal.types";

type SaveAction = "save" | "save-and-close" | "save-and-new";

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

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const formatCurrency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

export default function PurchaseFormModal({
  isOpen,
  onClose,
  purchaseId,
  title,
  initialWidth = 900,
  initialHeight = 720,
  list = [],
  currentIndex = 0,
  onNavigate,
}: PurchaseFormModalProps) {
  const queryClient = useQueryClient();
  const [createdPurchaseId, setCreatedPurchaseId] = useState<string>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const effectivePurchaseId =
    createdPurchaseId ?? (isCreatingNew ? undefined : purchaseId);
  const isEditing = !!effectivePurchaseId;

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemRow[]>([createEmptyRow()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(!!effectivePurchaseId);

  const { data: existingPurchase, isLoading: isLoadingPurchase } = useQuery({
    ...purchasesQueryOptions.detail(effectivePurchaseId ?? ""),
    enabled: isOpen && !!effectivePurchaseId,
  });
  const { data: suppliersData } = useQuery({
    ...suppliersQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
    enabled: isOpen,
  });
  const { data: productsData } = useQuery({
    ...productsQueryOptions.list({
      limit: "200",
      order_by: "name",
      order: "asc",
    }),
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (existingPurchase && effectivePurchaseId) {
      queueMicrotask(() => {
        setSupplierId(existingPurchase.supplier_id ?? "");
        setPurchaseDate(toDateInputValue(existingPurchase.purchase_date));
        setNotes(existingPurchase.notes ?? "");
        setItems(
          existingPurchase.items?.length
            ? existingPurchase.items.map((item) => ({
                clientRowId: String(item.id ?? createClientRowId()),
                product_id: item.product_id,
                quantity: String(item.quantity ?? "1"),
                unit_cost: String(item.unit_cost ?? "0"),
              }))
            : [createEmptyRow()],
        );
        setIsDisabled(true);
        setFormError(null);
      });
      return;
    }

    if (!effectivePurchaseId) {
      queueMicrotask(() => {
        setSupplierId("");
        setPurchaseDate(new Date().toISOString().slice(0, 10));
        setNotes("");
        setItems([createEmptyRow()]);
        setIsDisabled(false);
        setFormError(null);
      });
    }
  }, [effectivePurchaseId, existingPurchase, isOpen]);

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

  const createMutation = useMutation(
    purchasesMutationOptions.create(queryClient),
  );
  const updateMutation = useMutation(
    purchasesMutationOptions.update(queryClient),
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const totalProducts = validItems.length;

  const handleClose = () => {
    setCreatedPurchaseId(undefined);
    setIsCreatingNew(false);
    onClose();
  };

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
    setFormError(null);
  };

  const buildPayload = (): CreatePurchaseInput | null => {
    if (!supplierId) {
      setFormError("Selecciona un proveedor.");
      return null;
    }
    if (validItems.length === 0) {
      setFormError("Agrega al menos un producto válido.");
      return null;
    }

    return {
      supplier_id: supplierId,
      purchase_date: `${purchaseDate}T00:00:00.000Z`,
      notes: notes.trim() || null,
      items: validItems,
    };
  };

  const handleSubmit = (action: SaveAction) => {
    const payload = buildPayload();
    if (!payload) return;

    setFormError(null);
    const onSuccess = (purchase: { id: string }) => {
      if (action === "save-and-close") {
        handleClose();
      } else if (action === "save-and-new") {
        setCreatedPurchaseId(undefined);
        setIsCreatingNew(true);
      } else if (!effectivePurchaseId) {
        setCreatedPurchaseId(purchase.id);
        setIsCreatingNew(false);
      } else {
        setIsDisabled(true);
      }
    };
    const onError = (error: Error) => setFormError(error.message);

    if (effectivePurchaseId) {
      updateMutation.mutate(
        { id: effectivePurchaseId, input: payload },
        { onSuccess, onError },
      );
      return;
    }

    createMutation.mutate(payload, { onSuccess, onError });
  };

  const canNavigateUp = isEditing && currentIndex > 0;
  const canNavigateDown = isEditing && currentIndex < list.length - 1;

  const toolbar = (
    <ModalToolbar
      isDisabled={isDisabled}
      onEditToggle={() => setIsDisabled((current) => !current)}
      onSave={() => handleSubmit("save")}
      onSaveAndClose={() => handleSubmit("save-and-close")}
      onSaveAndNew={() => handleSubmit("save-and-new")}
      onNavigateUp={() => canNavigateUp && onNavigate?.(currentIndex - 1)}
      onNavigateDown={() => canNavigateDown && onNavigate?.(currentIndex + 1)}
      canNavigateUp={canNavigateUp}
      canNavigateDown={canNavigateDown}
      isSaving={isSaving}
      isEditing={isEditing}
    />
  );

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isCreatingNew
          ? "Crear compra"
          : createdPurchaseId
            ? "Editar compra"
            : (title ??
              (effectivePurchaseId ? "Editar compra" : "Crear compra"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() => (
        <Box
          sx={{
            p: 3,
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflow: "hidden",
          }}
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          {isLoadingPurchase ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <TextField
                    select
                    label="Proveedor"
                    value={supplierId}
                    onChange={(event) => setSupplierId(event.target.value)}
                    required
                    disabled={isDisabled || isSaving}
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
                    disabled={isDisabled || isSaving}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>

                <TextField
                  label="Notas"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  multiline
                  minRows={2}
                  disabled={isDisabled || isSaving}
                />

                <Paper variant="outlined" sx={{ flex: 1, overflow: "auto" }}>
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
                            disabled={isDisabled || isSaving}
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
                                disabled={isDisabled || isSaving}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "product_id",
                                    event.target.value,
                                  )
                                }
                              >
                                {products.map((productOption) => (
                                  <MenuItem
                                    key={productOption.id}
                                    value={productOption.id}
                                  >
                                    {`${productOption.folio ?? "N/A"} - ${
                                      productOption.name ?? "Sin nombre"
                                    } (${(productOption.unit ?? "pz").toUpperCase()})`}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <TextField
                                fullWidth
                                size="small"
                                value={item.quantity}
                                disabled={isDisabled || isSaving}
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
                                disabled={isDisabled || isSaving}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  if (!/^\d*([.]\d{0,2})?$/.test(value)) return;
                                  updateItem(index, "unit_cost", value);
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {formatCurrency(subtotal)}
                              {product?.unit ? ` (${product.unit})` : ""}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                color="error"
                                disabled={isDisabled || isSaving}
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
              </Box>

              <Box
                sx={{
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: 1,
                  borderColor: "divider",
                  px: 1,
                  py: 1.5,
                }}
              >
                <Typography variant="subtitle1">
                  {totalProducts} Articulos
                </Typography>
                <Typography variant="subtitle1" color="primary">
                  {formatCurrency(total)}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
    />
  );
}
