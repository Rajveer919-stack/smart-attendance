import { BrandLogo, Blobs } from './AuthLayout';
import '../auth.css';

// App khulte hi (login check hote waqt) ye sundar welcome screen dikhta hai
export default function Splash({ text = 'Getting things ready...' }) {
  return (
    <div className="auth-shell" data-no-translate="true">
      <Blobs />
      <div className="auth-splash">
        <div className="auth-logo">
          <BrandLogo className="h-10 w-10" />
        </div>
        <p className="auth-welcome">
          <i />
          Welcome to
        </p>
        <h1 className="auth-title">
          <span>Smart Attendance</span>
        </h1>
        <div className="auth-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <small role="status">{text}</small>
      </div>
    </div>
  );
}