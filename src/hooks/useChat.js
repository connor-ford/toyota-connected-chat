import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const LEX_URL     = process.env.REACT_APP_LEX_API_URL;
const CONNECT_URL = process.env.REACT_APP_CONNECT_API_URL;
const API_KEY     = process.env.REACT_APP_API_KEY;

const SESSION_ID  = uuidv4(); // one session per browser tab

async function callApi(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export function useChat({ setAgentMode, setConnected }) {
  const [messages, setMessages] = useState([
    {
      id: uuidv4(),
      role: 'bot',
      text: "Hello, I'm the Toyota Connected assistant. I can help you find a service centre, retrieve your vehicle manual, or connect you with a roadside assistance agent. How can I help?",
      ts: Date.now(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  // Holds the Connect chat token after escalation
  const [connectToken, setConnectToken] = useState(null);

  const appendMessage = useCallback((role, text) => {
    setMessages(prev => [...prev, { id: uuidv4(), role, text, ts: Date.now() }]);
  }, []);

  const sendToLex = useCallback(async (text) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi(LEX_URL, { message: text, sessionId: SESSION_ID });
      appendMessage('bot', data.message);

      // If Lex returns escalation intent, trigger Connect
      if (data.escalate) {
        appendMessage('system', 'Connecting you to a live agent…');
        await escalateToConnect();
      }
    } catch (e) {
      setError('Could not reach the assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appendMessage]);

  const escalateToConnect = useCallback(async () => {
    try {
      const data = await callApi(CONNECT_URL, { sessionId: SESSION_ID });
      // data.websocketUrl and data.connectionToken are returned by Connect
      setConnectToken(data.connectionToken);
      setAgentMode(true);
      setConnected(true);
      appendMessage('system', 'You are now connected to a live agent.');
    } catch (e) {
      setError('Could not connect to an agent. Please call 1800-TOYOTA.');
      setAgentMode(false);
      setConnected(false);
    }
  }, [appendMessage, setAgentMode, setConnected]);

  // After escalation, messages go to Connect participant service via WebSocket
  // For the demo, we route them through the same Lambda which proxies to Connect
  const sendToAgent = useCallback(async (text) => {
    setLoading(true);
    setError(null);
    try {
      await callApi(CONNECT_URL + '/message', {
        message: text,
        connectionToken: connectToken,
      });
      // Agent reply arrives via WebSocket polling (see ConnectPoller below)
    } catch (e) {
      setError('Message failed to send.');
    } finally {
      setLoading(false);
    }
  }, [connectToken]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    appendMessage('user', text);
    if (connectToken) {
      await sendToAgent(text);
    } else {
      await sendToLex(text);
    }
  }, [appendMessage, sendToLex, sendToAgent, connectToken]);

  return { messages, loading, error, sendMessage, escalateToConnect };
}
