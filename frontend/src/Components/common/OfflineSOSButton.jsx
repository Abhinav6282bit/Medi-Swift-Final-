import React, { useState, useEffect } from 'react';
import { Phone, ShieldAlert, MapPin, CheckCircle } from 'lucide-react';

const OfflineSOSButton = () => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [cachedLoc, setCachedLoc] = useState(null);

  // Pre-fetch and cache location when component mounts (or while online)
  useEffect(() => {
    // Check if location is already saved in localStorage
    const savedLoc = localStorage.getItem('mediswift_cached_location');
    if (savedLoc) {
      try {
        setCachedLoc(JSON.parse(savedLoc));
      } catch (e) {
        console.error('Failed to parse cached location', e);
      }
    }

    if (navigator.geolocation) {
      const updateLocationCache = (position) => {
        const locData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setCachedLoc(locData);
        localStorage.setItem('mediswift_cached_location', JSON.stringify(locData));
      };

      // Try quick low-accuracy pre-fetch to store in localStorage
      navigator.geolocation.getCurrentPosition(
        updateLocationCache,
        (err) => console.log('Location pre-fetch notice:', err.message),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    }
  }, []);

  const triggerSOS = () => {
    setLoading(true);
    setStatusMsg('Acquiring location coordinates...');

    const smsNumber = '+916282348375';

    const sendSMS = (lat, lng, sourceLabel = '') => {
      let locationUrl = '';
      if (lat && lng) {
        locationUrl = `https://maps.google.com/?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
      }

      const messageBody = locationUrl
        ? `CRITICAL SOS EMERGENCY! Location: ${locationUrl}${sourceLabel ? ` (${sourceLabel})` : ''}`
        : `CRITICAL SOS EMERGENCY! Location unavailable. Please send help immediately!`;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const separator = isIOS ? '&' : '?';
      const smsUri = `sms:${smsNumber}${separator}body=${encodeURIComponent(messageBody)}`;

      setStatusMsg('Opening SMS app...');
      setLoading(false);

      window.location.href = smsUri;
    };

    if (!navigator.geolocation) {
      // Use cached location if geolocation API is unsupported
      if (cachedLoc && cachedLoc.lat && cachedLoc.lng) {
        sendSMS(cachedLoc.lat, cachedLoc.lng, 'Cached');
      } else {
        sendSMS();
      }
      return;
    }

    // Step 1: Try live GPS lookup (fast 4s timeout)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Save new fresh location
        const locData = {
          lat: latitude,
          lng: longitude,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setCachedLoc(locData);
        localStorage.setItem('mediswift_cached_location', JSON.stringify(locData));
        sendSMS(latitude, longitude, 'Live GPS');
      },
      (error) => {
        console.warn('Live GPS failed, checking cached position:', error.message);
        
        // Step 2: Fall back to localStorage cached location if Airplane mode blocked live GPS
        const savedLoc = localStorage.getItem('mediswift_cached_location');
        if (savedLoc) {
          try {
            const parsed = JSON.parse(savedLoc);
            if (parsed.lat && parsed.lng) {
              setStatusMsg('Using last known cached position...');
              sendSMS(parsed.lat, parsed.lng, `Last Known ${parsed.time || ''}`);
              return;
            }
          } catch (e) {
            console.error('Error parsing stored location', e);
          }
        }

        if (error.code === 1) {
          setStatusMsg('⚠️ Location permission is blocked in site settings.');
        } else {
          setStatusMsg('⚠️ Device GPS unavailable. Please enable Location/GPS on your phone.');
        }

        // Final fallback: send SMS without coordinates
        sendSMS();
      },
      {
        enableHighAccuracy: false, // Low accuracy works faster when offline
        timeout: 4000,
        maximumAge: 300000 // 5 min cache allowance
      }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
      
      {/* Location Status Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '12px',
        backgroundColor: cachedLoc ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        border: `1px solid ${cachedLoc ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        fontSize: '0.8rem',
        color: cachedLoc ? '#34d399' : '#f87171'
      }}>
        {cachedLoc ? <CheckCircle size={14} /> : <MapPin size={14} />}
        <span>
          {cachedLoc
            ? `Location Ready: ${cachedLoc.lat.toFixed(4)}, ${cachedLoc.lng.toFixed(4)}`
            : 'Acquiring GPS location...'}
        </span>
      </div>

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
          fontSize: '0.85rem',
          fontWeight: '600',
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease-in-out',
          margin: 0,
          maxWidth: '320px'
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
