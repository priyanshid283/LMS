import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router';
import '../style.css';
import Navbar from '../components/Navbar';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import Dashboard from '../pages/Dashboard';
import Courses from '../pages/Courses';
import Tasks from '../pages/Tasks';
import Planner from '../pages/Planner';
import Profile from '../pages/Profile';

function ProtectedLayout() {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

const router = createBrowserRouter([
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
  { path: '/forgot-password', Component: ForgotPassword },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', Component: Dashboard },
      { path: 'courses', Component: Courses },
      { path: 'tasks', Component: Tasks },
      { path: 'planner', Component: Planner },
      { path: 'profile', Component: Profile },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
