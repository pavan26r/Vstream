const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

export const api = {
  async register(data) {
    const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },
  async login(data) {
    const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    return res.json();
  },
  async getVideos(page = 1) {
    const res = await fetch(`${API_BASE}/videos?page=${page}`, { headers: getHeaders() });
    return res.json();
  },
  async getVideo(id) {
    const res = await fetch(`${API_BASE}/videos/${id}`, { headers: getHeaders() });
    return res.json();
  },
  async getMyVideos() {
    const res = await fetch(`${API_BASE}/videos/user/me`, { headers: getHeaders() });
    return res.json();
  },
};
