import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const LiveChat = ({ videoId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const sock = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', { auth: { token } });
    sock.on('connect', () => { setConnected(true); sock.emit('join_video', { videoId }); });
    sock.on('chat_history', setMessages);
    sock.on('new_message', msg => setMessages(prev => [...prev, msg]));
    sock.on('disconnect', () => setConnected(false));
    setSocket(sock);
    return () => { sock.emit('leave_video', { videoId }); sock.disconnect(); };
  }, [videoId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!input.trim() || !socket) return;
    socket.emit('send_message', { videoId, message: input.trim() });
    setInput('');
  };

  return (
    <div style={{ border: '0.5px solid #e5e7eb', borderRadius: 12, height: 480, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
        <span style={{ fontWeight: 500, fontSize: 14 }}>Live Chat</span>
        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{connected ? 'Connected' : 'Reconnecting...'}</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ fontSize: 13 }}>
            <span style={{ fontWeight: 500, color: '#3b82f6' }}>{msg.username}</span>
            <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 6 }}>
              {new Date(msg.timestamp || msg.created_at).toLocaleTimeString()}
            </span>
            <div style={{ marginTop: 2, color: '#111827' }}>{msg.message}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid #e5e7eb', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Type a message..."
          maxLength={500}
          style={{ flex: 1, padding: '8px 12px', border: '0.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
        />
        <button onClick={send} disabled={!input.trim() || !connected}
          style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default LiveChat;
