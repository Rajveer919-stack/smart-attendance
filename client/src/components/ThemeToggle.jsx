import { useEffect, useState } from 'react';
import '../dark.css';

const KEY = 'theme';

function readSaved() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// Pehli baar: phone/laptop ki apni setting (dark ho to dark). Baad me jo user ne chuna
function initialDark() {
  const saved = readSaved();
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#312e81' : '#4f46e5');
}

// className na do to purana (header wala) rang use hoga
export default function ThemeToggle({ className }) {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      // save na ho paye to bhi theme badal jayegi
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? 'Light mode' : 'Dark mode'}
      aria-label={dark ? 'Light mode chalu karo' : 'Dark mode chalu karo'}
      className={
        className ||
        'h-9 w-9 shrink-0 rounded-lg bg-white/15 hover:bg-white/25 ring-1 ring-white/30 flex items-center justify-center'
      }
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}