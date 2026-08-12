import { User } from '../types';

interface AuthResponse {
  user?: User | null;
  error?: string;
}

async function parseAuthResponse(response: Response): Promise<User | null> {
  const data = (await response.json()) as AuthResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Unable to access your account.');
  }

  return data.user || null;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch('/api/auth', {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  return parseAuthResponse(response);
}

export async function signIn(email: string, password: string): Promise<User | null> {
  const response = await fetch('/api/auth', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'login', email, password }),
  });

  return parseAuthResponse(response);
}

export async function registerAccount(name: string, email: string, password: string): Promise<User | null> {
  const response = await fetch('/api/auth', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'register', name, email, password }),
  });

  return parseAuthResponse(response);
}

export async function signOut(): Promise<void> {
  const response = await fetch('/api/auth', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const data = (await response.json()) as AuthResponse;
    throw new Error(data.error || 'Unable to sign out.');
  }
}
