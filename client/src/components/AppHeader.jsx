import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

// Student, Teacher aur Admin teeno dashboard ka ek jaisa sundar header
export default function AppHeader({ label, actions }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/30 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold leading-tight truncate">Smart Attendance</p>
            <p className="text-xs text-white/75 truncate">{label}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <ThemeToggle />
          <span className="hidden sm:block text-sm text-white/85 max-w-[10rem] truncate">
            {user ? user.name : ''}
          </span>
          <button
            onClick={logout}
            className="rounded-lg bg-white/15 hover:bg-white/25 ring-1 ring-white/30 text-sm font-medium px-3 py-1.5"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}