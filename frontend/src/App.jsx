import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './Components/HomePage';
import AdminDashboard from './Components/AdminDashboard';
import ErrorBoundary from './Components/ErrorBoundary';
import Register from './Components/Register';
import PatientDashboard from './Components/PatientDashboard';
import HospitalDashboard from './Components/HospitalDashboard';
import DoctorDashboard from './Components/DoctorDashboard';
import NurseDashboard from './Components/NurseDashboard';
import LabDashboard from './Components/LabDashboard';
import PharmacyDashboard from './Components/PharmacyDashboard';
import RegisterPatient from './Components/RegisterPatient';
import AmbulanceDashboard from './Components/AmbulanceDashboard';
import AmbulanceHistory from './Components/AmbulanceHistory';
import EmergencySOS from './Components/EmergencySOS';
import BloodDonation from './Components/BloodDonation';
import EmergencyBlood from './Components/EmergencyBlood';
import FAQPage from './Components/FAQPage';
import BloodBankDashboard from './Components/BloodBankDashboard';
import OfflineGuard from './Components/common/OfflineGuard';

const ProtectedAdminRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setInstallPrompt(null);
    setShowBanner(false);
  };

  return (
    <BrowserRouter>
      {installPrompt && showBanner && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0284c7',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 10px 25px rgba(2, 132, 199, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 999999,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
            Install Medi-Swift App for offline access!
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleInstallClick}
              style={{
                backgroundColor: '#ffffff',
                color: '#0284c7',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '20px',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Install
            </button>
            <button
              onClick={() => setShowBanner(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Close
            </button>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translate(-50%, 100px); opacity: 0; }
              to { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      <OfflineGuard>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/patient-dashboard" element={<PatientDashboard />} />
          <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
          <Route path="/register-patient" element={<RegisterPatient />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          <Route path="/nurse-dashboard" element={<NurseDashboard />} />
          <Route path="/lab-dashboard" element={<ErrorBoundary><LabDashboard /></ErrorBoundary>} />
          <Route path="/pharmacy-dashboard" element={<PharmacyDashboard />} />
          <Route path="/ambulance-dashboard" element={<AmbulanceDashboard />} />
          <Route path="/ambulance-history" element={<AmbulanceHistory />} />
          <Route path="/emergency-sos" element={<EmergencySOS />} />
          <Route path="/blood-donation" element={<BloodDonation />} />
          <Route path="/emergency-blood" element={<EmergencyBlood />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/blood-bank-dashboard" element={<BloodBankDashboard />} />
          <Route path="/admin-dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
        </Routes>
      </OfflineGuard>
    </BrowserRouter>
  );
}

export default App;
