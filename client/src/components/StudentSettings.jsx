import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { bioAvailable, bioErrorMessage, enrollBio } from '../utils/bio';
import {
  disablePush,
  enablePush,
  getPushState,
  needsInstallOnIphone,
  pushSupported,
  syncPush,
} from '../utils/push';

function Badge({ on, children }) {
  return (
    <span
      className={
        'shrink-0 text-xs font-semibold rounded-full px-3 py-1 ' +
        (on ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')
      }
    >
      {children}
    </span>
  );
}

const btn = 'rounded-lg text-sm font-medium px-4 py-2 disabled:opacity-60';

// Student ke liye do cheezein: phone par notification aur fingerprint/face lock
export default function StudentSettings() {
  const [push, setPush] = useState('checking'); // checking | unsupported | blocked | off | on
  const [bio, setBio] = useState({ ready: false, usable: false, enrolled: false, required: false });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ type: '', text: '' });

  const refreshPush = useCallback(async () => {
    setPush(await getPushState());
  }, []);

  const refreshBio = useCallback(async () => {
    try {
      const [res, usable] = await Promise.all([api.get('/bio/status'), bioAvailable()]);
      setBio({ ready: true, usable, enrolled: res.data.enrolled, required: res.data.required });
    } catch {
      setBio((b) => ({ ...b, ready: true }));
    }
  }, []);

  useEffect(() => {
    refreshPush();
    refreshBio();
    // Is device ka notification address abhi ke student ke naam par pakka karo
    if (pushSupported()) syncPush();
  }, [refreshPush, refreshBio]);

  const run = async (name, fn, okText, isBio) => {
    setBusy(name);
    setMsg({ type: '', text: '' });
    try {
      await fn();
      setMsg({ type: 'ok', text: okText });
    } catch (err) {
      const text = isBio
        ? bioErrorMessage(err)
        : (err.response && err.response.data && err.response.data.message) || err.message || 'Kuch galat ho gaya';
      setMsg({ type: 'error', text });
    } finally {
      setBusy('');
      refreshPush();
      refreshBio();
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Phone ki settings</h2>

      {/* Notification */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-800">Notification</p>
            <p className="text-xs text-slate-500">Class shuru hote hi aur teacher ke announcement ka alert</p>
          </div>
          <Badge on={push === 'on'}>{push === 'on' ? 'ON' : 'OFF'}</Badge>
        </div>

        {push === 'unsupported' && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {needsInstallOnIphone()
              ? 'iPhone par pehle Safari me Share dabao aur Add to Home Screen karo. Phir app kholkar notification ON karo.'
              : 'Is browser me notification nahi chalti. Live site ko Chrome me kholo.'}
          </p>
        )}
        {push === 'blocked' && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            Notification block hai. Browser ki site settings me jaakar Notifications allow karo.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {push === 'off' && (
            <button
              onClick={() => run('push', enablePush, 'Notification ON ho gayi', false)}
              disabled={busy !== ''}
              className={btn + ' bg-indigo-600 text-white hover:bg-indigo-700'}
            >
              {busy === 'push' ? 'ON ho rahi hai...' : 'Notification ON karo'}
            </button>
          )}
          {push === 'on' && (
            <>
              <button
                onClick={() => run('test', () => api.post('/push/test'), 'Test notification bhej di', false)}
                disabled={busy !== ''}
                className={btn + ' border border-indigo-600 text-indigo-600 hover:bg-indigo-50'}
              >
                {busy === 'test' ? 'Bhej rahe hai...' : 'Test bhejo'}
              </button>
              <button
                onClick={() => run('unpush', disablePush, 'Notification band ho gayi', false)}
                disabled={busy !== ''}
                className={btn + ' border border-slate-300 text-slate-700 hover:bg-slate-50'}
              >
                Band karo
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Fingerprint / face lock */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-slate-800">Fingerprint / Face lock</p>
            <p className="text-xs text-slate-500">
              Attendance lagate waqt phone ka fingerprint ya face poochha jayega. Tumhare phone par koi aur tumhari
              attendance nahi laga payega.
            </p>
          </div>
          <Badge on={bio.enrolled}>{bio.enrolled ? 'ON' : 'OFF'}</Badge>
        </div>

        {!bio.ready && <p className="text-xs text-slate-500">Load ho raha hai...</p>}

        {bio.ready && bio.required && !bio.enrolled && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            Admin ne ye sabke liye zaroori kiya hai. Jab tak lock ON nahi hoga, attendance nahi lagegi.
          </p>
        )}

        {bio.ready && bio.enrolled && (
          <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            Lock ON hai. Naya phone ho ya lock kharab ho jaye to admin se reset karwao.
          </p>
        )}

        {bio.ready && !bio.enrolled && !bio.usable && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            Is phone ya browser me fingerprint, face ya screen lock nahi mila. Phone me screen lock lagao aur live
            site Chrome me kholo.
          </p>
        )}

        {bio.ready && !bio.enrolled && bio.usable && (
          <button
            onClick={() => run('bio', enrollBio, 'Fingerprint/face lock ON ho gaya', true)}
            disabled={busy !== ''}
            className={btn + ' bg-violet-600 text-white hover:bg-violet-700'}
          >
            {busy === 'bio' ? 'Phone se verify karo...' : 'Fingerprint/face lock ON karo'}
          </button>
        )}
      </div>

      {msg.text && (
        <p
          className={
            'text-sm rounded-lg px-3 py-2 ' +
            (msg.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50')
          }
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}