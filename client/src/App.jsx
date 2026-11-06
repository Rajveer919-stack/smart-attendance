import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionQR from './pages/SessionQR';
import SubjectReport from './pages/SubjectReport';
import StudentDashboard from './pages/StudentDashboard';
import ScanQR from './pages/ScanQR';

// Login hona zaroori hai, aur role bhi sahi hona chahiye
function ProtectedRoute({ role, loginPath = '/login', children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6">Loading...</p>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (role && user.role !== role) return <Navigate to={'/' + user.role} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />

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
        path="/teacher/report/:id"
        element={
          <ProtectedRoute role="teacher">
            <SubjectReport />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin" loginPath="/admin/login">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}