import dotenv from 'dotenv';

dotenv.config();

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: required('DATABASE_URL'),
  authSecret: process.env.AUTH_SECRET || 'dev-auth-secret-change-me',
  adminUsername: process.env.APP_ADMIN_USERNAME || 'admin',
  adminPassword: process.env.APP_ADMIN_PASSWORD || 'admin123',
  adminDisplayName: process.env.APP_ADMIN_DISPLAY_NAME || 'Administrator'
};
