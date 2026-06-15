import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react';

export const SignUp: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await register(email.trim(), password);
      // Nhost returns a session if email verification is bypassed.
      // If it is required, result.session is null/undefined.
      if (result && result.session) {
        navigate('/');
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Try a different email or check connection.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-fullscreen-layout">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo-badge" style={{ color: 'var(--emerald-500)' }}>
              <Mail size={28} />
            </div>
            <h1 className="auth-title">Verify Email</h1>
            <p className="auth-subtitle">
              Verification link dispatched to:
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-bright)', wordBreak: 'break-all', marginTop: '0.25rem' }}>
              {email}
            </p>
          </div>

          <div 
            className="alert-danger" 
            style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.08)', 
              borderColor: 'rgba(16, 185, 129, 0.4)', 
              color: 'var(--text-main)' 
            }}
          >
            <CheckCircle size={16} style={{ color: 'var(--emerald-500)', flexShrink: 0, marginTop: '2px' }} />
            <span className="alert-message">
              Please click the link in the verification email to activate your account, then return here to log in.
            </span>
          </div>

          <div className="auth-footer" style={{ borderTop: 'none', marginTop: '1rem', paddingTop: '0' }}>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-fullscreen-layout">
      <div className="auth-card">
        
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <UserPlus size={28} />
          </div>
          <h1 className="auth-title">
            Create Account
          </h1>
          <p className="auth-subtitle">
            Register a developer account for live streaming
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="alert-danger animate-fade-in">
            <AlertTriangle size={16} className="alert-icon" />
            <span className="alert-message">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">
              Email Address
            </label>
            <div className="form-input-container">
              <Mail className="form-input-icon" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@startup.io"
                disabled={loading}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Password
            </label>
            <div className="form-input-container">
              <KeyRound className="form-input-icon" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                disabled={loading}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Confirm Password
            </label>
            <div className="form-input-container">
              <KeyRound className="form-input-icon" size={16} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                disabled={loading}
                className="form-input"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-submit"
          >
            {loading ? (
              <span className="btn-loading-content">
                <div className="spinner-small"></div>
                <span>Provisioning Account...</span>
              </span>
            ) : (
              <span>Register</span>
            )}
          </button>
        </form>

        {/* Redirect Link */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Already registered?{' '}
            <Link to="/login" className="auth-link">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
