import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function TeacherStudents() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/my-classes')
      .then((res) => {
        setClasses(res.data.classes);
        if (res.data.classes.length > 0) setSelected(res.data.classes[0]);
      })
      .catch((err) => setError(err.response?.data?.message || 'Classes load nahi hui'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setListLoading(true);
    setError('');
    api
      .get('/users/class-students', {
        params: { department: selected.department, semester: selected.semester },
      })
      .then((res) => setStudents(res.data.students))
      .catch((err) => setError(err.response?.data?.message || 'List load nahi hui'))
      .finally(() => setListLoading(false));
  }, [selected]);

  const isSelected = (c) =>
    selected && selected.department === c.department && selected.semester === c.semester;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Class-wise students</h1>
            <p className="text-sm text-slate-500">{user.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/teacher"
              className="rounded-lg border border-slate-300 text-slate-700 text-sm px-3 py-1.5 hover:bg-slate-50"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="rounded-lg bg-slate-800 text-white text-sm px-3 py-1.5 hover:bg-slate-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {loading && <p className="text-slate-500">Load ho raha hai...</p>}
        {!loading && classes.length === 0 && (
          <p className="text-slate-500">Abhi tumhare naam par koi class nahi hai.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <button
              key={c.department + c.semester}
              onClick={() => setSelected(c)}
              className={
                'rounded-full text-sm px-3 py-1.5 border ' +
                (isSelected(c)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
              }
            >
              {c.department + ' Sem ' + c.semester + ' (' + c.count + ')'}
            </button>
          ))}
        </div>

        {selected && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-2">
            <h2 className="text-lg font-semibold text-slate-800">
              {selected.department + ' - Semester ' + selected.semester}
              <span className="ml-2 text-sm font-normal text-slate-500">
                {students.length + ' students'}
              </span>
            </h2>
            {listLoading && <p className="text-slate-500">Load ho raha hai...</p>}
            {!listLoading && students.length === 0 && (
              <p className="text-slate-500">Is class me abhi koi student register nahi hua.</p>
            )}
            {students.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 w-16">Roll</th>
                    <th className="py-2 pr-3">Naam</th>
                    <th className="py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium text-slate-700">{s.rollNo || '-'}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{s.name}</td>
                      <td className="py-2 text-slate-600">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}