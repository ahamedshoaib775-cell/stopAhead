// ChatbotModal.jsx - Complete Production-Ready StopAhead AI Chatbot Modal (Light Theme)
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Radio, Compass, Bell, Navigation, Sparkles, RefreshCw, Trash2, Clock, Pencil, Check, RotateCcw } from 'lucide-react';
import { processAssistantQuery } from '../utils/assistantService';
import { fetchChatConversations, createChatConversation, fetchChatMessages, saveChatMessage, clearChatConversationMessages, updateChatMessage, deleteChatMessagesAfter } from '../utils/dbService';



import BestWayThereCard from './chatbot/BestWayThereCard';
import AlertCard from './chatbot/AlertCard';
import UnavailableModeCard from './chatbot/UnavailableModeCard';
import StopCard from './chatbot/StopCard';
import JourneyCard from './chatbot/JourneyCard';
import AllRoutesCard from './chatbot/AllRoutesCard';


export default function ChatbotModal({ isOpen, onClose, appContext = {}, onStartTrip, onNavigate, user }) {
  const userId = user?.id || null;

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `👋 Hi! I'm StopAhead AI.\n\nI can help you:\n• Find the fastest way to any destination\n• Check nearby bus, metro, train & local train stops\n• Set and manage stop alerts\n• Track your current journey\n\nWhere are you headed today?`
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelConfirmMsgId, setCancelConfirmMsgId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState(null);

  const messagesEndRef = useRef(null);

  const { userPosition, userLocation, activeTrip, transportMode = 'bus', onUpdateActiveTrip } = appContext;

  const handleStartEdit = (msg) => {
    setEditingMsgId(msg.id);
    setEditText(msg.text);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditText('');
    setEditError(null);
  };

  const handleSaveEditedMessage = async (targetMsgId) => {
    if (!editText || !editText.trim() || !targetMsgId) return;

    const trimmedEdit = editText.trim();
    setIsProcessing(true);
    setEditError(null);

    try {
      await updateChatMessage(conversationId, targetMsgId, trimmedEdit);
      await deleteChatMessagesAfter(conversationId, targetMsgId);

      const targetIdx = messages.findIndex((m) => m.id === targetMsgId);
      if (targetIdx !== -1) {
        const updatedUserMsg = { ...messages[targetIdx], text: trimmedEdit };
        const truncatedList = messages.slice(0, targetIdx);
        truncatedList.push(updatedUserMsg);
        setMessages(truncatedList);
        setEditingMsgId(null);

        const response = await processAssistantQuery(trimmedEdit, appContext);
        if (response && conversationId) {
          const botMsgRecord = await saveChatMessage(conversationId, 'assistant', response.responseText, response);
          setMessages((prev) => [
            ...prev,
            {
              id: botMsgRecord.id,
              sender: 'bot',
              text: response.responseText,
              data: response
            }
          ]);
        }
      }
    } catch (err) {
      console.error('[StopAhead Chat Edit Error]:', err);
      setEditError('Failed to save edit.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleConfirmClear = async () => {
    setIsClearing(true);
    setClearError(null);

    try {
      const res = await clearChatConversationMessages(conversationId, userId);
      if (res && !res.success) {
        setClearError(res.error || 'Failed to delete messages from server.');
        setIsClearing(false);
        return;
      }

      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: `👋 Hi! I'm StopAhead AI.\n\nI can help you:\n• Find the fastest way to any destination\n• Check nearby bus, metro, train & local train stops\n• Set and manage stop alerts\n• Track your current journey\n\nWhere are you headed today?`
        }
      ]);
      setShowClearConfirm(false);
    } catch (e) {
      console.error('Clear chat error:', e);
      setClearError('Could not clear conversation. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };


  // Load persistent conversation & messages from Supabase DB / local storage
  useEffect(() => {
    let isMounted = true;

    async function initConversation() {
      try {
        const convs = await fetchChatConversations(userId);
        let currentConv = convs && convs.length > 0 ? convs[0] : null;

        if (!currentConv) {
          currentConv = await createChatConversation(userId, 'StopAhead Travel Chat');
        }

        if (currentConv && isMounted) {
          setConversationId(currentConv.id);
          const savedMsgs = await fetchChatMessages(currentConv.id);
          if (savedMsgs && savedMsgs.length > 0) {
            const formatted = savedMsgs.map((m) => ({
              id: m.id,
              sender: m.role === 'user' ? 'user' : 'bot',
              text: m.content,
              data: m.metadata?.cardData || m.metadata || null
            }));
            setMessages(formatted);
          }
        }
      } catch (e) {
        console.warn('Init conversation error:', e);
      }
    }

    if (isOpen) {
      initConversation();
    }
  }, [isOpen, userId]);

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

    console.log('[StopAhead UI] User sending chat query:', cleanText);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanText
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    // Save User Message to Supabase DB
    if (conversationId) {
      saveChatMessage(conversationId, 'user', cleanText);
    }

    try {
      const res = await processAssistantQuery(cleanText, appContext);
      console.log('[StopAhead UI] Assistant processed response:', res);

      let botMsg = {};

      if (typeof res === 'object' && res !== null) {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res.responseText || res.text || '',
          data: res
        };


        // Handle direct trip alert creation from chat
        if (res.cardType === 'alert_created' && onStartTrip && res.destinationStop) {
          onStartTrip(
            null,
            res.destinationStop,
            'stops',
            res.thresholdValue || 2,
            'chime',
            res.mode || 'bus'
          );
        }
      } else {
        botMsg = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res
        };
      }

      setMessages((prev) => [...prev, botMsg]);

      // Save Assistant Message & Card Metadata to Supabase DB
      if (conversationId) {
        saveChatMessage(conversationId, 'assistant', botMsg.text, { cardData: botMsg.data });
      }
    } catch (e) {
      const errMsg = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: "Sorry, I ran into an error while calculating routes. Please try again!",
        isError: true
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const quickActionButtons = [
    { label: '✨ Best way there', query: 'Best way there' },
    { label: '📍 Where am I?', query: 'Where am I?' },
    { label: '🔔 Set an alert', query: 'Set an alert for Marina Beach, 2 stops before' },
    { label: '⏱️ My active alert', query: 'My active alert' }
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
        padding: 0
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
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#025AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(2, 90, 237, 0.35)'
              }}
            >
              <Bot size={22} />
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                StopAhead AI
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Your Travel Assistant • {userLocation?.cityName || 'Live GPS Active'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              onClick={() => {
                setClearError(null);
                setShowClearConfirm(true);
              }}
              title="Clear Chat History"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Trash2 size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
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
        </div>

        {/* Clear Chat Confirmation Modal Overlay */}
        {showClearConfirm && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '1.5rem',
                maxWidth: '340px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                textAlign: 'center',
                border: '1px solid #e2e8f0'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              >
                <Trash2 size={24} />
              </div>

              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Clear Conversation?
                </h4>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.84rem', color: '#64748b', lineHeight: 1.4 }}>
                  This will permanently delete your conversation history with StopAhead AI. This action cannot be undone.
                </p>
              </div>

              {clearError && (
                <div
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: '10px',
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    color: '#e11d48',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                >
                  ⚠️ {clearError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={() => {
                    setShowClearConfirm(false);
                    setClearError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '12px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isClearing}
                  onClick={handleConfirmClear}
                  style={{
                    flex: 1,
                    padding: '0.65rem',
                    borderRadius: '12px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {isClearing ? 'Clearing...' : 'Clear Chat'}
                </button>
              </div>
            </div>
          </div>
        )}


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
            const cardData = msg.data;

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
                    maxWidth: '85%',
                    padding: '0.85rem 1.05rem',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser ? '#025AED' : '#ffffff',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    boxShadow: isUser ? '0 4px 14px rgba(2, 90, 237, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                    whiteSpace: 'pre-line',
                    position: 'relative'
                  }}
                >
                  {isUser && editingMsgId === msg.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', minWidth: '220px' }}>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid #93c5fd',
                          fontSize: '0.86rem',
                          background: '#ffffff',
                          color: '#0f172a',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                      {editError && (
                        <div style={{ fontSize: '0.72rem', color: '#fecdd3' }}>⚠️ {editError}</div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          style={{
                            padding: '0.25rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedMessage(msg.id)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: '#ffffff',
                            color: '#025AED',
                            border: 'none',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Check size={12} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span>{msg.text}</span>
                        {isUser && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(msg)}
                            title="Edit message"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.7)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                      </div>
                    </>
                  )}


                  {/* Render Structured Cards based on metadata */}

                  {cardData && (
                    <>
                      {/* All Routes Multi-Route List Card */}

                      {cardData.cardType === 'all_routes' && (
                        <AllRoutesCard
                          data={cardData}
                          onStartTrip={onStartTrip}
                          onNavigate={onNavigate}
                          onClose={onClose}
                        />
                      )}

                      {/* Best Way There Card */}
                      {cardData.cardType === 'best_way_there' && (
                        <BestWayThereCard
                          data={cardData}
                          onStartTrip={onStartTrip}
                          onNavigate={onNavigate}
                          onClose={onClose}
                        />
                      )}


                      {/* Alert Status Card */}
                      {cardData.cardType === 'alert' && (
                        <AlertCard
                          activeTrip={cardData.activeTrip || activeTrip}
                          onModifyAlert={(newVal) => handleSend(`Change my alert to ${newVal} stops`)}
                          onCancelAlert={() => handleSend('Cancel my alert')}
                        />
                      )}

                      {/* Unavailable Mode Card */}
                      {cardData.cardType === 'unavailable_mode' && (
                        <UnavailableModeCard
                          mode={cardData.mode}
                          nearestStationName={cardData.nearestStationName}
                          nearestStationKm={cardData.nearestStationKm}
                          onSwitchToAvailableMode={(newMode) => handleSend(`Switch to ${newMode}`)}
                        />
                      )}

                      {/* Stop Result Card */}
                      {cardData.cardType === 'stop' && cardData.stop && (
                        <StopCard
                          stop={cardData.stop}
                          mode={cardData.mode || 'bus'}
                          onSelectStop={(stop) => handleSend(`Alert me 2 stops before ${stop.name}`)}
                        />
                      )}

                      {/* Cancel Confirmation Dialog */}
                      {cardData.cardType === 'cancel_confirm' && (
                        <div style={{ marginTop: '0.65rem', padding: '0.65rem', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onStartTrip) onStartTrip(null, null, 'stops', 2, 'chime', 'bus');
                              handleSend('Alert cancelled');
                            }}
                            style={{ flex: 1, padding: '0.45rem', borderRadius: '8px', background: '#e11d48', color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            Confirm Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSend('Keep my alert')}
                            style={{ flex: 1, padding: '0.45rem', borderRadius: '8px', background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            Keep Alert
                          </button>
                        </div>
                      )}

                      {/* Error / Timeout Retry Card */}
                      {(cardData.cardType === 'error_timeout' || cardData.isError) && (
                        <div style={{ marginTop: '0.65rem', padding: '0.85rem 1rem', borderRadius: '14px', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e11d48', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={16} />
                            <span>Request timed out</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            This lookup is taking longer than expected. Would you like to try again?
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSend(cardData.rawQuery || msg.text)}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '8px',
                              background: '#025AED',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              border: 'none',
                              cursor: 'pointer',
                              alignSelf: 'flex-start'
                            }}
                          >
                            🔄 Retry Request
                          </button>
                        </div>
                      )}

                    </>
                  )}
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(2, 90, 237, 0.1)', border: '1px solid #025AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#025AED' }}>
                <Bot size={14} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                StopAhead AI is thinking & calculating transit data...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Welcome Quick Action Chips (rendered above input) */}
        <div
          style={{
            padding: '0.6rem 1rem',
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            gap: '0.45rem',
            overflowX: 'auto'
          }}
        >
          {quickActionButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(btn.query)}
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
              {btn.label}
            </button>
          ))}
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
            placeholder="Ask StopAhead AI..."
            disabled={isProcessing}
            maxLength={300}
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
