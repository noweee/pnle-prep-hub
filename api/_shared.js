import { get, put } from '@vercel/blob';
import crypto from 'node:crypto';

const SESSION_COOKIE = 'pnle_session';
const STORE_PREFIX = 'pnle-prep-hub';

export function sendJson(response, data, status = 200, headers = {}) {
  response.status(status);
  response.setHeader('Cache-Control', 'no-store');
  Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  response.json(data);
}

export function getStorePath(name) {
  return `${STORE_PREFIX}/${name}.json`;
}

export async function readJsonBlob(name, fallback) {
  try {
    const result = await get(getStorePath(name), { access: 'private' });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return fallback;
    }

    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch (error) {
    if (error?.name === 'BlobNotFoundError') {
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonBlob(name, data) {
  await put(getStorePath(name), JSON.stringify(data, null, 2), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
}

function getSecret() {
  return process.env.AUTH_SECRET || process.env.BLOB_READ_WRITE_TOKEN || 'pnle-dev-secret';
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

export function createSessionToken(userId) {
  const payload = {
    userId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function readSessionToken(request) {
  const cookies = request.cookies || {};
  if (cookies[SESSION_COOKIE]) return cookies[SESSION_COOKIE];

  const cookieHeader = request.headers.cookie || '';
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;

  const [encoded, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', getSecret()).update(encoded).digest('base64url');

  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.userId || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    isAdmin: Boolean(user.isAdmin),
    isEnabled: Boolean(user.isEnabled),
  };
}

export function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

export function normalizeUserAccess(user, users) {
  const configuredAdmins = adminEmails();
  const isConfiguredAdmin = configuredAdmins.includes(normalizeEmail(user.email));
  const isFirstUser = users.length === 0;
  const isAdmin = Boolean(user.isAdmin) || isConfiguredAdmin || isFirstUser;

  return {
    ...user,
    isAdmin,
    isEnabled: user.isEnabled === undefined ? isAdmin : Boolean(user.isEnabled),
  };
}

export async function getSignedInUser(request) {
  const payload = verifySessionToken(readSessionToken(request));
  if (!payload) return null;

  const users = await readJsonBlob('users', []);
  const user = users.find((item) => item.id === payload.userId);
  return user ? normalizeUserAccess(user, users) : null;
}
