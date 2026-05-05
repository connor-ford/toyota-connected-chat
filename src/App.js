import React, { useState } from 'react';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import StatusBar from './components/StatusBar';
import './App.css';

export default function App() {
  const [agentMode, setAgentMode] = useState(false);
  const [connected, setConnected] = useState(false);

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <div className="app-hero">
          <p className="app-hero-label">Driver assistance</p>
          <h1 className="app-hero-title">How can we<br />help you today?</h1>
          <p className="app-hero-sub">
            Ask about nearby service centres, vehicle manuals,<br />
            or connect with a roadside assistance agent.
          </p>
        </div>
        <ChatWindow
          agentMode={agentMode}
          setAgentMode={setAgentMode}
          connected={connected}
          setConnected={setConnected}
        />
      </main>
      <StatusBar agentMode={agentMode} connected={connected} />
    </div>
  );
}
