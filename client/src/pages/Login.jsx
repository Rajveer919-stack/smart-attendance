import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../components/LoginScreen';

// Student login (/login) aur Teacher login (/login?role=teacher) ek hi page hai
export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const role = params.get('role') === 'teacher' ? 'teacher' : 'student';
  const justRegistered = location.state && location.state.registered;

  const handle = async (email, password) => {
    try {
      const user = await login(email, password);
      if (user.role !== role) {
        logout();
        if (user.role === 'admin') return 'Ye admin account hai. Neeche se Admin Login chuno';
        if (user.role === 'teacher') return 'Ye teacher account hai. Neeche se Teacher Login chuno';
        return 'Ye student account hai. Neeche se Student Login chuno';
      }
      navigate('/' + user.role);
      return '';
    } catch (err) {
      return err.response?.data?.message || 'Server se connect nahi ho pa raha';
    }
  };

  return (
    <LoginScreen
      role={role}
      notice={justRegistered ? 'Email verify ho gaya, account ban gaya. Ab login karo.' : ''}
      onSubmit={handle}
    />
  );
}