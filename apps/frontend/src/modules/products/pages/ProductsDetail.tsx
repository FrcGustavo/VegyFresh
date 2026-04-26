import { Button, Typography, Box, Paper, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, TextField, MenuItem, IconButton } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../api';
import { useState } from 'react';

export default function ProductsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedList, setSelectedList] = useState('');
  const [priceValue, setPriceValue] = useState('');

  // Fetch Product
  const { data: product, isLoading: isProductLoading, error: productError } = useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchApi(`/products/${id}`)
  });

  // Fetch all Price Lists
  const { data: priceListsData } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => fetchApi('/price-lists')
  });

  // Fetch all Product Prices (and we will filter by product id locally)
  const { data: productPricesData } = useQuery({
    queryKey: ['product-prices'],
    queryFn: () => fetchApi('/product-prices')
  });

  const assignPriceMutation = useMutation({
    mutationFn: (newPrice: any) => fetchApi('/product-prices', {
      method: 'POST',
      body: JSON.stringify(newPrice)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-prices'] });
      setSelectedList('');
      setPriceValue('');
    }
  });

  const deletePriceMutation = useMutation({
    mutationFn: (priceId: string) => fetchApi(`/product-prices/${priceId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-prices'] });
    }
  });

  if (isProductLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (productError) return <Typography color="error">Error al cargar el producto: {(productError as Error).message}</Typography>;
  if (!product) return <Typography>No encontrado</Typography>;

  const priceLists = Array.isArray(priceListsData) ? priceListsData : (priceListsData?.data || []);
  const allPrices = Array.isArray(productPricesData) ? productPricesData : (productPricesData?.data || []);
  
  // Filtrar los precios que pertenecen a este producto
  const productPrices = allPrices.filter((p: any) => p.product_id === id);

  const handleAssignPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedList || !priceValue) return;
    assignPriceMutation.mutate({
      product_id: id,
      price_list_id: selectedList,
      price: Number(priceValue)
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Detalle de Producto</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>Información detallada sobre este producto.</Typography>
        <Typography variant="body2" color="text.secondary"><strong>SKU:</strong> {product.sku}</Typography>
        <Typography variant="body2" color="text.secondary"><strong>Nombre:</strong> {product.name}</Typography>
        <Typography variant="body2" color="text.secondary"><strong>Descripción:</strong> {product.description}</Typography>
        <Typography variant="body2" color="text.secondary"><strong>Stock:</strong> {product.stock}</Typography>
        <Typography variant="body2" color="text.secondary"><strong>Proveedor:</strong> {product.supplier?.name || product.supplier_id}</Typography>
      </Paper>

      <Typography variant="h5" gutterBottom>Listas de Precio Asignadas</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleAssignPrice} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            select
            label="Lista de Precio"
            value={selectedList}
            onChange={(e) => setSelectedList(e.target.value)}
            sx={{ minWidth: 200 }}
            size="small"
            required
          >
            {priceLists.map((list: any) => (
              <MenuItem key={list.id} value={list.id}>
                {list.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Precio ($)"
            type="number"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            size="small"
            required
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={assignPriceMutation.isPending}
          >
            {assignPriceMutation.isPending ? 'Asignando...' : 'Asignar Precio'}
          </Button>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre de Lista</TableCell>
                <TableCell>Precio Asignado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productPrices.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center">No hay precios asignados</TableCell></TableRow>
              ) : productPrices.map((pp: any) => {
                const list = priceLists.find((l: any) => l.id === pp.price_list_id);
                return (
                  <TableRow key={pp.id}>
                    <TableCell>{list ? list.name : 'Lista Desconocida'}</TableCell>
                    <TableCell>${pp.price}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" onClick={() => deletePriceMutation.mutate(pp.id)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Button variant="outlined" onClick={() => navigate('/products')}>Volver al Listado</Button>
    </Box>
  );
}
