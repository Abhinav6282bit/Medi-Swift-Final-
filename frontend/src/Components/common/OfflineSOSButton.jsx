import React, { useState } from 'react';
import { Phone, ShieldAlert } from 'lucide-react';

const OfflineSOSButton = () => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const triggerSOS = () => {
    setLoading(true);
    setStatusMsg('Locating device...');

    if (!navigator.geolocation) {
      handleSOSFallback('Geolocation not supported by device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const smsNumber = '+916282348375';
        const messageBody = `CRITICAL SOS EMERGENCY! Location: https://maps.google.com/?q=${latitude},${longitude}`;
        
        // Construct standard SMS URI
        const smsUri = `sms:${smsNumber}?body=${encodeURIComponent(messageBody)}`;
        
        setStatusMsg('Location acquired! Triggering cellular SMS...');
        setLoading(false);
        
        // Open the native cellular SMS app
        window.location.href = smsUri;
      },
      (error) => {
        console.error('Geolocation error:', error);
        handleSOSFallback(`Location access denied/failed: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  };

  const handleSOSFallback = (reason) => {
    console.warn(`SOS Geolocation fallback triggered due to: ${reason}`);
    setStatusMsg('Location failed. Initiating Emergency Voice Call...');
    setLoading(false);
    
    // Fallback to national emergency number
    window.location.href = 'tel:112';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
      <button
        onClick={triggerSOS}
        disabled={loading}
        className="offline-sos-btn"
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          backgroundColor: '#dc2626',
          color: 'white',
          border: '8px solid rgba(220, 38, 38, 0.2)',
          boxShadow: '0 10px 25px rgba(220, 38, 38, 0.4), 0 0 0 0px rgba(220, 38, 38, 0.5)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: 'offline-pulse 2s infinite',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.backgroundColor = '#b91c1c';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = '#dc2626';
        }}
      >
        <ShieldAlert size={48} style={{ animation: 'bounce 1s infinite alternate' }} />
        <span style={{ fontWeight: '900', fontSize: '1.25rem', letterSpacing: '0.05em' }}>
          {loading ? 'LOCATING...' : 'TRIGGER SOS'}
        </span>
      </button>

      {statusMsg && (
        <p style={{
          color: '#ef4444',
          fontSize: '0.9rem',
          fontWeight: '600',
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease-in-out',
          margin: 0
        }}>
          {statusMsg}
        </p>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <a
          href="tel:112"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: '600',
            transition: 'background 0.3s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
        >
          <Phone size={14} /> Call Emergency (112)
        </a>
      </div>

      <style>{`
        @keyframes offline-pulse {
          0% {
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4), 0 0 0 0px rgba(220, 38, 38, 0.5);
          }
          70% {
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4), 0 0 0 20px rgba(220, 38, 38, 0);
          }
          100% {
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.4), 0 0 0 0px rgba(220, 38, 38, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default OfflineSOSButton;
