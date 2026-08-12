// ChatbotModal.jsx - Sleek Floating AI Assistant Drawer for StopAhead
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Navigation, Clock, Bell, Radio } from 'lucide-react';
import { processAssistantQuery } from '../utils/assistantService';

export default function ChatbotModal({ isOpen, onClose, appContext = {} }) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'bot',
      text: "👋 Hi! I'm StopAhead AI. Ask me anything about live distances, ETAs, or stops near your location!"
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  const { userPosition, userLocation, activeTrip, transportMode = 'bus' } = appContext;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (queryText = inputQuery) => {
    const cleanText = (queryText || '').trim();
    if (!cleanText || isProcessing) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanText
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    try {
      const responseText = await processAssistantQuery(cleanText, appContext);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: responseText
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: "Sorry, I had trouble retrieving that live location data. Please try again!"
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    { label: '📍 Distance to nearest stop?', query: 'How far is the nearest stop from my location?' },
    { label: "⏱️ What's my ETA?", query: "What's my ETA?" },
    { label: '🔔 When will my alarm trigger?', query: 'How long until my alarm goes off?' },
    { label: '🚌 How many stops remaining?', query: 'How many stops until my destination?' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '82vh',
          background: 'var(--surface-color, #0f141f)',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid var(--border-color, rgba(2, 90, 237, 0.3))',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'rgba(2, 90, 237, 0.12)',
            borderBottom: '1px solid rgba(2, 90, 237, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #025AED, #00e5ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(2, 90, 237, 0.4)'
              }}
            >
              <Bot size={20} />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                StopAhead Assistant
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Radio size={10} color="var(--accent)" />
                <span>Live GPS Active ({userLocation?.cityName || 'Detected Loc'})</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            padding: '0.6rem 1rem',
            background: 'rgba(0, 0, 0, 0.2)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          {quickPrompts.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip.query)}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-full, 999px)',
                background: 'rgba(2, 90, 237, 0.12)',
                border: '1px solid rgba(2, 90, 237, 0.3)',
                color: 'var(--text-primary)',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Messages List Area */}
        <div
          style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '0.5rem'
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(2, 90, 237, 0.2)',
                      border: '1px solid var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <Bot size={14} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '82%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser ? 'var(--accent, #025AED)' : 'rgba(255, 255, 255, 0.08)',
                    color: isUser ? '#ffffff' : 'var(--text-primary)',
                    fontSize: '0.86rem',
                    lineHeight: 1.45,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(2, 90, 237, 0.2)',
                  border: '1px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)'
                }}
              >
                <Bot size={14} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Checking live GPS location & telemetry...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            padding: '0.85rem 1rem',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about distances, ETAs, or stops..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '0.7rem 0.95rem',
              borderRadius: 'var(--radius-md, 12px)',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isProcessing}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md, 12px)',
              background: inputQuery.trim() ? 'var(--accent, #025AED)' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputQuery.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s ease'
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
