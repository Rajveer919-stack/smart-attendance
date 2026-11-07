import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/AuthLayout';

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

export default function Register() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ departments: [], semesters: [], maxRoll: 300, classes: [] });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    semester: '',
    rollNo: '',
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    api
      .get('/auth/classes')
      .then((res) => setMeta(res.data))
      .catch(() => setError('Server se connect nahi ho pa raha'));
  }, []);

  // Resend ka 60 second wala countdown
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const classHasSubjects =
    !form.department ||
    !form.semester ||
    meta.classes.some(
      (c) => c.department === form.department && String(c.semester) === String(form.semester)
    );

  const sendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register/request', form);
      setNotice(data.message);
      setStep(2);
      setWait(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/register/verify', { email: form.email, otp });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      wide
      title="Student Register"
      subtitle={step === 1 ? 'Apni details bharo, email par OTP aayega' : 'Email par aaya OTP daalo'}
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {notice && step === 2 && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>
        )}

        {step === 1 && (
          <form onSubmit={sendOtp} className="space-y-3">
            <div>
              <label className={labelClass}>Poora naam</label>
              <input required value={form.name} onChange={set('name')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={set('email')}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Password (kam se kam 6 akshar)</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={set('password')}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Department</label>
                <select required value={form.department} onChange={set('department')} className={inputClass}>
                  <option value="">Chuno</option>
                  {meta.departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Semester</label>
                <select required value={form.semester} onChange={set('semester')} className={inputClass}>
                  <option value="">Chuno</option>
                  {meta.semesters.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {!classHasSubjects && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Is class ke abhi subject nahi bane hai. Admin se subject banwao, tab register hoga.
              </p>
            )}
            <div>
              <label className={labelClass}>{'Roll number (1 se ' + meta.maxRoll + ')'}</label>
              <input
                type="number"
                required
                min={1}
                max={meta.maxRoll}
                step={1}
                value={form.rollNo}
                onChange={set('rollNo')}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'OTP bheja ja raha hai...' : 'OTP bhejo'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verify} className="space-y-3">
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
            <button
              type="submit"
              disabled={busy || otp.length !== 6}
              className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Check ho raha hai...' : 'Verify karke account banao'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setError('');
                }}
                className="text-slate-600 hover:underline"
              >
                Details badlo
              </button>
              <button
                type="button"
                disabled={wait > 0 || busy}
                onClick={() => sendOtp()}
                className="text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                {wait > 0 ? 'Dobara bhejo (' + wait + 's)' : 'Dobara OTP bhejo'}
              </button>
            </div>
          </form>
        )}

        <p className="text-sm text-slate-600 text-center">
          Pehle se account hai?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Login karo
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}