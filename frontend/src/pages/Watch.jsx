import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import LiveChat from '../components/LiveChat';
import { api } from '../services/api';

const Watch = () => {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [streamUrls, setStreamUrls] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVideo(id).then(data => {
      setVideo(data.video);
      setStreamUrls(data.streamUrls);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}>Loading...</div>;
  if (!video) return <div style={{ textAlign: 'center', padding: 80 }}>Video not found</div>;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        <div>
          <VideoPlayer streamUrls={streamUrls} />
          <div style={{ marginTop: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>{video.title}</h1>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 12px' }}>
              {video.username} · {video.views_count} views ·{' '}
              {new Date(video.created_at).toLocaleDateString('en-IN')}
            </p>
            {video.description && (
              <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, borderTop: '0.5px solid #e5e7eb', paddingTop: 12 }}>
                {video.description}
              </p>
            )}
          </div>
        </div>
        <div style={{ position: 'sticky', top: 24 }}>
          <LiveChat videoId={id} />
        </div>
      </div>
    </div>
  );
};

export default Watch;
