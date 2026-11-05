import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';

// Har device ki ek pakki ID. Ek device se ek session me ek hi attendance lagegi
function getDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('deviceId', id);
  }
  return id;
}

export default function ScanQR() {
  const scannerRef = useRef(null);
  const handled = useRef(false);
  const [status, setStatus] = useState('idle'); // idle | scanning | sending | success | error
  const [message, setMessage] = useState('');

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // pehle se band hai
      }
    }
  };

  // Page chhodte hi camera band kar do
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const sendToken = async (token) => {
    setStatus('sending');
    try {
      const { data } = await api.post('/attendance/mark', {
        token,
        deviceId: getDeviceId(),
      });
      setStatus('success');
      setMessage(`${data.subject}: ${data.message}`);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    }
  };

  const startScan = async () => {
    setMessage('');
    setStatus('scanning');
    handled.current = false;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (handled.current) return;
          handled.current = true;
          await stopScanner();
          await sendToken(decodedText);
        },
        () => {}
      );
    } catch {
      scannerRef.current = null;
      setStatus('error');
      setMessage(
        'Camera chalu nahi hua. Camera ki permission do, aur site HTTPS ya localhost par kholo.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Attendance lagao</h1>
          <Link to="/student" className="text-sm text-indigo-600 font-medium">
            Wapas
          </Link>
        </div>

        <p className="text-sm text-slate-500">
          Teacher ki screen par jo QR dikh raha hai, use camera se scan karo.
        </p>

        <div
          id="qr-reader"
          className="w-full overflow-hidden rounded-xl bg-slate-100 min-h-[16rem]"
        />

        {status === 'sending' && (
          <p className="text-slate-600 text-center">Attendance lag rahi hai...</p>
        )}

        {status === 'success' && (
          <p className="text-green-700 bg-green-50 rounded-lg px-3 py-2 text-center font-medium">
            ✅ {message}
          </p>
        )}

        {status === 'error' && (
          <p className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{message}</p>
        )}

        {(status === 'idle' || status === 'error' || status === 'success') && (
          <button
            onClick={startScan}
            className="w-full rounded-lg bg-indigo-600 text-white font-medium py-2 hover:bg-indigo-700"
          >
            {status === 'idle' ? 'Scan shuru karo' : 'Dobara scan karo'}
          </button>
        )}
      </div>
    </div>
  );
}