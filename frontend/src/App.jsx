import React from 'react';
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

const ProtectedAdminRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('isAdminAuthenticated') === 'true';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
