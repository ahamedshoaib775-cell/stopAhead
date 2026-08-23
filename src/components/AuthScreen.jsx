// AuthScreen.jsx - StopAhead Full Signup & Login Flow with Supabase OTP Verification
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, RefreshCw, ChevronDown, Edit3 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { syncUserProfile } from '../utils/dbService';

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India (+91)' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States / Canada (+1)' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom (+44)' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates (+971)' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore (+65)' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia (+61)' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia (+60)' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany (+49)' }
];

export default function AuthScreen({ onAuthSuccess, onContinueAsGuest }) {
  // Navigation & Flow state
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'login'
  const [step, setStep] = useState(1); // 1: Input Form, 2: OTP Verification Screen
  const [method, setMethod] = useState('email'); // 'email' | 'phone'

  // Step 1 Input States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2 OTP State (6 individual digit boxes)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  // UI Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Resend Cooldown Timer
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

  // Format validation helpers
  const isValidEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
  const isValidPhone = (str) => /^\d{7,14}$/.test(str.trim().replace(/\D/g, ''));

  // Formatted E.164 phone string
  const fullPhone = `${countryCode}${phoneNumber.trim().replace(/\D/g, '')}`;

  // Masking helper for privacy on Step 2 OTP Screen
  const getMaskedIdentifier = () => {
    if (method === 'email') {
      const parts = email.trim().split('@');
      if (parts.length !== 2) return email;
      const name = parts[0];
      const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
      return `${maskedName}@${parts[1]}`;
    } else {
      const digits = phoneNumber.trim().replace(/\D/g, '');
      if (digits.length >= 4) {
        const last3 = digits.slice(-3);
        return `${countryCode} 9xxxx xx${last3}`;
      }
      return fullPhone;
    }
  };

  // Step 1 Submit: Validate inputs & Send OTP via Supabase Auth
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

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

    // 2. Method-specific format validation
    if (method === 'email') {
      if (!email.trim() || !isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
    } else {
      if (!phoneNumber.trim() || !isValidPhone(phoneNumber)) {
        setErrorMessage('Please enter a valid phone number (e.g. 10 digits for India).');
        return;
      }
    }

    setIsLoading(true);

    try {
      let result;

      if (method === 'email') {
        const userEmail = email.trim();
        console.log(`[StopAhead Auth] Triggering Email OTP for ${userEmail}...`);
        result = await supabase.auth.signInWithOtp({
          email: userEmail,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim()
            }
          }
        });
      } else {
        console.log(`[StopAhead Auth] Triggering SMS OTP for ${fullPhone}...`);
        result = await supabase.auth.signInWithOtp({
          phone: fullPhone,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim()
            }
          }
        });
      }

      const { error } = result || {};

      if (error) {
        console.warn('[StopAhead Auth Error]:', error);
        const msg = error.message || '';

        // Graceful fallback notice if phone SMS provider is not configured in Supabase dashboard
        if (method === 'phone' && (msg.includes('Unsupported phone provider') || msg.includes('SMS provider') || msg.includes('Provider not found') || msg.includes('disabled'))) {
          setErrorMessage('Phone verification is temporarily unavailable on this server — please try email instead.');
        } else if (msg.toLowerCase().includes('rate limit')) {
          setErrorMessage('Too many OTP requests. Please wait a minute before retrying.');
        } else {
          setErrorMessage(msg || 'Could not send verification code. Please check your details.');
        }
      } else {
        console.log('[StopAhead Auth] OTP Code Sent Successfully!');
        setSuccessMessage(`Verification code sent to ${getMaskedIdentifier()}`);
        setStep(2);
        setCooldown(45);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
        }, 100);
      }
    } catch (err) {
      console.error('[StopAhead Auth Exception]:', err);
      if (method === 'phone') {
        setErrorMessage('Phone verification is temporarily unavailable — please try email instead.');
      } else {
        setErrorMessage('An unexpected network error occurred. Please try again.');
      }
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

  // Step 2 Submit: Verify 6-digit OTP code
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
      let result;
      if (method === 'email') {
        result = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode,
          type: 'email'
        });
      } else {
        result = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: otpCode,
          type: 'sms'
        });
      }

      const { data, error } = result || {};

      if (error) {
        console.warn('[StopAhead OTP Verification Error]:', error);
        if (error.message.toLowerCase().includes('expired')) {
          setErrorMessage('Verification code expired. Tap Resend Code below for a new one.');
        } else {
          setErrorMessage('Incorrect verification code. Please check and try again.');
        }
      } else if (data?.user) {
        console.log('[StopAhead Auth] Verification Success! Syncing profile...');
        setSuccessMessage('Account verified successfully!');

        // Sync first_name, last_name, email, phone to DB profile table
        await syncUserProfile(data.user, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: method === 'phone' ? fullPhone : null
        });

        if (onAuthSuccess) {
          onAuthSuccess(data.user, data.session);
        }
      }
    } catch (err) {
      console.error('[StopAhead OTP Verification Exception]:', err);
      setErrorMessage('Network error verifying code. Please try again.');
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
        color: '#0f172a'
      }}
    >
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
            ? `Enter the 6-digit code sent to ${getMaskedIdentifier()}`
            : authMode === 'signup'
            ? 'Sign up with OTP verification for smart proximity transit alerts'
            : 'Enter your email or phone to receive a 6-digit sign-in code'}
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
        {/* Step 1: Sign Up / Sign In Form */}
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

            {/* Method Choice Selector: Email vs Phone */}
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                Verification Method
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setMethod('email'); setErrorMessage(''); }}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '12px',
                    border: method === 'email' ? '2px solid #025AED' : '1px solid #cbd5e1',
                    background: method === 'email' ? 'rgba(2, 90, 237, 0.06)' : '#ffffff',
                    color: method === 'email' ? '#025AED' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Mail size={15} />
                  <span>Email OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMethod('phone'); setErrorMessage(''); }}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '12px',
                    border: method === 'phone' ? '2px solid #025AED' : '1px solid #cbd5e1',
                    background: method === 'phone' ? 'rgba(2, 90, 237, 0.06)' : '#ffffff',
                    color: method === 'phone' ? '#025AED' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Phone size={15} />
                  <span>Phone OTP</span>
                </button>
              </div>
            </div>

            {/* Single Input Field based on selected method */}
            {method === 'email' ? (
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
            ) : (
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155', marginBottom: '0.35rem', display: 'block' }}>
                  Phone Number *
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      background: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <div style={{ position: 'relative', flex: 1 }}>
                    <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 14 }} />
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
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
              </div>
            )}

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
                  <span>Sending OTP Code...</span>
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
            
            {/* Masked Method Summary & Edit Back Button */}
            <div style={{ background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Code sent to
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                  {getMaskedIdentifier()}
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
                <span>Edit</span>
              </button>
            </div>

            {/* 6 Individual Digit OTP Input Boxes */}
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
                      border: digit ? '2px solid #025AED' : '1px solid #cbd5e1',
                      background: digit ? 'rgba(2, 90, 237, 0.05)' : '#ffffff',
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Success Message Banner */}
            {successMessage && (
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
