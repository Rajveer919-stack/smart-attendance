import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';

// Teacher ke phone ki location. Student isi ke paas hone chahiye (admin ne location check ON kiya ho to)
function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export default function TeacherDashboard() {
  const { user } = useAuth();
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
      const pos = await getPosition();
      const { data } = await api.post('/sessions/start', { subjectId: subject._id, ...(pos || {}) });
      navigate('/teacher/session/' + data.session.id, {
        state: { subjectName: subject.name },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Class shuru nahi ho payi');
      setStartingId(null);
    }
  };

  const actions = (
    <Link
      to="/teacher/students"
      className="rounded-lg bg-white text-indigo-700 text-sm font-semibold px-3 py-1.5 hover:bg-indigo-50"
    >
      Class-wise students
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader label="Teacher Dashboard" actions={actions} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 shadow-lg">
          <p className="text-sm text-white/80">Namaste,</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold">{user.name}</h1>
          <p className="mt-2 text-sm text-white/80">
            {subjects.length + ' subject tumhare naam par hai. Class shuru karo aur QR dikhao.'}
          </p>
        </section>

        <h2 className="text-xl font-semibold text-slate-800">Mere subjects</h2>
        <p className="text-xs text-slate-500">
          Class shuru karte waqt phone ki location allow karo, taki students ki location check ho sake.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-slate-500">Load ho raha hai...</p>}
        {!loading && subjects.length === 0 && (
          <p className="text-slate-500 bg-white rounded-2xl shadow p-5">
            Abhi tumhare naam par koi subject nahi hai. Admin se subject banwao.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{s.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-1">{s.code}</span>
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-1">{s.department}</span>
                    <span className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-1">
                      {'Semester ' + s.semester}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => startClass(s)}
                  disabled={startingId === s._id}
                  className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {startingId === s._id ? 'Shuru ho rahi hai...' : 'Class shuru karo (QR)'}
                </button>
                <Link
                  to={'/teacher/report/' + s._id}
                  className="block text-center w-full rounded-xl border border-indigo-600 text-indigo-600 font-semibold py-2.5 hover:bg-indigo-50"
                >
                  Poori class ki list aur report
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}