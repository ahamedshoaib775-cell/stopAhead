// AuthScreen.jsx - Supabase Authentication (Sign In & Sign Up) component
import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function AuthScreen({ onAuthSuccess, onContinueAsGuest }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotPrompt, setShowForgotPrompt] = useState(false);

  // Email format validation helper
  const isValidEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();

    // Validation checks
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please check and try again.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Supabase Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });

        if (error) {
          if (error.message.toLowerCase().includes('already registered')) {
            setErrorMessage('This email address is already registered. Switch to Sign In below.');
          } else {
            setErrorMessage(error.message || 'Failed to create account.');
          }
        } else if (data?.user) {
          setSuccessMessage('Account created successfully!');
          if (data.session) {
            onAuthSuccess(data.user, data.session);
          } else {
            setSuccessMessage('Account created! Please check your email to confirm registration or log in now.');
          }
        }
      } else {
        // Supabase Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });

        if (error) {
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Incorrect email or password. Please try again.');
          } else {
            setErrorMessage(error.message || 'Login failed. Please check your details.');
          }
        } else if (data?.user && data?.session) {
          onAuthSuccess(data.user, data.session);
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !isValidEmail(email.trim())) {
      setErrorMessage('Enter your registered email address above first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Password reset instructions sent to your email.');
        setShowForgotPrompt(false);
      }
    } catch (e) {
      setErrorMessage('Could not process password reset.');
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
        minHeight: '80vh',
        padding: '1rem 0'
      }}
    >
      {/* Brand Header with Official Full StopAhead Logo */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', maxWidth: '340px' }}>
        <div
          style={{
            background: '#ffffff',
            padding: '1.5rem 1.25rem 1.25rem 1.25rem',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 1rem auto',
            width: '100%',
            maxWidth: '280px'
          }}
        >
          <img
            src="/logo-sa.png"
            alt="StopAhead - Never Miss Your Stop"
            style={{
              width: '100%',
              maxWidth: '220px',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {isSignUp ? 'Create your personal account' : 'Sign in to access your saved transit routes'}
        </p>
      </div>

      {/* Main Auth Form Card */}
      <div
        className="quiet-card"
        style={{
          maxWidth: '400px',
          width: '100%',
          padding: '1.75rem 1.5rem',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-subtle)'
        }}
      >
        {/* Sign In / Sign Up Mode Switch Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
            marginBottom: '1.5rem',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={{
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              background: !isSignUp ? 'var(--accent)' : 'transparent',
              color: !isSignUp ? '#000' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage('');
              setSuccessMessage('');
            }}
            style={{
              padding: '0.6rem',
              borderRadius: 'var(--radius-sm)',
              background: isSignUp ? 'var(--accent)' : 'transparent',
              color: isSignUp ? '#000' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 82, 82, 0.12)',
              border: '1px solid rgba(255, 82, 82, 0.3)',
              color: '#ff5252',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.4
            }}
          >
            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.4
            }}
          >
            <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                FULL NAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
              EMAIL ADDRESS
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                PASSWORD
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setShowForgotPrompt(!showForgotPrompt)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                CONFIRM PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          {/* Submit CTA Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', opacity: isLoading ? 0.7 : 1 }}
            id="btn-auth-submit"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight size={18} style={{ marginLeft: 'auto' }} />
              </>
            )}
          </button>
        </form>

        {/* Forgot Password Actions Prompt */}
        {showForgotPrompt && !isSignUp && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 229, 255, 0.06)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>
              Send password reset link to <strong style={{ color: 'var(--text-primary)' }}>{email || 'your email'}</strong>?
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleForgotPassword}
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.8rem', width: '100%' }}
            >
              Send Reset Link
            </button>
          </div>
        )}

        {/* Continue as Guest Actions Prompt */}
        {onContinueAsGuest && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <button
              type="button"
              onClick={onContinueAsGuest}
              style={{
                background: 'rgba(2, 90, 237, 0.12)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--accent)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0.65rem 1rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
              id="btn-continue-guest"
            >
              <span>Continue as Guest (Explore Map & Transit)</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
