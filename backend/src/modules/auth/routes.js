import { Router } from 'express';
import { z } from 'zod';
import { createAuthToken } from '../../utils/authToken.js';
import { httpError } from '../../utils/httpError.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { pool } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';

export const authRouter = Router();
const DEFAULT_BUSINESS_ID = '00000000-0000-0000-0000-000000000001';
const USER_ROLES = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'VIEWER'];

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const userCreateSchema = z.object({
  businessId: z.string().uuid().optional(),
  username: z.string().min(3).max(50),
  displayName: z.string().min(2).max(100),
  password: z.string().min(6).max(128),
  role: z.enum(USER_ROLES).default('ACCOUNTANT')
});

function normalizeUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase();
}

function getRequestBusinessId(req, explicitBusinessId) {
  return explicitBusinessId || req.user?.businessId || DEFAULT_BUSINESS_ID;
}

function requireOwner(req) {
  if (req.user?.role !== 'OWNER') {
    throw httpError(403, 'Only owner users can manage users');
  }
}

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const username = normalizeUsername(payload.username);

    const result = await pool.query(
      `SELECT id, business_id AS "businessId", username, display_name AS "displayName", role, password_hash AS "passwordHash", is_active AS "isActive"
       FROM app_users
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [username]
    );

    let user = result.rows[0];

    // Backward-compat fallback for initial bootstrap before DB user creation.
    if (!user && username === normalizeUsername(env.adminUsername) && payload.password === env.adminPassword) {
      user = {
        id: env.adminUsername,
        businessId: DEFAULT_BUSINESS_ID,
        username: env.adminUsername,
        displayName: env.adminDisplayName,
        role: 'OWNER',
        isActive: true,
        passwordHash: null
      };
    }

    if (!user || !user.isActive) {
      throw httpError(401, 'Invalid username or password');
    }

    if (user.passwordHash && !verifyPassword(payload.password, user.passwordHash)) {
      throw httpError(401, 'Invalid username or password');
    }

    await pool.query(`UPDATE app_users SET last_login_at = NOW() WHERE id = $1`, [user.id]).catch(() => {});

    const token = createAuthToken(
      {
        sub: user.id,
        username: user.username,
        businessId: user.businessId,
        name: user.displayName,
        role: user.role
      },
      env.authSecret
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        businessId: user.businessId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(httpError(400, 'Invalid login payload', error.issues));
    }
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.sub,
    username: req.user.username || req.user.sub,
    displayName: req.user.name,
    role: req.user.role,
    businessId: req.user.businessId || DEFAULT_BUSINESS_ID
  });
});

authRouter.get('/users', requireAuth, async (req, res, next) => {
  try {
    requireOwner(req);
    const businessId = getRequestBusinessId(req, req.query.businessId);
    const result = await pool.query(
      `SELECT id,
              username,
              display_name AS "displayName",
              role,
              is_active AS "isActive",
              created_at AS "createdAt",
              last_login_at AS "lastLoginAt"
       FROM app_users
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [businessId]
    );
    res.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/users', requireAuth, async (req, res, next) => {
  try {
    requireOwner(req);
    const payload = userCreateSchema.parse(req.body);
    const businessId = getRequestBusinessId(req, payload.businessId);
    const username = normalizeUsername(payload.username);
    const passwordHash = hashPassword(payload.password);

    const inserted = await pool.query(
      `INSERT INTO app_users (
         business_id,
         username,
         display_name,
         password_hash,
         role,
         is_active,
         created_by
       ) VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING id,
                 username,
                 display_name AS "displayName",
                 role,
                 is_active AS "isActive",
                 created_at AS "createdAt"`,
      [businessId, username, payload.displayName.trim(), passwordHash, payload.role, req.user.sub]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(httpError(400, 'Invalid user payload', error.issues));
    }
    if (error?.code === '23505') {
      return next(httpError(409, 'Username already exists'));
    }
    next(error);
  }
});
