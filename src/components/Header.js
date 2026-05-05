import React from "react";
import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          {/* Toyota ellipses mark — SVG approximation */}
          <svg
            width="36"
            height="24"
            viewBox="0 0 36 24"
            fill="none"
            aria-hidden="true"
          >
            <ellipse
              cx="18"
              cy="12"
              rx="17"
              ry="11"
              stroke="#EB0A1E"
              strokeWidth="2.2"
              fill="none"
            />
            <ellipse
              cx="18"
              cy="12"
              rx="9"
              ry="11"
              stroke="#EB0A1E"
              strokeWidth="2.2"
              fill="none"
            />
            <ellipse
              cx="18"
              cy="4.5"
              rx="13"
              ry="3.5"
              stroke="#EB0A1E"
              strokeWidth="2.2"
              fill="none"
            />
          </svg>
          <span className="header-wordmark">Toyota Connected</span>
        </div>
        <nav className="header-nav">
          <span className="header-nav-item">Driver Assistance</span>
          <a
            className="header-cta"
            href="https://www.toyota.com"
            target="_blank"
            rel="noreferrer"
          >
            Toyota.com
          </a>
        </nav>
      </div>
      <div className="header-rule" />
    </header>
  );
}
