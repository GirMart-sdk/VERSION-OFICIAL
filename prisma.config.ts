import * as dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from '@prisma/config';

// 1. Carga garantizada del .env desde la raíz del proyecto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

// Verificamos la URL antes de exportar para evitar errores silenciosos
if (!databaseUrl) {
    throw new Error('❌ Error Crítico: DATABASE_URL no definida en el archivo .env raíz.');
}

export default defineConfig({
    datasource: {
        url: databaseUrl,
    },
    migrations: {
        seed: 'node backend/seed.js',
    },
});
