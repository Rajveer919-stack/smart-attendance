import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../components/LoginScreen';

export default function AdminLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handle = async (email, password) => {
    try {
      const user = await login(email, password);
      if (user.role !== 'admin') {
        logout();
        return 'Ye admin account nahi hai';
      }
      navigate('/admin');
      return '';
    } catch (err) {
      return err.response?.data?.message || 'Server se connect nahi ho pa raha';
    }
  };

  return <LoginScreen role="admin" onSubmit={handle} />;
}