import { User } from '../types';

interface AdminUsersResponse {
  users?: User[];
  error?: string;
}

async function parseAdminUsersResponse(response: Response): Promise<User[]> {
  const data = (await response.json()) as AdminUsersResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to load users.');
  }

  return Array.isArray(data.users) ? data.users : [];
}

export async function fetchAdminUsers(): Promise<User[]> {
  const response = await fetch('/api/admin-users', {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseAdminUsersResponse(response);
}

export async function updateAdminUser(userId: string, updates: Partial<Pick<User, 'isAdmin' | 'isEnabled'>>): Promise<User[]> {
  const response = await fetch('/api/admin-users', {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, ...updates }),
  });

  return parseAdminUsersResponse(response);
}
