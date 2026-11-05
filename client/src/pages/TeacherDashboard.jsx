import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    api
      .get('/subjects')
      .then((res) => setSubjects(res.data.subjects))
      .catch((err) => setError(err.response?.data?.message || 'Subjects load nahi hue'))
      .finally(() => setLoading(false));
  }, []);

  const startClass = async (subject) => {
    setError('');
    setStartingId(subject._id);
    try {
      const { data } = await api.post('/sessions/start', { subjectId: subject._id });
      navigate(`/teacher/session/${data.session.id}`, {
        state: { subjectName: subject.name },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Class shuru nahi ho payi');
      setStartingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Teacher Dashboard</h1>
            <p className="text-sm text-slate-500">{user.name}</p>
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
        <h2 className="text-xl font-semibold text-slate-800">Mere subjects</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {loading && <p className="text-slate-500">Load ho raha hai...</p>}

        {!loading && subjects.length === 0 && (
          <p className="text-slate-500">Abhi tumhare naam par koi subject nahi hai.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-slate-800">{s.name}</h3>
                <p className="text-sm text-slate-500">
                  {s.code} · {s.department} · Semester {s.semester}
                </p>
              </div>
              <button
                onClick={() => startClass(s)}
                disabled={startingId === s._id}
                className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700 disabled:opacity-60"
              >
                {startingId === s._id ? 'Shuru ho rahi hai...' : 'Class shuru karo (QR)'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}