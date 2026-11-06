import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

// QR 30 sec valid rehta hai, isliye 20 sec me naya le lete hai
const REFRESH_SECONDS = 20;
// Present/absent list har 5 sec me naya hoti hai
const LIST_REFRESH_MS = 5000;

const timeText = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function SessionQR() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [qrImage, setQrImage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [error, setError] = useState('');
  const [ending, setEnding] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const remaining = useRef(REFRESH_SECONDS);

  const loadQr = useCallback(async () => {
    try {
      const { data } = await api.get(`/sessions/${id}/qr`);
      setQrImage(data.qrImage);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'QR load nahi hua');
    }
  }, [id]);

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
    }, 1000);
    return () => clearInterval(timer);
  }, [loadQr]);

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

  const students = attendance?.students || [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
        {/* QR wala hissa */}
        <div className="bg-white rounded-2xl shadow p-6 text-center space-y-4 h-fit">
          <div>
            <p className="text-sm text-slate-500">Class chal rahi hai</p>
            <h1 className="text-2xl font-bold text-slate-800">
              {state?.subjectName || attendance?.subject || 'Attendance QR'}
            </h1>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-center">
            {qrImage ? (
              <img
                src={qrImage}
                alt="Attendance QR"
                className="w-72 h-72 rounded-xl border border-slate-200"
              />
            ) : (
              <div className="w-72 h-72 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                QR load ho raha hai...
              </div>
            )}
          </div>

          <p className="text-slate-600">
            Naya QR <span className="font-semibold text-indigo-600">{secondsLeft}</span> second me
          </p>
          <p className="text-sm text-slate-500">
            Students apne phone se is QR ko scan karke attendance lagayenge
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

          {!attendance && <p className="text-slate-500">Load ho raha hai...</p>}
          {attendance && students.length === 0 && (
            <p className="text-slate-500">
              Is subject ke department aur semester ka koi student abhi register nahi hai.
            </p>
          )}

          <ul className="divide-y divide-slate-100">
            {students.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-500">
                    {'Roll ' + (s.rollNo || '-')}
                    {s.markedAt ? ' - ' + timeText(s.markedAt) + ' baje' : ''}
                  </p>
                </div>
                <span
                  className={
                    'text-xs font-semibold rounded-full px-3 py-1 ' +
                    (s.status === 'present'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600')
                  }
                >
                  {s.status === 'present' ? 'Present' : 'Absent'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}