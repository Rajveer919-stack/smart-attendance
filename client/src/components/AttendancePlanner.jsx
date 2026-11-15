import { useEffect, useMemo, useState } from 'react';

const TARGETS = [60, 65, 70, 75, 80, 85, 90];
const KEY = 'attendanceTarget';

function readTarget() {
  try {
    const v = Number(localStorage.getItem(KEY));
    return TARGETS.includes(v) ? v : 75;
  } catch {
    return 75;
  }
}

// target% rakhne ke liye: kitni class lagatar chahiye (need) aur kitni chhod sakte ho (spare)
export function goalMath(attended, total, target) {
  const t = target / 100;
  if (total === 0) return { need: 0, spare: 0, ok: true };
  const pct = (attended / total) * 100;
  if (pct >= target) {
    // (a) / (total + x) >= t  ->  x <= a/t - total
    return { need: 0, spare: Math.max(0, Math.floor(attended / t + 1e-9 - total)), ok: true };
  }
  // (a + n) / (total + n) >= t  ->  n >= (t*total - a) / (1 - t)
  return { need: Math.max(1, Math.ceil((t * total - attended) / (1 - t) - 1e-9)), spare: 0, ok: false };
}

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '');

// Student ke liye "agar main itni class chhod doon to kya hoga?" calculator
// report: [{ subjectId, subject, code, totalClasses, attended, percentage }]
export default function AttendancePlanner({ report }) {
  const rows = useMemo(() => (report || []).filter((r) => r.totalClasses > 0), [report]);
  const [target, setTarget] = useState(readTarget);
  const [subjectId, setSubjectId] = useState('');
  const [skip, setSkip] = useState(1);
  const [attend, setAttend] = useState(0);

  // Pehli baar sabse kam attendance wala subject chuno
  useEffect(() => {
    if (!subjectId && rows.length > 0) {
      const worst = rows.reduce((a, b) => (b.percentage < a.percentage ? b : a), rows[0]);
      setSubjectId(String(worst.subjectId));
    }
  }, [rows, subjectId]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(target));
    } catch {
      // koi baat nahi
    }
  }, [target]);

  if (rows.length === 0) return null;

  const cur = rows.find((r) => String(r.subjectId) === String(subjectId)) || rows[0];
  const sk = Math.max(0, Math.min(200, Number(skip) || 0));
  const at = Math.max(0, Math.min(200, Number(attend) || 0));
  const newTotal = cur.totalClasses + sk + at;
  const newPct = newTotal > 0 ? ((cur.attended + at) / newTotal) * 100 : 0;
  const nowPct = (cur.attended / cur.totalClasses) * 100;
  const pass = newPct >= target;
  const g = goalMath(cur.attended, cur.totalClasses, target);

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const step = (set, v, d) => set(Math.max(0, Math.min(200, (Number(v) || 0) + d)));

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-4" aria-label="Attendance planner">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-800">Attendance planner</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Target
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1 text-sm">
            {TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}%
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm text-slate-600 sm:col-span-1">
          Subject
          <select value={String(cur.subjectId)} onChange={(e) => setSubjectId(e.target.value)} className={field + ' mt-1'}>
            {rows.map((r) => (
              <option key={r.subjectId} value={r.subjectId}>
                {r.subject + ' (' + fmt(r.percentage) + '%)'}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm text-slate-600">
          Aage kitni class chhodunga
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={() => step(setSkip, skip, -1)} className="h-9 w-9 rounded-lg border border-slate-300 text-lg" aria-label="Kam karo">
              −
            </button>
            <input type="number" min="0" max="200" value={skip} onChange={(e) => setSkip(e.target.value)} className={field + ' text-center'} aria-label="Chhodi hui class" />
            <button type="button" onClick={() => step(setSkip, skip, 1)} className="h-9 w-9 rounded-lg border border-slate-300 text-lg" aria-label="Zyada karo">
              +
            </button>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Aage kitni class attend karunga
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={() => step(setAttend, attend, -1)} className="h-9 w-9 rounded-lg border border-slate-300 text-lg" aria-label="Kam karo">
              −
            </button>
            <input type="number" min="0" max="200" value={attend} onChange={(e) => setAttend(e.target.value)} className={field + ' text-center'} aria-label="Attend ki hui class" />
            <button type="button" onClick={() => step(setAttend, attend, 1)} className="h-9 w-9 rounded-lg border border-slate-300 text-lg" aria-label="Zyada karo">
              +
            </button>
          </div>
        </div>
      </div>

      <div className={'rounded-xl px-4 py-3 ' + (pass ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}>
        <p className="text-sm">
          {'Abhi ' + fmt(nowPct) + '%  →  '}
          <b className="text-lg">{fmt(newPct) + '%'}</b>
          {'  (' + (cur.attended + at) + ' / ' + newTotal + ' class)'}
        </p>
        <p className="text-sm mt-1">
          {pass
            ? 'Theek hai, ' + target + '% se upar rahoge.'
            : target + '% se neeche chale jaoge. ' + (at === 0 && sk > 0 ? 'Itni class mat chhodo.' : 'Aur class attend karni hongi.')}
        </p>
      </div>

      <p className="text-sm text-slate-600">
        {g.ok
          ? g.spare > 0
            ? cur.subject + ': ' + target + '% rakhte hue tum lagatar ' + g.spare + ' class tak chhod sakte ho.'
            : cur.subject + ': ' + target + '% par ho, ab koi class chhodna mat.'
          : cur.subject + ': ' + target + '% tak pahunchne ke liye lagatar ' + g.need + ' class aur attend karni hogi.'}
      </p>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-indigo-600">Saare subjects ek sath dekho</summary>
        <div className="mt-2 divide-y divide-slate-100">
          {rows.map((r) => {
            const m = goalMath(r.attended, r.totalClasses, target);
            return (
              <div key={r.subjectId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-slate-700">{r.subject}</span>
                <span className="shrink-0 text-slate-500">{fmt(r.percentage) + '%'}</span>
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-xs ' + (m.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                  {m.ok ? (m.spare > 0 ? m.spare + ' chhod sakte' : 'ab mat chhodo') : m.need + ' class chahiye'}
                </span>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}