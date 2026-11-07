import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = location.state && location.state.registered;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <AuthLayout title="Welcome" subtitle="Apne account me login karo">
      <form onSubmit={handleSubmit} className="space-y-4">
        {justRegistered && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            Email verify ho gaya, account ban gaya. Ab login karo.
          </p>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <div className="text-right mt-1">
            <Link to="/forgot-password" className="text-sm text-indigo-600 hover:underline">
              Password bhool gaye?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 disabled:opacity-60"
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