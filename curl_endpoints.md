# API Endpoints - cURL Commands

## Public Endpoints

### Health Check
```bash
curl -X GET https://api.veggyfresh.com
```

---

## Auth

### POST /auth/signup
```bash
curl -X POST https://api.veggyfresh.com/auth/signup \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"John Doe","email":"john@example.com","password":"super-secure-password123"}'
```

### POST /auth/login
```bash
curl -X POST https://api.veggyfresh.com/auth/login \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"john@example.com","password":"super-secure-password123"}'
```

### POST /auth/refresh
```bash
curl -X POST https://api.veggyfresh.com/auth/refresh \
  -H "Content-Type: application/json" \
  --data-raw '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

---

## Portal Auth

### POST /portal/auth/login
```bash
curl -X POST https://api.veggyfresh.com/portal/auth/login \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"customer@email.com","password":"customer-pwd123"}'
```

---

## WhatsApp

### POST /whatsapp/send
```bash
curl -X POST https://api.veggyfresh.com/whatsapp/send \
  -H "Content-Type: application/json" \
  --data-raw '{"to":"5491122334455","text":"Hola! Ya recibimos tu pedido."}'
```

---

## AI

### POST /ai/interpret
```bash
curl -X POST https://api.veggyfresh.com/ai/interpret \
  -H "Content-Type: application/json" \
  --data-raw '{"message":"Hola, quiero comprar tomates","context":{}}'
```

---

## Organizations (Authenticated)

### POST /organizations (Create)
```bash
curl -X POST https://api.veggyfresh.com/organizations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Mi Organización","domain":"mi-org.com"}'
```

### GET /organizations/:id
```bash
curl -X GET https://api.veggyfresh.com/organizations/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /organizations/:id
```bash
curl -X PATCH https://api.veggyfresh.com/organizations/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Mi Organización Actualizada"}'
```

---

## Users (Authenticated)

### POST /users (Create)
```bash
curl -X POST https://api.veggyfresh.com/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"newuser@email.com","password":"secure-pwd123456","role":"client"}'
```

### GET /users (List)
```bash
curl -X GET "https://api.veggyfresh.com/users?search=&order_by=created_at&order=asc&limit=25&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /users/:id
```bash
curl -X GET https://api.veggyfresh.com/users/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /users/:id
```bash
curl -X PATCH https://api.veggyfresh.com/users/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"newuser_updated@email.com"}'
```

### DELETE /users/:id
```bash
curl -X DELETE https://api.veggyfresh.com/users/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Suppliers (Authenticated)

### POST /suppliers (Create)
```bash
curl -X POST https://api.veggyfresh.com/suppliers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Proveedor SA","email":"contacto@proveedor.com","phone_number":"+525512345678"}'
```

### GET /suppliers (List)
```bash
curl -X GET "https://api.veggyfresh.com/suppliers?search=&order_by=created_at&order=asc&limit=25&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /suppliers/:id
```bash
curl -X GET https://api.veggyfresh.com/suppliers/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /suppliers/:id
```bash
curl -X PATCH https://api.veggyfresh.com/suppliers/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Proveedor Actualizado"}'
```

### DELETE /suppliers/:id
```bash
curl -X DELETE https://api.veggyfresh.com/suppliers/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Clients (Authenticated)

### POST /clients (Create)
```bash
curl -X POST https://api.veggyfresh.com/clients \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Supermercado La Esquina","phone_number":"5491112345678","email":"ventas@supermercado.com"}'
```

### GET /clients (List)
```bash
curl -X GET "https://api.veggyfresh.com/clients?search=&order_by=created_at&order=asc&limit=25&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /clients/:id
```bash
curl -X GET https://api.veggyfresh.com/clients/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /clients/:id
```bash
curl -X PATCH https://api.veggyfresh.com/clients/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Supermercado Actualizado"}'
```

### DELETE /clients/:id
```bash
curl -X DELETE https://api.veggyfresh.com/clients/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /clients/:id/portal-access (Activate)
```bash
curl -X POST https://api.veggyfresh.com/clients/:id/portal-access \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /clients/:id/portal-access/reset-setup-link
```bash
curl -X POST https://api.veggyfresh.com/clients/:id/portal-access/reset-setup-link \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Products (Authenticated)

### POST /products (Create)
```bash
curl -X POST https://api.veggyfresh.com/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"sku":"TOM-001","name":"Tomate perita","supplier_id":"550e8400-e29b-41d4-a716-446655440000"}'
```

### GET /products (List)
```bash
curl -X GET "https://api.veggyfresh.com/products?search=&order_by=created_at&order=asc&limit=25&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /products/:id
```bash
curl -X GET https://api.veggyfresh.com/products/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /products/:id
```bash
curl -X PATCH https://api.veggyfresh.com/products/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Tomate perita Actualizado"}'
```

### DELETE /products/:id
```bash
curl -X DELETE https://api.veggyfresh.com/products/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Product Prices (Authenticated)

