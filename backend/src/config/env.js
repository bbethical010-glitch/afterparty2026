import dotenv from 'dotenv';

dotenv.config();

function parseOptionalBoolean(value) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'require'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

const databaseUrl = required('DATABASE_URL');
const explicitDbSsl = parseOptionalBoolean(process.env.DB_SSL);
const dbSslFromUrl = /sslmode=require|ssl=true/i.test(databaseUrl);
const managedDbHost = /(render\.com|neon\.tech|railway\.app|supabase\.co)/i.test(databaseUrl);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl,
  databaseSsl: explicitDbSsl ?? (dbSslFromUrl || managedDbHost),
  databaseSslRejectUnauthorized: parseOptionalBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED) ?? false,
  authSecret: process.env.AUTH_SECRET || 'dev-auth-secret-change-me',
  adminUsername: process.env.APP_ADMIN_USERNAME || 'admin',
  adminPassword: process.env.APP_ADMIN_PASSWORD || 'admin123',
  adminDisplayName: process.env.APP_ADMIN_DISPLAY_NAME || 'Administrator'
};
