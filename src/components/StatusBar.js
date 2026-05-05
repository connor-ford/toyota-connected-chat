import React from "react";
import "./StatusBar.css";

export default function StatusBar({ agentMode, connected }) {
  return (
    <footer className="status-bar">
      <span className="status-bar-copy">
        © {new Date().getFullYear()} Toyota Connected, Inc.
      </span>
      <span className="status-bar-state">
        <span
          className={`status-dot ${connected ? "connected" : agentMode ? "connecting" : "idle"}`}
        />
        {connected
          ? "Agent connected"
          : agentMode
            ? "Connecting…"
            : "AI assistant active"}
      </span>
      <span className="status-bar-copy">Powered by Amazon Connect</span>
    </footer>
  );
}
