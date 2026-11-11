import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardShell, { Stat } from '../components/DashboardShell';
import AdminCharts from '../components/AdminCharts';
import AdminSecurity from '../components/AdminSecurity';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
const primaryBtn =
  'rounded-lg bg-indigo-600 text-white font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60';

const emptyTeacher = { name: '', email: '', password: '', department: '' };
const emptySubject = { name: '', code: '', department: '', semester: '6', teacher: '' };
const emptyAccount = { currentPassword: '', newEmail: '', newPassword: '' };

// Side menu (laptop) aur neeche ka tab bar (phone) ke items
const ADMIN_NAV = [
  { key: 'overview', label: 'Overview', icon: 'chart' },
  { key: 'students', label: 'Students', icon: 'users' },
  { key: 'teachers', label: 'Teachers', icon: 'teacher' },
  { key: 'subjects', label: 'Subjects', icon: 'book' },
  { key: 'security', label: 'Security', icon: 'shield' },
  { key: 'account', label: 'Account', icon: 'user' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [meta, setMeta] = useState({ departments: [], semesters: [1, 2, 3, 4, 5, 6, 7, 8], maxRoll: 300 });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [teacherForm, setTeacherForm] = useState(emptyTeacher);
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [t, s, sub, m] = await Promise.all([
        api.get('/users?role=teacher&limit=1000'),
        api.get('/users?role=student&limit=1000'),
        api.get('/subjects'),
        api.get('/auth/classes'),
      ]);
      setTeachers(t.data.users);
      setStudents(s.data.users);
      setSubjects(sub.data.subjects);
      setMeta(m.data);
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

  const startEdit = (u) => {
    setError('');
    setNotice('');
    setEditing({
      _id: u._id,
      role: u.role,
      name: u.name || '',
      email: u.email || '',
      rollNo: u.rollNo === undefined || u.rollNo === null ? '' : String(u.rollNo),
      department: u.department || '',
      semester: u.semester ? String(u.semester) : '',
      newPassword: '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const body = { name: editing.name, email: editing.email };
    if (editing.role === 'student') {
      body.rollNo = editing.rollNo;
      body.department = editing.department;
      body.semester = editing.semester;
    }
    if (editing.newPassword) body.newPassword = editing.newPassword;
    const ok = await run(() => api.put('/users/' + editing._id, body), 'Update ho gaya');
    if (ok) setEditing(null);
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    const body = { currentPassword: accountForm.currentPassword };
    if (accountForm.newEmail) body.newEmail = accountForm.newEmail;
    if (accountForm.newPassword) body.newPassword = accountForm.newPassword;
    const ok = await run(
      () => api.put('/auth/account', body),
      'Account update ho gaya. Agli baar naye email/password se login karna'
    );
    if (ok) setAccountForm(emptyAccount);
  };

  // Students ko department -> semester ke group me baantna, har group roll number ke order me
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = students.filter((s) => {
      if (deptFilter && s.department !== deptFilter) return false;
      if (semFilter && String(s.semester) !== semFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        String(s.rollNo || '') === q
      );
    });
    const map = new Map();
    filtered.forEach((s) => {
      const key = (s.department || '-') + '|' + (s.semester || 0);
      if (!map.has(key)) map.set(key, { department: s.department || '-', semester: s.semester || 0, rows: [] });
      map.get(key).rows.push(s);
    });
    const order = (d) => {
      const i = meta.departments.indexOf(d);
      return i === -1 ? 999 : i;
    };
    const list = Array.from(map.values());
    list.forEach((g) => g.rows.sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0)));
    list.sort((a, b) => order(a.department) - order(b.department) || a.semester - b.semester);
    return list;
  }, [students, query, deptFilter, semFilter, meta.departments]);

  const classCounts = useMemo(() => {
    const map = new Map();
    students.forEach((s) => {
      const key = (s.department || '-') + '|' + (s.semester || 0);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => {
      const parts = key.split('|');
      return { department: parts[0], semester: Number(parts[1]), count };
    });
  }, [students]);

  const nav = ADMIN_NAV.map((n) => ({ ...n, onClick: () => switchTab(n.key) }));

  const deptOptions = meta.departments.map((d) => (
    <option key={d} value={d}>
      {d}
    </option>
  ));

  return (
    <DashboardShell label="Admin Panel" nav={nav} active={tab}>
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {notice && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>
        )}

        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat icon="teacher" tone="violet" label="Teachers" value={teachers.length} />
              <Stat icon="book" tone="sky" label="Subjects" value={subjects.length} />
              <Stat icon="calendar" tone="emerald" label="Classes" value={classCounts.length} />
            </div>
            <AdminCharts />
          </div>
        )}

        {tab === 'security' && <AdminSecurity />}

        {tab === 'students' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <h2 className="text-lg font-semibold text-slate-800">Class-wise students</h2>
              {classCounts.length === 0 && (
                <p className="text-slate-500 text-sm">Abhi kisi class me student nahi hai.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {classCounts
                  .sort(
                    (a, b) =>
                      meta.departments.indexOf(a.department) - meta.departments.indexOf(b.department) ||
                      a.semester - b.semester
                  )
                  .map((c) => (
                    <button
                      key={c.department + c.semester}
                      onClick={() => {
                        setDeptFilter(c.department);
                        setSemFilter(String(c.semester));
                      }}
                      className="rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm px-3 py-1 hover:bg-indigo-100"
                    >
                      {c.department + ' Sem ' + c.semester + ': ' + c.count}
                    </button>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Saare departments</option>
                  {deptOptions}
                </select>
                <select
                  value={semFilter}
                  onChange={(e) => setSemFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Saare semesters</option>
                  {meta.semesters.map((n) => (
                    <option key={n} value={String(n)}>
                      {'Semester ' + n}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Naam, roll ya email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={inputClass}
                />
                <button
                  onClick={() => {
                    setDeptFilter('');
                    setSemFilter('');
                    setQuery('');
                  }}
                  className="rounded-lg border border-slate-300 text-slate-700 px-3 py-2 hover:bg-slate-50"
                >
                  Filter hatao
                </button>
              </div>
            </div>

            {groups.length === 0 && (
              <p className="text-slate-500 bg-white rounded-2xl shadow p-5">Koi student nahi mila.</p>
            )}

            {groups.map((g) => (
              <div key={g.department + g.semester} className="bg-white rounded-2xl shadow p-5 space-y-2">
                <h3 className="font-semibold text-slate-800">
                  {g.department + ' - Semester ' + g.semester}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {g.rows.length + ' students'}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3 w-16">Roll</th>
                        <th className="py-2 pr-3">Naam</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((s) => (
                        <tr key={s._id} className="border-b border-slate-100">
                          <td className="py-2 pr-3 font-medium text-slate-700">{s.rollNo || '-'}</td>
                          <td className="py-2 pr-3 font-medium text-slate-800">{s.name}</td>
                          <td className="py-2 pr-3 text-slate-600">{s.email}</td>
                          <td className="py-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEdit(s)}
                              className="text-indigo-600 hover:underline mr-3"
                            >
                              Edit
                            </button>
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
            ))}
          </div>
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
                <select
                  value={teacherForm.department}
                  onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Koi nahi</option>
                  {deptOptions}
                </select>
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
                    <div className="whitespace-nowrap text-sm">
                      <button onClick={() => startEdit(t)} className="text-indigo-600 hover:underline mr-3">
                        Edit
                      </button>
                      <button onClick={() => removeUser(t, 'Teacher')} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
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
                  <select
                    required
                    value={subjectForm.department}
                    onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Chuno</option>
                    {deptOptions}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Semester</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                    className={inputClass}
                  >
                    {meta.semesters.map((n) => (
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
                  <p className="text-xs text-red-600 mt-1">Pehle Teachers tab me teacher banao.</p>
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
                    <button onClick={() => removeSubject(s)} className="text-sm text-red-600 hover:underline">
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === 'account' && (
          <form onSubmit={saveAccount} className="bg-white rounded-2xl shadow p-5 space-y-3 max-w-md">
            <h2 className="text-lg font-semibold text-slate-800">Apna email ya password badlo</h2>
            <p className="text-sm text-slate-500">
              {'Abhi ka email: ' + user.email + '. Jo badalna hai wahi bharo, baaki khali chhod do.'}
            </p>
            <div>
              <label className={labelClass}>Abhi ka password (zaroori)</label>
              <input
                type="password"
                required
                value={accountForm.currentPassword}
                onChange={(e) => setAccountForm({ ...accountForm, currentPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Naya email (optional)</label>
              <input
                type="email"
                value={accountForm.newEmail}
                onChange={(e) => setAccountForm({ ...accountForm, newEmail: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Naya password (optional, kam se kam 6 akshar)</label>
              <input
                type="password"
                minLength={6}
                value={accountForm.newPassword}
                onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            <button type="submit" disabled={busy} className={primaryBtn}>
              Save karo
            </button>
          </form>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold text-slate-800">
              {editing.role === 'student' ? 'Student edit karo' : 'Teacher edit karo'}
            </h2>
            <div>
              <label className={labelClass}>Naam</label>
              <input
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className={inputClass}
              />
            </div>
            {editing.role === 'student' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Department</label>
                    <select
                      required
                      value={editing.department}
                      onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Chuno</option>
                      {deptOptions}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Semester</label>
                    <select
                      required
                      value={editing.semester}
                      onChange={(e) => setEditing({ ...editing, semester: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Chuno</option>
                      {meta.semesters.map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{'Roll number (1 se ' + meta.maxRoll + ')'}</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={meta.maxRoll}
                    value={editing.rollNo}
                    onChange={(e) => setEditing({ ...editing, rollNo: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
            <div>
              <label className={labelClass}>Naya password (sirf badalna ho tab)</label>
              <input
                minLength={6}
                value={editing.newPassword}
                onChange={(e) => setEditing({ ...editing, newPassword: e.target.value })}
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className={primaryBtn}>
                Save karo
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}