# TODO: Fix 400 en POST /api/sales (POS)

- [ ] Ajustar Joi `createSaleSchema` en `backend/services/salesValidator.js` para que el POS pase la validación:
  - [ ] Permitir `sale.id` que no empiece por `ON...` (o generar ON... en backend)
  - [ ] Hacer `customer_email` opcional en POS (evitar required email si viene vacío)
  - [ ] Cambiar `saleItemSchema` para que `productId` no sea requerido si `id` existe (POS envía `id` pero no `productId`)
  - [ ] Aceptar `timestamp` no-iso si viene del POS (`nowStr()`)
- [ ] (Opcional) Normalizar en backend `req.body` antes de `SalesService.createSale` para rellenar campos faltantes.

Criterio de éxito:
- [ ] `POST /api/sales` desde POS deja de devolver 400.
- [ ] No se rompe el checkout online (si usas `registerOnlineSale`).

