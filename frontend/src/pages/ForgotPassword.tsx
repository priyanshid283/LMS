import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import api from '../api/api';

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1 — request OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/forgot-password', { email });
      setSuccess('OTP sent to your email address.');
      setStep('otp');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to send OTP. Check the email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }
    setLoading(true);
    try {
      await api.post('/verify-otp', { email, otp: otpValue });
      setSuccess('OTP verified! Set your new password.');
      setStep('reset');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — reset password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/reset-password', {
        email,
        otp: otp.join(''),
        new_password: newPassword,
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // OTP input box handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      document.getElementById('otp-5')?.focus();
    }
  };

  const stepLabels = ['Send OTP', 'Verify OTP', 'New Password'];

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <h1>AI<span>Learn</span></h1>
          <p>Smart Learning Management System</p>
        </div>

        {/* Step indicator */}
        <div className="fp-steps">
          {stepLabels.map((label, i) => {
            const stepKeys: Step[] = ['email', 'otp', 'reset'];
            const current = stepKeys.indexOf(step);
            const state = i < current ? 'done' : i === current ? 'active' : 'pending';
            return (
              <div key={label} className={`fp-step fp-step-${state}`}>
                <div className="fp-step-circle">{i < current ? '✓' : i + 1}</div>
                <span className="fp-step-label">{label}</span>
                {i < 2 && <div className={`fp-step-line ${i < current ? 'done' : ''}`} />}
              </div>
            );
          })}
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && step !== 'otp' && <div className="success-msg">{success}</div>}

        {/* Step 1 — Email */}
        {step === 'email' && (
          <>
            <h2 className="auth-title">Forgot Password</h2>
            <p className="auth-subtitle">Enter your registered email to receive a 6-digit OTP.</p>
            <form onSubmit={handleEmailSubmit}>
              <div className="form-group">
                <label htmlFor="fp-email">Email Address</label>
                <input
                  id="fp-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </>
        )}

        {/* Step 2 — OTP */}
        {step === 'otp' && (
          <>
            <h2 className="auth-title">Enter OTP</h2>
            <p className="auth-subtitle">
              We sent a 6-digit code to <strong>{email}</strong>. Check your inbox.
            </p>
            {success && <div className="success-msg">{success}</div>}
            <form onSubmit={handleOtpSubmit}>
              <div className="otp-input-row" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="otp-box"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button type="submit" className="btn-primary" disabled={loading || otp.join('').length < 6}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="btn-resend"
                onClick={() => { setStep('email'); setOtp(['','','','','','']); setError(''); setSuccess(''); }}
              >
                ← Change email or resend
              </button>
            </form>
          </>
        )}

        {/* Step 3 — New Password */}
        {step === 'reset' && (
          <>
            <h2 className="auth-title">Set New Password</h2>
            <p className="auth-subtitle">Choose a strong new password for your account.</p>
            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {newPassword && confirmPassword && (
                <div className={`password-match ${newPassword === confirmPassword ? 'match' : 'no-match'}`}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <div className="auth-link" style={{ marginTop: '1.25rem' }}>
          <Link to="/login">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
