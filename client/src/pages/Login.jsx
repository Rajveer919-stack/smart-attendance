import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const inputClass =
  'w-full rounded-xl border border-slate-300 pl-10 pr-3 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-500';

function FieldIcon({ d }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state && location.state.registered;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate('/' + user.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Apne account me login karo">
      <form onSubmit={handleSubmit} className="space-y-4">
        {justRegistered && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            Email verify ho gaya, account ban gaya. Ab login karo.
          </p>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <div className="relative">
            <FieldIcon d="M4 6h16v12H4zM4 7l8 6 8-6" />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@college.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <div className="relative">
            <FieldIcon d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
            <input
              type={show ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass + ' pr-16'}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:underline"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className="text-right mt-1.5">
            <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
              Password bhool gaye?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold py-3 shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60"
        >
          {busy ? 'Login ho raha hai...' : 'Login'}
        </button>

        <p className="text-sm text-slate-600 text-center">
          Student ho aur account nahi hai?{' '}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">
            Register karo
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}