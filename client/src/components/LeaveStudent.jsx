import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const CHIP = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};
const LABEL = { pending: 'Jawab baaki', approved: 'Approve', rejected: 'Reject' };

// Phone ke local din ko YYYY-MM-DD banata hai
function dayText(offset) {
  const d = new Date(Date.now() + offset * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// Student: leave maango aur apni requests dekho
export default function LeaveStudent() {
  const [list, setList] = useState([]);
  const [from, setFrom] = useState(dayText(0));
  const [to, setTo] = useState(dayText(0));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/leaves/mine');
      setList(data.leaves);
    } catch {
      // agli baar phir koshish hogi
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });
    try {
      const { data } = await api.post('/leaves', { fromDate: from, toDate: to, reason });
      setMsg({ type: 'ok', text: data.message });
      setReason('');
      load();
    } catch (err) {
      setMsg({ type: 'error', text: (err.response && err.response.data && err.response.data.message) || 'Request nahi ja payi' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Ye request hatani hai?')) return;
    try {
      await api.delete('/leaves/' + id);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: (err.response && err.response.data && err.response.data.message) || 'Request nahi hati' });
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Leave maango</h2>
        <p className="text-xs text-slate-500">Teacher approve karega to tumhe notification aayegi.</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-600">
            Se
            <input type="date" required min={dayText(-7)} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} className={field + ' mt-1'} />
          </label>
          <label className="text-sm text-slate-600">
            Tak
            <input type="date" required min={from} value={to} onChange={(e) => setTo(e.target.value)} className={field + ' mt-1'} />
          </label>
        </div>
        <label className="block text-sm text-slate-600">
          Wajah
          <textarea required minLength={5} maxLength={300} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Jaise: bukhar hai, doctor ne aaram bola" className={field + ' mt-1'} />
        </label>
        <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60">
          {busy ? 'Bhej rahe hain...' : 'Request bhejo'}
        </button>
        {msg.text && (
          <p className={'text-sm rounded-lg px-3 py-2 ' + (msg.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50')}>{msg.text}</p>
        )}
      </form>

      {list.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {list.map((l) => (
            <li key={l.id} className="py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {l.fromDate === l.toDate ? l.fromDate : l.fromDate + '  →  ' + l.toDate}
                  <span className="ml-2 text-xs font-normal text-slate-500">{l.days + ' din'}</span>
                </p>
                <span className={'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ' + CHIP[l.status]}>{LABEL[l.status]}</span>
              </div>
              <p className="text-sm text-slate-600 break-words">{l.reason}</p>
              {l.note && <p className="text-xs text-slate-500">{'Teacher: ' + l.note}</p>}
              {l.status === 'pending' && (
                <button type="button" onClick={() => cancel(l.id)} className="text-xs font-medium text-red-600">
                  Request hatao
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}