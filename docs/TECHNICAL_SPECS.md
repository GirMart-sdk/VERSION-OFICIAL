# 📖 Especificaciones Técnicas - Winner Store v3.5

Este documento detalla la implementación técnica de los módulos críticos actualizados.

## 🐘 Prisma & PostgreSQL

Se utiliza **Prisma** como capa de acceso a datos para garantizar transacciones atómicas.

- **Ventas:** Cada venta (`Sale`) se registra mediante un `$transaction` que valida el stock en la tabla `Inventory` antes de confirmar, evitando sobreventas.
- **Abonos:** Los apartados físicos se gestionan en la relación `SalePayment`, permitiendo múltiples ingresos de dinero para una misma referencia.

## 💳 Integración de Wompi

El sistema implementa el **Sello de Integridad** (HMAC-SHA256) para asegurar que los montos no sean alterados en el cliente.

- **Flujo:** El backend genera el hash usando `reference`, `amountInCents`, `currency` y el `integrity_secret`.
- **Campo:** El hash se envía al Web Widget de Wompi estrictamente bajo el nombre de propiedad `integrity`.
- **Webhook:** Ubicado en `/api/webhooks/wompi`, procesa eventos `transaction.updated` para sincronizar automáticamente el estado de la venta y registrar el ingreso contable en la base de datos.

## 🖼️ Gestión de Medios (Storage)

Se ha eliminado la dependencia de servicios externos de almacenamiento.

1.  **Captura:** El frontend utiliza `Cropper.js` para forzar un aspect-ratio 1:1.
2.  **Envío:** La imagen recortada se envía al servidor como Base64.
3.  **Procesamiento:** El servidor utiliza `Sharp` para:
    - Redimensionar a un máximo de 1200px.
    - Convertir a formato **WebP** (calidad 80).
    - Almacenar en la carpeta física `/uploads`.

## 📈 Analytics y Dashboard

El dashboard realiza agregaciones directas en la base de datos mediante Prisma:

- **Revenue:** Calcula el total recibido sumando ventas completadas y abonos parciales.
- **Top Products:** Agrupa por `productId` en la tabla `SaleItem` para identificar tendencias de venta.
- **Stock Crítico:** Filtro dinámico que detecta productos con menos de 5 unidades totales en todas sus tallas.

## 📱 WhatsApp Center

El módulo `messaging.js` genera URLs dinámicas usando la API `wa.me`.

- **Formatos:** Incluye plantillas predefinidas para envío de comprobantes de pago (PDF generado por el backend), confirmación de despacho con número de guía y recordatorios de pago para créditos locales.

## ⚙️ Configuración de Puertos

El servidor cuenta con una función de **Auto-Incremento de Puerto**. Si el puerto `3000` está ocupado, buscará automáticamente el `3001` y así sucesivamente, notificando el cambio en la consola para evitar colisiones con otros servicios locales.

---

_Documentación técnica actualizada al 4 de junio de 2026._
