import { NavLink, useNavigate } from 'react-router';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <a href="/dashboard" className="navbar-brand">
        AI<span>Learn</span> LMS
      </a>
      <div className="navbar-links">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/courses">Courses</NavLink>
        <NavLink to="/tasks">Tasks</NavLink>
        <NavLink to="/planner">Planner</NavLink>
        <NavLink to="/profile" className="profile-avatar-btn" title="My Profile">
          <span className="profile-avatar-icon">👤</span>
          <span className="profile-avatar-label">Profile</span>
        </NavLink>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
