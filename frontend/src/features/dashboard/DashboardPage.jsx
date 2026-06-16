import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import BillingStatsWidget from './BillingStatsWidget';
import { authApi, healthApi } from '../../lib/api';
import { clearCurrentUser, clearToken, getCurrentUserFromStorage, setCurrentUser } from '../../lib/auth';
import { formatTimestamp, getServiceStatusColor } from '../../lib/utils';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [currentUser, setCurrentUserState] = useState(getCurrentUserFromStorage());

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [meResponse, healthResponse] = await Promise.all([authApi.me(), healthApi.backend()]);
      setCurrentUserState(meResponse.data.user);
      setCurrentUser(meResponse.data.user);
      setHealth(healthResponse.data);
    } catch (loadError) {
      if (loadError.response?.status === 401) {
        clearToken();
        clearCurrentUser();
        navigate('/login', { replace: true });
        return;
      }

      setError(loadError.response?.data?.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Stateless logout should still clear local auth state.
    } finally {
      clearToken();
      clearCurrentUser();
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Authenticated workspace</p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-stone-900">Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Phase 8 adds invoice generation, GST and discount calculation, payment tracking, PDF invoices, and patient-linked billing history on top of the existing consultation and prescription workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 transition hover:-translate-y-0.5 hover:shadow-xl" to="/appointments">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Phase 6</p>
          <h3 className="mt-3 text-xl font-semibold text-stone-900">Consultation workflow</h3>
          <p className="mt-2 text-sm text-stone-600">Open appointments, create consultation drafts, request AI suggestions, and complete doctor assessments safely.</p>
        </Link>
        <Link className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 transition hover:-translate-y-0.5 hover:shadow-xl" to="/prescriptions">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Phase 7</p>
          <h3 className="mt-3 text-xl font-semibold text-stone-900">Prescription module</h3>
          <p className="mt-2 text-sm text-stone-600">Create draft prescriptions, finalize them with doctor confirmation, and download patient-ready PDF copies.</p>
        </Link>
        <Link className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 transition hover:-translate-y-0.5 hover:shadow-xl" to="/billing">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Phase 8</p>
          <h3 className="mt-3 text-xl font-semibold text-stone-900">Billing module</h3>
          <p className="mt-2 text-sm text-stone-600">Create GST-aware invoices, record payments, generate PDF invoices, and review patient-linked billing history.</p>
        </Link>
        <Link className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 transition hover:-translate-y-0.5 hover:shadow-xl" to="/appointments">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Phase 4</p>
          <h3 className="mt-3 text-xl font-semibold text-stone-900">Appointment scheduling</h3>
          <p className="mt-2 text-sm text-stone-600">Book appointments, review calendar views, and manage scheduling status flow without double booking.</p>
        </Link>
        <Link className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 transition hover:-translate-y-0.5 hover:shadow-xl" to="/patients">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Phase 3</p>
          <h3 className="mt-3 text-xl font-semibold text-stone-900">Patient management</h3>
          <p className="mt-2 text-sm text-stone-600">Create, search, update, and review patient history placeholders within the active clinic scope.</p>
        </Link>
        <Link className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 transition hover:-translate-y-0.5 hover:shadow-xl" to="/doctors">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Phase 3</p>
          <h3 className="mt-3 text-xl font-semibold text-stone-900">Doctor management</h3>
          <p className="mt-2 text-sm text-stone-600">Maintain doctor profiles, searchable directories, and baseline weekly availability.</p>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        {loading ? (
          <LoadingState label="Loading authenticated dashboard..." />
        ) : error ? (
          <div className="md:col-span-2">
            <EmptyState
              title="Dashboard unavailable"
              description={error}
              action={
                <button
                  onClick={loadDashboard}
                  className="rounded-full bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : (
          <>
            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-stone-900">Current user</h3>
                  <p className="mt-2 text-sm text-stone-600">Stored identity from the auth flow and `/auth/me` refresh.</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {currentUser?.role || 'UNKNOWN'}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Name</dt>
                  <dd className="mt-2 text-sm font-medium text-stone-900">{currentUser?.name || 'Not available'}</dd>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Email</dt>
                  <dd className="mt-2 text-sm font-medium text-stone-900">{currentUser?.email || 'Not available'}</dd>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Role</dt>
                  <dd className="mt-2 text-sm font-medium text-stone-900">{currentUser?.role || 'Not available'}</dd>
                </div>
                <div className="rounded-2xl bg-stone-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Status</dt>
                  <dd className="mt-2 text-sm font-medium text-stone-900">
                    {currentUser?.isActive ? 'Active' : 'Inactive'}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-stone-900">Backend status</h3>
                  <p className="mt-2 text-sm text-stone-600">Health endpoint signal from the Phase 2 backend foundation.</p>
                </div>
                <span
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold"
                  style={{ color: getServiceStatusColor(health?.status) }}
                >
                  {health?.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>

              <div className="mt-6 space-y-3 text-sm text-stone-700">
                <div>Service: {health?.service || 'Not available'}</div>
                <div>Updated: {formatTimestamp(health?.timestamp)}</div>
                <div>Database: {health?.database?.status || 'Not available'}</div>
                <div>Database mode: {health?.database?.mode || 'Not available'}</div>
                <div>Clinic context: {currentUser?.clinicId || 'Not provided'}</div>
              </div>
            </article>
          </>
        )}
      </div>

      {['ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'].includes(currentUser?.role) ? <BillingStatsWidget /> : null}
    </section>
  );
};

export default DashboardPage;
