import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

const LEX_URL = process.env.REACT_APP_LEX_API_URL;
const CONNECT_URL = process.env.REACT_APP_CONNECT_API_URL;
const API_KEY = process.env.REACT_APP_API_KEY;

const SESSION_ID = uuidv4();

async function callApi(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
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
      role: "bot",
      text: "Hello, I'm the Toyota Connected assistant. I can help you find a service centre, retrieve your vehicle manual, or connect you with a roadside assistance agent. How can I help?",
      ts: Date.now(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectToken, setConnectToken] = useState(null);
  const wsRef = useRef(null);

  const appendMessage = useCallback((role, text) => {
    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), role, text, ts: Date.now() },
    ]);
  }, []);

  const sendToLex = useCallback(
    async (text) => {
      setLoading(true);
      setError(null);
      try {
        const data = await callApi(LEX_URL, {
          message: text,
          sessionId: SESSION_ID,
        });
        appendMessage("bot", data.message);

        if (data.escalate) {
          appendMessage("system", "Connecting you to a live agent…");
          await escalateToConnect();
        }
      } catch (e) {
        setError("Could not reach the assistant. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [appendMessage],
  );

  const escalateToConnect = useCallback(async () => {
    try {
      const data = await callApi(CONNECT_URL, { sessionId: SESSION_ID });

      // Store the connection token for sending messages later
      setConnectToken(data.connectionToken);
      setAgentMode(true);

      // Open the WebSocket connection so Connect sees the customer as present
      const ws = new WebSocket(data.websocketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Subscribe to the chat topic — required by Connect Participant Service
        ws.send(
          JSON.stringify({
            topic: "aws/subscribe",
            content: { topics: ["aws/chat"] },
          }),
        );
        setConnected(true);
        appendMessage("system", "You are now connected to a live agent.");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Only display actual chat messages from the agent
          if (
            msg.topic === "aws/chat" &&
            msg.contentType === "text/plain" &&
            msg.participantRole === "AGENT"
          ) {
            appendMessage("agent", msg.content);
          }
        } catch (e) {
          console.error("WebSocket message parse error:", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setError("Connection to agent failed. Please try again.");
        setAgentMode(false);
        setConnected(false);
      };

      ws.onclose = () => {
        appendMessage("system", "Agent session ended.");
        setConnected(false);
      };
    } catch (e) {
      setError("Could not connect to an agent. Please call 1800-TOYOTA.");
      setAgentMode(false);
      setConnected(false);
    }
  }, [appendMessage, setAgentMode, setConnected]);

  const sendToAgent = useCallback(
    async (text) => {
      setLoading(true);
      setError(null);
      try {
        await callApi(CONNECT_URL + "/message", {
          message: text,
          connectionToken: connectToken,
        });
      } catch (e) {
        setError("Message failed to send.");
      } finally {
        setLoading(false);
      }
    },
    [connectToken],
  );

  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim()) return;
      appendMessage("user", text);
      if (connectToken) {
        await sendToAgent(text);
      } else {
        await sendToLex(text);
      }
    },
    [appendMessage, sendToLex, sendToAgent, connectToken],
  );

  return { messages, loading, error, sendMessage, escalateToConnect };
}
