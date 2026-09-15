import React, { useState, useEffect } from 'react';
import { Phone, ShieldAlert, MapPin, CheckCircle, Radio, Navigation, Edit3 } from 'lucide-react';

const OfflineSOSButton = () => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [cachedLoc, setCachedLoc] = useState(null);
  const [customLandmark, setCustomLandmark] = useState('');

  // Load saved location & landmark on mount
  useEffect(() => {
    const savedLoc = localStorage.getItem('mediswift_cached_location');
    if (savedLoc) {
      try {
        setCachedLoc(JSON.parse(savedLoc));
      } catch (e) {
        console.error('Failed to parse cached location', e);
      }
    }

    const savedLandmark = localStorage.getItem('mediswift_manual_landmark');
    if (savedLandmark) {
      setCustomLandmark(savedLandmark);
    }
  }, []);

  // Save manual landmark to localStorage
  const handleLandmarkChange = (e) => {
    const value = e.target.value;
    setCustomLandmark(value);
    localStorage.setItem('mediswift_manual_landmark', value);
  };

  // User-triggered explicit GPS Fetch (Guarantees Chrome shows permission dialog)
  const fetchGPSLocation = () => {
    setLoading(true);
    setStatusMsg('Acquiring live GPS coordinates...');

    if (!navigator.geolocation) {
      setStatusMsg('⚠️ Geolocation API unsupported by browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locData = {
          lat: latitude,
          lng: longitude,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setCachedLoc(locData);
        localStorage.setItem('mediswift_cached_location', JSON.stringify(locData));
        setStatusMsg('✅ Live GPS coordinates locked!');
        setLoading(false);
      },
      (error) => {
        console.warn('Manual GPS fetch error:', error.message);
        if (error.code === 1) {
          setStatusMsg('⚠️ Location permission is blocked in browser settings.');
        } else {
          setStatusMsg('⚠️ GPS lock failed. You can type your location landmark below.');
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const triggerSOS = () => {
    setLoading(true);
    setStatusMsg('Preparing emergency SMS...');

    const smsNumber = '+916282348375';

    // Check cached location or live state
    let lat = cachedLoc?.lat;
    let lng = cachedLoc?.lng;

    if (!lat || !lng) {
      const savedLoc = localStorage.getItem('mediswift_cached_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed && parsed.lat && parsed.lng) {
            lat = parsed.lat;
            lng = parsed.lng;
          }
        } catch (e) {
          console.error('Error parsing stored location', e);
        }
      }
    }

    let locationUrl = '';
    if (lat && lng) {
      locationUrl = `https://maps.google.com/?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
    }

    // Build rich SMS text with map link and custom landmark
    let messageBody = 'CRITICAL SOS EMERGENCY!';
    if (locationUrl) {
      messageBody += ` Location: ${locationUrl}`;
    }
    if (customLandmark.trim()) {
      messageBody += ` (Landmark: ${customLandmark.trim()})`;
    }
    if (!locationUrl && !customLandmark.trim()) {
      messageBody += ' Location unavailable. Please send help immediately!';
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const separator = isIOS ? '&' : '?';
    const smsUri = `sms:${smsNumber}${separator}body=${encodeURIComponent(messageBody)}`;

    setStatusMsg('Opening SMS app...');
    setLoading(false);

    window.location.href = smsUri;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
      
      {/* Satellite / GPS Status & Manual Fetch Button */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.9rem',
          borderRadius: '14px',
          backgroundColor: cachedLoc ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${cachedLoc ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          fontSize: '0.82rem',
          color: cachedLoc ? '#34d399' : '#fbbf24'
        }}>
          {cachedLoc ? <CheckCircle size={15} /> : <Radio size={15} style={{ animation: 'pulse 1s infinite' }} />}
          <span>
            {cachedLoc
              ? `GPS Ready: ${cachedLoc.lat.toFixed(4)}, ${cachedLoc.lng.toFixed(4)}`
              : 'GPS Coordinates Not Saved Yet'}
          </span>
        </div>

        <button
          onClick={fetchGPSLocation}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.8rem',
            backgroundColor: 'rgba(2, 132, 199, 0.2)',
            border: '1px solid rgba(2, 132, 199, 0.4)',
            borderRadius: '12px',
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <Navigation size={12} /> Click to Allow / Fetch GPS Location
        </button>
      </div>

      {/* Manual Location / Landmark Input */}
      <div style={{
        width: '100%',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        textAlign: 'left'
      }}>
        <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Edit3 size={12} /> Optional Landmark / Address:
        </label>
        <input
          type="text"
          placeholder="e.g. Near City Hospital, MG Road"
          value={customLandmark}
          onChange={handleLandmarkChange}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        />
      </div>

      {/* Big Red SOS Button */}
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
