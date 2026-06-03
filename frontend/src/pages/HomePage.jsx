import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/videos`).then(r => { setVideos(r.data.videos); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center',padding:60,color:'#888' }}>Loading...</div>;

  return (
    <div style={{ padding:'24px 32px' }}>
      <h1 style={{ fontSize:24,fontWeight:700,marginBottom:24 }}>🎬 Latest Videos</h1>
      {videos.length === 0 && <p style={{ color:'#888' }}>No videos yet. Be the first to upload!</p>}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20 }}>
        {videos.map(v => (
          <Link key={v.id} to={`/watch/${v.id}`} style={{ display:'block',background:'#1a1a1a',borderRadius:12,overflow:'hidden',transition:'transform 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            {v.thumbnail_url
              ? <img src={`${process.env.REACT_APP_CDN_URL}/${v.thumbnail_url}`} alt={v.title} style={{ width:'100%',aspectRatio:'16/9',objectFit:'cover' }}/>
              : <div style={{ width:'100%',aspectRatio:'16/9',background:'#222',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40 }}>🎥</div>}
            <div style={{ padding:'12px 14px' }}>
              <h3 style={{ fontSize:14,fontWeight:600,marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{v.title}</h3>
              <div style={{ fontSize:12,color:'#888',display:'flex',gap:12 }}>
                <span>{v.username}</span>
                <span>{v.views_count} views</span>
                <span>{new Date(v.created_at).toLocaleDateString()}</span>
              </div>
              {v.available_qualities?.length > 0 && (
                <div style={{ marginTop:6,display:'flex',gap:4 }}>
                  {v.available_qualities.filter(Boolean).map(q => (
                    <span key={q} style={{ background:'#333',borderRadius:4,padding:'2px 6px',fontSize:10,color:'#aaa' }}>{q}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
