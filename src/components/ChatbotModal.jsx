// ChatbotModal.jsx - Light-Theme Conversational AI Trip-Planner Assistant Drawer
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Radio, Bus, Train, TrainFront, TrainTrack, Rocket, Navigation, ArrowRight } from 'lucide-react';
import { processAssistantQuery } from '../utils/assistantService';

export default function ChatbotModal({ isOpen, onClose, appContext = {}, onStartTrip, onNavigate }) {
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'bot',
      text: "👋 Hi! I'm StopAhead AI Trip Planner. Ask me 'How do I get to Phoenix Mall?' or 'How far is Anna Nagar?' to get live data-backed transit recommendations!"
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

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'metro':
        return TrainFront;
      case 'train':
      case 'local_train':
        return TrainTrack;
      case 'bus':
      default:
        return Bus;
    }
  };

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
      const res = await processAssistantQuery(cleanText, appContext);
      let botMsg = {};

      if (typeof res === 'object' && res !== null) {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res.responseText || res.text || '',
          data: res.isTripRecommendation ? res : null
        };
      } else {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res
        };
      }

      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: "Sorry, I had trouble planning that route with live transit data. Please try again!"
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickPrompts = [
    { label: '🗺️ Route to Phoenix Mall', query: 'How do I get to Phoenix Mall?' },
    { label: '📍 Nearest transit stop', query: 'Where is the nearest stop?' },
    { label: "⏱️ What's my ETA?", query: "What's my ETA?" },
    { label: '🔔 Alarm trigger time', query: 'When will my alarm trigger?' },
    { label: '🗣️ Tamil / English Voice Alerts', query: 'How do voice alerts work?' },
    { label: '🚨 Emergency SOS', query: 'How does Emergency SOS work?' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
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
          height: '84vh',
          background: '#ffffff',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {/* Light Header Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#025AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(2, 90, 237, 0.35)'
              }}
            >
              <Bot size={20} />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                StopAhead AI Assistant
              </div>
              <div style={{ fontSize: '0.72rem', color: '#025AED', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Radio size={10} color="#025AED" />
                <span>Live GPS Active ({userLocation?.cityName || 'Detected City'})</span>
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
              background: '#e2e8f0',
              border: 'none',
              color: '#475569',
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
            padding: '0.65rem 1rem',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            gap: '0.45rem',
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
                padding: '0.4rem 0.75rem',
                borderRadius: '999px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '0.76rem',
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
            background: '#f8fafc',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const tripData = msg.data;
            const ModeIcon = tripData ? getModeIcon(tripData.recommendedMode) : Bus;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: '0.55rem'
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(2, 90, 237, 0.1)',
                      border: '1px solid #025AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#025AED',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    <Bot size={14} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '84%',
                    padding: '0.8rem 1rem',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser ? '#025AED' : '#ffffff',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    boxShadow: isUser ? '0 4px 14px rgba(2, 90, 237, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {/* Inline Mode Icon for Trip Recommendations */}
                  {tripData && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        color: '#025AED',
                        marginBottom: '0.4rem'
                      }}
                    >
                      <ModeIcon size={18} color="#025AED" />
                      <span>Recommended: {tripData.recommendedModeLabel}</span>
                    </div>
                  )}

                  <div>{msg.text}</div>

                  {/* One-Tap Start Trip Card */}
                  {tripData && onStartTrip && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      <div style={{ fontSize: '0.76rem', color: '#475569', fontWeight: 700, marginBottom: '0.35rem' }}>
                        JOURNEY BREAKDOWN
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 600 }}>
                        📍 {tripData.originStop?.name} → {tripData.destinationStop?.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {tripData.stopsCount} stops • ~{tripData.transitMins} min transit • {tripData.walkMins} min walk
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onStartTrip(
                            tripData.originStop,
                            tripData.destinationStop,
                            'stops',
                            2,
                            null,
                            tripData.recommendedMode
                          );
                          onNavigate && onNavigate('active-trip');
                          onClose && onClose();
                        }}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          marginTop: '0.6rem',
                          borderRadius: '10px',
                          background: '#025AED',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 12px rgba(2, 90, 237, 0.35)'
                        }}
                        id="btn-start-trip-from-chat"
                      >
                        <Rocket size={15} />
                        <span>Start this trip now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(2, 90, 237, 0.1)',
                  border: '1px solid #025AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#025AED'
                }}
              >
                <Bot size={14} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                Analyzing transit options & calculating route...
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
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask 'How do I get to Phoenix Mall?'..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
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
              borderRadius: '12px',
              background: inputQuery.trim() ? '#025AED' : '#e2e8f0',
              border: 'none',
              color: inputQuery.trim() ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputQuery.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: inputQuery.trim() ? '0 4px 12px rgba(2, 90, 237, 0.3)' : 'none'
            }}
            id="btn-send-chat"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
