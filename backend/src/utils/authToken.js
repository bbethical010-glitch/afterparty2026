import crypto from 'crypto';

function toBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = normalized + (pad ? '='.repeat(4 - pad) : '');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(payloadEncoded, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadEncoded)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function createAuthToken(payload, secret, expiresInSeconds = 60 * 60 * 12) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payloadEncoded = toBase64Url(JSON.stringify({ ...payload, exp }));
  const signature = sign(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifyAuthToken(token, secret) {
  if (!token || !token.includes('.')) {
    throw new Error('Invalid token format');
  }

  const [payloadEncoded, signature] = token.split('.');
  const expected = sign(payloadEncoded, secret);

  if (!signature || signature !== expected) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(fromBase64Url(payloadEncoded));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}
