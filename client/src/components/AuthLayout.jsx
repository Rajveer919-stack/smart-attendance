import ThemeToggle from './ThemeToggle';
import '../auth.css';

// App ka logo (QR jaisa nishan). Splash me bhi yahi use hota hai
export function BrandLogo({ className = 'h-9 w-9' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className + ' text-white'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" />
    </svg>
  );
}

export function Blobs() {
  return (
    <>
      <span className="auth-blob a" />
      <span className="auth-blob b" />
      <span className="auth-blob c" />
    </>
  );
}

const POINTS = [
  {
    icon: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16',
    title: 'Live QR and rotating code',
    text: 'A fresh QR and 4-digit code every few seconds',
  },
  {
    icon: 'M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    title: 'Location and device checks',
    text: 'Only students inside the class can mark attendance',
  },
  {
    icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    title: 'Instant attendance reports',
    text: 'Subject-wise percentage and low-attendance alerts',
  },
];

// Login, Register, Forgot password aur Admin login sab isi layout me khulte hai
export default function AuthLayout({ title, subtitle, wide, dark, children }) {
  return (
    <div className={'auth-shell' + (dark ? ' is-admin' : '')}>
      <Blobs />
      <div className="auth-top">
        <ThemeToggle className="auth-icon-btn" />
      </div>

      <div className="auth-wrap">
        <section className="auth-hero" data-no-translate="true">
          <div className="auth-logo">
            <BrandLogo className="h-9 w-9" />
          </div>
          <p className="auth-welcome">
            <i />
            Welcome to
          </p>
          <h1 className="auth-title">
            <span>Smart Attendance</span>
          </h1>
          <p className="auth-tag">
            {dark
              ? 'Admin control room for your college: students, teachers, subjects and security in one place.'
              : 'Fast, secure and proxy-free attendance for your college.'}
          </p>
          <ul className="auth-points">
            {POINTS.map((p) => (
              <li key={p.title}>
                <span className="ico">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.icon} />
                  </svg>
                </span>
                <span>
                  <b>{p.title}</b>
                  <small>{p.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className={'auth-card bg-white' + (wide ? ' is-wide' : '')}>
          <div className="auth-head">
            {dark && <span className="auth-badge">Admin access</span>}
            <h2>{title}</h2>
            {subtitle && <p className="auth-sub">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>

      <p className="auth-foot" data-no-translate="true">
        Smart Attendance + Analytics System
      </p>
    </div>
  );
}