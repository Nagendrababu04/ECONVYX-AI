import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters before starting the API.');
}

export const JWT_SECRET = jwtSecret;

const envOrigins = [
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL,
]
  .filter(Boolean)
  .flatMap((url) => (url as string).split(','))
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const CLIENT_ORIGINS = Array.from(new Set([
  ...envOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
]));
