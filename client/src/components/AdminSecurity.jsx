import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const TYPE_LABELS = {
  device_reuse: 'Ek phone se do students',
  shared_device: 'Phone share ho raha hai',
  out_of_range: 'Class se door',
  no_location: 'Location nahi mili',
  login_locked: 'Account lock hua',
  login_unlock: 'Account unlock hua',
  attendance_edit: 'Attendance badli',
  user_create: 'Naya user bana',
  user_update: 'User ki details badli',
  user_delete: 'User delete hua',
  subject_create: 'Naya subject bana',
  subject_update: 'Subject badla',
  subject_delete: 'Subject delete hua',
  account_update: 'Account badla',
  alert_sent: 'Email alert gaya',
  settings_update: 'Settings badli',
  code_wrong: 'Galat code daala',
  code_locked: 'Code ki koshish roki gayi',
  bio_failed: 'Fingerprint/face fail hua',
  bio_enroll: 'Fingerprint/face lock ON',
  bio_reset: 'Fingerprint/face lock reset',
  session_reopen: 'Class dobara khuli',
  announcement: 'Announcement bheji',
};

const timeText = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-indigo-600"
      />
      <span>
        <span className="block font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

export default function AdminSecurity() {
  const [settings, setSettings] = useState(null);
  const [radius, setRadius] = useState('150');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [week, setWeek] = useState({});
  const [locked, setLocked] = useState([]);
  const [group, setGroup] = useState('security');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, l, k] = await Promise.all([
        api.get('/security/settings'),
        api.get('/security/logs', { params: { group, limit: 100 } }),
        api.get('/security/locked'),
      ]);
      setSettings(s.data.settings);
      setRadius(String(s.data.settings.radiusMeters));
      setLogs(l.data.logs);
      setTotal(l.data.total);
      setWeek(l.data.week);
      setLocked(k.data.users);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Data load nahi hua');
    }
  }, [group]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await api.put('/security/settings', patch);
      setSettings(res.data.settings);
      setRadius(String(res.data.settings.radiusMeters));
      setNotice(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
    } finally {
      setBusy(false);
    }
  };

  const unlock = async (u) => {
    setError('');
    setNotice('');
    try {
      const res = await api.post('/security/unlock/' + u._id);
      setNotice(res.data.message);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
    }
  };

  const resetBio = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const res = await api.post('/bio/reset', { email: resetEmail });
      setNotice(res.data.message);
      setResetEmail('');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
    }
  };

  const weekTotal = Object.values(week).reduce((sum, n) => sum + n, 0);

  const tab = (name) =>
    'px-3 py-1.5 rounded-lg text-sm font-medium ' +
    (group === name ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow');

  if (!settings && !error) return <p className="text-slate-500">Load ho raha hai...</p>;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {notice && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>}

      {settings && (
        <div className="bg-white rounded-2xl shadow p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Security settings</h2>

          <Toggle
            checked={settings.geoEnabled}
            onChange={(v) => save({ geoEnabled: v })}
            label="Location check"
            hint="Student teacher ke phone ke paas ho, tabhi attendance lagegi. Teacher ko class shuru karte waqt location allow karni hogi."
          />

          <div className="flex flex-wrap items-end gap-3 pl-8">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Kitni doori tak chalegi (meter)
              </label>
              <input
                type="number"
                min="30"
                max="2000"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              disabled={busy}
              onClick={() => save({ radiusMeters: Number(radius) })}
              className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              Save karo
            </button>
          </div>

          <Toggle
            checked={settings.autoAlerts}
            onChange={(v) => save({ autoAlerts: v })}
            label="Apne aap email alert"
            hint="Class khatam hote hi 75% se kam wale students ko email jaye (ek student ko 3 din me ek hi baar)."
          />

          <Toggle
            checked={settings.bioRequired}
            onChange={(v) => save({ bioRequired: v })}
            label="Fingerprint / Face lock sabke liye zaroori"
            hint="ON karne par har student ko pehle apne phone me lock ON karna hoga, tabhi attendance lagegi. OFF rakho to lock sirf unke liye chalega jo khud ON karein."
          />
        </div>
      )}

      <form onSubmit={resetBio} className="bg-white rounded-2xl shadow p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Student ka Fingerprint / Face lock reset karo</h2>
        <p className="text-xs text-slate-500">
          Student ka phone badla ho ya lock kharab ho to uska email daalo. Lock hat jayega aur wo naye phone par
          dobara ON kar sakega.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            required
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="Student ka email"
            className="flex-1 min-w-[12rem] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
          >
            Lock reset karo
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Locked accounts</h2>
        {locked.length === 0 && <p className="text-sm text-slate-500">Abhi koi account lock nahi hai.</p>}
        {locked.map((u) => (
          <div key={u._id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-800 truncate">{u.name}</p>
              <p className="text-xs text-slate-500 truncate">{u.email + ' (' + u.role + ')'}</p>
            </div>
            <button
              onClick={() => unlock(u)}
              className="shrink-0 rounded-lg bg-green-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-green-700"
            >
              Unlock karo
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Activity log</h2>
          <button onClick={load} className="text-sm text-indigo-600 font-medium">
            Refresh karo
          </button>
        </div>

        <p
          className={
            'text-sm rounded-lg px-3 py-2 ' +
            (weekTotal > 0 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700')
          }
        >
          {weekTotal > 0
            ? 'Pichhle 7 din me ' + weekTotal + ' suspicious ghatna hui.'
            : 'Pichhle 7 din me koi suspicious ghatna nahi hui.'}
        </p>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setGroup('security')} className={tab('security')}>
            Suspicious
          </button>
          <button onClick={() => setGroup('audit')} className={tab('audit')}>
            Kisne kya badla
          </button>
          <button onClick={() => setGroup('all')} className={tab('all')}>
            Sab kuch
          </button>
        </div>

        {logs.length === 0 && <p className="text-sm text-slate-500">Abhi koi record nahi hai.</p>}

        {logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 whitespace-nowrap">Time</th>
                  <th className="py-2 pr-3">Kya hua</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{timeText(l.createdAt)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span
                        className={
                          'text-xs font-semibold rounded-full px-2.5 py-1 ' +
                          (l.level === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                        }
                      >
                        {TYPE_LABELS[l.type] || l.type}
                      </span>
                    </td>
                    <td className="py-2 text-slate-700">{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > logs.length && (
              <p className="text-xs text-slate-400 mt-2">
                {'Sabse naye ' + logs.length + ' record dikh rahe hai, kul ' + total + '.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}