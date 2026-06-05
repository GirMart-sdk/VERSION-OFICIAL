import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { defineConfig } from '@prisma/config';

// 1. Carga inteligente de configuración (prioriza .env.production)
const prodEnv = path.resolve(process.cwd(), '.env.production');
const envPath = fs.existsSync(prodEnv) ? prodEnv : path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

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
