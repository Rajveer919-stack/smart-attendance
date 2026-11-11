import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LanguageGate from './components/LanguageGate';
import Splash from './components/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionQR from './pages/SessionQR';
import SessionEdit from './pages/SessionEdit';
import SubjectReport from './pages/SubjectReport';
import TeacherStudents from './pages/TeacherStudents';
import TeacherAnnouncements from './pages/TeacherAnnouncements';
import StudentDashboard from './pages/StudentDashboard';
import AttendanceCalendar from './pages/AttendanceCalendar';
import ScanQR from './pages/ScanQR';

// Login hona zaroori hai, aur role bhi sahi hona chahiye
function ProtectedRoute({ role, loginPath = '/login', children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to={loginPath} replace />;
  if (role && user.role !== role) return <Navigate to={'/' + user.role} replace />;
  return children;
}

// App kholte hi "/" par aate hai: login hai to seedha apne dashboard par, nahi to login par
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return <Navigate to={user ? '/' + user.role : '/login'} replace />;
}

// Login / Register / Forgot page: agar login pehle se hai to dobara login dikhane ki zarurat nahi
function GuestRoute({ onlyRole, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user && (!onlyRole || user.role === onlyRole)) return <Navigate to={'/' + user.role} replace />;
  return children;
}

export default function App() {
  return (
    <LanguageGate>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route
          path="/admin/login"
          element={
            <GuestRoute onlyRole="admin">
              <AdminLogin />
            </GuestRoute>
          }
        />

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
          path="/student/calendar/:subjectId"
          element={
            <ProtectedRoute role="student">
              <AttendanceCalendar />
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
          path="/teacher/session/:id/attendance"
          element={
            <ProtectedRoute role="teacher">
              <SessionEdit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute role="teacher">
              <TeacherStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/announcements"
          element={
            <ProtectedRoute role="teacher">
              <TeacherAnnouncements />
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

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </LanguageGate>
  );
}