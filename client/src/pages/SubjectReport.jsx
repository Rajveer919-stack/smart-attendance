import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const prettyDate = (key) => {
  const d = new Date(key + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SubjectReport() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [days, setDays] = useState([]);
  const [error, setError] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(
    async (f, t) => {
      setError('');
      try {
        const params = {};
        if (f) params.from = f;
        if (t) params.to = t;
        const [rep, daily] = await Promise.all([
          api.get('/analytics/subject/' + id, { params }),
          api.get('/analytics/subject/' + id + '/daily', { params }),
        ]);
        setData(rep.data);
        setDays(daily.data.days);
      } catch (err) {
        setError(err.response?.data?.message || 'Report load nahi hui');
      }
    },
    [id]
  );

  useEffect(() => {
    load('', '');
  }, [load]);

  const applyFilter = (e) => {
    e.preventDefault();
    load(from, to);
  };

  const clearFilter = () => {
    setFrom('');
    setTo('');
    load('', '');
  };

  const downloadExcel = async () => {
    setExporting(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/analytics/subject/' + id + '/export', {
        params,
        responseType: 'blob',
      });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/);
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = match ? match[1] : 'attendance.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Excel nahi ban payi');
    } finally {
      setExporting(false);
    }
  };

  const rows = data ? (onlyRisk ? data.report.filter((r) => r.atRisk) : data.report) : [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            {data ? data.subject.name + ' - Class report' : 'Class report'}
          </h1>
          <Link to="/teacher" className="text-sm text-indigo-600 font-medium print:hidden">
            Wapas
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {!data && !error && <p className="text-slate-500">Load ho raha hai...</p>}

        {data && (
          <>
            <form
              onSubmit={applyFilter}
              className="bg-white rounded-2xl shadow p-4 flex flex-wrap items-end gap-3 print:hidden"
            >
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kis date se</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kis date tak</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700"
              >
                Filter lagao
              </button>
              {(from || to || data.from || data.to) && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="rounded-lg bg-slate-100 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-200"
                >
                  Filter hatao
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={downloadExcel}
                  disabled={exporting}
                  className="rounded-lg bg-green-600 text-white text-sm font-medium px-4 py-2 hover:bg-green-700 disabled:opacity-60"
                >
                  {exporting ? 'Ban rahi hai...' : 'Excel download'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 hover:bg-slate-50"
                >
                  Print / PDF
                </button>
              </div>
            </form>

            {(data.from || data.to) && (
              <p className="text-sm text-slate-600">
                {'Report: ' + (data.from ? prettyDate(data.from) : 'Start') + '  to  ' + (data.to ? prettyDate(data.to) : 'Today')}
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-2xl font-bold text-slate-800">{data.totalStudents}</p>
                <p className="text-xs text-slate-500">Total students</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-2xl font-bold text-slate-800">{data.totalClasses}</p>
                <p className="text-xs text-slate-500">Ho chuki classes</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-2xl font-bold text-indigo-600">{data.classAverage}%</p>
                <p className="text-xs text-slate-500">Class ka average</p>
              </div>
              <div className="bg-white rounded-xl shadow py-3">
                <p className="text-2xl font-bold text-red-600">{data.riskCount}</p>
                <p className="text-xs text-slate-500">75% se kam</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">Din-wise classes</h2>
              {days.length === 0 && (
                <p className="text-slate-500 text-sm">Is period me koi class nahi hui.</p>
              )}
              {days.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Time</th>
                        <th className="py-2 pr-3">Present</th>
                        <th className="py-2 pr-3">Absent</th>
                        <th className="py-2 pr-3">%</th>
                        <th className="py-2 print:hidden">Attendance badlo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d) => (
                        <tr key={d.sessionId} className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-800">{prettyDate(d.date)}</td>
                          <td className="py-2 pr-3 text-slate-600">{d.time}</td>
                          <td className="py-2 pr-3 text-green-700">{d.present}</td>
                          <td className="py-2 pr-3 text-red-600">{d.absent}</td>
                          <td className="py-2 pr-3 font-semibold">{d.percentage + '%'}</td>
                          <td className="py-2 print:hidden">
                            <Link
                              to={'/teacher/session/' + d.sessionId + '/attendance'}
                              className="text-indigo-600 font-medium"
                            >
                              Edit karo
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Sabhi students</h2>
                <label className="flex items-center gap-2 text-sm text-slate-600 print:hidden">
                  <input
                    type="checkbox"
                    checked={onlyRisk}
                    onChange={(e) => setOnlyRisk(e.target.checked)}
                  />
                  Sirf 75% se kam wale
                </label>
              </div>

              {rows.length === 0 && (
                <p className="text-slate-500">Is filter me koi student nahi hai.</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3">Roll</th>
                      <th className="py-2 pr-3">Naam</th>
                      <th className="py-2 pr-3">Aaya</th>
                      <th className="py-2 pr-3">Absent</th>
                      <th className="py-2 pr-3">Percentage</th>
                      <th className="py-2">Haal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.studentId} className="border-b border-slate-100">
                        <td className="py-2 pr-3 text-slate-600">{r.rollNo || '-'}</td>
                        <td className="py-2 pr-3 font-medium text-slate-800">{r.name}</td>
                        <td className="py-2 pr-3 text-green-700">
                          {r.attended + ' / ' + r.totalClasses}
                        </td>
                        <td className="py-2 pr-3 text-red-600">
                          {r.totalClasses - r.attended}
                        </td>
                        <td className="py-2 pr-3 font-semibold">{r.percentage + '%'}</td>
                        <td className="py-2">
                          <span
                            className={
                              'text-xs font-semibold rounded-full px-3 py-1 ' +
                              (r.atRisk
                                ? 'bg-red-100 text-red-600'
                                : 'bg-green-100 text-green-700')
                            }
                          >
                            {r.atRisk ? 'Kam aata hai' : 'Theek hai'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}