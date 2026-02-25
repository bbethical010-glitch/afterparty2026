import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

function parseOptionalBoolean(value) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'require'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

async function main() {
  const sqlPathArg = process.argv[2];
  if (!sqlPathArg) {
    throw new Error('Usage: node scripts/run-sql.js <sql-file-path>');
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envCandidates = [path.resolve(process.cwd(), '.env'), path.resolve(__dirname, '../.env')];
  const envPath = envCandidates.find((candidate) => fsSync.existsSync(candidate));
  if (envPath) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL in environment');
  }

  const explicitDbSsl = parseOptionalBoolean(process.env.DB_SSL);
  const dbSslFromUrl = /sslmode=require|ssl=true/i.test(databaseUrl);
  const managedDbHost = /(render\.com|neon\.tech|railway\.app|supabase\.co)/i.test(databaseUrl);
  const useSsl = explicitDbSsl ?? (dbSslFromUrl || managedDbHost);
  const rejectUnauthorized = parseOptionalBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED) ?? false;

  const sqlPath = path.resolve(__dirname, sqlPathArg);
  const sql = await fs.readFile(sqlPath, 'utf8');

  const poolConfig = { connectionString: databaseUrl };
  if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized };
  }

  const pool = new Pool(poolConfig);
  const client = await pool.connect();

  try {
    await client.query(sql);
    console.log(`Executed SQL file: ${sqlPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('SQL runner failed.');
  if (error?.message) {
    console.error(`message: ${error.message}`);
  }
  if (error?.code) {
    console.error(`code: ${error.code}`);
  }
  if (error?.stack) {
    console.error(error.stack);
  } else {
    console.error(error);
  }
  if (Array.isArray(error?.errors)) {
    for (const nested of error.errors) {
      console.error('nested:', nested?.message || nested);
    }
  }
  process.exit(1);
});
