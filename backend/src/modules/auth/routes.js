import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { createAuthToken } from '../../utils/authToken.js';
import { httpError } from '../../utils/httpError.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

authRouter.post('/login', (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    if (payload.username !== env.adminUsername || payload.password !== env.adminPassword) {
      throw httpError(401, 'Invalid username or password');
    }

    const user = {
      username: env.adminUsername,
      displayName: env.adminDisplayName,
      role: 'OWNER'
    };

    const token = createAuthToken(
      {
        sub: user.username,
        name: user.displayName,
        role: user.role
      },
      env.authSecret
    );

    res.json({ token, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(httpError(400, 'Invalid login payload', error.issues));
    }
    next(error);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    username: req.user.sub,
    displayName: req.user.name,
    role: req.user.role
  });
});
