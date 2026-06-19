import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import {
  Sparkles, Send, Compass, BrainCircuit, User
} from 'lucide-react';

const QUICK_ACTIONS = [
  "How is my budget looking?",
  "Suggest ways to increase my savings rate",
  "Any anomalies in my recent transactions?",
  "Will I reach my Europe Trip goal?"
];

export default function AICoach() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your FinSight AI coach. I have analyzed your spending patterns, budgets, and savings goals. How can I help you optimize your finances today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const [health, setHealth] = useState({ overall: 0, label: 'Unrated', components: [] });
  const [loadingHealth, setLoadingHealth] = useState(true);

  const fetchHealthScore = async () => {
    setLoadingHealth(true);
    try {
      const res = await client.get('/health/score');
      if (res.data?.success) {
        setHealth(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load health score:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealthScore();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response = await client.post('/ai/chat', { message: textToSend });
      if (response.data?.success) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: response.data.data.reply || response.data.data.response || response.data.data.recommendation || "I analyzed your request and updated your dashboard.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        throw new Error('API returned failure status');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "I apologize, but I encountered an error communicating with the financial orchestrator. Please verify your connection or try again shortly.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>
      {/* Left Column: Health Score Card */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* FHS Circular Card */}
        <div className="card" style={{ flex: '1' }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
            <h3 className="heading-4" style={{ marginBottom: 16 }}>Financial Health Score</h3>
            
            {loadingHealth ? (
              <p style={{ color: 'var(--text-secondary)' }}>Calculating Health Score...</p>
            ) : (
              <>
                {/* Visual Gauge */}
                <div style={{ position: 'relative', width: 150, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-primary)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-primary)" strokeWidth="8"
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * health.overall) / 100}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{health.overall}</span>
                    <span className="caption" style={{ fontWeight: 600, color: 'var(--accent-primary-dark)', marginTop: 4 }}>{health.label}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: '0 10px' }}>
                  {health.components && health.components.slice(0, 3).map((comp) => (
                    <div key={comp.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{comp.name}</span>
                      <span style={{ fontWeight: 600 }}>{comp.score}/100</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions List */}
        <div className="card" style={{ flex: '1' }}>
          <div className="card-body">
            <h3 className="heading-4" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Compass size={18} color="var(--accent-primary-dark)" />
              Suggested Queries
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action)}
                  className="quick-action-btn"
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    background: 'var(--bg-primary)',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    border: '1px solid var(--card-border)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-primary)';
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Chat Box */}
      <div className="card" style={{ flex: '2.5', display: 'flex', flexDirection: 'column' }}>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
          {/* Chat Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--card-border)', padding: '16px 24px', background: 'var(--bg-secondary)', borderTopLeftRadius: 'var(--card-radius)', borderTopRightRadius: 'var(--card-radius)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(124, 182, 142, 0.15)', color: 'var(--accent-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BrainCircuit size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>FinSight Copilot</div>
              <div style={{ fontSize: 11, color: 'var(--accent-primary-dark)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }} />
                Connected to Llama-3 AI Engine
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, idx) => {
              const isAI = m.sender === 'ai';
              return (
                <div key={idx} style={{ display: 'flex', gap: 10, alignSelf: isAI ? 'flex-start' : 'flex-end', maxWidth: '80%', flexDirection: isAI ? 'row' : 'row-reverse' }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isAI ? 'rgba(124, 182, 142, 0.15)' : 'var(--bg-sidebar)',
                    color: isAI ? 'var(--accent-primary-dark)' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isAI ? <Sparkles size={14} /> : <User size={14} />}
                  </div>

                  {/* Message Bubble */}
                  <div>
                    <div style={{
                      background: isAI ? 'var(--bg-secondary)' : 'var(--accent-success-bg)',
                      border: isAI ? '1px solid var(--card-border)' : '1px solid var(--accent-primary-light)',
                      color: 'var(--text-primary)',
                      padding: '12px 16px',
                      borderRadius: isAI ? '0px 12px 12px 12px' : '12px 0px 12px 12px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      {m.text}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: isAI ? 'left' : 'right' }}>
                      {m.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Chat Loading */}
            {isSending && (
              <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(124, 182, 142, 0.15)',
                  color: 'var(--accent-primary-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sparkles size={14} />
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--card-border)',
                  padding: '12px 16px',
                  borderRadius: '0px 12px 12px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s infinite alternate' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s infinite alternate 0.2s' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1s infinite alternate 0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={onSubmit} style={{ padding: 16, borderTop: '1px solid var(--card-border)', background: 'var(--bg-secondary)', display: 'flex', gap: 10, borderBottomLeftRadius: 'var(--card-radius)', borderBottomRightRadius: 'var(--card-radius)' }}>
            <input
              type="text"
              placeholder="Ask the AI Coach (e.g. Can I afford a laptop next month?)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid var(--card-border)',
                borderRadius: 24,
                background: 'var(--card-bg)',
                outline: 'none',
                fontSize: 13,
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: input.trim() ? 'var(--bg-sidebar)' : 'var(--bg-primary)',
                color: input.trim() ? 'white' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                cursor: input.trim() ? 'pointer' : 'default'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
