import React, { useState, useEffect, useRef } from 'react';
import { ChatCircleText, X } from '@phosphor-icons/react';
import { apiEndpoints } from '../config/api';

// Mini chat popup for Facebook-style messaging
export default function ChatPopup({ recipientId, recipientName, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const chatRef = useRef(null);
  const userData = localStorage.getItem('user');
  const currentUser = userData ? JSON.parse(userData) : null;
  const currentUserId = currentUser?.id || currentUser?._id || '';

  const areMessagesEqual = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      const leftSender =
        typeof a[i]?.sender === 'object' && a[i]?.sender !== null
          ? String(a[i].sender._id || a[i].sender.id || '')
          : String(a[i]?.sender || '');
      const rightSender =
        typeof b[i]?.sender === 'object' && b[i]?.sender !== null
          ? String(b[i].sender._id || b[i].sender.id || '')
          : String(b[i]?.sender || '');
      if (
        String(a[i]?._id || '') !== String(b[i]?._id || '') ||
        String(a[i]?.text || '') !== String(b[i]?.text || '') ||
        String(a[i]?.createdAt || '') !== String(b[i]?.createdAt || '') ||
        leftSender !== rightSender
      ) {
        return false;
      }
    }
    return true;
  };

  useEffect(() => {
    const fetchMessages = async (options = {}) => {
      const silent = Boolean(options.silent);
      if (!silent) setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${apiEndpoints.getMessages}/${recipientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const nextMessages = Array.isArray(data?.messages) ? data.messages : [];
          setMessages((prev) => (areMessagesEqual(prev, nextMessages) ? prev : nextMessages));
        }
      } catch (err) {}
      if (!silent) setLoading(false);
    };

    fetchMessages({ silent: false });
    const intervalId = setInterval(() => fetchMessages({ silent: true }), 3000);

    return () => clearInterval(intervalId);
  }, [recipientId]);

  useEffect(() => {
    // Only auto-scroll when the user is already near the bottom.
    if (chatRef.current) {
      const distanceFromBottom =
        chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight;
      if (distanceFromBottom > 100) return;
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiEndpoints.sendMessage}/${recipientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: input }),
      });
      if (res.ok) {
        const token = localStorage.getItem('token');
        const refreshRes = await fetch(`${apiEndpoints.getMessages}/${recipientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const nextMessages = Array.isArray(refreshData?.messages) ? refreshData.messages : [];
          setMessages((prev) => (areMessagesEqual(prev, nextMessages) ? prev : nextMessages));
        }
        setInput('');
      }
    } catch (err) {}
    setSending(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      width: '420px',
      height: '340px',
      background: '#fff',
      borderRadius: '18px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
      border: '1px solid #efe5d7',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#f3ede3',
        borderBottom: '1px solid #efe5d7',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
          <ChatCircleText size={20} color="#8a5a00" />
          {recipientName || 'Conversation'}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} color="#8a5a00" />
        </button>
      </div>
      <div ref={chatRef} style={{
        flex: 1,
        padding: '18px',
        overflowY: 'auto',
        background: '#faf9f7',
        minHeight: '220px',
        maxHeight: '100%',
      }}>
        {loading ? (
          <div style={{ color: '#8a5a00', textAlign: 'center' }}>Loading...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center' }}>No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            (() => {
              const senderId = typeof msg.sender === 'object' && msg.sender !== null
                ? (msg.sender._id || msg.sender.id || '')
                : msg.sender;
              const isMine = String(senderId) === String(currentUserId);
              return (
            <div key={idx} style={{
              marginBottom: '12px',
              textAlign: isMine ? 'right' : 'left',
            }}>
              <span style={{
                display: 'inline-block',
                background: isMine ? '#d9a520' : '#e4d6c4',
                color: '#111827',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: 500,
                maxWidth: '70%',
                wordBreak: 'break-word',
              }}>{msg.text}</span>
            </div>
              );
            })()
          ))
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid #efe5d7',
        background: '#f3ede3',
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '14px',
            outline: 'none',
            background: '#fff',
            marginRight: '8px',
          }}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          style={{
            background: '#d9a520',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 700,
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
