import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import OfflineSOSButton from './OfflineSOSButton';
import Logo from '../../assets/logo.png';
import { WifiOff, ShieldAlert, Award, FileText, Activity } from 'lucide-react';

const OfflineGuard = ({ children }) => {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999,
        overflowY: 'auto'
      }}>
        {/* Sleek Corner Decorative Blobs */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(2, 132, 199, 0.15) 0%, rgba(0,0,0,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220, 38, 38, 0.1) 0%, rgba(0,0,0,0) 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        {/* Brand Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          marginBottom: '2rem',
          zIndex: 1
        }}>
          <img
            src={Logo}
            alt="Medi-Swift"
            style={{
              height: '80px',
              width: 'auto',
              filter: 'drop-shadow(0 0 8px rgba(2, 132, 199, 0.3))'
            }}
          />
          <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.2em', color: '#38bdf8' }}>
            OFFLINE EMERGENCY PORTAL
          </span>
        </div>

        {/* Main Glassmorphic Card */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.65)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '2.5rem 2rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          zIndex: 1,
          boxSizing: 'border-box',
          textAlign: 'center'
        }}>
          {/* Header State */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <WifiOff size={28} style={{ animation: 'pulse 1.5s infinite' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>
              Connection Interrupted
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Interactive medical dashboards, AI consultation matching, WebRTC diagnostics, and live bed maps are temporarily unavailable.
            </p>
          </div>

          {/* SOS Trigger Area */}
          <div style={{
            width: '100%',
            padding: '1.5rem',
            borderRadius: '16px',
            backgroundColor: 'rgba(220, 38, 38, 0.04)',
            border: '1px dashed rgba(220, 38, 38, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171' }}>
              <ShieldAlert size={18} />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                CELLULAR DISTRESS TRIGGER
              </span>
            </div>
            <OfflineSOSButton />
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>
              Clicking the button will read device location coordinates, construct a pre-formatted medical request payload, and prompt your native SMS application.
            </p>
          </div>

          {/* Vital Guidelines / First Aid */}
          <div style={{
            width: '100%',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.5rem'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#38bdf8', letterSpacing: '0.05em' }}>
              OFFLINE VITAL GUIDELINES
            </span>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Award size={16} style={{ color: '#fbbf24', marginTop: '3px', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>Bleeding / Wounds:</strong> Apply firm, direct pressure with a clean cloth. Keep the injured limb elevated.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Activity size={16} style={{ color: '#10b981', marginTop: '3px', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>CPR Cycles:</strong> Push hard and fast in the center of the chest (100–120 compressions per minute).
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <FileText size={16} style={{ color: '#38bdf8', marginTop: '3px', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                <strong>Local Records:</strong> Your loaded profiles, prescriptions, and codes are stored offline in browser cache.
              </div>
            </div>
          </div>
        </div>

        {/* Retry / Liveness Check Indicator */}
        <p style={{
          marginTop: '1.5rem',
          fontSize: '0.8rem',
          color: '#64748b',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#64748b',
            animation: 'pulse 1s infinite'
          }} />
          Polling server connection automatically...
        </p>
      </div>
    );
  }

  return children;
};

export default OfflineGuard;
