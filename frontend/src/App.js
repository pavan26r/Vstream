import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Watch from './pages/Watch';
import Upload from './pages/Upload';
import Login from './pages/Login';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  return (
    <nav style={{ borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 24, background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: 'none', color: '#111' }}>🎬 VideoStream</Link>
      <div style={{ flex: 1 }} />
      {isAuthenticated ? (
        <>
          <Link to="/upload" style={{ padding: '6px 16px', background: '#3b82f6', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>Upload</Link>
          <span style={{ fontSize: 14, color: '#6b7280' }}>{user?.username}</span>
          <button onClick={logout} style={{ background: 'none', border: '0.5px solid #e5e7eb', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Logout</button>
        </>
      ) : (
        <Link to="/login" style={{ padding: '6px 16px', border: '0.5px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', fontSize: 14, color: '#111' }}>Sign In</Link>
      )}
    </nav>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/login" element={<Login />} />
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
