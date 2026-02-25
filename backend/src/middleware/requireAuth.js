import { env } from '../config/env.js';
import { verifyAuthToken } from '../utils/authToken.js';
import { httpError } from '../utils/httpError.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(httpError(401, 'Missing or invalid authorization token'));
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyAuthToken(token, env.authSecret);
    req.user = payload;
    return next();
  } catch (_error) {
    return next(httpError(401, 'Authentication failed'));
  }
}
