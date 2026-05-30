import { useState } from 'react';
import { useNavigate, Link } from 'react-router';

import api from '../api/api';

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Password validation
      if (
        form.password !== form.confirm_password
      ) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        confirm_password:
          form.confirm_password,
      };

      const response = await api.post(
        '/register',
        payload
      );

      console.log(
        'Registration Success:',
        response.data
      );

      setSuccess(
        'Account created successfully! Redirecting to login...'
      );

      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      console.error(
        'Register Error:',
        err?.response?.data
      );

      const detail =
        err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        const messages = detail
          .map((item: any) => item.msg)
          .join(', ');

        setError(messages);
      } else if (
        typeof detail === 'string'
      ) {
        setError(detail);
      } else {
        setError(
          'Registration failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>
            AI<span>Learn</span>
          </h1>
          <p>
            Smart Learning Management
            System
          </p>
        </div>

        <h2 className="auth-title">
          Create Account
        </h2>

        <p className="auth-subtitle">
          Join the platform and start
          learning
        </p>

        {error && (
          <div className="error-msg">
            {error}
          </div>
        )}

        {success && (
          <div className="success-msg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">
              Full Name
            </label>

            <input
              id="name"
              type="text"
              name="name"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">
              Confirm Password
            </label>

            <input
              id="confirm_password"
              type="password"
              name="confirm_password"
              placeholder="Confirm password"
              value={form.confirm_password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Creating Account...'
              : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account?{' '}
          <Link to="/login">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}