import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    rollNo: '',
    department: 'BCA',
    semester: 6,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ ...form, semester: Number(form.semester) });
      navigate('/student');
    } catch (err) {
      setError(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Student Register</h1>
          <p className="text-sm text-slate-500">Apna account banao</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
          <input required value={form.name} onChange={update('name')} className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password (kam se kam 6 akshar)
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={update('password')}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Roll No</label>
          <input
            required
            value={form.rollNo}
            onChange={update('rollNo')}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input
              required
              value={form.department}
              onChange={update('department')}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
            <select
              value={form.semester}
              onChange={update('semester')}
              className={inputClass}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Account ban raha hai...' : 'Register'}
        </button>

        <p className="text-sm text-slate-600 text-center">
          Pehle se account hai?{' '}
          <Link to="/login" className="text-indigo-600 font-medium">
            Login karo
          </Link>
        </p>
      </form>
    </div>
  );
}