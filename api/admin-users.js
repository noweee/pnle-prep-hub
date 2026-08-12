import {
  getSignedInUser,
  normalizeUserAccess,
  publicUser,
  readJsonBlob,
  sendJson,
  writeJsonBlob,
} from './_shared.js';

function readBody(request) {
  return typeof request.body === 'object' && request.body !== null ? request.body : {};
}

function sortedUsers(users) {
  return users
    .map((user) => publicUser(user))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export default async function handler(request, response) {
  try {
    const signedInUser = await getSignedInUser(request);

    if (!signedInUser?.isAdmin) {
      return sendJson(response, { error: 'Admin account required.' }, 403);
    }

    const storedUsers = await readJsonBlob('users', []);
    const users = storedUsers.map((user) => normalizeUserAccess(user, storedUsers));

    if (request.method === 'GET') {
      return sendJson(response, { users: sortedUsers(users) });
    }

    if (request.method !== 'PATCH') {
      response.setHeader('Allow', 'GET, PATCH');
      return sendJson(response, { error: 'Method not allowed.' }, 405);
    }

    const body = readBody(request);
    const targetUser = users.find((user) => user.id === body.userId);

    if (!targetUser) {
      return sendJson(response, { error: 'User not found.' }, 404);
    }

    if (targetUser.id === signedInUser.id && body.isEnabled === false) {
      return sendJson(response, { error: 'You cannot disable your own admin account.' }, 400);
    }

    if (targetUser.id === signedInUser.id && body.isAdmin === false) {
      return sendJson(response, { error: 'You cannot remove your own admin role.' }, 400);
    }

    const updatedUsers = users.map((user) => {
      if (user.id !== targetUser.id) return user;

      return {
        ...user,
        isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : user.isEnabled,
        isAdmin: typeof body.isAdmin === 'boolean' ? body.isAdmin : user.isAdmin,
      };
    });

    await writeJsonBlob('users', updatedUsers);

    return sendJson(response, { users: sortedUsers(updatedUsers) });
  } catch (error) {
    console.error('Admin user management failed:', error);
    return sendJson(response, { error: 'Admin user management is unavailable.' }, 500);
  }
}
