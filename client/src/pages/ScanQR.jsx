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
  const zoomRef = useRef(null); // { feature, min, max, step, value }
  const pinchRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | scanning | sending | success | error
  const [message, setMessage] = useState('');
  const [zoom, setZoom] = useState(null); // null = is phone me zoom nahi hai

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    zoomRef.current = null;
    setZoom(null);
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
      setMessage(data.subject + ': ' + data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Server se connect nahi ho pa raha');
    }
  };

  // Camera ka zoom badalna (Google Pay jaisa)
  const applyZoom = async (value) => {
    const z = zoomRef.current;
    if (!z) return;
    const next = Math.min(z.max, Math.max(z.min, value));
    try {
      await z.feature.apply(next);
      z.value = next;
      setZoom({ min: z.min, max: z.max, step: z.step, value: next });
    } catch {
      // is camera ne ye zoom nahi liya
    }
  };

  const setupZoom = (scanner) => {
    try {
      const caps = scanner.getRunningTrackCameraCapabilities();
      const feature = caps.zoomFeature();
      if (feature && feature.isSupported()) {
        const min = feature.min();
        const max = feature.max();
        const step = feature.step() || 0.1;
        const value = feature.value() || min;
        zoomRef.current = { feature, min, max, step, value };
        setZoom({ min, max, step, value });
        return;
      }
    } catch {
      // zoom support nahi hai
    }
    zoomRef.current = null;
    setZoom(null);
  };

  // Do ungli se pinch karke zoom
  const distance = (touches) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const onTouchStart = (e) => {
    if (e.touches.length === 2 && zoomRef.current) {
      pinchRef.current = { start: distance(e.touches), zoom: zoomRef.current.value };
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current && zoomRef.current) {
      const ratio = distance(e.touches) / pinchRef.current.start;
      applyZoom(pinchRef.current.zoom * ratio);
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const startScan = async () => {
    setMessage('');
    setStatus('scanning');
    handled.current = false;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        {
          fps: 10,
          qrbox: (w, h) => {
            const side = Math.floor(Math.min(w, h) * 0.75);
            return { width: side, height: side };
          },
        },
        async (decodedText) => {
          if (handled.current) return;
          handled.current = true;
          await stopScanner();
          await sendToken(decodedText);
        },
        () => {}
      );
      setupZoom(scanner);
    } catch {
      scannerRef.current = null;
      setStatus('error');
      setMessage(
        'Camera chalu nahi hua. Camera ki permission do, aur site HTTPS ya localhost par kholo.'
      );
    }
  };

  const zoomLabel = zoom ? zoom.value.toFixed(1) + 'x' : '';
  const stepBy = zoom ? Math.max(zoom.step, (zoom.max - zoom.min) / 10) : 0.5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
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
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'pan-y' }}
          className="relative w-full overflow-hidden rounded-2xl bg-slate-100 min-h-[16rem]"
        >
          <div id="qr-reader" className="w-full" />
        </div>

        {status === 'scanning' && zoom && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Zoom (ya do ungli se pinch karo)</span>
              <span className="font-semibold text-indigo-600">{zoomLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => applyZoom(zoom.value - stepBy)}
                className="h-9 w-9 rounded-full bg-white border border-slate-300 text-xl font-bold text-slate-700 leading-none"
              >
                -
              </button>
              <input
                type="range"
                min={zoom.min}
                max={zoom.max}
                step={zoom.step}
                value={zoom.value}
                onChange={(e) => applyZoom(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <button
                type="button"
                onClick={() => applyZoom(zoom.value + stepBy)}
                className="h-9 w-9 rounded-full bg-white border border-slate-300 text-xl font-bold text-slate-700 leading-none"
              >
                +
              </button>
            </div>
          </div>
        )}

        {status === 'scanning' && !zoom && (
          <p className="text-xs text-slate-500 text-center">
            Is phone ke camera me zoom nahi mil raha. QR ke thoda paas ya door ho jao.
          </p>
        )}

        {status === 'sending' && (
          <p className="text-slate-600 text-center">Attendance lag rahi hai...</p>
        )}

        {status === 'success' && (
          <p className="text-green-700 bg-green-50 rounded-lg px-3 py-2 text-center font-medium">
            {'Attendance lag gayi. ' + message}
          </p>
        )}

        {status === 'error' && (
          <p className="text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{message}</p>
        )}

        {(status === 'idle' || status === 'error' || status === 'success') && (
          <button
            onClick={startScan}
                        className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700"
          >
            {status === 'idle' ? 'Scan shuru karo' : 'Dobara scan karo'}
          </button>
        )}
      </div>
    </div>
  );
}