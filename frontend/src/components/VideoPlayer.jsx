import { useEffect, useRef, useState } from 'react';

const VideoPlayer = ({ streamUrls }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentQuality, setCurrentQuality] = useState('auto');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrls) return;
    const masterUrl = streamUrls['master'] || Object.values(streamUrls)[0];

    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, backBufferLength: 90 });
        hls.loadSource(masterUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) hls.destroy();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = masterUrl;
      }
    });

    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [streamUrls]);

  const handleQualityChange = (quality) => {
    setCurrentQuality(quality);
    if (!hlsRef.current) return;
    if (quality === 'auto') {
      hlsRef.current.currentLevel = -1;
    } else {
      const idx = hlsRef.current.levels?.findIndex(l => l.height === parseInt(quality));
      if (idx !== -1) hlsRef.current.currentLevel = idx;
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      <video
        ref={videoRef}
        style={{ width: '100%', display: 'block', aspectRatio: '16/9' }}
        onTimeUpdate={() => setProgress((videoRef.current?.currentTime / videoRef.current?.duration) * 100 || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        playsInline
      />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.85))', padding: '24px 16px 12px' }}>
        <div onClick={handleSeek} style={{ height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, cursor: 'pointer', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#ef4444', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff' }}>
          <button onClick={() => videoRef.current?.[isPlaying ? 'pause' : 'play']()} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0 }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <span style={{ fontSize: 12, opacity: 0.8 }}>
            {fmt(videoRef.current?.currentTime || 0)} / {fmt(duration)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {['auto', '1080p', '720p', '480p'].map(q => (
              <button key={q} onClick={() => handleQualityChange(q)} style={{ background: currentQuality === q ? '#ef4444' : 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
