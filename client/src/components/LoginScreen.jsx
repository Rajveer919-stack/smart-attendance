import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../login.css';

const CAP = 'M12 3 1 9l11 6 9-4.9V17h2V9L12 3zM5 13.2v4L12 21l7-3.8v-4L12 17l-7-3.8z';

function Cap({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={CAP} />
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#5b2be0" />
      <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHECKS = ['Fast & Secure Login', 'Real-Time Attendance', 'Easy Management', '100% Reliable'];

// Piche ka campus (building + ped), sirf sajawat ke liye
function Campus() {
  return (
    <svg className="lg-campus" viewBox="0 0 900 520" preserveAspectRatio="xMinYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="lgB1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d3ff" />
          <stop offset="1" stopColor="#b3abf1" />
        </linearGradient>
        <linearGradient id="lgB2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4e9ff" />
          <stop offset="1" stopColor="#bcc7f5" />
        </linearGradient>
        <pattern id="lgWin" width="34" height="38" patternUnits="userSpaceOnUse">
          <rect x="4" y="5" width="26" height="28" rx="3" fill="#7fa3ec" opacity="0.7" />
          <rect x="4" y="5" width="26" height="9" rx="3" fill="#fff" opacity="0.35" />
        </pattern>
      </defs>
      <rect x="40" y="150" width="330" height="330" rx="10" fill="url(#lgB1)" />
      <rect x="58" y="176" width="294" height="270" fill="url(#lgWin)" />
      <rect x="40" y="140" width="330" height="16" rx="6" fill="#a79fe8" />
      <rect x="330" y="60" width="300" height="420" rx="10" fill="url(#lgB2)" />
      <rect x="350" y="90" width="260" height="360" fill="url(#lgWin)" />
      <rect x="330" y="50" width="300" height="16" rx="6" fill="#aab6ee" />
      <rect x="600" y="210" width="240" height="270" rx="10" fill="url(#lgB1)" opacity="0.9" />
      <rect x="618" y="236" width="204" height="210" fill="url(#lgWin)" />
      <g fill="#3fae82" opacity="0.85">
        <circle cx="30" cy="440" r="42" />
        <circle cx="80" cy="460" r="34" />
        <circle cx="820" cy="430" r="46" />
        <circle cx="770" cy="462" r="32" />
      </g>
      <rect x="0" y="470" width="900" height="50" fill="#cfe9d6" opacity="0.7" />
    </svg>
  );
}

// Neeche ki purple wave
function Wave() {
  return (
    <div className="lg-wave" aria-hidden="true">
      <svg viewBox="0 0 1440 190" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lgW" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a1fd0" />
            <stop offset="0.6" stopColor="#6d3cf0" />
            <stop offset="1" stopColor="#8d62ff" />
          </linearGradient>
        </defs>
        <path d="M0 80 C 200 20, 420 10, 640 60 S 1080 150, 1440 70 L1440 190 L0 190 Z" fill="url(#lgW)" />
        <path d="M0 80 C 200 20, 420 10, 640 60 S 1080 150, 1440 70" fill="none" stroke="#c4b5fd" strokeWidth="3" opacity="0.7" />
      </svg>
    </div>
  );
}

function RoleLink({ to, on, className = '', children }) {
  return (
    <Link to={to} className={'lg-role ' + className + (on ? ' is-on' : '')} aria-current={on ? 'page' : undefined}>
      {children}
    </Link>
  );
}

const REMEMBER_KEY = 'rememberEmail';
const readRemembered = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) || '';
  } catch {
    return '';
  }
};
const writeRemembered = (email) => {
  try {
    if (email) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    // koi baat nahi
  }
};

