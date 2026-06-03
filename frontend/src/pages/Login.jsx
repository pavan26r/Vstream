import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      if (data.error) { setError(data.error); return; }
      login(data.token, data.user);
      navigate('/');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </h1>
      <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Username</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
              style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
            {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Register')}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 14, marginTop: 16, color: '#6b7280' }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 14 }}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
