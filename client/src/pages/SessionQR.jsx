import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

// QR 30 sec valid rehta hai, isliye 20 sec me naya le lete hai
const REFRESH_SECONDS = 20;

export default function SessionQR() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [qrImage, setQrImage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS);
  const [error, setError] = useState('');
  const [ending, setEnding] = useState(false);
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 text-center space-y-4">
        <div>
          <p className="text-sm text-slate-500">Class chal rahi hai</p>
          <h1 className="text-2xl font-bold text-slate-800">
            {state?.subjectName || 'Attendance QR'}
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
    </div>
  );
}