import { useEffect, useState } from 'react';
import api from '../api/axios';

function Flame({ active }) {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
      <path
        d="M12 2c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4.2.2 1.4.9 2.2 1.8 2.6C10.3 7.6 10.5 4.5 12 2z"
        fill={active ? '#f97316' : '#94a3b8'}
      />
    </svg>
  );
}

// Student ki lagatar attendance (streak) aur badges
export default function StreakBadges() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get('/gamify/me')
      .then((res) => alive && setData(res.data))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;
  if (!data) {
    return <div className="bg-white rounded-2xl shadow p-4 text-sm text-slate-500">Badges load ho rahe hain...</div>;
  }

  const { stats, badges, next, earnedCount } = data;
  const hot = stats.current > 0;

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-4" aria-label="Streak aur badges">
      <div className="flex items-center gap-3">
        <Flame active={hot} />
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-800 leading-none">
            {stats.current}
            <span className="ml-1 text-sm font-medium text-slate-500">class lagatar</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {stats.total === 0
              ? 'Pehli class attend karo, streak shuru ho jayegi.'
              : 'Sabse lambi streak: ' + stats.best + ' class'}
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-lg font-bold text-indigo-600">{earnedCount + '/' + badges.length}</p>
          <p className="text-xs text-slate-500">badges</p>
        </div>
      </div>

      {next && (
        <div>
          <div className="flex justify-between text-xs text-slate-600 mb-1">
            <span>{'Agla badge: ' + next.title}</span>
            <span>{next.value + '/' + next.target}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: Math.round((next.value / next.target) * 100) + '%' }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{next.desc}</p>
        </div>
      )}

      <ul className="grid grid-cols-3 gap-2">
        {badges.map((b) => (
          <li
            key={b.key}
            title={b.desc}
            className={
              'rounded-xl border px-2 py-3 text-center ' +
              (b.earned ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50 opacity-60')
            }
          >
            <div
              className={
                'mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ' +
                (b.earned ? 'bg-amber-400 text-white' : 'bg-slate-300 text-slate-600')
              }
            >
              {b.earned ? '✓' : '·'}
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-tight">{b.title}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}