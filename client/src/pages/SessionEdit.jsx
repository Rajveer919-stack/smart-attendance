import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const timeText = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function SessionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | present | absent
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/sessions/' + id + '/attendance');
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'List load nahi hui');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (student, status) => {
    if (student.status === status) return;
    setBusyId(student.studentId);
    setError('');
    setNotice('');
    try {
      await api.put('/sessions/' + id + '/attendance/' + student.studentId, { status });
      await load();
      setNotice(student.name + ': ' + (status === 'present' ? 'Present' : 'Absent') + ' kar diya');
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
    } finally {
      setBusyId('');
    }
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.students.filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || String(s.rollNo || '').includes(q);
    });
  }, [data, query, filter]);

  const tab = (name) =>
    'px-3 py-1.5 rounded-lg text-sm font-medium ' +
    (filter === name ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 shadow');

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Attendance badlo</h1>
            {data && (
              <p className="text-sm text-slate-500">
                {data.subject + ', ' + new Date(data.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + timeText(data.startTime)}
              </p>
            )}
          </div>
          <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 font-medium">
            Wapas
          </button>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {notice && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>}
        {!data && !error && <p className="text-slate-500">Load ho raha hai...</p>}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-xl font-bold text-slate-800">{data.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-xl font-bold text-green-700">{data.presentCount}</p>
                <p className="text-xs text-slate-500">Present</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-xl font-bold text-red-600">{data.absentCount}</p>
                <p className="text-xs text-slate-500">Absent</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Naam ya roll number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button onClick={() => setFilter('all')} className={tab('all')}>
                  Sabhi students
                </button>
                <button onClick={() => setFilter('present')} className={tab('present')}>
                  Present
                </button>
                <button onClick={() => setFilter('absent')} className={tab('absent')}>
                  Absent
                </button>
              </div>

              {rows.length === 0 && <p className="text-slate-500 text-sm">Koi student nahi mila.</p>}

              <ul className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <li key={s.studentId} className="py-2 flex items-center gap-3">
                    <span className="w-10 text-sm text-slate-500 shrink-0">{s.rollNo || '-'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 truncate">{s.name}</p>
                      {s.status === 'present' && s.markedAt && (
                        <p className="text-xs text-slate-400">
                          {(s.source === 'manual' ? 'Haath se lagayi, ' : 'QR se, ') + timeText(s.markedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
                      <button
                        disabled={busyId === s.studentId}
                        onClick={() => setStatus(s, 'present')}
                        className={
                          'px-3 py-1.5 text-sm font-medium disabled:opacity-60 ' +
                          (s.status === 'present' ? 'bg-green-600 text-white' : 'bg-white text-slate-600')
                        }
                      >
                        Present
                      </button>
                      <button
                        disabled={busyId === s.studentId}
                        onClick={() => setStatus(s, 'absent')}
                        className={
                          'px-3 py-1.5 text-sm font-medium disabled:opacity-60 ' +
                          (s.status === 'absent' ? 'bg-red-600 text-white' : 'bg-white text-slate-600')
                        }
                      >
                        Absent
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}