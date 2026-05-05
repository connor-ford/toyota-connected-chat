import React from 'react';
import './Message.css';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Message({ message }) {
  const { role, text, ts } = message;

  if (role === 'system') {
    return (
      <div className="msg-system">
        <span className="msg-system-line" />
        <span className="msg-system-text">{text}</span>
        <span className="msg-system-line" />
      </div>
    );
  }

  return (
    <div className={`msg-row msg-row--${role}`}>
      {role !== 'user' && (
        <div className="msg-avatar">
          {role === 'bot' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          )}
        </div>
      )}
      <div className="msg-body">
        <div className={`msg-bubble msg-bubble--${role}`}>{text}</div>
        <span className="msg-ts">{formatTime(ts)}</span>
      </div>
    </div>
  );
}
