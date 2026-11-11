import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import DashboardShell, { Stat } from '../components/DashboardShell';
import StudentSettings from '../components/StudentSettings';
import { getDeviceId, getPosition } from '../utils/device';
import { markWithBio } from '../utils/bio';

const RADIUS = 28;
const CIRCLE = 2 * Math.PI * RADIUS;

function tone(percentage) {
  if (percentage >= 75) return { text: 'text-green-600', stroke: '#16a34a', bar: 'bg-green-500', chip: 'bg-green-50 text-green-700' };
  if (percentage >= 60) return { text: 'text-amber-600', stroke: '#d97706', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' };
  return { text: 'text-red-600', stroke: '#dc2626', bar: 'bg-red-500', chip: 'bg-red-50 text-red-700' };
}

function Ring({ percentage, size = 64 }) {
  const p = Math.max(0, Math.min(100, Number(percentage) || 0));
  const t = tone(p);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          stroke={t.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCLE}
          strokeDashoffset={CIRCLE * (1 - p / 100)}
        />
      </svg>
      <span
        className={'absolute inset-0 flex items-center justify-center font-bold ' + t.text}
        style={{ fontSize: size > 80 ? 20 : 14 }}
      >
        {Math.round(p) + '%'}
      </span>
    </div>
  );
}

// Side menu (laptop) aur neeche ka tab bar (phone). Scan alag page par khulta hai
const STUDENT_NAV = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'subjects', label: 'Subjects', icon: 'book' },
  { key: 'scan', label: 'Scan', icon: 'scan', to: '/student/scan' },
  { key: 'history', label: 'History', icon: 'clock' },
  { key: 'settings', label: 'Settings', icon: 'sliders' },
];

const SOURCE_LABEL = { qr: 'QR se', code: 'Code se', manual: 'Teacher ne lagayi' };

// Announcement kab tak dekhi gayi (is phone me yaad rehta hai)
const readSeen = () => {
  try {
    return Number(localStorage.getItem('annSeen')) || 0;
  } catch {
    return 0;
  }
};
const writeSeen = () => {
  try {
    localStorage.setItem('annSeen', String(Date.now()));
  } catch {
    // koi baat nahi
  }
};

