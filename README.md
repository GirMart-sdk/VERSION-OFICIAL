# 🏆 WINNER STORE v3.5 — Enterprise E-commerce & POS

![Version](https://img.shields.io/badge/version-3.5-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.x-green)
![Prisma](https://img.shields.io/badge/ORM-Prisma-brightgreen)
![Database](https://img.shields.io/badge/DB-PostgreSQL-blue)

**Winner Store** es una plataforma integral de comercio electrónico y Punto de Venta (POS) diseñada para marcas de ropa _streetwear_. Esta versión 3.5 utiliza **Prisma ORM** y **PostgreSQL** para una gestión de datos robusta.

---

## 🚀 Características

- **Gestión Pro**: Inventario por tallas (Ropa/Calzado/Accesorios).
- **POS Neón**: Interfaz de alta velocidad para tiendas físicas con impresión térmica.
- **Pagos Seguros**: Integración con Wompi (PSE, Nequi, Tarjetas) con Sello de Integridad.
- **Notificaciones**: Centro de mensajería automatizado por WhatsApp.

---

## 🛠️ Requisitos Previos

- Node.js v18 o superior.
- Instancia de PostgreSQL (Local o Cloud).

## 🛠️ Instalación Rápida

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Configura tu `.env` (usa como base la documentación en `docs/README.md`).
3. Sincroniza la base de datos:
    ```bash
    npx prisma db push
    ```
4. Inicia el sistema:
    ```bash
    .\INICIAR_TIENDA.bat
    ```

---

## 📦 Despliegue en Producción

Sigue estos pasos para desplegar **Winner Store** en un servidor de producción (ej. VPS con Windows Server o Linux).

1.  **Clonar el Repositorio:**
    `git clone https://github.com/GirMart-sdk/VERSION-OFICIAL.git`
2.  **Instalar Dependencias de Producción:**
    `npm install --production`
3.  **Configurar la Base de Datos:**
    `npm run db:setup` (Este asistente te ayudará a crear el archivo `.env.production`).
4.  **Inicializar la Base de Datos:**
    `npm run setup` (Aplica el esquema y los datos iniciales).
5.  **Configurar Persistencia con PM2:**
    `pm2 startup` (Sigue las instrucciones que te dé) y luego `pm2 save`.
6.  **Iniciar la Aplicación:**
    `pm2 start ecosystem.config.js --env production`

---

## 📄 Documentación Adicional

| Documento           | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| API_AND_FEATURES.md | Catálogo completo de endpoints y funcionalidades.  |
| proxy/nginx.conf    | Configuración de Proxy Inverso para Producción.    |
| TECHNICAL_SPECS.md  | Detalles de implementación (Wompi, Prisma, Sharp). |
| CONTRIBUTING.md     | Guía para desarrolladores.                         |

---

## ⚖️ Propiedad Intelectual y Licencia

Este es un software **PROPIETARIO**. El código fuente, la lógica de negocio y el diseño de la interfaz son propiedad exclusiva de **GirMart-SDK**.

**PROHIBIDO:** 
- La redistribución o reventa del código.
- El uso de este sistema sin una licencia válida.
- El reclamo de autoría por parte de colaboradores externos.

Para más detalles, consulte el archivo `LICENSE` y `CONTRIBUTING.md`.

🚀 _Impulsando la cultura urbana._
