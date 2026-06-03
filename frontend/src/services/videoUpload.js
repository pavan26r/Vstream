const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export class VideoUploader {
  constructor(file, metadata, onProgress) {
    this.file = file;
    this.metadata = metadata;
    this.onProgress = onProgress;
    this.videoId = null;
    this.uploadId = null;
  }

  async upload() {
    // Init
    const initRes = await this._request('POST', '/upload/init', {
      filename: this.file.name,
      fileSize: this.file.size,
      mimeType: this.file.type,
      title: this.metadata.title,
      description: this.metadata.description,
    });
    if (initRes.error) throw new Error(initRes.error);
    this.videoId = initRes.videoId;
    this.uploadId = initRes.uploadId;

    // Chunks
    const totalChunks = Math.ceil(this.file.size / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = this.file.slice(start, Math.min(start + CHUNK_SIZE, this.file.size));
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('videoId', this.videoId);
      formData.append('uploadId', this.uploadId);
      formData.append('partNumber', String(i + 1));
      await this._requestFormData('/upload/chunk', formData);
      this.onProgress(Math.round(((i + 1) / totalChunks) * 90));
    }

    // Complete
    await this._request('POST', '/upload/complete', { videoId: this.videoId, uploadId: this.uploadId });
    this.onProgress(100);
    return this.videoId;
  }

  async _request(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async _requestFormData(path, formData) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
    return res.json();
  }
}
