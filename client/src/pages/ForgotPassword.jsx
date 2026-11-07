import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot', { email });
      setNotice(data.message);
      setStep(2);
      setWait(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset', { email, otp, newPassword });
      setNotice(data.message);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Password bhool gaye?"
      subtitle="Email par OTP aayega, usse naya password banao"
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {notice && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>
        )}

        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-3">
            <div>
              <label className={labelClass}>Apna registered email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Bheja ja raha hai...' : 'OTP bhejo'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={reset} className="space-y-3">
            <div>
              <label className={labelClass}>6 ank ka OTP</label>
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className={inputClass + ' text-center text-2xl tracking-widest'}
              />
            </div>
            <div>
              <label className={labelClass}>Naya password (kam se kam 6 akshar)</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Badal raha hai...' : 'Password badlo'}
            </button>
            <button
              type="button"
              disabled={wait > 0 || busy}
              onClick={() => sendOtp()}
              className="w-full text-sm text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {wait > 0 ? 'Dobara bhejo (' + wait + 's)' : 'Dobara OTP bhejo'}
            </button>
          </form>
        )}

        {step === 3 && (
          <Link
            to="/login"
            className="block text-center w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700"
          >
            Login par jao
          </Link>
        )}

        {step !== 3 && (
          <p className="text-sm text-center">
            <Link to="/login" className="text-indigo-600 hover:underline">
              Wapas login par
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}