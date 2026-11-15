import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const CHIP = { approved: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700', pending: 'bg-amber-50 text-amber-700' };
const LABEL = { approved: 'Approve', rejected: 'Reject', pending: 'Baaki' };

// Teacher / Admin: students ki leave requests dekho aur approve ya reject karo
export default function LeaveInbox({ title = 'Leave requests' }) {
  const [tab, setTab] = useState('pending');
  const [list, setList] = useState([]);
  const [pending, setPending] = useState(0);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/leaves', { params: { status: tab } });
      setList(data.leaves);
      setPending(data.pending);
      setError('');
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.message) || 'Leave requests nahi mili');
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (l, status) => {
    setBusyId(l.id);
    setError('');
    try {
      await api.put('/leaves/' + l.id + '/decision', { status, note: notes[l.id] || '' });
      await load();
    } catch (err) {
      setError((err.response && err.response.data && err.response.data.message) || 'Faisla save nahi hua');
      load();
    } finally {
      setBusyId('');
    }
  };

  const tabBtn = (key, text) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={'rounded-full px-3 py-1 text-sm font-medium ' + (tab === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')}
    >
      {text}
    </button>
  );

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">
          {title}
          {pending > 0 && <span className="ml-2 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5">{pending + ' naye'}</span>}
        </h2>
        <div className="flex gap-2">
          {tabBtn('pending', 'Baaki')}
          {tabBtn('all', 'Sab')}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {list.length === 0 && !error && (
        <p className="text-sm text-slate-500">{tab === 'pending' ? 'Koi leave request baaki nahi hai.' : 'Abhi tak koi leave request nahi aayi.'}</p>
      )}

      <ul className="divide-y divide-slate-100">
        {list.map((l) => (
          <li key={l.id} className="py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">
                  {(l.student ? l.student.name : '-') + (l.student && l.student.rollNo ? ' (Roll ' + l.student.rollNo + ')' : '')}
                </p>
                <p className="text-xs text-slate-500">{l.department + ' Sem ' + l.semester}</p>
              </div>
              <span className={'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ' + CHIP[l.status]}>{LABEL[l.status]}</span>
            </div>
            <p className="text-sm text-slate-700">
              {l.fromDate === l.toDate ? l.fromDate : l.fromDate + '  →  ' + l.toDate}
              <span className="ml-2 text-xs text-slate-500">{l.days + ' din'}</span>
            </p>
            <p className="text-sm text-slate-600 break-words">{l.reason}</p>
            {l.status !== 'pending' && l.note && <p className="text-xs text-slate-500">{'Note: ' + l.note}</p>}

            {l.status === 'pending' && (
              <div className="space-y-2">
                <input
                  value={notes[l.id] || ''}
                  maxLength={200}
                  onChange={(e) => setNotes({ ...notes, [l.id]: e.target.value })}
                  placeholder="Note (optional)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button type="button" disabled={busyId === l.id} onClick={() => decide(l, 'approved')} className="rounded-lg bg-green-600 text-white text-sm font-medium px-4 py-1.5 hover:bg-green-700 disabled:opacity-60">
                    Approve
                  </button>
                  <button type="button" disabled={busyId === l.id} onClick={() => decide(l, 'rejected')} className="rounded-lg bg-red-600 text-white text-sm font-medium px-4 py-1.5 hover:bg-red-700 disabled:opacity-60">
                    Reject
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}