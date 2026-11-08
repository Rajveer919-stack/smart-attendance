import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const toneColor = (p) => (p >= 75 ? '#16a34a' : p >= 60 ? '#d97706' : '#dc2626');

function Tile({ value, label, color }) {
  return (
    <div className="bg-white rounded-xl shadow py-3 text-center">
      <p className="text-2xl font-extrabold" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function Bar({ label, sub, value, empty }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-700 truncate">{label}</span>
        <span className="text-xs text-slate-500 shrink-0">{empty ? '-' : value + '%'}</span>
      </div>
      <div className="mt-1 h-3 rounded-full bg-slate-100 overflow-hidden">
        {!empty && (
          <div
            className="h-full rounded-full"
            style={{ width: Math.min(100, value) + '%', backgroundColor: toneColor(value) }}
          />
        )}
      </div>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TrendChart({ trend }) {
  const W = 560;
  const H = 150;
  const top = 10;
  const base = H - 24;
  const slot = W / trend.length;
  const barW = slot * 0.6;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="w-full h-auto">
      {[0, 50, 75, 100].map((g) => {
        const y = base - ((base - top) * g) / 100;
        return (
          <g key={g}>
            <line x1="0" x2={W} y1={y} y2={y} stroke={g === 75 ? '#fca5a5' : '#e2e8f0'} strokeDasharray={g === 75 ? '4 3' : undefined} />
          </g>
        );
      })}
      {trend.map((t, i) => {
        const x = i * slot + (slot - barW) / 2;
        const has = t.percentage !== null;
        const h = has ? Math.max(2, ((base - top) * t.percentage) / 100) : 0;
        return (
          <g key={t.date}>
            {has ? (
              <rect x={x} y={base - h} width={barW} height={h} rx="3" fill={toneColor(t.percentage)}>
                <title>{t.label + ': ' + t.percentage + '%'}</title>
              </rect>
            ) : (
              <rect x={x} y={base - 2} width={barW} height="2" fill="#cbd5e1" />
            )}
            <text x={i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">
              {t.label.slice(0, 2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminCharts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/analytics/overview');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Data load nahi hua');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>;
  if (!data) return <p className="text-slate-500">Load ho raha hai...</p>;

  const t = data.totals;
  const hasClasses = t.classesHeld > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Poora overview</h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm rounded-lg bg-white shadow px-3 py-1.5 text-indigo-600 font-medium disabled:opacity-60"
        >
          {loading ? 'Load ho raha hai...' : 'Refresh karo'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile value={t.students} label="Sabhi students" />
        <Tile value={t.classesHeld} label="Ho chuki classes" />
        <Tile
          value={hasClasses ? t.overallPercentage + '%' : '-'}
          label="Overall attendance"
          color={hasClasses ? toneColor(t.overallPercentage) : undefined}
        />
        <Tile value={t.lowCount} label="75% se kam" color={t.lowCount > 0 ? '#dc2626' : '#16a34a'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Department-wise attendance</h3>
          {data.departments.length === 0 && (
            <p className="text-sm text-slate-500">Abhi koi data nahi hai.</p>
          )}
          {data.departments.map((d) => (
            <Bar
              key={d.department}
              label={d.department}
              value={d.percentage}
              empty={d.classes === 0}
              sub={d.students + ' students, ' + d.classes + ' classes'}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow p-5 space-y-2">
          <h3 className="font-semibold text-slate-800">Pichhle 14 din ka trend</h3>
          <TrendChart trend={data.trend} />
          <p className="text-xs text-slate-400">
            Lal dotted line 75% hai. Jis din class nahi hui wahan patli grey line hai.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Sabse kam attendance wale subject</h3>
          {data.weakSubjects.length === 0 && (
            <p className="text-sm text-slate-500">Abhi koi data nahi hai.</p>
          )}
          {data.weakSubjects.map((s) => (
            <Bar
              key={s.code}
              label={s.name}
              value={s.percentage}
              sub={s.department + ' Sem ' + s.semester + ', ' + s.classes + ' classes'}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-slate-800">Sabse kam attendance wale students</h3>
          {data.lowest.length === 0 && (
            <p className="text-sm text-green-700">Koi student 75% se neeche nahi hai.</p>
          )}
          {data.lowest.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">Roll</th>
                    <th className="py-2 pr-3">Naam</th>
                    <th className="py-2 pr-3">Class</th>
                    <th className="py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lowest.map((s) => (
                    <tr key={s.studentId} className="border-b border-slate-100">
                      <td className="py-2 pr-3 text-slate-600">{s.rollNo || '-'}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{s.name}</td>
                      <td className="py-2 pr-3 text-slate-600">{s.department + ' ' + s.semester}</td>
                      <td className="py-2 font-semibold text-red-600">{s.percentage + '%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}