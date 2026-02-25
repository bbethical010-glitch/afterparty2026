import { pool } from './pool.js';

export async function ensureRuntimeArtifacts() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL DEFAULT 'SYSTEM',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_json JSONB,
      after_json JSONB,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created_at ON audit_logs (business_id, created_at DESC)`
  );

  await pool.query(`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(
    `ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reversed_by_voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL`
  );
  await pool.query(
    `ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reversed_from_voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL`
  );
  await pool.query(
    `ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT FALSE`
  );
}