// Student / Teacher / Admin teeno login pages ka ek jaisa design
// role: 'student' | 'teacher' | 'admin'   onSubmit(email, password) -> error text ya ''
export default function LoginScreen({ role, notice, onSubmit }) {
  const [email, setEmail] = useState(readRemembered);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Role badalne par purana error hata do
  useEffect(() => {
    setError('');
  }, [role]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      writeRemembered(remember ? email.trim() : '');
      const msg = await onSubmit(email, password);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const subtitle =
    role === 'student' ? 'Login to your account to continue' : (role === 'teacher' ? 'Teacher' : 'Admin') + ' login to continue';

  return (
    <div className="lg-shell">
      <div className="lg-bg" aria-hidden="true">
        <span className="lg-cloud a" />
        <span className="lg-cloud b" />
        <Campus />
        <span className="lg-cube a" />
        <span className="lg-cube b" />
      </div>

      <header className="lg-top" data-no-translate="true">
        <Link to="/login" className="lg-brand">
          <Cap />
          <span>
            <b>Smart Attendance</b>
            <b>System</b>
          </span>
        </Link>
        <span className="lg-tagline">
          Smart Campus <i /> Smart Future
        </span>
      </header>

      <main className="lg-main">
        <section className="lg-hero" data-no-translate="true">
          <h2>Welcome to</h2>
          <h1>
            Smart Attendance <span>System</span>
          </h1>
          <p className="lg-track">Track · Manage · Grow</p>
          <p className="lg-tag">
            A Smarter Way to Track Attendance
            <br />
            for a Better Tomorrow
          </p>
          <ul className="lg-checks">
            {CHECKS.map((c) => (
              <li key={c}>
                <Tick />
                {c}
              </li>
            ))}
          </ul>
        </section>

        <img className="lg-boy" src="/login-boy.webp" alt="" width="504" height="730" />

        <section className="lg-card">
          <div className="lg-badge">
            <Cap />
          </div>
          <h3>
            Welcome <span>Back!</span>
          </h3>
          <p className="lg-sub">{subtitle}</p>

          <form onSubmit={submit}>
            {notice && <p className="lg-ok">{notice}</p>}
            {error && <p className="lg-err">{error}</p>}

            <div className="lg-field">
              <svg className="i" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="7.5" r="4.2" />
                <path d="M3.5 21c0-4.6 3.8-7.5 8.5-7.5s8.5 2.9 8.5 7.5z" />
              </svg>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email"
              />
            </div>

            <div className="lg-field">
              <svg className="i" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 10V8a5 5 0 0 1 10 0v2h1.2c.9 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H5.8C4.8 22 4 21.2 4 20.2v-8.4C4 10.8 4.8 10 5.8 10H7zm2.2 0h5.6V8a2.8 2.8 0 0 0-5.6 0v2z" />
              </svg>
              <input
                type={show ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
              />
              <button type="button" className="lg-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {show && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </div>

            <div className="lg-row">
              <label className="lg-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span className="box">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                </span>
                Remember Me
              </label>
              <Link to="/forgot-password" className="lg-link">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="lg-btn" disabled={busy}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
              </svg>
              {busy ? 'Login ho raha hai...' : 'Login'}
            </button>
          </form>

          <div className="lg-or" data-no-translate="true">OR</div>

          <div className="lg-roles" data-no-translate="true">
            <RoleLink to="/login" on={role === 'student'}>
              <Cap />
              Student Login
            </RoleLink>
            <RoleLink to="/admin/login" on={role === 'admin'}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2 4 5.5V11c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5.5L12 2zm-1.2 13.6-3.4-3.4 1.4-1.4 2 2 4.2-4.2 1.4 1.4-5.6 5.6z" />
              </svg>
              Admin Login
            </RoleLink>
            <RoleLink to="/login?role=teacher" on={role === 'teacher'} className="wide">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-7l2 3v1H8v-1l2-3H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v9h16V6H4zm4 2h8v2H8V8z" />
              </svg>
              Teacher Login
            </RoleLink>
          </div>

          <p className="lg-reg" data-no-translate="true">
            {role === 'student' ? (
              <>
                Don&apos;t have an account?{' '}
                <Link to="/register" className="lg-link">
                  Register Now →
                </Link>
              </>
            ) : (
              <>{role === 'teacher' ? 'Teacher' : 'Admin'} accounts are created by the college admin.</>
            )}
          </p>
        </section>
      </main>

      <Wave />
      <p className="lg-script" data-no-translate="true" aria-hidden="true">
        <em>Let&apos;s Build a</em>
        <em>Smarter Campus Together ♡</em>
        <u />
      </p>

      <footer className="lg-foot" data-no-translate="true">
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 4 5.5V11c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5.5L12 2z" />
          </svg>
          Secure &amp; Encrypted
        </span>
        <span>
          <svg viewBox="0 0 24 24" fill="#fcd34d" aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
          </svg>
          Powered by Technology
        </span>
        <span>
          Made with <b className="heart">♥</b> for Education
        </span>
      </footer>
    </div>
  );
}