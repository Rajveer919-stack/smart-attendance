import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../glass.css';
import '../mock.css';

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
  cap: 'M12 4 2 9l10 5 10-5-10-5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6',
  bell: 'M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
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

// Upar ka bada "Welcome Back" banner (cartoon ke saath). role: admin | teacher | student
export function Hero({ role, hi = 'Welcome Back,', name, line, quote, children }) {
  return (
    <section className={'mk-hero mk-hero-' + role}>
      <img className="mk-hero-img" src={'/hero-' + role + '.webp'} alt="" width="300" height="180" />
      <div className="mk-hero-txt">
        <h1>
          {hi} <span>{name}</span>
        </h1>
        {line ? <p className="mk-hero-line">{line}</p> : null}
        {children}
        {quote ? <p className="mk-hero-quote">{quote}</p> : null}
      </div>
    </section>
  );
}

const ROLE_TEXT = { admin: 'Super Admin', teacher: 'Teacher', student: 'Student' };

// Teeno dashboard (Admin, Teacher, Student) ka ek jaisa dhancha:
// laptop par side menu + search, phone par user card aur neeche tab bar.
// nav: [{ key, label, icon, to | onClick, center }]   active: jis item ki key abhi khuli hai
// bellTo: bell dabane par kahan jaye (na do to bell nahi dikhegi)
export default function DashboardShell({ label, nav = [], active, bellTo, children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  // Ye dashboard hamesha dark-violet dikhta hai. Chhodte hi purani theme wapas
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains('dark');
    root.classList.add('dark');
    return () => {
      if (!had) root.classList.remove('dark');
    };
  }, []);

  const today = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const isOn = (n) => (n.key ? n.key === active : !!n.to && n.to === pathname);

  const go = (n) => {
    if (n.to) navigate(n.to);
    else if (n.onClick) n.onClick();
  };

  // Search: menu ka naam likho (jaise "students") aur Enter dabao
  const search = (e) => {
    e.preventDefault();
    const t = q.trim().toLowerCase();
    if (!t) return;
    const hit = nav.find((n) => n.label.toLowerCase().includes(t));
    if (hit) {
      go(hit);
      setQ('');
    }
  };

  const renderItem = (n, className) => {
    const on = isOn(n);
    const props = {
      className: className + (on ? ' is-on' : '') + (className === 'dash-tab' && n.center ? ' is-center' : ''),
      'aria-current': on ? 'page' : undefined,
    };
    const inner = (
      <>
        <span className="dash-ico">
          <Icon name={n.icon} className={className === 'dash-tab' ? 'h-[22px] w-[22px]' : 'h-5 w-5'} />
        </span>
        <span className="dash-lbl">{n.label}</span>
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
  const roleText = ROLE_TEXT[user && user.role] || '';

  const brand = (
    <div className="dash-brand">
      <div className="dash-logo">
        <Icon name="cap" className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <b>Smart Attendance</b>
        <small>System</small>
      </div>
    </div>
  );

  const bell = bellTo ? (
    <Link to={bellTo} className="dash-icon-btn" aria-label="Notifications" title="Notifications">
      <Icon name="bell" />
    </Link>
  ) : null;

  return (
    <div className="dash-shell mk">
      {/* Laptop: side menu */}
      <aside className="dash-side" aria-label="Menu">
        {brand}
        <nav className="dash-nav">{nav.map((n) => renderItem(n, 'dash-link'))}</nav>
        <button type="button" onClick={logout} className="dash-link dash-logout">
          <span className="dash-ico">
            <Icon name="logout" />
          </span>
          <span className="dash-lbl">Logout</span>
        </button>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          {/* Phone: logo + naam */}
          {brand}

          {/* Laptop: search */}
          <form className="dash-search" onSubmit={search} role="search">
            <Icon name="search" className="h-[18px] w-[18px]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Menu search karo (jaise students)"
              aria-label="Search menu"
            />
          </form>

          <div className="dash-top-right">
            {bell}
            <button type="button" onClick={logout} className="dash-icon-btn dash-logout-mobile" aria-label="Logout" title="Logout">
              <Icon name="logout" />
            </button>
            {/* Laptop: user chip */}
            <div className="dash-chipuser">
              <div className="dash-avatar">{initial}</div>
              <p>
                <b>{name}</b>
                <small>{roleText}</small>
              </p>
            </div>
          </div>
        </header>

        {/* Phone: user card */}
        <div className="dash-usercard">
          <div className="dash-avatar">{initial}</div>
          <p>
            <b>{name}</b>
            <small>{roleText}</small>
          </p>
          <span className="dash-date">{today}</span>
        </div>

        <main className="dash-content" aria-label={label}>
          {children}
        </main>
      </div>

      {/* Phone: neeche ka tab bar */}
      <nav className="dash-tabs" aria-label="Menu">
        {nav.map((n) => renderItem(n, 'dash-tab'))}
      </nav>
    </div>
  );
}