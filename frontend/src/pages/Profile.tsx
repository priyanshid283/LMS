import { useState, useEffect, useRef } from 'react';
import api from '../api/api';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role?: string;
  bio?: string;
  joined?: string;
  study_hours?: number;
}

interface DashboardStats {
  total_courses: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const emptyPasswordForm: PasswordForm = {
  current_password: '',
  new_password: '',
  confirm_password: '',
};

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editForm, setEditForm] = useState({ name: '', bio: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');

  const [pwForm, setPwForm] = useState<PasswordForm>(emptyPasswordForm);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const [activeTab, setActiveTab] = useState<'overview' | 'edit' | 'password'>('overview');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    Promise.all([api.get('/profile'), api.get('/dashboard')])
      .then(([profileRes, dashRes]) => {
        setUser(profileRes.data);
        setStats(dashRes.data);
        setEditForm({ name: profileRes.data.name, bio: profileRes.data.bio || '' });
      })
      .catch(() => setError('Failed to load profile. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  /* ── Update profile ── */
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');
    setEditLoading(true);
    try {
      const res = await api.put('/profile', { name: editForm.name, bio: editForm.bio });
      setUser((u) => u ? { ...u, ...res.data } : u);
      setEditSuccess('Profile updated successfully!');
      setActiveTab('overview');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setEditError(e.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  /* ── Change password ── */
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/profile/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess('Password changed successfully!');
      setPwForm(emptyPasswordForm);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setPwError(e.response?.data?.detail || 'Failed to change password. Check your current password.');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span className="loading-text">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return <div className="page-container"><div className="error-msg">{error}</div></div>;
  }

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const completionPct =
    stats && stats.total_tasks > 0
      ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
      : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account and track your learning progress</p>
      </div>

      <div className="profile-layout">
        {/* ── Sidebar ── */}
        <aside className="profile-sidebar">
          {/* Avatar card */}
          <div className="avatar-card">
            <div className="avatar-circle">{initials}</div>
            <h2 className="avatar-name">{user.name}</h2>
            {user.role && <span className="avatar-role">{user.role}</span>}
            <p className="avatar-email">{user.email}</p>
            {user.joined && <p className="avatar-joined">Member since {user.joined}</p>}
          </div>

          {/* Nav tabs */}
          <div className="profile-tab-nav">
            {([
              { key: 'overview', icon: '📊', label: 'Overview' },
              { key: 'edit',     icon: '✏️',  label: 'Edit Profile' },
              { key: 'password', icon: '🔒',  label: 'Change Password' },
            ] as const).map(({ key, icon, label }) => (
              <button
                key={key}
                className={`profile-tab-btn ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="profile-main">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              {/* Stats row */}
              <div className="profile-stats-row">
                {[
                  { icon: '📚', value: stats?.total_courses ?? '—',    label: 'Courses Enrolled', color: '#3182ce' },
                  { icon: '📋', value: stats?.total_tasks ?? '—',      label: 'Total Tasks',      color: '#805ad5' },
                  { icon: '✅', value: stats?.completed_tasks ?? '—',  label: 'Tasks Completed',  color: '#38a169' },
                  { icon: '⏳', value: stats?.pending_tasks ?? '—',    label: 'Tasks Pending',    color: '#dd6b20' },
                ].map(({ icon, value, label, color }) => (
                  <div className="profile-stat-box" key={label}>
                    <span className="profile-stat-box-icon" style={{ color }}>{icon}</span>
                    <span className="profile-stat-box-value">{value}</span>
                    <span className="profile-stat-box-label">{label}</span>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="card" style={{ marginTop: '1.1rem' }}>
                <h3 className="profile-section-title">Task Completion Progress</h3>
                <div className="progress-label-row">
                  <span>{stats?.completed_tasks ?? 0} of {stats?.total_tasks ?? 0} tasks completed</span>
                  <span className="progress-pct">{completionPct}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${completionPct}%` }} />
                </div>
              </div>

              {/* Account details */}
              <div className="card" style={{ marginTop: '1.1rem' }}>
                <h3 className="profile-section-title">Account Details</h3>
                {[
                  { label: 'Full Name',     value: user.name },
                  { label: 'Email',         value: user.email },
                  { label: 'Role',          value: user.role || '—' },
                  { label: 'Member Since',  value: user.joined || '—' },
                  { label: 'Study Hours',   value: user.study_hours != null ? `${user.study_hours}h` : '—' },
                ].map(({ label, value }) => (
                  <div className="detail-row" key={label}>
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{value}</span>
                  </div>
                ))}
              </div>

              {/* Bio */}
              <div className="card" style={{ marginTop: '1.1rem' }}>
                <h3 className="profile-section-title">Bio</h3>
                <p style={{ color: '#4a5568', lineHeight: 1.75, fontSize: '0.95rem' }}>
                  {user.bio || (
                    <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>
                      No bio yet. Click "Edit Profile" to add one.
                    </span>
                  )}
                </p>
              </div>
            </>
          )}

          {/* EDIT PROFILE TAB */}
          {activeTab === 'edit' && (
            <div className="card">
              <h3 className="profile-section-title">Edit Profile</h3>
              {editError   && <div className="error-msg">{editError}</div>}
              {editSuccess && <div className="success-msg">{editSuccess}</div>}
              <form onSubmit={handleProfileSave}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    placeholder="Your full name"
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <small style={{ color: '#a0aec0', fontSize: '0.78rem' }}>Email cannot be changed here.</small>
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={editForm.bio}
                    placeholder="Tell us a bit about yourself..."
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ background: '#718096' }}
                    onClick={() => setActiveTab('overview')}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-secondary" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CHANGE PASSWORD TAB */}
          {activeTab === 'password' && (
            <div className="card">
              <h3 className="profile-section-title">Change Password</h3>
              {pwError   && <div className="error-msg">{pwError}</div>}
              {pwSuccess && <div className="success-msg">{pwSuccess}</div>}
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                    required
                  />
                </div>
                {pwForm.new_password && pwForm.confirm_password && (
                  <div className={`password-match ${pwForm.new_password === pwForm.confirm_password ? 'match' : 'no-match'}`}>
                    {pwForm.new_password === pwForm.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ background: '#718096' }}
                    onClick={() => { setPwForm(emptyPasswordForm); setActiveTab('overview'); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-secondary" disabled={pwLoading}>
                    {pwLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
