import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import '../glass.css';

// Chhote line-icons (bahar se koi package nahi chahiye)
const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
  book: 'M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h12',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  scan: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  users:
    'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1a4 4 0 0 0-3-3.9M15 4.2a3.5 3.5 0 0 1 0 6.6',
  teacher: 'M3 8l9-4 9 4-9 4zM7 10.5V15c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6zM9 12l2 2 4-4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11',
  user: 'M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  play: 'M7 4l13 8-13 8z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  check: 'M5 12l4 4 10-10',
};

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name] || ICONS.home} />
    </svg>
  );
}

// Bada number wala chhota card (icon + number + naam)
export function Stat({ icon = 'chart', tone = 'indigo', label, value, hint }) {
  return (
    <div className="dash-stat">
      <div className={'dash-chip dash-chip-' + tone}>
        <Icon name={icon} />
      </div>
      <p className="dash-stat-value">{value}</p>
      <p className="dash-stat-label">{label}</p>
      {hint ? <p className="dash-stat-hint">{hint}</p> : null}
    </div>
  );
}

const ROLE_TEXT = { admin: 'Admin', teacher: 'Teacher', student: 'Student' };

// Teeno dashboard (Admin, Teacher, Student) ka ek jaisa dhancha:
// laptop par side menu, phone par neeche tab bar.
// nav: [{ key, label, icon, to | onClick }]   active: jis item ki key abhi khuli hai
export default function DashboardShell({ label, nav = [], active, children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const today = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const isOn = (n) => (n.key ? n.key === active : !!n.to && n.to === pathname);

  const renderItem = (n, className) => {
    const on = isOn(n);
    const props = {
      className: className + (on ? ' is-on' : ''),
      'aria-current': on ? 'page' : undefined,
    };
    const inner = (
      <>
        <Icon name={n.icon} className={className === 'dash-tab' ? 'h-[22px] w-[22px]' : 'h-5 w-5'} />
        <span>{n.label}</span>
      </>
    );
    if (n.to) {
      return (
        <Link key={n.key || n.to} to={n.to} {...props}>
          {inner}
        </Link>
      );
    }
    return (
      <button key={n.key} type="button" onClick={n.onClick} {...props}>
        {inner}
      </button>
    );
  };

  const name = user ? user.name : '';
  const initial = name ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <div className="dash-shell">
      {/* Laptop: side menu */}
      <aside className="dash-side" aria-label="Menu">
        <div className="dash-brand">
          <div className="dash-logo">
            <Icon name="scan" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <b>Smart Attendance</b>
            <small>{label}</small>
          </div>
        </div>

        <nav className="dash-nav">
          <p className="dash-nav-title">Menu</p>
          {nav.map((n) => renderItem(n, 'dash-link'))}
        </nav>

        <div className="dash-user">
          <div className="dash-avatar">{initial}</div>
          <p>
            <b>{name}</b>
            <small>{ROLE_TEXT[user && user.role] || ''}</small>
          </p>
        </div>
        <button type="button" onClick={logout} className="dash-link dash-logout">
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          {/* Phone: logo + naam */}
          <div className="dash-brand">
            <div className="dash-logo">
              <Icon name="scan" className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <b>Smart Attendance</b>
              <small>{label}</small>
            </div>
          </div>
          {/* Laptop: page ka naam + aaj ki date */}
          <div className="dash-page">
            <b>{label}</b>
            <small className="dash-date">{today}</small>
          </div>

          <div className="dash-top-right">
            <ThemeToggle className="dash-icon-btn" />
            <button type="button" onClick={logout} className="dash-icon-btn dash-logout-mobile" aria-label="Logout" title="Logout">
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <main className="dash-content">{children}</main>
      </div>

      {/* Phone: neeche ka tab bar */}
      <nav className="dash-tabs" aria-label="Menu">
        {nav.map((n) => renderItem(n, 'dash-tab'))}
      </nav>
    </div>
  );
}