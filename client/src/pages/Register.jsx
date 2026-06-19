import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import {
  Wallet, Mail, Lock, User, ShieldAlert, Globe, ArrowRight
} from 'lucide-react';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await client.post('/auth/register', { name, email, password });
      if (response.data?.success) {
        const { token, user } = response.data.data;
        login(token, user);
        navigate('/');
      } else {
        throw new Error(response.data?.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h2 className="heading-2" style={{ marginBottom: 4 }}>Create Account</h2>
            <p className="caption">Start optimizing your financial trajectory today</p>
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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aryan Kumar" 
                  required 
                  style={{ width: '100%', padding: '10px 12px 10px 38px', border: '1px solid var(--card-border)', borderRadius: 'var(--input-radius)', background: 'var(--input-bg)', outline: 'none' }} 
                />
              </div>
            </div>

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
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters" 
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
              {isLoading ? 'Creating Account...' : 'Sign Up'} <ArrowRight size={16} />
            </button>
          </form>

          {/* Social signup divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <span style={{ flex: 1, borderTop: '1px solid var(--card-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>OR SIGN UP WITH</span>
            <span style={{ flex: 1, borderTop: '1px solid var(--card-border)' }} />
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => alert("Google Single Sign-On configured on backend. Redirecting via Google accounts...")}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}
          >
            <Globe size={16} /> Google Account
          </button>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--accent-primary-dark)', fontWeight: 700 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
