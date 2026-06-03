import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVideos().then(data => {
      setVideos(data.videos || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>Loading videos...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 24 }}>Videos</h1>
      {videos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
          <p style={{ fontSize: 18 }}>No videos yet.</p>
          <Link to="/upload" style={{ color: '#3b82f6' }}>Upload the first one →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {videos.map(video => (
            <Link key={video.id} to={`/watch/${video.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                <div style={{ aspectRatio: '16/9', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 40 }}>🎬</span>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <p style={{ fontWeight: 500, fontSize: 15, margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{video.title}</p>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                    {video.username} · {video.views_count} views
                  </p>
                  <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                    {(video.available_qualities || []).filter(Boolean).map(q => (
                      <span key={q} style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{q}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
