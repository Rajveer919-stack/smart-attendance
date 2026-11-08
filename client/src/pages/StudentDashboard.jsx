import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';

const RADIUS = 28;
const CIRCLE = 2 * Math.PI * RADIUS;

function tone(percentage) {
  if (percentage >= 75) return { text: 'text-green-600', stroke: '#16a34a', bar: 'bg-green-500', chip: 'bg-green-50 text-green-700' };
  if (percentage >= 60) return { text: 'text-amber-600', stroke: '#d97706', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' };
  return { text: 'text-red-600', stroke: '#dc2626', bar: 'bg-red-500', chip: 'bg-red-50 text-red-700' };
}

function Ring({ percentage }) {
  const p = Math.max(0, Math.min(100, Number(percentage) || 0));
  const t = tone(p);
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          stroke={t.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCLE}
          strokeDashoffset={CIRCLE * (1 - p / 100)}
        />
      </svg>
      <span className={'absolute inset-0 flex items-center justify-center text-sm font-bold ' + t.text}>
        {Math.round(p) + '%'}
      </span>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/attendance/me')
      .then((res) => setReport(res.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Report load nahi hui'))
      .finally(() => setLoading(false));
  }, []);

  const riskCount = report.filter((r) => r.atRisk).length;
  const totalAttended = report.reduce((sum, r) => sum + (r.attended || 0), 0);
  const totalHeld = report.reduce((sum, r) => sum + (r.totalClasses || 0), 0);
  const overall = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 1000) / 10 : 0;
  const overallTone = tone(overall);

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader label="Student Dashboard" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 shadow-lg">
          <p className="text-sm text-white/80">Namaste,</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{user.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1">{'Roll ' + (user.rollNo || '-')}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">{user.department}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">{'Semester ' + user.semester}</span>
          </div>
        </section>

        <Link
          to="/student/scan"
          className="flex items-center justify-center gap-3 rounded-2xl bg-white shadow-md border border-indigo-100 py-4 text-indigo-700 font-semibold text-lg hover:bg-indigo-50"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
            <path d="M4 12h16" />
          </svg>
          QR scan karke attendance lagao
        </Link>

        {!loading && report.length > 0 && (
          <section className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-2xl shadow py-4">
              <p className={'text-2xl font-extrabold ' + overallTone.text}>{overall + '%'}</p>
              <p className="text-xs text-slate-500 mt-1">Overall</p>
            </div>
            <div className="bg-white rounded-2xl shadow py-4">
              <p className="text-2xl font-extrabold text-slate-800">{report.length}</p>
              <p className="text-xs text-slate-500 mt-1">Subjects</p>
            </div>
            <div className="bg-white rounded-2xl shadow py-4">
              <p className={'text-2xl font-extrabold ' + (riskCount > 0 ? 'text-red-600' : 'text-green-600')}>
                {riskCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">Risk me</p>
            </div>
          </section>
        )}

        {riskCount > 0 && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {'Dhyan do: ' + riskCount + ' subject me tumhari attendance 75% se kam hai. Neeche dekho kitni class aur lagani hai.'}
          </p>
        )}

        <h2 className="text-xl font-semibold text-slate-800">Subject-wise attendance</h2>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-slate-500">Load ho raha hai...</p>}
        {!loading && !error && report.length === 0 && (
          <p className="text-slate-500 bg-white rounded-2xl shadow p-5">
            Tumhare department aur semester ke koi subject abhi nahi hai.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {report.map((r) => {
            const t = tone(r.percentage);
            const need = Math.max(0, 3 * r.totalClasses - 4 * r.attended);
            const spare = Math.max(0, Math.floor((4 * r.attended) / 3 - r.totalClasses));
            return (
              <div key={r.subjectId} className="bg-white rounded-2xl shadow p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Ring percentage={r.percentage} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{r.subject}</h3>
                    <p className="text-sm text-slate-500">{r.code}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {r.attended + ' / ' + r.totalClasses + ' class attend ki'}
                    </p>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={'h-full ' + t.bar}
                    style={{ width: Math.min(r.percentage, 100) + '%' }}
                  />
                </div>
                                <Link
                  to={'/student/calendar/' + r.subjectId}
                  className="block text-center text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Calendar dekho
                </Link>

                {r.totalClasses === 0 ? (
                  <p className="text-xs rounded-lg bg-slate-50 text-slate-600 px-3 py-2">
                    Abhi is subject ki koi class nahi hui.
                  </p>
                ) : r.atRisk ? (
                  <p className={'text-xs rounded-lg px-3 py-2 ' + t.chip}>
                    {'75% tak pahunchne ke liye lagatar ' + need + ' class aur attend karni hogi.'}
                  </p>
                ) : (
                  <p className={'text-xs rounded-lg px-3 py-2 ' + t.chip}>
                    {spare > 0
                      ? 'Sab theek hai. 75% se upar rehte hue tum ' + spare + ' class tak chhod sakte ho.'
                      : 'Sab theek hai, par ab koi class chhodna mat.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}