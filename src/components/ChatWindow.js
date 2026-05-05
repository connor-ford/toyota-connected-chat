import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';
import Message from './Message';
import './ChatWindow.css';

const QUICK_REPLIES = [
  'Find a service centre near me',
  'Get my vehicle manual',
  'I need roadside assistance',
  'Report an emergency',
];

export default function ChatWindow({ agentMode, setAgentMode, connected, setConnected }) {
  const { messages, loading, error, sendMessage, escalateToConnect } = useChat({
    setAgentMode,
    setConnected,
  });
  const [input, setInput]     = useState('');
  const [started, setStarted] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setStarted(true);
    const text = input;
    setInput('');
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuick = (text) => {
    setStarted(true);
    sendMessage(text);
  };

  return (
    <div className="chat-shell">
      {/* Mode badge */}
      <div className={`chat-mode-badge ${agentMode ? 'agent' : 'bot'}`}>
        <span className="chat-mode-dot" />
        {agentMode ? 'Live agent connected' : 'AI assistant'}
      </div>

      {/* Message list */}
      <div className="chat-messages">
        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="chat-typing">
            <span /><span /><span />
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies — shown until user has sent first message */}
      {!started && (
        <div className="chat-quick">
          {QUICK_REPLIES.map(q => (
            <button
              key={q}
              className="chat-quick-btn"
              onClick={() => handleQuick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Escalate button — shown after conversation starts, before agent mode */}
      {started && !agentMode && (
        <button className="chat-escalate" onClick={escalateToConnect}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 01.5 2.18 2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.36 6.36l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
          Connect to live agent
        </button>
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          placeholder={agentMode ? 'Message agent…' : 'Ask anything…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
          aria-label="Chat message input"
        />
        <button
          className="chat-send"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
