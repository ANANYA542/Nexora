import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import {
  Wallet, Mail, Lock, ShieldAlert, Globe, ArrowRight
} from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '201448844450-37ksnuseiv9grqoe9iuudpqtd4mkn2be.apps.googleusercontent.com';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await client.post('/auth/login', { email, password });
      if (response.data?.success) {
        const { token, user } = response.data.data;
        login(token, user);
        navigate('/');
      } else {
        throw new Error(response.data?.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Please contact support.');
      return;
    }

    setError(null);
    setIsGoogleLoading(true);

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const res = await client.post('/auth/google', { id_token: response.credential });
            if (res.data?.success) {
              const { token, user } = res.data.data;
              login(token, user);
              navigate('/');
            } else {
              throw new Error(res.data?.message || 'Google sign-in failed');
            }
          } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Google sign-in failed');
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setIsGoogleLoading(false);
        }
      });
    } catch (err) {
      console.error('Google Sign-In initialization failed:', err);
      setError('Google Sign-In is currently unavailable. Please try again later.');
      setIsGoogleLoading(false);
    }
  }, [login, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: 20
    }}>
      <div className="card animate-scale-in" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body" style={{ padding: '40px 32px' }}>
          {/* Logo & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 12, 
              background: 'var(--bg-sidebar)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Wallet size={24} />
            </div>
            <h2 className="heading-2" style={{ marginBottom: 4 }}>Welcome to FinSight</h2>
            <p className="caption">India's first AI-powered financial operating system</p>
          </div>

          {error && (
            <div style={{ 
              background: 'var(--accent-danger-bg)', 
              border: '1px solid var(--accent-danger-light)', 
              color: 'var(--accent-danger)', 
              padding: '10px 14px', 
              borderRadius: 8, 
              fontSize: 12, 
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 20 
            }}>
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com" 
                  required 
                  style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)', outline: 'none' }} 
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <a href="#" className="caption" style={{ color: 'var(--accent-primary-dark)', fontWeight: 600 }}>Forgot password?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)', outline: 'none' }} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="btn btn-dark" 
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'} <ArrowRight size={16} />
            </button>
          </form>

          {/* Social login dividers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <span style={{ flex: 1, borderTop: '1px solid var(--card-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>OR CONTINUE WITH</span>
            <span style={{ flex: 1, borderTop: '1px solid var(--card-border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Google OAuth */}
            <button 
              className="btn btn-secondary" 
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}
            >
              <Globe size={16} /> {isGoogleLoading ? 'Connecting...' : 'Google Account'}
            </button>
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Don't have an account? </span>
            <Link to="/register" style={{ color: 'var(--accent-primary-dark)', fontWeight: 700 }}>Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

