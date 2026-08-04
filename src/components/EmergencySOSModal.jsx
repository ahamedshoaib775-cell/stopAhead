// EmergencySOSModal.jsx - Emergency SOS Trigger & Contact Configuration Modal
import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, Phone, User, Send, CheckCircle2, X } from 'lucide-react';
import { fetchEmergencyContact, saveEmergencyContact } from '../utils/dbService';

export default function EmergencySOSModal({ activeTrip, userPosition, userLocation, user, onClose }) {
  const [contact, setContact] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    fetchEmergencyContact(user?.id).then((c) => {
      if (c) {
        setContact(c);
        setContactName(c.contact_name || '');
        setContactPhone(c.phone_number || '');
      } else {
        setIsEditing(true);
      }
    });
  }, [user?.id]);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;

    const saved = await saveEmergencyContact(user?.id, { name: contactName.trim(), phone: contactPhone.trim() });
    setContact(saved);
    setIsEditing(false);
  };

  const handleTriggerSOS = () => {
    if (!contact || !contact.phone_number) return;

    const lat = userPosition?.lat || userLocation?.lat || activeTrip?.destinationStop?.lat || 13.0827;
    const lng = userPosition?.lng || userLocation?.lng || activeTrip?.destinationStop?.lng || 80.2707;
    const destName = activeTrip?.destinationStop?.name || 'Destination';
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

    const textMessage = `EMERGENCY SOS ALERT from StopAhead!\nI need assistance.\nLocation: ${googleMapsUrl}\nDestination: ${destName}\nStatus: Active Journey Tracker`;

    // 1. Try Web Share API if supported
    if (navigator.share) {
      navigator.share({
        title: 'EMERGENCY SOS ALERT - StopAhead',
        text: textMessage,
        url: googleMapsUrl
      }).catch(() => {});
    }

    // 2. Open WhatsApp / SMS link fallback
    const encodedText = encodeURIComponent(textMessage);
    const cleanPhone = contact.phone_number.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    const smsUrl = `sms:${cleanPhone}?body=${encodedText}`;

    window.open(whatsappUrl, '_blank') || (window.location.href = smsUrl);
    setSentSuccess(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(4, 9, 20, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
    >
      <div
        className="quiet-card"
        style={{
          maxWidth: '420px',
          width: '100%',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid rgba(255, 82, 82, 0.4)',
          boxShadow: '0 20px 60px rgba(255, 82, 82, 0.25)',
          padding: '1.5rem',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: '#ff5252' }}>
          <ShieldAlert size={28} />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Emergency SOS Alert</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Instant location dispatch to emergency contact
            </div>
          </div>
        </div>

        {sentSuccess ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.3rem' }}>SOS Alert Sent!</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Your live GPS coordinates and trip details were shared with <strong>{contact?.contact_name}</strong>.
            </div>
            <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
              Close SOS
            </button>
          </div>
        ) : isEditing || !contact ? (
          <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Set up your trusted emergency contact (family or friend) to enable 1-tap SOS location dispatch.
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                CONTACT NAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  placeholder="e.g. Mom / Spouse / Friend"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.65rem 0.65rem 2.3rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                PHONE / WHATSAPP NUMBER
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.65rem 0.65rem 2.3rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.3rem' }}>
              Save & Enable SOS
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 82, 82, 0.08)',
                border: '1px solid rgba(255, 82, 82, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>EMERGENCY RECIPIENT</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{contact.contact_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{contact.phone_number}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Change
              </button>
            </div>

            <button
              type="button"
              onClick={handleTriggerSOS}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: '#ff5252',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(255, 82, 82, 0.4)'
              }}
              id="btn-trigger-sos-now"
            >
              <Send size={20} />
              <span>DISPATCH SOS NOW</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
