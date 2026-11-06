import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
const primaryBtn =
  'rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60';

const emptyTeacher = { name: '', email: '', password: '', department: '' };
const emptySubject = { name: '', code: '', department: '', semester: '6', teacher: '' };

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [teacherForm, setTeacherForm] = useState(emptyTeacher);
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [query, setQuery] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [t, s, sub] = await Promise.all([
        api.get('/users?role=teacher'),
        api.get('/users?role=student'),
        api.get('/subjects'),
      ]);
      setTeachers(t.data.users);
      setStudents(s.data.users);
      setSubjects(sub.data.subjects);
    } catch (err) {
      setError(err.response?.data?.message || 'Data load nahi hua');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const switchTab = (name) => {
    setTab(name);
    setError('');
    setNotice('');
  };

  const run = async (action, successText) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
      setNotice(successText);
      await loadAll();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addTeacher = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => api.post('/auth/create-user', { ...teacherForm, role: 'teacher' }),
      'Teacher ka account ban gaya'
    );
    if (ok) setTeacherForm(emptyTeacher);
  };

  const addSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.teacher) {
      setError('Pehle teacher chuno');
      return;
    }
    const ok = await run(
      () => api.post('/subjects', { ...subjectForm, semester: Number(subjectForm.semester) }),
      'Subject ban gaya aur teacher ko mil gaya'
    );
    if (ok) setSubjectForm(emptySubject);
  };

  const removeUser = (u, label) => {
    if (!window.confirm(label + ' "' + u.name + '" ko delete karna hai?')) return;
    run(() => api.delete('/users/' + u._id), label + ' delete ho gaya');
  };

  const removeSubject = (s) => {
    if (!window.confirm('Subject "' + s.name + '" ko delete karna hai?')) return;
    run(() => api.delete('/subjects/' + s._id), 'Subject delete ho gaya');
  };

  const departments = Array.from(new Set(subjects.map((s) => s.department)));
  const q = query.trim().toLowerCase();
  const shownStudents = students.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.rollNo || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q)
  );

  const tabClass = (name) =>
    'px-4 py-2 rounded-lg text-sm font-medium ' +
    (tab === name
      ? 'bg-indigo-600 text-white'
      : 'bg-white text-slate-700 hover:bg-slate-50 shadow');

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Admin Panel</h1>
            <p className="text-sm text-slate-500">{user.name}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-slate-800 text-white text-sm px-3 py-1.5 hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-xl shadow py-3">
            <p className="text-2xl font-bold text-slate-800">{teachers.length}</p>
            <p className="text-xs text-slate-500">Teachers</p>
          </div>
          <div className="bg-white rounded-xl shadow py-3">
            <p className="text-2xl font-bold text-slate-800">{subjects.length}</p>
            <p className="text-xs text-slate-500">Subjects</p>
          </div>
          <div className="bg-white rounded-xl shadow py-3">
            <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            <p className="text-xs text-slate-500">Students</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => switchTab('teachers')} className={tabClass('teachers')}>
            Teachers
          </button>
          <button onClick={() => switchTab('subjects')} className={tabClass('subjects')}>
            Subjects
          </button>
          <button onClick={() => switchTab('students')} className={tabClass('students')}>
            Students
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {notice && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>
        )}

        {tab === 'teachers' && (
          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={addTeacher} className="bg-white rounded-2xl shadow p-5 space-y-3 h-fit">
              <h2 className="text-lg font-semibold text-slate-800">Naya teacher jodo</h2>
              <div>
                <label className={labelClass}>Naam</label>
                <input
                  required
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email (isse teacher login karega)</label>
                <input
                  type="email"
                  required
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Password (kam se kam 6 akshar)</label>
                <input
                  required
                  minLength={6}
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Department (optional)</label>
                <input
                  value={teacherForm.department}
                  onChange={(e) =>
                    setTeacherForm({ ...teacherForm, department: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={busy} className={primaryBtn}>
                Teacher banao
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow p-5 space-y-2">
              <h2 className="text-lg font-semibold text-slate-800">Saare teachers</h2>
              {teachers.length === 0 && <p className="text-slate-500">Abhi koi teacher nahi hai.</p>}
              <ul className="divide-y divide-slate-100">
                {teachers.map((t) => (
                  <li key={t._id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.email}</p>
                    </div>
                    <button
                      onClick={() => removeUser(t, 'Teacher')}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'subjects' && (
          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={addSubject} className="bg-white rounded-2xl shadow p-5 space-y-3 h-fit">
              <h2 className="text-lg font-semibold text-slate-800">Naya subject jodo</h2>
              <div>
                <label className={labelClass}>Subject ka naam</label>
                <input
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Subject code (jaise BCA601)</label>
                <input
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Department</label>
                  <input
                    required
                    list="department-list"
                    value={subjectForm.department}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, department: e.target.value })
                    }
                    className={inputClass}
                  />
                  <datalist id="department-list">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass}>Semester</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, semester: e.target.value })
                    }
                    className={inputClass}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Kaun teacher padhayega</label>
                <select
                  required
                  value={subjectForm.teacher}
                  onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Teacher chuno</option>
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name + ' (' + t.email + ')'}
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Pehle Teachers tab me teacher banao.
                  </p>
                )}
              </div>
              <button type="submit" disabled={busy} className={primaryBtn}>
                Subject banao
              </button>
            </form>

            <div className="bg-white rounded-2xl shadow p-5 space-y-2">
              <h2 className="text-lg font-semibold text-slate-800">Saare subjects</h2>
              {subjects.length === 0 && <p className="text-slate-500">Abhi koi subject nahi hai.</p>}
              <ul className="divide-y divide-slate-100">
                {subjects.map((s) => (
                  <li key={s._id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        {s.code + ' - ' + s.department + ' Sem ' + s.semester}
                      </p>
                      <p className="text-xs text-slate-500">
                        {'Teacher: ' + (s.teacher ? s.teacher.name : '-')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSubject(s)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'students' && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Saare students</h2>
              <input
                placeholder="Naam, roll ya department dhundo"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            {shownStudents.length === 0 && <p className="text-slate-500">Koi student nahi mila.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3">Roll</th>
                    <th className="py-2 pr-3">Naam</th>
                    <th className="py-2 pr-3">Class</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {shownStudents.map((s) => (
                    <tr key={s._id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 text-slate-600">{s.rollNo || '-'}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{s.name}</td>
                      <td className="py-2 pr-3 text-slate-600">
                        {(s.department || '-') + ' Sem ' + (s.semester || '-')}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{s.email}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => removeUser(s, 'Student')}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}