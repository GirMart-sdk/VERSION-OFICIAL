const request = require('supertest');
const app = require('./server'); // Importamos nuestra app de Express
const { describe, afterAll, it, expect } = require('@jest/globals');
const { prisma } = require('./database'); // Importamos prisma para desconectar

// eslint-disable-next-line no-undef
// Cargar variables de entorno para la prueba
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
// eslint-disable-next-line no-undef
// Describimos el conjunto de pruebas para el endpoint de Health
describe('GET /api/health', () => {

  // Después de que todas las pruebas en este archivo terminen, cerramos la conexión a la BD
  // para evitar que Jest se quede colgado.
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('debería responder con estado 200 y un objeto de estado si la API Key es correcta', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('x-api-key', process.env.ADMIN_API_KEY); // El endpoint requiere la API Key de admin

    // Verificamos el código de estado
    expect(response.statusCode).toBe(200);

    // Verificamos el cuerpo de la respuesta
    expect(response.body).toEqual({
      status: 'online',
      version: '3.5',
      database: 'connected',
      timestamp: expect.any(String) // Verificamos que timestamp sea un string, ya que el valor exacto cambia
    });
  });

  it('debería responder con estado 401 si la API Key es incorrecta o no se provee', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('x-api-key', 'una-clave-incorrecta');

    // El middleware de autenticación debería devolver 401 Unauthorized
    expect(response.statusCode).toBe(401);
  });
});