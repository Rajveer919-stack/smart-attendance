import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionQR from './pages/SessionQR';
import StudentDashboard from './pages/StudentDashboard';
import ScanQR from './pages/ScanQR';

// Login hona zaroori hai, aur role bhi sahi hona chahiye
function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

// Admin ke liye abhi ke liye chhota sa page. Aage isko asli dashboard se badal denge
function Home({ title }) {
  const { user, logout } = useAuth();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <p className="text-slate-600 mt-1">
        Welcome, {user.name} ({user.role})
      </p>
      <button
        onClick={logout}
        className="mt-4 rounded-lg bg-slate-800 text-white px-4 py-2 hover:bg-slate-900"
      >
        Logout
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/scan"
        element={
          <ProtectedRoute role="student">
            <ScanQR />
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/session/:id"
        element={
          <ProtectedRoute role="teacher">
            <SessionQR />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Home title="Admin Dashboard" />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}