import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { ROLES } from '../../constants/roles';
import { userApi, providersApi } from '../../lib/api';

const FIELD_CLASS =
  'rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const UsersAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await userApi.list();
      setUsers(response.data?.users || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const response = await providersApi.getProviders({ limit: 100 });
      setProviders(response?.data?.items || response?.items || []);
    } catch (err) {
      console.error('Failed to load operational units', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadProviders();
  }, []);

  const handleRoleChange = async (userId, role) => {
    setMessage('');
    try {
      await userApi.updateRole(userId, { role });
      setMessage('User role updated.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update user role.');
    }
  };

  const handleStatusToggle = async (user) => {
    setMessage('');
    try {
      await userApi.updateStatus(user._id, { isActive: !user.isActive });
      setMessage(`User ${user.isActive ? 'deactivated' : 'activated'}.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update user status.');
    }
  };

  const handleProviderChange = async (userId, providerId) => {
    setMessage('');
    try {
      await userApi.updateProvider(userId, { providerId: providerId || null });
      setMessage('User assignment updated.');
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update user assignment.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading users..." />;
  }

  if (error && !users.length) {
    return <ErrorState title="User administration unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Control clinic user roles and account activation status."
      />

      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg shadow-stone-200/40">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-[0.18em] text-stone-500">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Assigned Unit</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const showProviderDropdown = [ROLES.PHARMACIST, ROLES.LAB_TECHNICIAN].includes(user.role);
              const filteredProviders = providers.filter(p => {
                if (user.role === ROLES.PHARMACIST) return p.providerType === 'Pharmacy';
                if (user.role === ROLES.LAB_TECHNICIAN) return p.providerType === 'Laboratory';
                return false;
              });

              return (
                <tr key={user._id} className="border-t border-stone-100">
                  <td className="px-6 py-4 font-medium text-stone-900">{user.name}</td>
                  <td className="px-6 py-4 text-stone-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <select
                      className={FIELD_CLASS}
                      value={user.role}
                      onChange={(event) => handleRoleChange(user._id, event.target.value)}
                    >
                      {Object.values(ROLES).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    {showProviderDropdown ? (
                      <select
                        className={FIELD_CLASS}
                        value={user.providerId || ''}
                        onChange={(event) => handleProviderChange(user._id, event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {filteredProviders.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-stone-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{user.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(user)}
                      className="rounded-2xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      {user.isActive
                        ? 'Deactivate'
                        : user.role === ROLES.DOCTOR
                        ? 'Approve & Activate'
                        : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default UsersAdminPage;
