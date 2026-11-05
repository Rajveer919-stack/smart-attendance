import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
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

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Student Dashboard</h1>
            <p className="text-sm text-slate-500">
              {user.name} · Roll {user.rollNo} · {user.department} Sem {user.semester}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-slate-800 text-white text-sm px-3 py-1.5 hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link
          to="/student/scan"
          className="block text-center rounded-xl bg-indigo-600 text-white font-medium py-3 hover:bg-indigo-700"
        >
          📷 QR scan karke attendance lagao
        </Link>

        {riskCount > 0 && (
          <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
            ⚠️ {riskCount} subject me tumhari attendance 75% se kam hai
          </p>
        )}

        <h2 className="text-xl font-semibold text-slate-800">Subject-wise attendance</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {loading && <p className="text-slate-500">Load ho raha hai...</p>}
        {!loading && !error && report.length === 0 && (
          <p className="text-slate-500">
            Tumhare department aur semester ke koi subject abhi nahi hai.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {report.map((r) => (
            <div key={r.subjectId} className="bg-white rounded-2xl shadow p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{r.subject}</h3>
                  <p className="text-sm text-slate-500">{r.code}</p>
                </div>
                <span
                  className={`text-2xl font-bold ${
                    r.atRisk ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {r.percentage}%
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full ${r.atRisk ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(r.percentage, 100)}%` }}
                />
              </div>

              <p className="text-sm text-slate-600">
                {r.attended} / {r.totalClasses} class attend ki
                {r.atRisk && <span className="text-red-600 font-medium"> · Risk (75% se kam)</span>}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}