import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';

const LoginPage = () => {
  const { login, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated && !loading) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const authData = await login(form);
      navigate(location.state?.from?.pathname || getDefaultRouteForRole(authData?.user?.role), { replace: true });
    } catch (loginError) {
      setError(loginError?.response?.data?.message || loginError?.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-100 via-white to-emerald-50 px-4">
      <Card className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">AI-CMS</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Sign in</h1>
        <p className="mt-2 text-sm text-stone-600">Access the clinic dashboard with your authenticated account.</p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Email</span>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="admin@aicms.local"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Password</span>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? <ErrorState title="Sign-in failed" description={error} /> : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          Need an account?{' '}
          <Link className="font-semibold text-emerald-700 hover:text-emerald-800" to="/register">
            Register here
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default LoginPage;
