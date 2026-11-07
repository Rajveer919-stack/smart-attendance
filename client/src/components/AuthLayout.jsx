// Login, Register, Forgot password aur Admin login sab isi sundar layout me khulte hai
export default function AuthLayout({ title, subtitle, wide, dark, children }) {
  const bg = dark
    ? 'from-slate-900 via-slate-800 to-slate-900'
    : 'from-indigo-700 via-indigo-600 to-violet-700';

  return (
    <div
      className={
        'min-h-screen bg-gradient-to-br flex flex-col items-center justify-center px-4 py-8 ' + bg
      }
    >
      <div className="text-center text-white mb-6">
        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center ring-1 ring-white/30">
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9 text-white"
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
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Smart Attendance</h1>
        <p className="mt-1 text-sm sm:text-base text-white/80">QR se attendance, bina proxy ke</p>
      </div>

      <div
        className={
          'w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 ' + (wide ? 'max-w-md' : 'max-w-sm')
        }
      >
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>

      <p className="mt-6 text-xs text-white/60">Smart Attendance + Analytics System</p>
    </div>
  );
}