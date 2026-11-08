import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftMonth(month, delta) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + delta;
  const date = new Date(Date.UTC(y, m, 1));
  return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0');
}

function cellTone(list) {
  if (!list) return 'bg-white text-slate-400';
  if (list.some((x) => x.status === 'absent')) return 'bg-red-100 text-red-700 font-semibold';
  if (list.some((x) => x.status === 'live')) return 'bg-amber-100 text-amber-700 font-semibold';
  return 'bg-green-100 text-green-700 font-semibold';
}

export default function AttendanceCalendar() {
  const { subjectId } = useParams();
  const [month, setMonth] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (m) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/attendance/calendar/' + subjectId, {
          params: m ? { month: m } : {},
        });
        setData(res.data);
        setMonth(res.data.month);
      } catch (err) {
        setError(err.response?.data?.message || 'Data load nahi hua');
      } finally {
        setLoading(false);
      }
    },
    [subjectId]
  );

  useEffect(() => {
    load('');
  }, [load]);

  const cells = [];
  if (data) {
    for (let i = 0; i < data.firstWeekday; i += 1) cells.push({ blank: true, key: 'b' + i });
    for (let d = 1; d <= data.daysInMonth; d += 1) {
      const key = data.month + '-' + String(d).padStart(2, '0');
      cells.push({ day: d, key, list: data.days[key], today: key === data.today });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            {data ? data.subject.name : 'Calendar'}
          </h1>
          <Link to="/student" className="text-sm text-indigo-600 font-medium">
            Wapas
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {!data && !error && <p className="text-slate-500">Load ho raha hai...</p>}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-xl font-bold text-slate-800">{data.held}</p>
                <p className="text-xs text-slate-500">Ho chuki classes</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-xl font-bold text-green-700">{data.attended}</p>
                <p className="text-xs text-slate-500">Aaya</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className={'text-xl font-bold ' + (data.percentage >= 75 || data.held === 0 ? 'text-indigo-600' : 'text-red-600')}>
                  {data.held === 0 ? '-' : data.percentage + '%'}
                </p>
                <p className="text-xs text-slate-500">Is mahine</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => load(shiftMonth(month, -1))}
                  disabled={loading}
                  className="h-9 w-9 rounded-full bg-slate-100 text-lg font-bold text-slate-700 disabled:opacity-60"
                  aria-label="Pichhla mahina"
                >
                  {'<'}
                </button>
                <p className="font-semibold text-slate-800">
                  {MONTH_NAMES[Number(month.slice(5, 7)) - 1] + ' ' + month.slice(0, 4)}
                </p>
                <button
                  onClick={() => load(shiftMonth(month, 1))}
                  disabled={loading}
                  className="h-9 w-9 rounded-full bg-slate-100 text-lg font-bold text-slate-700 disabled:opacity-60"
                  aria-label="Agla mahina"
                >
                  {'>'}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
                {WEEK.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((c) =>
                  c.blank ? (
                    <div key={c.key} />
                  ) : (
                    <div
                      key={c.key}
                      className={
                        'rounded-lg py-2 text-center text-sm ' +
                        cellTone(c.list) +
                        (c.today ? ' ring-2 ring-indigo-500' : '')
                      }
                      title={c.list ? c.list.map((x) => x.time + ' ' + x.status).join(', ') : ''}
                    >
                      {c.day}
                      {c.list && c.list.length > 1 && (
                        <span className="block text-[10px] leading-none">{c.list.length + 'x'}</span>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-green-200" /> Aaya
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-red-200" /> Absent
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-amber-200" /> Class chal rahi hai
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded bg-white border border-slate-300" /> Class nahi hui
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
