// AuthScreen.jsx - StopAhead Email OTP Signup & Login Flow with Branded Success Animation
import React, { useState, useEffect, useRef } from 'react';
import { Mail, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, RefreshCw, Edit3 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { syncUserProfile } from '../utils/dbService';
import OtpSuccessAnimation from './OtpSuccessAnimation';

export default function AuthScreen({ onAuthSuccess, onContinueAsGuest }) {
  // Navigation & Flow state
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'login'
  const [step, setStep] = useState(1); // 1: Email & Name Form, 2: OTP Verification Screen

  // Form Input States (Email Only - Phone auth removed completely)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 OTP State (6 individual digit boxes)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  // UI Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Part 2: Success Animation & Auth Session Cache
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [authDataCache, setAuthDataCache] = useState(null);

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

  // Masking helper for privacy on Step 2 OTP Screen
  const getMaskedEmail = () => {
    const parts = email.trim().split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${parts[1]}`;
  };

  // Step 1 Submit: Validate Email & Names, then Trigger Email OTP
  const handleSendOtp = async (e) => {
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
      console.log(`[StopAhead Auth] Sending Email OTP to ${trimmedEmail}...`);
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim()
          }
        }
      });

      if (error) {
        console.warn('[StopAhead Email OTP Error]:', error);
        const msg = error.message || '';
        if (msg.toLowerCase().includes('rate limit')) {
          setErrorMessage('Too many requests. Please wait a minute before retrying.');
        } else {
          setErrorMessage(msg || 'Could not send verification code. Please check your email address.');
        }
      } else {
        console.log('[StopAhead Auth] Email OTP Code Sent Successfully!');
        setSuccessMessage(`Verification code sent to ${getMaskedEmail()}`);
        setStep(2);
        setCooldown(45);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
        }, 100);
      }
    } catch (err) {
      console.error('[StopAhead Auth Exception]:', err);
      setErrorMessage('An unexpected network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 OTP Digit Box Handlers
  const handleOtpDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance focus to next input
    if (cleanVal && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      if (otpInputRefs.current[nextFocus]) otpInputRefs.current[nextFocus].focus();
    }
  };

  // Step 2 Submit: Verify 6-digit OTP code & trigger success animation
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'email'
      });

      if (error) {
        console.warn('[StopAhead OTP Verification Error]:', error);
        if (error.message.toLowerCase().includes('expired')) {
          setErrorMessage('Verification code expired. Tap Resend Code below for a new one.');
        } else {
          setErrorMessage('Incorrect verification code. Please check and try again.');
        }
      } else if (data?.user) {
        console.log('[StopAhead Auth] OTP Verification Success! Triggering success animation...');

        // 1. Instant Green Feedback (0-0.2s)
        setIsOtpVerified(true);

        // Sync first_name, last_name, email to DB profile table
        await syncUserProfile(data.user, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim()
        });

        // Store session data to navigate after animation finishes
        setAuthDataCache({ user: data.user, session: data.session });
      }
    } catch (err) {
      console.error('[StopAhead OTP Verification Exception]:', err);
      setErrorMessage('Network error verifying code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Callback when OtpSuccessAnimation finishes (~2.5s)
  const handleAnimationComplete = () => {
    if (authDataCache && onAuthSuccess) {
      onAuthSuccess(authDataCache.user, authDataCache.session);
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
        color: '#0f172a'
      }}
    >
      {/* Full-Screen Branded Success Animation takeover on correct OTP */}
      {isOtpVerified && (
        <OtpSuccessAnimation onComplete={handleAnimationComplete} />
      )}

      {/* Brand Header with Official StopAhead Logo */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', maxWidth: '380px' }}>
        <div
          style={{
            background: '#ffffff',
            padding: '1.4rem 1.25rem 1.25rem 1.25rem',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.1)',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 1rem auto',
            width: '100%',
            border: '1px solid #e2e8f0'
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

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
          {step === 2
            ? 'Verify Verification Code'
            : authMode === 'signup'
            ? 'Create your StopAhead Account'
            : 'Welcome Back'}
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.35rem 0 0 0' }}>
          {step === 2
            ? `Enter the 6-digit code sent to ${getMaskedEmail()}`
            : authMode === 'signup'
            ? 'Sign up with Email OTP for smart proximity transit alerts'
            : 'Enter your email address to receive a 6-digit sign-in code'}
        </p>
      </div>

      {/* Main Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}
      >
        {/* Step 1: Sign Up / Sign In Email Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Mode Switcher Tabs (Sign Up vs Sign In) */}
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '0.25rem' }}>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: authMode === 'signup' ? '#ffffff' : 'transparent',
                  color: authMode === 'signup' ? '#025AED' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: authMode === 'signup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
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
                  background: authMode === 'login' ? '#ffffff' : 'transparent',
                  color: authMode === 'login' ? '#025AED' : '#64748b',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: authMode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
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
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                    First Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 13 }} />
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
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
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
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      outline: 'none',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email Address Input */}
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 14 }} />
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
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    color: '#0f172a'
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

            {/* Submit Send OTP Button */}
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
                  <span>Sending Email OTP...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: 6-Digit OTP Verification Entry Screen */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            {/* Masked Email Summary & Edit Back Button */}
            <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Code sent to
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  {getMaskedEmail()}
                </div>
              </div>

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
                <span>Edit Email</span>
              </button>
            </div>

            {/* 6 Individual Digit OTP Input Boxes with Green Success Glow on Correct Code */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem', display: 'block', textAlign: 'center' }}>
                Enter 6-Digit Verification Code
              </label>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    style={{
                      width: '46px',
                      height: '52px',
                      borderRadius: '12px',
                      border: isOtpVerified
                        ? '2px solid #10B981'
                        : digit
                        ? '2px solid #025AED'
                        : '1px solid #cbd5e1',
                      background: isOtpVerified
                        ? 'rgba(16, 185, 129, 0.15)'
                        : digit
                        ? 'rgba(2, 90, 237, 0.05)'
                        : '#ffffff',
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: isOtpVerified ? '#10B981' : '#0f172a',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: isOtpVerified ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Success Message Banner */}
            {successMessage && !isOtpVerified && (
              <div style={{ padding: '0.65rem 0.85rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#059669', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Error Message Banner */}
            {errorMessage && (
              <div style={{ padding: '0.75rem 0.9rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '0.45rem', lineHeight: 1.4 }}>
                <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Verification Button */}
            <button
              type="submit"
              disabled={isLoading || otpDigits.join('').length < 6}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '14px',
                background: '#025AED',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: isLoading || otpDigits.join('').length < 6 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(2, 90, 237, 0.35)',
                opacity: isLoading || otpDigits.join('').length < 6 ? 0.6 : 1
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Sign In</span>
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>

            {/* Resend Code with Cooldown Timer */}
            <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
              {cooldown > 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Resend code in <strong>{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#025AED',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Resend Verification Code</span>
                </button>
              )}
            </div>
          </form>
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
