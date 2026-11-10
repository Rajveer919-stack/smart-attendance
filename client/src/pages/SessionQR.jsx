import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

// QR 30 sec valid rehta hai, isliye 20 sec me naya le lete hai
const REFRESH_SECONDS = 20;
// 4 digit code har 15 second me badalta hai
const CODE_STEP = 15;
// Present/absent list har 5 sec me naya hoti hai
const LIST_REFRESH_MS = 5000;

const SOURCE_LABEL = { qr: 'QR se', code: 'Code se', manual: 'Haath se' };

const timeText = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function SessionQR() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [qrImage, setQrImage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [code, setCode] = useState('----');
  const [codeLeft, setCodeLeft] = useState(CODE_STEP);
  const [hasLocation, setHasLocation] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ending, setEnding] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [roll, setRoll] = useState('');
  const [busyId, setBusyId] = useState('');
  const remaining = useRef(REFRESH_SECONDS);
  const codeRemaining = useRef(CODE_STEP);

  const applyCode = useCallback((value, left) => {
    setCode(value);
    codeRemaining.current = left;
    setCodeLeft(left);
  }, []);

  const loadQr = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${id}/qr`);
      setQrImage(data.qrImage);
      setHasLocation(data.hasLocation !== false);
      if (data.code) applyCode(data.code, data.codeSecondsLeft || CODE_STEP);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'QR load nahi hua');
    }
  }, [id, applyCode]);

  const loadCode = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${id}/code`);
      applyCode(data.code, data.secondsLeft);
    } catch {
      // agli baar phir koshish hogi
    }
  }, [id, applyCode]);

  const loadAttendance = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${id}/attendance`);
      setAttendance(data);
    } catch {
      // agli baar phir koshish hogi
    }
  }, [id]);

  useEffect(() => {
    loadQr();
    const timer = setInterval(() => {
      remaining.current -= 1;
      if (remaining.current <= 0) {
        remaining.current = REFRESH_SECONDS;
        loadQr();
      }
      setSecondsLeft(remaining.current);

      codeRemaining.current -= 1;
      if (codeRemaining.current <= 0) {
        codeRemaining.current = CODE_STEP;
        loadCode();
      }
      setCodeLeft(codeRemaining.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [loadQr, loadCode]);

  useEffect(() => {
    loadAttendance();
    const timer = setInterval(loadAttendance, LIST_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadAttendance]);

  const endClass = async () => {
    setEnding(true);
    try {
      await api.post(`/sessions/${id}/end`);
      navigate('/teacher');
    } catch (err) {
      setError(err.response?.data?.message || 'Class band nahi ho payi');
      setEnding(false);
    }
  };

  const setStatus = async (student, status) => {
    setBusyId(String(student.studentId));
    setError('');
    setNotice('');
    try {
      await api.put(`/sessions/${id}/attendance/${student.studentId}`, { status });
      setNotice(student.name + ': ' + (status === 'present' ? 'Present' : 'Absent') + ' kar diya');
      await loadAttendance();
    } catch (err) {
      setError(err.response?.data?.message || 'Kuch galat ho gaya');
    } finally {
      setBusyId('');
    }
  };

  // Roll number daal kar present: jiske paas phone nahi unke liye
  const markByRoll = async (e) => {
    e.preventDefault();
    const r = Number(roll);
    const student = (attendance?.students || []).find((s) => s.rollNo === r);
    if (!student) {
      setNotice('');
      setError('Is roll number ka student is class me nahi mila');
      return;
    }
    await setStatus(student, 'present');
    setRoll('');
  };

  const students = attendance?.students || [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
        {/* QR + code wala hissa */}
        <div className="bg-white rounded-2xl shadow p-6 text-center space-y-4 h-fit">
          <div>
            <p className="text-sm text-slate-500">Class chal rahi hai</p>
            <h1 className="text-2xl font-bold text-slate-800">
              {state?.subjectName || attendance?.subject || 'Attendance QR'}
            </h1>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {!hasLocation && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              Is class me teacher ki location nahi mili, isliye 4 ank ke code se attendance nahi lagegi. Location allow karke class dobara shuru karo.
            </p>
          )}

          <div className="flex justify-center">
            {qrImage ? (
              <img src={qrImage} alt="Attendance QR" className="w-72 h-72 rounded-xl border border-slate-200 bg-white" />
            ) : (
              <div className="w-72 h-72 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                QR load ho raha hai...
              </div>
            )}
          </div>

          <p className="text-slate-600">
            Naya QR <span className="font-semibold text-indigo-600">{secondsLeft}</span> second me
          </p>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-4 space-y-2">
            <p className="text-sm text-white/80">Camera na chale to ye code daalo</p>
            <p className="text-5xl font-extrabold tracking-[0.35em] pl-[0.35em]">{code}</p>
            <div className="h-1.5 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-1000 ease-linear"
                style={{ width: Math.max(0, (codeLeft / CODE_STEP) * 100) + '%' }}
              />
            </div>
            <p className="text-xs text-white/80">{'Naya code ' + codeLeft + ' second me'}</p>
          </div>

          <p className="text-sm text-slate-500">
            Students QR scan karke ya ye code apne dashboard me daal kar attendance lagayenge
          </p>

          <button
            onClick={endClass}
            disabled={ending}
            className="w-full rounded-lg bg-red-600 text-white font-medium py-2 hover:bg-red-700 disabled:opacity-60"
          >
            {ending ? 'Band ho rahi hai...' : 'Class khatam karo'}
          </button>
        </div>

        {/* Present / Absent list */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800">Live attendance</h2>
            <span className="text-xs text-slate-400">har 5 second me update</span>
          </div>

          {attendance && (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-slate-100 py-2">
                <p className="text-xl font-bold text-slate-800">{attendance.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
              <div className="rounded-xl bg-green-50 py-2">
                <p className="text-xl font-bold text-green-700">{attendance.presentCount}</p>
                <p className="text-xs text-green-700">Present</p>
              </div>
              <div className="rounded-xl bg-red-50 py-2">
                <p className="text-xl font-bold text-red-600">{attendance.absentCount}</p>
                <p className="text-xs text-red-600">Absent</p>
              </div>
            </div>
          )}

          <form onSubmit={markByRoll} className="rounded-xl border border-slate-200 p-3 space-y-2">
            <p className="text-sm font-medium text-slate-700">Jiske paas phone nahi: roll number se present karo</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                placeholder="Roll number"
                className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!roll}
                className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
              >
                Present karo
              </button>
            </div>
          </form>

          {notice && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{notice}</p>}

          {!attendance && <p className="text-slate-500">Load ho raha hai...</p>}
          {attendance && students.length === 0 && (
            <p className="text-slate-500">
              Is subject ke department aur semester ka koi student abhi register nahi hai.
            </p>
          )}

          <ul className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
            {students.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between py-2 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {'Roll ' + (s.rollNo || '-')}
                    {s.markedAt ? ' - ' + timeText(s.markedAt) + ' baje' : ''}
                    {s.status === 'present' && s.source ? ' - ' + (SOURCE_LABEL[s.source] || '') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={
                      'text-xs font-semibold rounded-full px-3 py-1 ' +
                      (s.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')
                    }
                  >
                    {s.status === 'present' ? 'Present' : 'Absent'}
                  </span>
                  <button
                    onClick={() => setStatus(s, s.status === 'present' ? 'absent' : 'present')}
                    disabled={busyId === String(s.studentId)}
                    className="text-xs text-indigo-600 font-medium disabled:opacity-50"
                  >
                    {s.status === 'present' ? 'Absent karo' : 'Present karo'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}