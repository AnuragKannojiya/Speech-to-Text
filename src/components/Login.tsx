import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.message && err.message.toLowerCase().includes('not verified')) {
        setError('Your email address has not been verified yet. Nhost requires email verification before logging in. Please check your inbox (and spam folder) for the verification link.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-layout">
      <div className="auth-card">
        
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">
            Developer Gate
          </h1>
          <p className="auth-subtitle">
            Sign in to access transcription dashboard
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
                placeholder="••••••••••••"
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
                <span>Authenticating...</span>
              </span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Redirect Link */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Need an account?{' '}
            <Link to="/signup" className="auth-link">
              Sign Up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
