import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AppHeader from '../components/AppHeader';

const timeText = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function TeacherAnnouncements() {
  const [subjects, setSubjects] = useState([]);
  const [mine, setMine] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMine = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements/mine');
      setMine(data.announcements);
    } catch {
      // agli baar phir koshish hogi
    }
  }, []);

  useEffect(() => {
    api
      .get('/subjects')
      .then((res) => {
        setSubjects(res.data.subjects);
        if (res.data.subjects.length === 1) setSubjectId(res.data.subjects[0]._id);
      })
      .catch((err) => setError(err.response?.data?.message || 'Subjects load nahi hue'));
    loadMine();
  }, [loadMine]);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSending(true);
    try {
      const { data } = await api.post('/announcements', { subjectId, title, message });
      setNotice(data.message);
      setTitle('');
      setMessage('');
      loadMine();
    } catch (err) {
      setError(err.response?.data?.message || 'Announcement nahi ja payi');
    } finally {
      setSending(false);
    }
  };

  const remove = async (a) => {
    setError('');
    setNotice('');
    try {
      const { data } = await api.delete('/announcements/' + a.id);
      setNotice(data.message);
      loadMine();
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
    }
  };

  const actions = (
    <Link
      to="/teacher"
      className="rounded-lg bg-white text-indigo-700 text-sm font-semibold px-3 py-1.5 hover:bg-indigo-50"
    >
      Wapas
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader label="Announcements" actions={actions} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <form onSubmit={send} className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h1 className="text-xl font-semibold text-slate-800">Class ko message bhejo</h1>
          <p className="text-xs text-slate-500">
            Message us class ke saare students ko dashboard par dikhega aur phone par notification bhi jayegi.
          </p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {notice && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kis class ko</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Subject chuno</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name + ' - ' + s.department + ' Sem ' + s.semester}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
              placeholder="Jaise: Kal ki class"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={600}
              rows={4}
              placeholder="Students ke liye message likho"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 text-right">{message.length + ' / 600'}</p>
          </div>

          <button
            type="submit"
            disabled={sending || !subjectId}
            className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 disabled:opacity-60"
          >
            {sending ? 'Bhej rahe hai...' : 'Announcement bhejo'}
          </button>
        </form>

        <section className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Maine ye bheje</h2>
          {mine.length === 0 && <p className="text-sm text-slate-500">Abhi tumne koi announcement nahi bheji.</p>}
          <ul className="divide-y divide-slate-100">
            {mine.map((a) => (
              <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {a.subject + ' - ' + a.department + ' Sem ' + a.semester + ' - ' + timeText(a.createdAt)}
                  </p>
                  <p className="font-medium text-slate-800">{a.title}</p>
                  <p className="text-sm text-slate-600 whitespace-pre-line break-words">{a.message}</p>
                </div>
                <button onClick={() => remove(a)} className="shrink-0 text-sm text-red-600 font-medium">
                  Hatao
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}