const timeText = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function StudentDashboard() {
  const { user } = useAuth();
  const [view, setView] = useState('home');
  const [report, setReport] = useState([]);
  const [live, setLive] = useState([]);
  const [history, setHistory] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showAllAnn, setShowAllAnn] = useState(false);
  const seenAt = useRef(readSeen()).current;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [codeMsg, setCodeMsg] = useState({ type: '', text: '' });
  const [installEvent, setInstallEvent] = useState(null);
  const codeRef = useRef(null);

  const loadReport = useCallback(async () => {
    try {
      const [rep, hist] = await Promise.all([api.get('/attendance/me'), api.get('/attendance/history')]);
      setReport(rep.data.report);
      setHistory(hist.data.history);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Report load nahi hui');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const { data } = await api.get('/attendance/live');
      setLive(data.classes);
    } catch {
      // agli baar phir koshish hogi
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data.announcements);
      writeSeen();
    } catch {
      // agli baar phir koshish hogi
    }
  }, []);

  useEffect(() => {
    loadReport();
    loadLive();
    loadAnnouncements();
    // Chalti class har 10 second me dekho (sirf jab app saamne khula ho)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadLive();
    }, 10000);
    const annTimer = setInterval(() => {
      if (document.visibilityState === 'visible') loadAnnouncements();
    }, 60000);
    return () => {
      clearInterval(timer);
      clearInterval(annTimer);
    };
  }, [loadReport, loadLive, loadAnnouncements]);

  // "App install karo" ka button (Android Chrome)
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try {
      await installEvent.userChoice;
    } catch {
      // koi baat nahi
    }
    setInstallEvent(null);
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(code)) {
      setCodeMsg({ type: 'error', text: '4 ank ka code daalo' });
      return;
    }
    setSending(true);
    setCodeMsg({ type: '', text: 'Location dekh rahe hai...' });
    try {
      const pos = await getPosition();
      if (!pos) {
        setCodeMsg({
          type: 'error',
          text: 'Phone ki location ON karo aur allow karo, tabhi code se attendance lagegi',
        });
        return;
      }
      const { data } = await markWithBio(
        '/attendance/mark-code',
        { code, deviceId: getDeviceId(), ...pos },
        () => setCodeMsg({ type: '', text: 'Fingerprint ya face se verify karo...' })
      );
      setCodeMsg({ type: 'ok', text: data.subject + ': ' + data.message });
      setCode('');
      loadLive();
      loadReport();
    } catch (err) {
      setCodeMsg({
        type: 'error',
        text: err.response?.data?.message || 'Server se connect nahi ho pa raha',
      });
    } finally {
      setSending(false);
    }
  };

  const openView = (key) => {
    setView(key);
    window.scrollTo(0, 0);
  };
  const nav = STUDENT_NAV.map((n) => (n.to ? n : { ...n, onClick: () => openView(n.key) }));

  const riskCount = report.filter((r) => r.atRisk).length;
  const totalAttended = report.reduce((sum, r) => sum + (r.attended || 0), 0);
  const totalHeld = report.reduce((sum, r) => sum + (r.totalClasses || 0), 0);
  const overall = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 1000) / 10 : 0;
  const overallTone = tone(overall);
  const pending = live.filter((c) => !c.marked);
  const allDone = live.length > 0 && pending.length === 0;
  const newAnnCount = announcements.filter((a) => new Date(a.createdAt).getTime() > seenAt).length;
  const shownAnn = showAllAnn ? announcements : announcements.slice(0, 3);

  return (
    <DashboardShell label="Student Dashboard" nav={nav} active={view}>
      <div className="space-y-5">
        {view === 'home' && (
          <>
            <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 shadow-lg">
              <p className="text-sm text-white/80">Namaste,</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold">{user.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="rounded-full bg-white/20 px-3 py-1">{'Roll ' + (user.rollNo || '-')}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">{user.department}</span>
                <span className="rounded-full bg-white/20 px-3 py-1">{'Semester ' + user.semester}</span>
              </div>
            </section>

            {installEvent && (
              <button
                onClick={install}
                className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white shadow px-4 py-3 text-left"
              >
                <span>
                  <span className="block font-semibold text-slate-800">App install karo</span>
                  <span className="block text-xs text-slate-500">Home screen se seedha khulega, login yaad rahega</span>
                </span>
                <span className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-3 py-1.5">Install</span>
              </button>
            )}

            <div className="grid gap-5 lg:grid-cols-5 lg:items-start">
              <div className="space-y-5 lg:col-span-3">
                {/* Abhi chal rahi class */}
                <section className="bg-white rounded-2xl shadow p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        'h-2.5 w-2.5 rounded-full ' + (live.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-300')
                      }
                    />
                    <h2 className="text-lg font-semibold text-slate-800">
                      {live.length > 0 ? 'Abhi class chal rahi hai' : 'Abhi koi class chalu nahi hai'}
                    </h2>
                  </div>

                  {live.map((c) => (
                    <div
                      key={c.sessionId}
                      className={
                        'flex items-center justify-between rounded-xl px-3 py-2 ' +
                        (c.marked ? 'bg-green-50' : 'bg-indigo-50')
                      }
                    >
                      <div>
                        <p className="font-medium text-slate-800">{c.subject}</p>
                        <p className="text-xs text-slate-500">{c.code}</p>
                      </div>
                      <span
                        className={
                          'text-xs font-semibold rounded-full px-3 py-1 ' +
                          (c.marked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800')
                        }
                      >
                        {c.marked ? 'Attendance lag gayi' : 'Attendance baaki hai'}
                      </span>
                    </div>
                  ))}

                  {live.length === 0 && (
                    <p className="text-sm text-slate-500">Teacher class shuru karega to yaha dikh jayegi.</p>
                  )}

                  {pending.length > 0 && (
                    <div className="space-y-3 pt-1">
                      <Link
                        to="/student/scan"
                        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700"
                      >
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                          <path d="M4 12h16" />
                        </svg>
                        QR scan karke attendance lagao
                      </Link>

                      <form onSubmit={submitCode} className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <p className="text-sm font-medium text-slate-700">Camera nahi chal raha? 4 ank ka code daalo</p>
                        <p className="text-xs text-slate-500">
                          Teacher ki screen par jo code dikh raha hai wo daalo (har 15 second me badalta hai). Class ke 100 meter ke andar hona zaroori hai.
                        </p>
                        <div className="flex gap-2">
                          <input
                            ref={codeRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoComplete="one-time-code"
                            placeholder="0000"
                            maxLength={4}
                            className="w-32 rounded-xl border border-slate-300 px-3 py-2.5 text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            disabled={sending || code.length !== 4}
                            className="flex-1 rounded-xl bg-violet-600 text-white font-semibold px-3 hover:bg-violet-700 disabled:opacity-60"
                          >
                            {sending ? 'Lag rahi hai...' : 'Code se attendance lagao'}
                          </button>
                        </div>
                        {codeMsg.text && (
                          <p
                            className={
                              'text-sm rounded-lg px-3 py-2 ' +
                              (codeMsg.type === 'ok'
                                ? 'text-green-700 bg-green-50'
                                : codeMsg.type === 'error'
                                  ? 'text-red-600 bg-red-50'
                                  : 'text-slate-600 bg-slate-50')
                            }
                          >
                            {codeMsg.text}
                          </p>
                        )}
                      </form>

                      <p className="text-xs text-slate-500">
                        Phone nahi hai? Teacher ke paas jaakar apna roll number batao, wo haath se attendance laga denge.
                      </p>
                    </div>
                  )}

                  {allDone && (
                    <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      Is class ki tumhari attendance lag chuki hai.
                    </p>
                  )}
                </section>

                {announcements.length > 0 && (
                  <section className="bg-white rounded-2xl shadow p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-slate-800">Teacher ke announcements</h2>
                      {newAnnCount > 0 && (
                        <span className="text-xs font-semibold rounded-full px-3 py-1 bg-indigo-600 text-white">
                          {newAnnCount + ' naye'}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {shownAnn.map((a) => (
                        <li key={a.id} className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                          <p className="text-xs text-slate-500">
                            {a.subject + ' - ' + a.teacher + ' - ' + timeText(a.createdAt)}
                          </p>
                          <p className="font-semibold text-slate-800">{a.title}</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line break-words">{a.message}</p>
                        </li>
                      ))}
                    </ul>
                    {announcements.length > 3 && (
                      <button
                        onClick={() => setShowAllAnn((v) => !v)}
                        className="text-sm text-indigo-600 font-medium"
                      >
                        {showAllAnn ? 'Kam dikhao' : 'Sab dikhao (' + announcements.length + ')'}
                      </button>
                    )}
                  </section>
                )}

              </div>
              <div className="space-y-5 lg:col-span-2">
                {!loading && report.length > 0 && (
                  <section className="grid gap-3">
                    <div className="bg-white rounded-2xl shadow p-4 flex items-center gap-4">
                      <Ring percentage={overall} size={96} />
                      <div>
                        <p className="text-sm text-slate-500">Poori attendance</p>
                        <p className={'text-lg font-bold ' + overallTone.text}>
                          {overall >= 75 ? 'Sab theek hai' : 'Dhyan do'}
                        </p>
                        <p className="text-xs text-slate-500">{totalAttended + ' / ' + totalHeld + ' class'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Stat icon="book" tone="indigo" label="Subjects" value={report.length} />
                      <Stat
                        icon={riskCount > 0 ? 'alert' : 'check'}
                        tone={riskCount > 0 ? 'rose' : 'emerald'}
                        label="Risk me"
                        value={riskCount}
                      />
                      <Stat icon="clock" tone="amber" label="Absent" value={totalHeld - totalAttended} />
                    </div>
                  </section>
                )}

              </div>
            </div>
          </>
        )}

        {view === 'subjects' && (
          <>
            {riskCount > 0 && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {'Dhyan do: ' + riskCount + ' subject me tumhari attendance 75% se kam hai. Neeche dekho kitni class aur lagani hai.'}
              </p>
            )}

            <h2 className="text-xl font-semibold text-slate-800">Subject-wise attendance</h2>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            {loading && <p className="text-slate-500">Load ho raha hai...</p>}
            {!loading && !error && report.length === 0 && (
              <p className="text-slate-500 bg-white rounded-2xl shadow p-5">
                Tumhare department aur semester ke koi subject abhi nahi hai.
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {report.map((r) => {
                const t = tone(r.percentage);
                const need = Math.max(0, 3 * r.totalClasses - 4 * r.attended);
                const spare = Math.max(0, Math.floor((4 * r.attended) / 3 - r.totalClasses));
                return (
                  <div key={r.subjectId} className="bg-white rounded-2xl shadow p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <Ring percentage={r.percentage} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{r.subject}</h3>
                        <p className="text-sm text-slate-500">{r.code}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {r.attended + ' / ' + r.totalClasses + ' class attend ki'}
                        </p>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className={'h-full ' + t.bar} style={{ width: Math.min(r.percentage, 100) + '%' }} />
                    </div>

                    {r.totalClasses === 0 ? (
                      <p className="text-xs rounded-lg bg-slate-50 text-slate-600 px-3 py-2">
                        Abhi is subject ki koi class nahi hui.
                      </p>
                    ) : r.atRisk ? (
                      <p className={'text-xs rounded-lg px-3 py-2 ' + t.chip}>
                        {'75% tak pahunchne ke liye lagatar ' + need + ' class aur attend karni hogi.'}
                      </p>
                    ) : (
                      <p className={'text-xs rounded-lg px-3 py-2 ' + t.chip}>
                        {spare > 0
                          ? 'Sab theek hai. 75% se upar rehte hue tum ' + spare + ' class tak chhod sakte ho.'
                          : 'Sab theek hai, par ab koi class chhodna mat.'}
                      </p>
                    )}

                    <Link
                      to={'/student/calendar/' + r.subjectId}
                      className="block text-center text-sm text-indigo-600 font-medium"
                    >
                      Calendar dekho
                    </Link>
                  </div>
                );
              })}
            </div>

          </>
        )}

        {view === 'history' && (
          <>
            <section className="bg-white rounded-2xl shadow p-4 space-y-2">
              <h2 className="text-lg font-semibold text-slate-800">Haal hi ki attendance</h2>
              {history.length === 0 && <p className="text-sm text-slate-500">Abhi tak koi attendance nahi lagi.</p>}
              <ul className="divide-y divide-slate-100">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between py-2 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{h.subject}</p>
                      <p className="text-xs text-slate-500">{timeText(h.markedAt)}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold rounded-full px-3 py-1 bg-green-100 text-green-700">
                      {SOURCE_LABEL[h.source] || 'Present'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

          </>
        )}

        {view === 'settings' && <StudentSettings />}
      </div>
    </DashboardShell>
  );
}