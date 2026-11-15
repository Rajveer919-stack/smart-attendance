import { useState } from 'react';
import api from '../api/axios';

const field = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Blob me aaye error ko padhkar message nikalta hai
async function errorText(err) {
  try {
    const data = err.response && err.response.data;
    if (data && typeof data.text === 'function') {
      const j = JSON.parse(await data.text());
      if (j && j.message) return j.message;
    } else if (data && data.message) {
      return data.message;
    }
  } catch {
    // neeche wala default message
  }
  return 'Excel nahi ban payi. Thodi der baad try karo';
}

// Saare subjects ka ek Excel (Teacher: apne subjects, Admin: sab ya department/semester chuno)
// departments: admin ke liye department ki list (na do to filter nahi dikhega)
export default function ExportAll({ departments = [], title = 'Saare subjects ka Excel' }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (department) params.department = department;
      if (semester) params.semester = semester;
      const res = await api.get('/analytics/export-all', { params, responseType: 'blob' });
      const m = (res.headers['content-disposition'] || '').match(/filename="?([^";]+)"?/);
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = m ? m[1] : 'attendance-all.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(await errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500">
          Ek file me 3 sheet: subject-wise hisaab, har student ka subject-wise %, aur 75% se kam wale students.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {departments.length > 0 && (
          <>
            <label className="text-sm text-slate-600">
              Department
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={field + ' mt-1 block'}>
                <option value="">Sab</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Semester
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className={field + ' mt-1 block'}>
                <option value="">Sab</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="text-sm text-slate-600">
          Se (date)
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field + ' mt-1 block'} />
        </label>
        <label className="text-sm text-slate-600">
          Tak (date)
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field + ' mt-1 block'} />
        </label>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="rounded-lg bg-green-600 text-white text-sm font-medium px-4 py-2 hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? 'Ban rahi hai...' : 'Excel download'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </section>
  );
}