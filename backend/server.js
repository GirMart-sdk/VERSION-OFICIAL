const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiados intentos. Por seguridad, bloqueado por 15 min." }
};
