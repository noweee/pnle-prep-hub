import { useState } from 'react';
import { LogIn, LogOut, UserPlus, UserRound } from 'lucide-react';
import { User } from '../types';
import { registerAccount, signIn, signOut } from '../lib/authApi';

interface AccountPanelProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export default function AccountPanel({ user, onUserChange }: AccountPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setError('');

    try {
      const nextUser = mode === 'register'
        ? await registerAccount(name, email, password)
        : await signIn(email, password);

      onUserChange(nextUser);
      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account request failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    try {
      await signOut();
      onUserChange(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unable to sign out.');
    } finally {
      setIsBusy(false);
    }
  };

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="nav-button" style={{ cursor: 'default' }}>
          <UserRound size={16} />
          <span>{user.name}{!user.isEnabled ? ' (Pending)' : ''}</span>
        </span>
        <button className="nav-button" onClick={handleSignOut} disabled={isBusy}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <button className="nav-button" onClick={() => setIsOpen(true)}>
        <LogIn size={16} />
        <span>Student Login</span>
      </button>

      {isOpen && (
        <div className="modal-overlay account-modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                {mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
                {mode === 'register' ? 'Create Student Account' : 'Student Login'}
              </h3>
              <button className="modal-close" onClick={() => { setIsOpen(false); resetForm(); }}>
                X
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </div>

              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  {error}
                </p>
              )}

              {mode === 'register' && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                  New accounts are pending by default. An admin must enable access before questions can be opened.
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={isBusy} style={{ width: '100%', padding: '12px' }}>
                {isBusy ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register');
                setError('');
              }}
            >
              {mode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
