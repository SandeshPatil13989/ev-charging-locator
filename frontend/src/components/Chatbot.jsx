import { useState, useRef, useEffect } from "react";
import axios from "axios";

const BASE = "http://localhost:5000";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "👋 Hi! I'm your EV Charging Assistant. Ask me anything about stations, availability, costs, or routes!",
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const suggestions = [
    "Which stations are available now?",
    "What's the best time to charge?",
    "How much does charging cost?",
    "Find fast chargers nearby",
    "How does the AI prediction work?",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    const userMsg = { role: "user", text: msg, time: new Date().toLocaleTimeString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await axios.post(`${BASE}/chat`, { message: msg });
      const botMsg = {
        role: "bot",
        text: res.data.reply,
        time: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "bot",
        text: "❌ Sorry, I couldn't connect. Make sure Flask is running!",
        time: new Date().toLocaleTimeString()
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="chatbot-wrap">
      <div className="chatbot-header">
        <div className="chatbot-avatar">🤖</div>
        <div>
          <h3>EV Charging Assistant</h3>
          <span className="chatbot-status">🟢 Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chatbot-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === "bot" && <span className="chat-avatar">🤖</span>}
            <div className="chat-bubble">
              <p style={{ whiteSpace: "pre-line" }}>{m.text}</p>
              <span className="chat-time">{m.time}</span>
            </div>
            {m.role === "user" && <span className="chat-avatar">👤</span>}
          </div>
        ))}
        {loading && (
          <div className="chat-msg bot">
            <span className="chat-avatar">🤖</span>
            <div className="chat-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="chat-suggestions">
        {suggestions.map((s) => (
          <button key={s} className="suggestion-btn" onClick={() => sendMessage(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="chatbot-input-wrap">
        <input
          type="text"
          className="chatbot-input"
          placeholder="Ask me anything about EV charging..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="chatbot-send"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}