// AuthScreen.jsx - StopAhead Magic Link Authentication Flow
import React, { useState, useEffect } from 'react';
import { Mail, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, RefreshCw, Edit3, MailCheck } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function AuthScreen({ onAuthSuccess, onContinueAsGuest }) {
  // Navigation & Flow state
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'login'
  const [step, setStep] = useState(1); // 1: Input Form, 2: Magic Link Sent Confirmation

  // Form Input States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // UI Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Resend Cooldown Timer (45 seconds)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Email format validation helper
  const isValidEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());

  // Masking helper for privacy on confirmation screen
  const getMaskedEmail = () => {
    const parts = email.trim().split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${parts[1]}`;
  };

  // Step 1 Submit: Validate & Trigger Magic Link via Supabase Auth
  const handleSendMagicLink = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();

    // 1. Name validation for Signup
    if (authMode === 'signup') {
      if (!firstName.trim()) {
        setErrorMessage('Please enter your first name.');
        return;
      }
      if (!lastName.trim()) {
        setErrorMessage('Please enter your last name.');
        return;
      }
    }

    // 2. Email format validation
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      console.log(`[StopAhead Auth] Sending Magic Link to ${trimmedEmail}...`);
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      });

      if (error) {
        console.warn('[StopAhead Magic Link Error]:', error);
        const msg = error.message || '';
        if (msg.toLowerCase().includes('rate limit') || error?.status === 429) {
          setErrorMessage('Supabase security rate limit reached. Please wait 60 seconds before requesting another email link.');
          setCooldown(60);
        } else {
          setErrorMessage(msg || 'Could not send sign-in link. Please check your email address.');
        }
      } else {
        console.log('[StopAhead Auth] Magic Link Sent Successfully!');
        setSuccessMessage(`Sign-in link sent to ${getMaskedEmail()}`);
        setStep(2);
        setCooldown(60);
      }
    } catch (err) {
      console.error('[StopAhead Auth Exception]:', err);
      setErrorMessage('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        padding: '1.25rem 0',
        color: 'var(--text-primary)'
      }}
    >
      {/* Brand Header with Official StopAhead Logo */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', maxWidth: '380px' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.4rem 1.25rem 1.25rem 1.25rem',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.3)',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 1rem auto',
            width: '100%',
            border: '1px solid var(--border-color)'
          }}
        >
          <img
            src="/logo-sa.png"
            alt="StopAhead - Never Miss Your Stop"
            style={{
              width: '100%',
              maxWidth: '240px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
          {step === 2
            ? 'Check Your Email'
            : authMode === 'signup'
            ? 'Create your StopAhead Account'
            : 'Welcome Back'}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
          {step === 2
            ? `We sent a magic sign-in link to ${getMaskedEmail()}`
            : authMode === 'signup'
            ? 'Sign up with instant magic link authentication'
            : 'Enter your email address to receive a magic sign-in link'}
        </p>
      </div>

      {/* Main Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-card)',
          borderRadius: '24px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}
      >
        {/* Step 1: Sign Up / Sign In Form */}
        {step === 1 && (
          <form onSubmit={handleSendMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Mode Switcher Tabs (Sign Up vs Sign In) */}
            <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: '12px', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: authMode === 'signup' ? 'var(--bg-card)' : 'transparent',
                  color: authMode === 'signup' ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: authMode === 'signup' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: authMode === 'login' ? 'var(--bg-card)' : 'transparent',
                  color: authMode === 'login' ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: authMode === 'login' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Sign In
              </button>
            </div>

            {/* Name Fields (First Name & Last Name) - Shown for Sign Up */}
            {authMode === 'signup' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    First Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 13 }} />
                    <input
                      type="text"
                      placeholder="Shoaib"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.75rem 0.7rem 2.3rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-surface)',
                        fontSize: '0.88rem',
                        outline: 'none',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Ahamed"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.75rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-surface)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Address Input */}
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="email"
                  placeholder="e.g. shoaib@stopahead.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* Error Feedback Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.45rem',
                  lineHeight: 1.4
                }}
              >
                <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Send Magic Link Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                background: '#025AED',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(2, 90, 237, 0.35)',
                opacity: isLoading ? 0.75 : 1,
                marginTop: '0.3rem'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Sending Magic Link...</span>
                </>
              ) : (
                <>
                  <span>Send Magic Link</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Magic Link Sent Confirmation Screen */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center', padding: '0.5rem 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(2, 90, 237, 0.1)',
                color: '#025AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              <MailCheck size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                Magic Link Dispatched!
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                We sent an instant sign-in link to <strong>{email.trim()}</strong>. Open your email inbox and tap the link to complete authentication.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Sent to: <strong>{getMaskedEmail()}</strong>
              </span>

              <button
                type="button"
                onClick={() => { setStep(1); setErrorMessage(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#025AED',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            </div>

            {/* Resend Link with Cooldown Timer */}
            <div>
              {cooldown > 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Resend magic link in <strong>{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendMagicLink}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#025AED',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Resend Magic Link</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Divider line */}
        <div style={{ height: '1px', background: '#e2e8f0', margin: '0.2rem 0' }} />

        {/* Guest Mode Action Button */}
        <button
          type="button"
          onClick={onContinueAsGuest}
          style={{
            width: '100%',
            padding: '0.65rem',
            borderRadius: '12px',
            background: 'transparent',
            color: '#64748b',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Continue as Guest
        </button>

      </div>
    </div>
  );
}
