import { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { User } from '../types';
import { fetchAdminUsers, updateAdminUser } from '../lib/adminApi';

interface AdminUsersPanelProps {
  currentUser: User;
}

export default function AdminUsersPanel({ currentUser }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const loadedUsers = await fetchAdminUsers();
      setUsers(loadedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleEnabled = async (user: User) => {
    setBusyUserId(user.id);
    setError('');

    try {
      const updatedUsers = await updateAdminUser(user.id, { isEnabled: !user.isEnabled });
      setUsers(updatedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update account.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleToggleAdmin = async (user: User) => {
    setBusyUserId(user.id);
    setError('');

    try {
      const updatedUsers = await updateAdminUser(user.id, { isAdmin: !user.isAdmin });
      setUsers(updatedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update admin role.');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-heading)' }}>Account Access</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review student accounts and approve who can open the simulator and questions.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '16px' }}>
          {error}
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading accounts...</p>
        ) : users.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No accounts have been created yet.</p>
        ) : (
          <div className="data-table-container" style={{ marginTop: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isBusy = busyUserId === user.id;
                  const isSelf = currentUser.id === user.id;

                  return (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${user.isEnabled ? 'badge-success' : 'badge-warning'}`}>
                          {user.isEnabled ? 'Enabled' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.isAdmin ? 'badge-info' : 'badge-primary'}`}>
                          {user.isAdmin ? 'Admin' : 'Student'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className={`btn ${user.isEnabled ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleToggleEnabled(user)}
                            disabled={isBusy || (isSelf && user.isEnabled)}
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            title={isSelf ? 'You cannot disable your own account' : undefined}
                          >
                            {user.isEnabled ? <UserX size={14} /> : <UserCheck size={14} />}
                            {user.isEnabled ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleToggleAdmin(user)}
                            disabled={isBusy || (isSelf && user.isAdmin)}
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            title={isSelf ? 'You cannot remove your own admin role' : undefined}
                          >
                            <ShieldCheck size={14} />
                            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
