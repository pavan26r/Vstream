import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoUploader } from '../services/videoUpload';

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) return;
    setUploading(true);
    setStatus('Initializing upload...');
    try {
      const uploader = new VideoUploader(file, { title, description }, (p) => {
        setProgress(p);
        if (p < 90) setStatus(`Uploading... ${p}%`);
        else if (p === 90) setStatus('Finalizing upload...');
        else setStatus('✅ Uploaded! Processing in background...');
      });
      const videoId = await uploader.upload();
      setTimeout(() => navigate(`/watch/${videoId}`), 2000);
    } catch (err) {
      setStatus(`❌ Error: ${err.message}`);
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Upload Video</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required
            style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
            placeholder="Enter video title" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 15, resize: 'vertical', boxSizing: 'border-box' }}
            placeholder="Describe your video..." />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Video File *</label>
          <input type="file" accept="video/*" onChange={e => setFile(e.target.files[0])} required
            style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          {file && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
            {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
          </p>}
        </div>

        {uploading && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <p style={{ fontSize: 14, color: '#374151' }}>{status}</p>
          </div>
        )}

        <button type="submit" disabled={uploading || !file || !title}
          style={{ width: '100%', padding: '12px', background: uploading ? '#9ca3af' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer' }}>
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
};

export default Upload;
