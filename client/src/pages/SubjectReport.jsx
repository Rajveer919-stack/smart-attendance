import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

export default function SubjectReport() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(false);

  useEffect(() => {
    api
      .get('/analytics/subject/' + id)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Report load nahi hui'));
  }, [id]);

  const rows = data ? (onlyRisk ? data.report.filter((r) => r.atRisk) : data.report) : [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            {data ? data.subject.name + ' - Class report' : 'Class report'}
          </h1>
          <Link to="/teacher" className="text-sm text-indigo-600 font-medium">
            Wapas
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {!data && !error && <p className="text-slate-500">Load ho raha hai...</p>}

        {data && (
          <>
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Sabhi students</h2>
                <label className="flex items-center gap-2 text-sm text-slate-600">
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