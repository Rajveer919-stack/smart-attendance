import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardShell, { Hero, Stat } from '../components/DashboardShell';

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

// Band hui class itni der tak dobara khul sakti hai (server me bhi yahi limit hai)
const REOPEN_MINUTES = 30;

const TEACHER_NAV = [
  { key: 'home', label: 'Home', icon: 'home', to: '/teacher' },
  { key: 'ann', label: 'Announcements', icon: 'megaphone', to: '/teacher/announcements' },
  { key: 'students', label: 'Students', icon: 'users', to: '/teacher/students' },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingId, setStartingId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [reopeningId, setReopeningId] = useState(null);

  useEffect(() => {
    api
      .get('/subjects')
      .then((res) => setSubjects(res.data.subjects))
      .catch((err) => setError(err.response?.data?.message || 'Subjects load nahi hue'))
      .finally(() => setLoading(false));
    api
      .get('/sessions')
      .then((res) => setSessions(res.data.sessions))
      .catch(() => {});
  }, []);

  // Abhi chalti classes, aur wo jo abhi-abhi band hui (late students ke liye dobara khul sakti hai)
  const running = sessions.filter((s) => s.isActive);
  const runningSubjects = new Set(running.map((s) => (s.subject ? String(s.subject._id) : '')));
  const seen = new Set();
  const recent = sessions.filter((s) => {
    if (s.isActive || !s.endTime || !s.subject) return false;
    const mins = (Date.now() - new Date(s.endTime).getTime()) / 60000;
    if (mins > REOPEN_MINUTES) return false;
    const sid = String(s.subject._id);
    if (runningSubjects.has(sid) || seen.has(sid)) return false;
    seen.add(sid);
    return true;
  });
  const minutesLeft = (s) =>
    Math.max(1, Math.ceil(REOPEN_MINUTES - (Date.now() - new Date(s.endTime).getTime()) / 60000));

  const reopenClass = async (s) => {
    setError('');
    setReopeningId(s._id);
    try {
      const pos = await getPosition();
      await api.post('/sessions/' + s._id + '/reopen', pos || {});
      navigate('/teacher/session/' + s._id, { state: { subjectName: s.subject.name } });
    } catch (err) {
      setError(err.response?.data?.message || 'Class dobara chalu nahi ho payi');
      setReopeningId(null);
    }
  };

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

  return (
    <DashboardShell label="Teacher Dashboard" nav={TEACHER_NAV} active="home" bellTo="/teacher/announcements">
      <div className="space-y-5">
                <Hero
          role="teacher"
          name={user.name}
          line="Teach · Guide · Inspire"
          quote={subjects.length + ' subject tumhare naam par hai. Class shuru karo aur QR dikhao.'}
        >
          <Link to="/teacher/announcements" className="mk-hero-link">
            Class ko announcement bhejo
          </Link>
        </Hero>

        <div className="grid grid-cols-3 gap-3">
          <Stat icon="book" tone="indigo" label="Subjects" value={subjects.length} />
          <Stat icon="play" tone="emerald" label="Chal rahi class" value={running.length} />
          <Stat icon="clock" tone="amber" label="Dobara khul sakti" value={recent.length} />
        </div>

        {(running.length > 0 || recent.length > 0) && (
          <section className="bg-white rounded-2xl shadow p-4 space-y-3">
            {running.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 rounded-xl bg-green-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{s.subject ? s.subject.name : '-'}</p>
                  <p className="text-xs text-green-700">Class chal rahi hai</p>
                </div>
                <Link
                  to={'/teacher/session/' + s._id}
                  state={{ subjectName: s.subject ? s.subject.name : '' }}
                  className="shrink-0 rounded-lg bg-green-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-green-700"
                >
                  QR dikhao
                </Link>
              </div>
            ))}
            {recent.map((s) => (
              <div key={s._id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{s.subject.name}</p>
                  <p className="text-xs text-amber-800">
                    {'Class band ho gayi. Late students ke liye ' + minutesLeft(s) + ' minute tak dobara chalu kar sakte ho.'}
                  </p>
                </div>
                <button
                  onClick={() => reopenClass(s)}
                  disabled={reopeningId === s._id}
                  className="shrink-0 rounded-lg bg-amber-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-amber-700 disabled:opacity-60"
                >
                  {reopeningId === s._id ? 'Ho raha hai...' : 'Dobara chalu karo'}
                </button>
              </div>
            ))}
          </section>
        )}

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
      </div>
    </DashboardShell>
  );
}