### POST /product-prices (Create)
```bash
curl -X POST https://api.veggyfresh.com/product-prices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"product_id":"550e8400-e29b-41d4-a716-446655440001","price":25.5}'
```

### GET /product-prices (List)
```bash
curl -X GET https://api.veggyfresh.com/product-prices \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /product-prices/:id
```bash
curl -X GET https://api.veggyfresh.com/product-prices/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /product-prices/:id
```bash
curl -X PATCH https://api.veggyfresh.com/product-prices/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"price":30.0}'
```

### DELETE /product-prices/:id
```bash
curl -X DELETE https://api.veggyfresh.com/product-prices/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Price Lists (Authenticated)

### POST /price-lists (Create)
```bash
curl -X POST https://api.veggyfresh.com/price-lists \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Precio Cliente VIP"}'
```

### GET /price-lists (List)
```bash
curl -X GET "https://api.veggyfresh.com/price-lists?search=&order_by=created_at&order=asc&limit=25&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /price-lists/:id
```bash
curl -X GET https://api.veggyfresh.com/price-lists/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /price-lists/:id
```bash
curl -X PATCH https://api.veggyfresh.com/price-lists/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"name":"Precio Cliente VIP Actualizado"}'
```

### DELETE /price-lists/:id
```bash
curl -X DELETE https://api.veggyfresh.com/price-lists/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Purchases (Authenticated)

### GET /purchases (List)
```bash
curl -X GET https://api.veggyfresh.com/purchases \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /purchases (Create)
```bash
curl -X POST https://api.veggyfresh.com/purchases \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "supplier_id=550e8400-e29b-41d4-a716-446655440000" \
  -F 'items[0]={"product_id":"550e8400-e29b-41d4-a716-446655440000","quantity":10.0,"unit_cost":34.9}'
```

### GET /purchases/:id
```bash
curl -X GET https://api.veggyfresh.com/purchases/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Orders (Authenticated)

### GET /orders (List)
```bash
curl -X GET "https://api.veggyfresh.com/orders?created_filter=all&order_by=created_at&order=desc&limit=25&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /orders (Create)
```bash
curl -X POST https://api.veggyfresh.com/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"client_id":"550e8400-e29b-41d4-a716-446655440001","user_id":"550e8400-e29b-41d4-a716-446655440000","origin":"WHATSAPP","items":[{"product_id":"550e8400-e29b-41d4-a716-446655440000","quantity":3,"unit_price":25.5}],"status":"PENDING_REVIEW","delivery_date":"2026-06-01T12:00:00.000Z"}'
```

### GET /orders/:id
```bash
curl -X GET https://api.veggyfresh.com/orders/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### PATCH /orders/:id
```bash
curl -X PATCH https://api.veggyfresh.com/orders/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"status":"SHIPPED"}'
```

### DELETE /orders/:id
```bash
curl -X DELETE https://api.veggyfresh.com/orders/:id \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Inventory (Authenticated)

### GET /inventory/inventory (Snapshot)
```bash
curl -X GET https://api.veggyfresh.com/inventory/inventory \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### GET /inventory/inventory/movements (History)
```bash
curl -X GET https://api.veggyfresh.com/inventory/inventory/movements \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### POST /inventory/inventory/adjustments (Adjust Stock)
```bash
curl -X POST https://api.veggyfresh.com/inventory/inventory/adjustments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{"product_id":"550e8400-e29b-41d4-a716-446655440000","quantity":-1.25,"reason":"Merma por almacenamiento"}'
```

---

## Portal Orders (Customer Portal)

### GET /portal/orders (List)
```bash
curl -X GET "https://api.veggyfresh.com/portal/orders?created_filter=all&order_by=created_at&order=desc&limit=25&offset=0" \
  -H "Authorization: Bearer PORTAL_ACCESS_TOKEN"
```

### GET /portal/orders/:id (Find by ID)
```bash
curl -X GET https://api.veggyfresh.com/portal/orders/:id \
  -H "Authorization: Bearer PORTAL_ACCESS_TOKEN"
```
