const request = require('supertest');
const app = require('../server');
const { describe, beforeAll, afterAll, it, expect } = require('@jest/globals');
const { prisma } = require('../database');
const { scryptSync } = require('crypto');

const HASH_SALT = process.env.HASH_SALT || "winner_secure_salt_2026";

describe('Auth Endpoints', () => {
  let testUser;

  // Antes de todas las pruebas, creamos un usuario de prueba en la BD
  beforeAll(async () => {
    const passwordHash = scryptSync('testpassword', HASH_SALT, 64).toString('hex');
    testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'testuser@winner.com',
        password: passwordHash,
        role: 'user',
      },
    });
  });

  // Después de todas las pruebas, limpiamos el usuario de prueba
  afterAll(async () => {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/login', () => {
    it('debería autenticar al usuario y devolver un token JWT con credenciales correctas', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          user: 'testuser',
          pass: 'testpassword',
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user', 'testuser');
      expect(response.body).toHaveProperty('role', 'user');
      // La cookie debe estar presente
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('debería rechazar el login con contraseña incorrecta', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          user: 'testuser',
          pass: 'wrongpassword',
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });

    it('debería rechazar el login con usuario inexistente', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          user: 'nonexistentuser',
          pass: 'somepassword',
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error', 'Credenciales inválidas');
    });
  });
});