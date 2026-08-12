import {
  clearSessionCookie,
  createSessionToken,
  getSignedInUser,
  hashPassword,
  makeId,
  normalizeEmail,
  publicUser,
  readJsonBlob,
  sendJson,
  sessionCookie,
  verifyPassword,
  writeJsonBlob,
} from './_shared.js';

function readBody(request) {
  return typeof request.body === 'object' && request.body !== null ? request.body : {};
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const user = await getSignedInUser(request);
      return sendJson(response, { user: publicUser(user) });
    }

    if (request.method === 'DELETE') {
      return sendJson(response, { user: null }, 200, {
        'Set-Cookie': clearSessionCookie(),
      });
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST, DELETE');
      return sendJson(response, { error: 'Method not allowed.' }, 405);
    }

    const body = readBody(request);
    const action = body.action === 'register' ? 'register' : 'login';
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const users = await readJsonBlob('users', []);

    if (!email || !password) {
      return sendJson(response, { error: 'Email and password are required.' }, 400);
    }

    if (action === 'register') {
      if (password.length < 6) {
        return sendJson(response, { error: 'Password must be at least 6 characters.' }, 400);
      }

      if (users.some((user) => user.email === email)) {
        return sendJson(response, { error: 'An account with this email already exists.' }, 409);
      }

      const passwordResult = hashPassword(password);
      const user = {
        id: makeId('user'),
        name: String(body.name || '').trim() || email.split('@')[0],
        email,
        passwordSalt: passwordResult.salt,
        passwordHash: passwordResult.hash,
        createdAt: new Date().toISOString(),
      };

      users.push(user);
      await writeJsonBlob('users', users);

      const token = createSessionToken(user.id);
      return sendJson(response, { user: publicUser(user) }, 201, {
        'Set-Cookie': sessionCookie(token),
      });
    }

    const user = users.find((item) => item.email === email);
    if (!user || !verifyPassword(password, user)) {
      return sendJson(response, { error: 'Invalid email or password.' }, 401);
    }

    const token = createSessionToken(user.id);
    return sendJson(response, { user: publicUser(user) }, 200, {
      'Set-Cookie': sessionCookie(token),
    });
  } catch (error) {
    console.error('Authentication failed:', error);
    return sendJson(response, { error: 'Authentication service is unavailable.' }, 500);
  }
}
