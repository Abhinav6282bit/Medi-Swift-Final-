import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import {
  AppBar, Box, Toolbar, Typography, Container, Button, Grid, Card, CardContent, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, ListItemButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Divider, CircularProgress, Chip, Avatar, Badge, Popover, ListItemAvatar
} from '@mui/material';
import { Menu as MenuIcon, Dashboard as DashboardIcon, History as HistoryIcon, Person as PersonIcon, Logout as LogoutIcon, Bloodtype as BloodtypeIcon, AddCircleOutline as AddIcon, Science as ScienceIcon, Medication as MedicationIcon, Download as DownloadIcon, LocalPharmacy as PharmacyIcon, ArrowBack as BackIcon, LocalHospital as HospitalIcon, Notifications as NotificationsIcon, EventAvailable as EventIcon, CheckCircle as CheckCircleIcon, Assignment as ReportIcon, CalendarMonth as CalendarIcon, Print as PrintIcon, Close as CloseIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [patientData, setPatientData] = useState({ name: '', mediId: '' });
  const [aptOpen, setAptOpen] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split('T')[0],
    hospitalId: '', hospitalName: '', doctorId: '', doctorName: '', speciality: '',
    step: 0, symptoms: '', aiResult: null, matchedDoctors: []
  });
  // Initialize from LocalStorage if available
  const [virtualToken, setVirtualToken] = useState(() => {
    const saved = localStorage.getItem('activeToken');
    return saved ? JSON.parse(saved) : null;
  });
  const [pharmacyOpen, setPharmacyOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [pharmacyStatus, setPharmacyStatus] = useState('Idle');
  const [orderData, setOrderData] = useState({
    available: [],
    orderId12: '',
    hospitalName: '',
    paymentStatus: 'Unpaid',
    _id: ''
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [fullPatientData, setFullPatientData] = useState(null);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [liveQueue, setLiveQueue] = useState({ currentToken: 0 });
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Blood Donor Hub State
  const [isRegisteredDonor, setIsRegisteredDonor] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [donorHubOpen, setDonorHubOpen] = useState(false);
  const [outgoingHubOpen, setOutgoingHubOpen] = useState(false);

  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastKnownToken = React.useRef(0);

  // Sync to LocalStorage
  useEffect(() => {
    if (virtualToken) {
      localStorage.setItem('activeToken', JSON.stringify(virtualToken));
    } else {
      localStorage.removeItem('activeToken');
    }
  }, [virtualToken]);

  // Restore Active Session (Verify from Backend)
  useEffect(() => {
    const fetchActiveApt = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser && storedUser.mediId) {
        try {
          console.log("Restoring session for:", storedUser.mediId);
          const res = await axios.get(`${API_BASE_URL}/api/patient-active-appointment/${storedUser.mediId}`);
          if (res.data.success && res.data.appointment) {
            console.log("Session restored:", res.data.appointment);
            setVirtualToken(res.data.appointment);
          } else {
            // If backend says no active session, clear local state
            setVirtualToken(null);
          }
        } catch (err) { console.error("Session restore error", err); }
      }
    };
    fetchActiveApt();
  }, []);

  // --- BACKEND NOTIFICATION POLLING ---
  useEffect(() => {
    if (!patientData.mediId) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/patient/notifications/${patientData.mediId}`);
        if (res.data.success) {
          // Map backend notifications to the display format
          const backendNotifs = res.data.notifications.map(n => ({
            msg: n.message,
            title: n.title,
            type: n.type,
            time: new Date(n.createdAt),
            read: n.read,
            _id: n._id,
            metadata: n.metadata,
            source: 'backend'
          }));
          // Merge with client-side queue notifications (which have source: 'client')
          setNotifications(prev => {
            const clientNotifs = prev.filter(n => n.source === 'client');
            // Deduplicate backend IDs, then merge
            const merged = [...clientNotifs, ...backendNotifs];
            merged.sort((a, b) => b.time - a.time);
            return merged;
          });
          // Unread count = backend unread + client-side (all unread)
          const clientUnread = notifications.filter(n => n.source === 'client' && !n.read).length;
          setUnreadCount(res.data.unreadCount + clientUnread);
        }
      } catch (err) {
        console.error('Notification fetch error:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [patientData.mediId]);

  // Poll for Live Queue Status
  useEffect(() => {
    let interval;
    if (virtualToken?.doctorId && virtualToken?.date) {
      const fetchQueue = async () => {
        try {
          // Verify if appointment is for today to show live status
          const today = new Date().toISOString().split('T')[0];
          const aptDate = new Date(virtualToken.date).toISOString().split('T')[0];

          if (aptDate === today) {
            const res = await axios.get(`${API_BASE_URL}/api/doctor-live-status/${virtualToken.doctorId}`);

            const newCurrentToken = res.data.currentToken;
            if (newCurrentToken > 0 && newCurrentToken !== lastKnownToken.current) {
              if (newCurrentToken === Number(virtualToken.token)) {
                setNotifications(prev => [{ msg: `Your token #${newCurrentToken} is now being served!`, title: 'Your Turn!', type: 'queue', time: new Date(), source: 'client', read: false }, ...prev]);
                setUnreadCount(prev => prev + 1);
              } else if (newCurrentToken === Number(virtualToken.token) - 1) {
                setNotifications(prev => [{ msg: `Be ready! The Doctor is serving Token #${newCurrentToken}. You are next!`, title: 'Get Ready', type: 'queue', time: new Date(), source: 'client', read: false }, ...prev]);
                setUnreadCount(prev => prev + 1);
              }
              lastKnownToken.current = newCurrentToken;
            }

            setLiveQueue(res.data);
          }
        } catch (err) { console.error("Queue sync error", err); }
      };

      fetchQueue(); // Initial call
      interval = setInterval(fetchQueue, 30000); // Poll every 30s
    }
    return () => clearInterval(interval);
  }, [virtualToken]);


  // Fetch Blood Donor Request Status (Incoming for donors, Outgoing for requesters)
  useEffect(() => {
    let interval;
    const fetchBloodHubData = async () => {
      if (!patientData.mediId) return;

      try {
        // Fetch outgoing requests (requests this patient sent to others)
        const outRes = await axios.get(`${API_BASE_URL}/api/blood-request/outgoing/${patientData.mediId}`);
        if (outRes.data.success) {
          setOutgoingRequests(outRes.data.requests);

          // Generate notifications for outgoing request status changes
          const bloodNotifs = [];
          outRes.data.requests.forEach(req => {
            if (req.status === 'Accepted') {
              bloodNotifs.push({
                msg: `Your blood request (${req.bloodGroup}) at ${req.hospitalName} has been ACCEPTED! Token: ${req.tokenNumber}`,
                title: '🩸 Blood Request Accepted!',
                type: 'blood_accepted',
                time: new Date(req.requestDate),
                read: false,
                source: 'blood',
                _id: req._id
              });
            } else if (req.status === 'Rejected') {
              bloodNotifs.push({
                msg: `Your blood request (${req.bloodGroup}) at ${req.hospitalName} was declined by the donor.`,
                title: '🩸 Blood Request Declined',
                type: 'blood_rejected',
                time: new Date(req.requestDate),
                read: false,
                source: 'blood',
                _id: req._id
              });
            }
          });

          // Merge blood notifications into state
          if (bloodNotifs.length > 0) {
            setNotifications(prev => {
              const existingIds = new Set(prev.filter(n => n.source === 'blood').map(n => n._id));
              const newOnes = bloodNotifs.filter(n => !existingIds.has(n._id));
              if (newOnes.length === 0) return prev;
              const merged = [...newOnes, ...prev];
              merged.sort((a, b) => b.time - a.time);
              return merged;
            });
            setUnreadCount(prev => prev + bloodNotifs.filter(n => {
              // Only count truly new ones
              return true;
            }).length > 0 ? 1 : 0);
          }
        }
      } catch (err) {
        console.error("Error fetching outgoing requests", err);
      }

      try {
        // Fetch donor registration status
        const statusRes = await axios.get(`${API_BASE_URL}/api/blood-donation/status/${patientData.mediId}`);
        if (statusRes.data.registered) {
          setIsRegisteredDonor(true);
          // If registered, fetch incoming requests
          const inRes = await axios.get(`${API_BASE_URL}/api/blood-request/incoming/${patientData.mediId}`);
          if (inRes.data.success) {
            setIncomingRequests(inRes.data.requests);

            // Generate notifications for incoming (pending) blood requests
            const pendingRequests = inRes.data.requests.filter(r => r.status === 'Pending');
            if (pendingRequests.length > 0) {
              const incomingNotifs = pendingRequests.map(req => ({
                msg: `Emergency blood request (${req.bloodGroup}) from ${req.requesterName} at ${req.hospitalName}. Please respond!`,
                title: '🚨 Blood Donation Request!',
                type: 'blood_incoming',
                time: new Date(req.requestDate),
                read: false,
                source: 'blood',
                _id: req._id
              }));

              setNotifications(prev => {
                const existingIds = new Set(prev.filter(n => n.source === 'blood').map(n => n._id));
                const newOnes = incomingNotifs.filter(n => !existingIds.has(n._id));
                if (newOnes.length === 0) return prev;
                const merged = [...newOnes, ...prev];
                merged.sort((a, b) => b.time - a.time);
                return merged;
              });
              setUnreadCount(prev => prev + incomingNotifs.length);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching blood hub data", err);
      }
    };

    fetchBloodHubData();
    interval = setInterval(fetchBloodHubData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [patientData.mediId]);

  const fetchHistory = async () => {
    const session = JSON.parse(localStorage.getItem('user'));
    const pId = session?.mediId || session?.userData?.mediId;
    if (!pId) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/patient-history/${pId}`);
      setMedicalHistory(res.data);
    } catch (err) {
      console.error("History fetch failed", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedUser) {
      const data = savedUser.userData || savedUser;
      setPatientData({
        name: `${data.firstName || ''} ${data.lastName || ''}`,
        mediId: savedUser.mediId || data.mediId,
        photoUrl: data.photoUrl
      });
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchActivePrescriptions = async () => {
      if (!patientData.mediId) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/get-patient-prescriptions/${patientData.mediId}`);
        const readyOrder = res.data.find(p => p.status === 'Ready for Pickup' || p.status === 'Preparing');

        if (readyOrder) {
          const status = readyOrder.status;
          setPharmacyStatus(status === 'Preparing' ? 'Preparing' : 'Ready');
          setOrderData({
            _id: readyOrder._id,
            orderId12: readyOrder.verificationCode || '',
            available: Array.isArray(readyOrder.medicines) ? readyOrder.medicines : [readyOrder.medicines],
            hospitalName: readyOrder.hospitalName || "Selected Hospital",
            paymentStatus: readyOrder.isPaid ? 'Paid' : (readyOrder.paymentMethod ? 'Awaiting Confirmation' : 'Unpaid'),
            verificationCode: readyOrder.verificationCode || '',
            fullStatus: status
          });
          setPharmacyOpen(true);
        } else {
          setPharmacyStatus('Idle');
          setPharmacyOpen(false); // Close dialog if no active order
        }
      } catch (err) {
        console.error("Pharmacy sync error", err);
      }
    };

    if (patientData.mediId) {
      fetchActivePrescriptions();
      const interval = setInterval(fetchActivePrescriptions, 15000);
      return () => clearInterval(interval);
    }
  }, [patientData.mediId]);

  // Fetch Blood Donor Status & Requests
  useEffect(() => {
    const fetchDonorInfo = async () => {
      if (!patientData.mediId) return;
      try {
        // Check if registered
        const statusRes = await axios.get(`${API_BASE_URL}/api/blood-donation/status/${patientData.mediId}`);
        if (statusRes.data.success && statusRes.data.registered) {
          setIsRegisteredDonor(true);

          // Fetch incoming requests
          const reqRes = await axios.get(`${API_BASE_URL}/api/blood-request/incoming/${patientData.mediId}`);
          if (reqRes.data.success) {
            setIncomingRequests(reqRes.data.requests);
            // Add notification if there are pending requests
            const pendingCount = reqRes.data.requests.filter(r => r.status === 'Pending').length;
            if (pendingCount > 0) {
              setNotifications(prev => {
                const existing = prev.find(n => n.type === 'blood_request');
                if (!existing) {
                  return [{ msg: `You have ${pendingCount} pending urgent blood request(s).`, title: 'Urgent Blood Request', type: 'blood_request', time: new Date(), source: 'client', read: false }, ...prev];
                }
                return prev;
              });
              setUnreadCount(prev => prev + (prev > 0 ? 0 : 1)); // Simplified approach
            }
          }
        }
      } catch (err) {
        console.error("Error fetching donor info:", err);
      }
    };

    fetchDonorInfo();
    const interval = setInterval(fetchDonorInfo, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [patientData.mediId]);

  const handleConfirmPayment = async (method) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/patient/confirm-payment-intent`, {
        orderId: orderData._id,
        method: method
      });
      if (res.data.success) {
        // Update local state with the returned code and new status
        setOrderData({
          ...orderData,
          paymentStatus: method === 'Online' ? 'Paid' : 'Awaiting Confirmation',
          verificationCode: res.data.appointment.verificationCode
        });
      }
    } catch (err) {
      alert("Payment selection failed: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    try {
      const encodedId = encodeURIComponent(patientData.mediId);
      const pName = patientData.name || "";
      const encodedName = encodeURIComponent(pName);
      const res = await axios.get(`${API_BASE_URL}/api/patient-history/${encodedId}?name=${encodedName}`);
      setMedicalHistory(res.data);
    } catch (err) {
      console.error("Error fetching medical history", err);
    }
  };

  const handleUpdateRequestStatus = async (requestId, newStatus) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/blood-request/update/${requestId}`, { status: newStatus });
      if (res.data.success) {
        // Refresh requests locally
        setIncomingRequests(prev => prev.map(req => req._id === requestId ? { ...req, status: newStatus, tokenNumber: res.data.request.tokenNumber } : req));
      }
    } catch (err) {
      alert("Failed to update request status.");
    }
  };

  const handleOpenProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/search-patient/${patientData.mediId}`);
      if (res.data.success) {
        setFullPatientData(res.data.patient);
        setProfileOpen(true);
      }
    } catch (err) {
      console.error("Error fetching profile", err);
      alert("Failed to load profile data.");
    }
  };

  const handleDownloadReport = (record) => {
    setSelectedReport(record);
    setReportOpen(true);
  };
  const handleOpenApt = async () => {
    setAptOpen(true);
    setVirtualToken(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get-all-hospitals`);
      setHospitals(res.data);
    } catch (err) { console.error("Error fetching hospitals"); }
  };

  const handleAutomaticBooking = async (notif) => {
    const { metadata } = notif;
    if (!metadata) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/book-appointment`, {
        patientId: patientData.mediId,
        patientName: patientData.name,
        hospitalId: metadata.hospitalId || '', // metadata should have this
        hospitalName: metadata.hospitalName,
        doctorId: metadata.doctorId,
        doctorName: metadata.doctorName,
        date: metadata.date,
        speciality: 'Follow-up'
      });

      if (res.data.success) {
        setVirtualToken(res.data.appointment);
        alert(`Appointment booked automatically with Dr. ${metadata.doctorName} for ${new Date(metadata.date).toLocaleDateString()}`);
        handleDeleteNotification(notif._id);
        handleNotificationClose();
      }
    } catch (err) {
      console.error("Auto-booking failed", err);
      alert("Automatic booking failed. Please try manual booking.");
    }
  };

  const handleDeleteNotification = async (notifId) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/notifications/${notifId}`);
      setNotifications(prev => prev.filter(n => n._id !== notifId));
    } catch (err) {
      console.error("Delete notification failed", err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!window.confirm("Clear all notifications?")) return;
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/notifications/clear-all/${patientData.mediId}`);
      if (res.data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Clear notifications failed", err);
    }
  };

  const handleHospitalChange = async (hId, hName) => {
    setBookingData({ ...bookingData, hospitalId: hId, hospitalName: hName, doctorId: '', doctorName: '' });
    try {
      const res = await axios.get(`${API_BASE_URL}/api/hospital-staff?role=DOCTOR&hospitalMediId=${hId}`);
      setDoctors(res.data);
    } catch (err) { console.error("Error fetching doctors"); }
  };

  const handleFinalSubmit = async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/book-appointment`, {
        ...bookingData,
        patientId: patientData.mediId,
        patientName: patientData.name
      });
      if (res.data.success) setVirtualToken(res.data.appointment);
    } catch (err) { alert("Booking failed."); }
  };

  const toggleDrawer = (newOpen) => () => setOpen(newOpen);
  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const handleNotificationClick = async (event) => {
    setNotificationAnchor(event.currentTarget);
    setUnreadCount(0); // Mark as read locally
    // Mark as read on backend
    if (patientData.mediId) {
      try {
        await axios.put(`${API_BASE_URL}/api/patient/notifications/mark-read/${patientData.mediId}`);
        // Also mark client-side notifications as read
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } catch (err) {
        console.error('Mark-read error:', err);
      }
    }
  };
  const handleNotificationClose = () => setNotificationAnchor(null);
  const openNotification = Boolean(notificationAnchor);

  // Helper: notification icon by type
  const getNotifIcon = (type) => {
    switch (type) {
      case 'appointment_booked': return <EventIcon sx={{ color: '#2196f3' }} />;
      case 'session_completed': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'lab_update': return <ScienceIcon sx={{ color: '#9c27b0' }} />;
      case 'pharmacy_preparing': return <PharmacyIcon sx={{ color: '#ff9800' }} />;
      case 'pharmacy_ready': return <PharmacyIcon sx={{ color: '#4caf50' }} />;
      case 'queue': return <HospitalIcon sx={{ color: '#f44336' }} />;
      case 'blood_request': return <BloodtypeIcon sx={{ color: '#e11d48' }} />;
      default: return <NotificationsIcon sx={{ color: '#607d8b' }} />;
    }
  };

  // Helper: time ago formatting
  const timeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const sanitizeLabResult = (text) => {
    if (!text) return '';
    return text.replace(/\s*\(Ref:.*?\)\s*/g, '').trim();
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/patient-dashboard' },
    { text: 'Blood Donation', icon: <BloodtypeIcon />, path: '/blood-donation' },
    { text: 'Medical History', icon: <HistoryIcon />, onClick: handleOpenHistory },
    { text: 'My Profile', icon: <PersonIcon />, onClick: handleOpenProfile },
  ];

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#0d0f1e',
      background: 'linear-gradient(135deg, #0d0f1e 0%, #101828 35%, #0f1b30 65%, #0b1220 100%)',
      pb: 10
    }}>
      <AppBar position="sticky" sx={{
        bgcolor: 'rgba(13, 15, 30, 0.8)',
        backdropFilter: 'blur(20px)',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: (theme) => theme.zIndex.drawer + 1
      }}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: { xs: 0.5, sm: 0 }, px: { xs: 1, sm: 3 } }}>
          <IconButton size="large" edge="start" color="inherit" sx={{ mr: { xs: 0.5, sm: 2 } }} onClick={toggleDrawer(true)}><MenuIcon /></IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: '900', letterSpacing: -0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>Medi-Swift</Typography>
          <Box sx={{ display: { xs: 'none', md: 'block' }, mr: 3 }}>
            <Typography variant="caption" sx={{
              border: '1px solid rgba(255,255,255,0.1)',
              px: 2, py: 1, borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.03)',
              fontWeight: 700,
              color: '#94a3b8'
            }}>
              Patient ID: <strong style={{ color: 'white' }}>{patientData.mediId}</strong>
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="error"
            onClick={() => navigate('/emergency-sos')}
            sx={{
              mr: { xs: 0.5, sm: 2 },
              fontWeight: 900,
              borderRadius: '12px',
              px: { xs: 1.5, sm: 3 },
              minWidth: { xs: 'auto', sm: 'auto' },
              fontSize: { xs: '0.65rem', sm: '0.875rem' },
              animation: 'pulse 2s infinite',
              bgcolor: '#ef4444',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)',
              '&:hover': { bgcolor: '#dc2626' }
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>EMERGENCY </Box>SOS
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/emergency-blood')}
            sx={{
              mr: { xs: 0.5, sm: 3 }, fontWeight: 900, borderRadius: '12px', px: { xs: 1.5, sm: 3 },
              fontSize: { xs: '0.65rem', sm: '0.875rem' },
              animation: 'pulse-blood 2.5s infinite',
              bgcolor: '#e11d48',
              boxShadow: '0 0 15px rgba(225, 29, 72, 0.4)',
              '&:hover': { bgcolor: '#be123c' }
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>EMERGENCY </Box>BLOOD
          </Button>
          <IconButton color="inherit" onClick={handleNotificationClick} sx={{ mr: { xs: 0, sm: 2 } }}>
            <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 900 } }}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout} sx={{ display: { xs: 'flex', sm: 'none' } }}><LogoutIcon /></IconButton>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />} sx={{ fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}>Logout</Button>
        </Toolbar>
      </AppBar>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(211, 47, 47, 0); }
          100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
        }
        @keyframes pulse-blood {
          0% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); }
          100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }
      `}</style>

      <Popover
        open={openNotification}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: { xs: '90vw', sm: 380 },
            maxHeight: 500,
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            color: 'white',
            backgroundImage: 'none'
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.5 }}>Notifications</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {notifications.length > 0 && (
                <Button size="small" onClick={handleClearAllNotifications} sx={{ color: '#ef4444', fontWeight: 800, p: 0, minWidth: 'auto', '&:hover': { background: 'none', textDecoration: 'underline' } }}>
                  Clear All
                </Button>
              )}
              <Chip label={`${notifications.length}`} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 900 }} />
            </Stack>
          </Box>
          {notifications.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.05)', mb: 2 }} />
              <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>No notifications yet</Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto', py: 0, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3 } }}>
              {notifications.map((notif, idx) => (
                <Box key={notif._id || idx} sx={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: notif.read ? 'transparent' : 'rgba(99,102,241,0.05)', transition: '0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                  <IconButton
                    onClick={() => handleDeleteNotification(notif._id)}
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 12,
                      color: 'rgba(255,255,255,0.2)',
                      '&:hover': { color: '#ef4444' },
                      zIndex: 1
                    }}
                    size="small"
                  >
                    <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </IconButton>
                  <ListItem
                    alignItems="flex-start"
                    sx={{ px: 2, pt: 2, pb: 1.5 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 48, mt: 0.5 }}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getNotifIcon(notif.type)}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: notif.read ? 700 : 900, color: 'white', lineHeight: 1.3, pr: 3 }}>
                          {notif.title || 'Notification'}
                        </Typography>
                      }
                      secondary={
                        <Stack spacing={1} sx={{ mt: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.5, fontWeight: 500 }}>{notif.msg}</Typography>

                          {notif.type === 'pre_booking_request' && (
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Button
                                variant="contained" size="small"
                                onClick={() => handleAutomaticBooking(notif)}
                                sx={{ bgcolor: '#6366f1', fontSize: '0.7rem', fontWeight: 700, borderRadius: 2 }}
                              >
                                Proceed
                              </Button>
                              <Button
                                variant="outlined" size="small"
                                onClick={handleNotificationClose}
                                sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', fontSize: '0.7rem', fontWeight: 700, borderRadius: 2 }}
                              >
                                Remind me later
                              </Button>
                            </Stack>
                          )}

                          {notif.type === 'bed_allocated' && (
                            <Button
                              variant="contained" size="small" fullWidth
                              onClick={handleNotificationClose}
                              sx={{ bgcolor: '#10b981', mt: 1, fontSize: '0.7rem', fontWeight: 700, borderRadius: 2 }}
                            >
                              Ok, Got it
                            </Button>
                          )}

                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, mt: 0.5 }}>{timeAgo(notif.time).toUpperCase()}</Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Popover>

      <Drawer open={open} onClose={toggleDrawer(false)}>
        <Box sx={{
          width: 300,
          background: 'linear-gradient(180deg, #0b1437 0%, #080d2b 100%)',
          height: '100%',
          color: 'white',
          borderRight: '1px solid rgba(255,255,255,0.05)'
        }} role="presentation" onClick={toggleDrawer(false)}>
          <Box sx={{
            p: 4,
            pt: 12, // Added top padding so it doesn't hide behind the sticky AppBar
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
            mb: 2,
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Avatar
              src={patientData.photoUrl ? `${API_BASE_URL}/${patientData.photoUrl}` : ''}
              sx={{ width: 64, height: 64, mb: 2, bgcolor: '#4318ff', fontWeight: 900, fontSize: '1.5rem', boxShadow: '0 8px 16px rgba(67, 24, 255, 0.3)' }}
            >
              {patientData.name ? patientData.name[0] : 'U'}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: '900', letterSpacing: -0.5 }}>{patientData.name}</Typography>
            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800, letterSpacing: 1 }}>{patientData.mediId}</Typography>
          </Box>
          <List sx={{ px: 2 }}>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={item.onClick ? item.onClick : () => navigate(item.path)}
                  sx={{
                    borderRadius: 3,
                    py: 1.5,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                    '&.Mui-selected': { bgcolor: 'rgba(99,102,241,0.1)' }
                  }}
                >
                  <ListItemIcon sx={{ color: '#818cf8', minWidth: 45 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>{item.text}</Typography>} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: { xs: 3, md: 8 }, color: 'white' }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: '400', fontSize: { xs: '2.5rem', md: '3.5rem' }, letterSpacing: -1.5, color: 'white', mb: 1 }}>
            Welcome, <Box component="span" sx={{ fontWeight: '800' }}>{patientData.name || 'User'}</Box>.
          </Typography>
          <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 400 }}>
            Here is your health overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

        {/* SECTION: ACTIVE SESSION */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: virtualToken ? '#10b981' : '#64748b' }} />
            <Typography variant="overline" sx={{ fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
              YOUR ACTIVE SESSION
            </Typography>
          </Stack>

          {virtualToken ? (
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} spacing={{ xs: 3, md: 6 }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: 1, display: 'block', mb: 0 }}>TOKEN NO.</Typography>
                <Typography variant="h2" sx={{ fontWeight: '400', fontSize: { xs: '3rem', md: '4rem' }, letterSpacing: -2, color: 'white', lineHeight: 1 }}>
                  #{virtualToken.token}
                </Typography>
              </Box>

              <Box sx={{ height: { xs: '1px', md: '60px' }, width: { xs: '100%', md: '1px' }, bgcolor: 'rgba(255,255,255,0.1)' }} />

              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: 1, display: 'block', mb: 0 }}>SERVING NOW</Typography>
                <Typography variant="h4" sx={{ fontWeight: '400', color: '#cbd5e1', lineHeight: 1 }}>
                  #{liveQueue.currentToken}
                </Typography>
              </Box>

              <Box sx={{ height: { xs: '1px', md: '60px' }, width: { xs: '100%', md: '1px' }, bgcolor: 'rgba(255,255,255,0.1)' }} />

              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: 1, display: 'block', mb: 0 }}>EST. WAIT TIME</Typography>
                <Typography variant="h4" sx={{ fontWeight: '400', color: '#cbd5e1', lineHeight: 1 }}>
                  {Math.max(0, (virtualToken.token - liveQueue.currentToken) * 15)} <Typography component="span" variant="subtitle1" sx={{ color: '#64748b', fontWeight: 600 }}>mins</Typography>
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Typography variant="h4" sx={{ color: '#475569', fontWeight: 300 }}>
              No active appointments at the moment.
            </Typography>
          )}
        </Box>

        {/* IPD BILLING POPUP */}
        {virtualToken && virtualToken.ipdBillStatus === 'Generated' && (
          <Dialog
            open={true}
            maxWidth="sm" fullWidth
            PaperProps={{ sx: { background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderRadius: 4, border: '2px solid #6366f1' } }}
          >
            <DialogTitle sx={{ fontWeight: 900, color: '#818cf8', textAlign: 'center', pt: 4 }}>
              🚑 DISCHARGE BILL READY
            </DialogTitle>
            <DialogContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: '#cbd5e1', mb: 1 }}>{virtualToken.hospitalName}</Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>
                Your IPD discharge has been requested and the final bill is ready. You must settle this amount to complete the discharge process.
              </Typography>
              
              <Box sx={{ p: 4, bgcolor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 3, mb: 4 }}>
                <Typography variant="overline" sx={{ color: '#10b981', fontWeight: 800, letterSpacing: 1 }}>TOTAL AMOUNT DUE</Typography>
                <Typography variant="h3" sx={{ color: '#10b981', fontWeight: 900, mt: 1 }}>₹{virtualToken.ipdBillAmount}</Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>Select a payment method:</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button 
                  fullWidth variant="contained" 
                  onClick={async () => {
                    if (window.confirm('Simulate paying ₹' + virtualToken.ipdBillAmount + ' online?')) {
                      await axios.post(`${API_BASE_URL}/api/discharge/pay/${virtualToken._id}`, { paymentMethod: 'Online' });
                      alert('Payment successful! You are officially discharged.');
                      setVirtualToken(null);
                      fetchHistory();
                    }
                  }}
                  sx={{ bgcolor: '#6366f1', color: 'white', py: 2, fontWeight: 900, borderRadius: 3, '&:hover': { bgcolor: '#4f46e5' } }}
                >
                  PAY ONLINE NOW
                </Button>
                <Button 
                  fullWidth variant="outlined" 
                  onClick={async () => {
                     await axios.post(`${API_BASE_URL}/api/discharge/pay/${virtualToken._id}`, { paymentMethod: 'COD' });
                     alert('COD requested. Please pay at the hospital counter. The staff will confirm and discharge you.');
                     // Update local token to reflect new status
                     setVirtualToken({ ...virtualToken, ipdBillStatus: 'Pending_COD' });
                  }}
                  sx={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', py: 2, fontWeight: 900, borderRadius: 3, '&:hover': { bgcolor: 'rgba(16,185,129,0.1)' } }}
                >
                  PAY AT COUNTER (CASH)
                </Button>
              </Stack>
            </DialogContent>
          </Dialog>
        )}

        {/* IPD PENDING COD NOTIFICATION */}
        {virtualToken && virtualToken.ipdBillStatus === 'Pending_COD' && (
            <Box sx={{ p: 3, bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 3, mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="subtitle1" sx={{ color: '#f59e0b', fontWeight: 800 }}>Payment Pending at Counter</Typography>
                    <Typography variant="body2" sx={{ color: '#fcd34d' }}>Please pay ₹{virtualToken.ipdBillAmount} at {virtualToken.hospitalName} billing desk to complete your discharge.</Typography>
                </Box>
                <HospitalIcon sx={{ color: '#f59e0b', fontSize: 40 }}/>
            </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

        {/* SECTION: QUICK ACTIONS */}

        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#6366f1' }} />
            <Typography variant="overline" sx={{ fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
              QUICK ACTIONS
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {/* BOOK APPOINTMENT LIST ITEM */}
            <Box
              onClick={handleOpenApt}
              sx={{
                p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 4, cursor: 'pointer', transition: '0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
              }}
            >
              <Stack direction="row" alignItems="center" spacing={4}>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 400, width: 220 }}>Book Appointment</Typography>
                <Typography variant="body1" sx={{ color: '#64748b', display: { xs: 'none', md: 'block' } }}>Schedule a new visit or secure a live token instantly.</Typography>
              </Stack>
              <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 300 }}>&rarr;</Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

            {/* MEDICAL HISTORY LIST ITEM */}
            <Box
              onClick={handleOpenHistory}
              sx={{
                p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 4, cursor: 'pointer', transition: '0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
              }}
            >
              <Stack direction="row" alignItems="center" spacing={4}>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 400, width: 220 }}>Medical History</Typography>
                <Typography variant="body1" sx={{ color: '#64748b', display: { xs: 'none', md: 'block' } }}>Review past diagnoses, treatments, and laboratory records.</Typography>
              </Stack>
              <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 300 }}>&rarr;</Typography>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

            {/* PRESCRIPTIONS LIST ITEM */}
            <Box
              onClick={() => setPharmacyOpen(true)}
              sx={{
                p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderRadius: 4, cursor: 'pointer', transition: '0.2s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
              }}
            >
              <Stack direction="row" alignItems="center" spacing={4}>
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 400, width: 220 }}>Prescriptions</Typography>
                {pharmacyStatus === 'Ready' || pharmacyStatus === 'Preparing' ? (
                  <Typography variant="body1" sx={{ color: pharmacyStatus === 'Ready' ? '#10b981' : '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {pharmacyStatus === 'Ready' ? '● Ready for pickup' : '● Preparing order'} — {orderData.hospitalName}
                  </Typography>
                ) : (
                  <Typography variant="body1" sx={{ color: '#64748b', display: { xs: 'none', md: 'block' } }}>Track your medication status or view pickup codes.</Typography>
                )}
              </Stack>
              <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 300 }}>&rarr;</Typography>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 4 }} />

        {/* BLOOD DONATION CENTER SECTION */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
            <Typography variant="overline" sx={{ fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
              BLOOD DONATION CENTER
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {incomingRequests.find(r => r.status === 'Accepted' && !r.bloodReceived) && (
              <Box
                onClick={() => setDonorHubOpen(true)}
                sx={{
                  p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: 4, cursor: 'pointer', transition: '0.2s', bgcolor: 'rgba(239, 68, 68, 0.05)',
                  borderLeft: '4px solid #ef4444',
                  '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={4}>
                  <Typography variant="h5" sx={{ color: '#fca5a5', fontWeight: 600, width: 220 }}>Active Donation</Typography>
                  <Typography variant="body1" sx={{ color: 'white', display: { xs: 'none', md: 'block' } }}>
                    Token #{incomingRequests.find(r => r.status === 'Accepted' && !r.bloodReceived)?.tokenNumber} — 🏥 {incomingRequests.find(r => r.status === 'Accepted' && !r.bloodReceived)?.hospitalName}
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ color: '#ef4444', fontWeight: 300 }}>&rarr;</Typography>
              </Box>
            )}

            {isRegisteredDonor && incomingRequests.find(r => r.status === 'Accepted' && !r.bloodReceived) && (
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            )}

            {isRegisteredDonor && (
              <Box
                onClick={() => setDonorHubOpen(true)}
                sx={{
                  p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: 4, cursor: 'pointer', transition: '0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={4}>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 400, width: 220 }}>Donor Hub</Typography>
                  {incomingRequests.filter(r => r.status === 'Pending').length > 0 ? (
                    <Typography variant="body1" sx={{ color: '#fb7185', fontWeight: 600 }}>
                      ● {incomingRequests.filter(r => r.status === 'Pending').length} urgent requests matching your blood type
                    </Typography>
                  ) : (
                    <Typography variant="body1" sx={{ color: '#64748b', display: { xs: 'none', md: 'block' } }}>Manage matches and find opportunities to donate.</Typography>
                  )}
                </Stack>
                <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 300 }}>&rarr;</Typography>
              </Box>
            )}

            {(isRegisteredDonor || incomingRequests.find(r => r.status === 'Accepted' && !r.bloodReceived)) && outgoingRequests.some(r => !r.bloodReceived) && (
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            )}

            {outgoingRequests.some(r => !r.bloodReceived) && (
              <Box
                onClick={() => setOutgoingHubOpen(true)}
                sx={{
                  p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: 4, cursor: 'pointer', transition: '0.2s',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                }}
              >
                <Stack direction="row" alignItems="center" spacing={4}>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 400, width: 220 }}>My Requests</Typography>
                  <Typography variant="body1" sx={{ color: outgoingRequests.some(r => r.status === 'Accepted') ? '#34d399' : '#64748b', fontWeight: outgoingRequests.some(r => r.status === 'Accepted') ? 600 : 400, display: { xs: 'none', md: 'block' } }}>
                    {outgoingRequests.some(r => r.status === 'Accepted') ? '● A donor has accepted! Tap to view token.' : 'Tracking your urgent blood requests.'}
                  </Typography>
                </Stack>
                <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 300 }}>&rarr;</Typography>
              </Box>
            )}
          </Stack>
        </Box>
        {/* APPOINTMENT BOOKING DIALOG */}
        <Dialog
          open={aptOpen}
          onClose={() => setAptOpen(false)}
          fullWidth maxWidth="sm"
          PaperProps={{ sx: { bgcolor: 'rgba(15,23,42,0.98)', backgroundImage: 'none', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' } }}
        >
          <DialogTitle sx={{ fontWeight: 900, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', px: 4, py: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarIcon sx={{ color: '#6366f1' }} />
            {bookingData.step === 0 ? 'Book an Appointment' : bookingData.step === 1 ? 'AI Symptom Scan' : 'Confirm Booking'}
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {bookingData.step === 0 && (
              <Stack spacing={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Select a hospital and date to begin.</Typography>
                <TextField
                  select fullWidth label="Select Hospital" variant="outlined"
                  value={bookingData.hospitalId}
                  onChange={(e) => {
                    const hosp = hospitals.find(h => h.mediId === e.target.value);
                    handleHospitalChange(e.target.value, hosp?.hospitalName || '');
                  }}
                  InputProps={{ sx: { color: 'white' } }}
                  InputLabelProps={{ sx: { color: '#94a3b8' } }}
                  sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' } } }}
                >
                  {hospitals.map(h => (
                    <MenuItem key={h.mediId} value={h.mediId}>{h.hospitalName}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  type="date" fullWidth label="Appointment Date"
                  value={bookingData.date}
                  onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                  InputProps={{ sx: { color: 'white' } }}
                  InputLabelProps={{ sx: { color: '#94a3b8' }, shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' } } }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
                <Button
                  fullWidth variant="contained"
                  disabled={!bookingData.hospitalId}
                  onClick={() => setBookingData({ ...bookingData, step: 1 })}
                  sx={{ bgcolor: '#6366f1', py: 1.5, fontWeight: 900, borderRadius: 3, '&:hover': { bgcolor: '#4f46e5' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' } }}
                >
                  Next: Describe Symptoms →
                </Button>
              </Stack>
            )}

            {bookingData.step === 1 && (
              <Stack spacing={3}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Describe your symptoms and let our AI find the best doctor for you.</Typography>
                <TextField
                  multiline rows={4} fullWidth label="Describe your symptoms"
                  value={bookingData.symptoms}
                  onChange={(e) => setBookingData({ ...bookingData, symptoms: e.target.value })}
                  InputProps={{ sx: { color: 'white' } }}
                  InputLabelProps={{ sx: { color: '#94a3b8' } }}
                  sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                />
                {bookingData.aiResult && (
                  <Box sx={{ p: 2, bgcolor: 'rgba(99,102,241,0.08)', borderRadius: 3, border: '1px solid rgba(99,102,241,0.3)' }}>
                    <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800, letterSpacing: 1 }}>AI RECOMMENDATION</Typography>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mt: 0.5 }}>{bookingData.aiResult.specialization}</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>{bookingData.aiResult.reasoning}</Typography>
                    <Typography variant="caption" sx={{ color: '#818cf8' }}>Confidence: {bookingData.aiResult.confidence}%</Typography>
                  </Box>
                )}
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" onClick={() => setBookingData({ ...bookingData, step: 0 })} sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)', flex: 1 }}>← Back</Button>
                  <Button
                    variant="contained" flex={2}
                    disabled={!bookingData.symptoms}
                    onClick={async () => {
                      try {
                        const res = await axios.post(`${API_BASE_URL}/api/ai-match-doctor`, { symptoms: bookingData.symptoms, hospitalId: bookingData.hospitalId });
                        if (res.data.success) {
                          setBookingData({ ...bookingData, aiResult: res.data.aiResult, matchedDoctors: res.data.doctors, step: 2 });
                        }
                      } catch (err) { alert('AI match failed. Please try manually.'); setBookingData({ ...bookingData, step: 2 }); }
                    }}
                    sx={{ bgcolor: '#6366f1', py: 1.5, fontWeight: 900, borderRadius: 3, flex: 2, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' } }}
                  >
                    Find Doctor →
                  </Button>
                </Stack>
              </Stack>
            )}

            {bookingData.step === 2 && (
              <Stack spacing={3}>
                {bookingData.matchedDoctors.length > 0 ? (
                  <>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1 }}>RECOMMENDED DOCTORS</Typography>
                    {bookingData.matchedDoctors.map(doc => (
                      <Box
                        key={doc._id}
                        onClick={() => setBookingData({ ...bookingData, doctorId: doc.mediId, doctorName: `${doc.firstName} ${doc.lastName}`, speciality: doc.specialization })}
                        sx={{
                          p: 3, borderRadius: 4, cursor: 'pointer', transition: '0.2s',
                          border: bookingData.doctorId === doc.mediId ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                          bgcolor: bookingData.doctorId === doc.mediId ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700 }}>
                          {doc.firstName} {doc.lastName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>{doc.specialization}</Typography>
                      </Box>
                    ))}
                  </>
                ) : (
                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>No AI-matched doctors found. Select manually:</Typography>
                    <TextField
                      select fullWidth label="Select Doctor"
                      value={bookingData.doctorId}
                      onChange={(e) => {
                        const doc = doctors.find(d => d.mediId === e.target.value);
                        setBookingData({ ...bookingData, doctorId: doc?.mediId || e.target.value, doctorName: `${doc?.firstName || ''} ${doc?.lastName || ''}` });
                      }}
                      InputProps={{ sx: { color: 'white' } }}
                      InputLabelProps={{ sx: { color: '#94a3b8' } }}
                      sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                    >
                      {doctors.map(d => (
                        <MenuItem key={d._id} value={d.mediId || d._id}>{d.firstName} {d.lastName} — {d.specialization || d.category}</MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                )}

                {bookingData.doctorId && (
                  <Box sx={{ p: 2, bgcolor: 'rgba(16,185,129,0.08)', borderRadius: 3, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800, letterSpacing: 1 }}>BOOKING SUMMARY</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>🏥 {bookingData.hospitalName}</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>👨‍⚕️ {bookingData.doctorName}</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>📅 {new Date(bookingData.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Typography>
                  </Box>
                )}

                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" onClick={() => setBookingData({ ...bookingData, step: 1 })} sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)', flex: 1 }}>← Back</Button>
                  <Button
                    variant="contained" disabled={!bookingData.doctorId}
                    onClick={async () => {
                      await handleFinalSubmit();
                      setAptOpen(false);
                    }}
                    sx={{ bgcolor: '#10b981', py: 1.5, fontWeight: 900, borderRadius: 3, flex: 2, '&:hover': { bgcolor: '#059669' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' } }}
                  >
                    ✔ Confirm Booking
                  </Button>
                </Stack>
              </Stack>
            )}
          </DialogContent>
        </Dialog>

        {/* EHR DIALOG */}
        <Dialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              bgcolor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              backgroundImage: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }
          }}
        >
          <DialogTitle sx={{
            fontWeight: '900', display: 'flex', alignItems: 'center', gap: 2,
            color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', px: 4, py: 3
          }}>
            <HistoryIcon sx={{ color: '#818cf8', fontSize: 28 }} /> Electronic Health Record (EHR)
          </DialogTitle>
          <DialogContent sx={{
            p: 4,
            '&::-webkit-scrollbar': { width: '8px' },
            '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.02)' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
          }}>
            {medicalHistory.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, opacity: 0.5 }}>
                <HistoryIcon sx={{ fontSize: 64, mb: 2, color: '#94a3b8' }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>No treatment records found</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>Your clinical history will appear here after your first visit.</Typography>
              </Box>
            ) : (
              <Stack spacing={4}>
                {medicalHistory.map((record, index) => (
                  <Card key={index} sx={{
                    borderRadius: 5, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', transition: '0.3s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(129, 140, 248, 0.4)' }
                  }}>
                    <Box sx={{
                      background: 'linear-gradient(90deg, #4f46e5, #3730a3)',
                      p: 2, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>📅 {record.date}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>🧑‍⚕️ {record.doctorName?.match(/^dr\.?/i) ? record.doctorName : `Dr. ${record.doctorName}`}</Typography>
                    </Box>
                    <CardContent sx={{ p: 3 }}>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#6366f1', letterSpacing: 1 }}>CLINICAL DIAGNOSIS</Typography>
                          <Typography variant="h6" sx={{ mt: 1, mb: 2, fontWeight: 700, color: 'white' }}>{record.diagnosis}</Typography>
                          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2, mt: 1 }}>
                            <ScienceIcon sx={{ color: '#0ea5e9', fontSize: 24 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'white' }}>Lab Investigations</Typography>
                          </Stack>
                          <Box sx={{
                            p: 2.5, bgcolor: 'rgba(14, 165, 233, 0.05)', borderRadius: 4,
                            border: '1px solid rgba(14, 165, 233, 0.2)'
                          }}>
                            <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 800, mb: 1 }}>
                              Tests: {record.labTests || "None Requested"}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2, lineHeight: 1.6 }}>
                              <strong style={{ color: 'white' }}>Result:</strong> {sanitizeLabResult(record.labResultSummary) || "Waiting for processing..."}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Chip
                                label={record.labStatus || 'Pending'}
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  bgcolor: record.labStatus === 'Completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                                  color: record.labStatus === 'Completed' ? '#4ade80' : '#fbbf24',
                                  border: `1px solid ${record.labStatus === 'Completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                                }}
                              />
                              {record.labStatus === 'Completed' && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<DownloadIcon />}
                                  onClick={() => handleDownloadReport(record)}
                                  sx={{
                                    bgcolor: '#6366f1', fontSize: '0.75rem', fontWeight: 700,
                                    '&:hover': { bgcolor: '#4f46e5' }
                                  }}
                                >
                                  View Report
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2, mt: 1 }}>
                            <MedicationIcon sx={{ color: '#10b981', fontSize: 24 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'white' }}>Prescribed Medication</Typography>
                          </Stack>
                          <Box sx={{
                            p: 2.5, bgcolor: 'rgba(16, 185, 129, 0.05)', borderRadius: 4,
                            border: '1px solid rgba(16, 185, 129, 0.2)', height: '100%'
                          }}>
                            <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 600, lineHeight: 1.8 }}>
                              {record.medicines || "No medication prescribed for this visit."}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </DialogContent>
          <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
            <Button
              variant="outlined"
              onClick={() => setHistoryOpen(false)}
              sx={{
                color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 700,
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
              }}
            >
              Close Records
            </Button>
          </Box>
        </Dialog>

        {/* LAB REPORT VIEWER DIALOG */}
        <Dialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              bgcolor: '#0f172a',
              backgroundImage: 'none',
              borderRadius: 6,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          {selectedReport && (
            <>
              <Box sx={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: 'white', p: 4
              }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                  <ReportIcon sx={{ fontSize: 32 }} />
                  <Typography variant="h5" fontWeight="900">Lab Diagnostic Report</Typography>
                </Stack>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 700, letterSpacing: 0.5 }}>
                  🏥 {selectedReport.hospitalName || 'Medi-Swift Hospital'}
                </Typography>
              </Box>

              <DialogContent sx={{
                p: 0, bgcolor: '#0f172a',
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.02)' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }
              }}>
                <Box sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>Clinical Findings</Typography>
                    <Chip
                      label={selectedReport.labStatus || 'Pending'}
                      sx={{
                        fontWeight: 800,
                        bgcolor: selectedReport.labStatus === 'Completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: selectedReport.labStatus === 'Completed' ? '#4ade80' : '#fbbf24',
                        border: `1px solid ${selectedReport.labStatus === 'Completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                      }}
                    />
                  </Stack>

                  <Box sx={{
                    p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.1)', mb: 4
                  }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#94a3b8' }}>
                      {sanitizeLabResult(selectedReport.labResultSummary) || 'Clinical observations are pending.'}
                    </Typography>
                  </Box>

                  {selectedReport.reportUrl && (
                    <Box sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'black' }}>
                      <Typography variant="caption" sx={{
                        p: 1.5, display: 'block', bgcolor: 'rgba(255,255,255,0.05)',
                        fontWeight: 800, color: '#38bdf8', letterSpacing: 1, textAlign: 'center'
                      }}>
                        DIAGNOSTIC VISUALIZATION
                      </Typography>
                      {(() => {
                        const fullUrl = selectedReport.reportUrl.startsWith('http')
                          ? selectedReport.reportUrl
                          : `${API_BASE_URL}/${selectedReport.reportUrl}`;

                        return fullUrl.toLowerCase().includes('.pdf') ? (
                          <iframe
                            src={fullUrl}
                            title="Lab Report Document"
                            width="100%"
                            height="500px"
                            style={{ border: 'none' }}
                          />
                        ) : (
                          <Box sx={{ textAlign: 'center', p: 2 }}>
                            <img
                              src={fullUrl}
                              alt="Lab Report"
                              style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
                            />
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Box>
              </DialogContent>
              <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', bgcolor: 'rgba(15, 23, 42, 0.5)' }}>
                <Button
                  variant="contained"
                  onClick={() => setReportOpen(false)}
                  sx={{ bgcolor: '#0ea5e9', fontWeight: 800, '&:hover': { bgcolor: '#0284c7' } }}
                >
                  Done Viewing
                </Button>
              </Box>
            </>
          )}
        </Dialog>

        {/* PHARMACY DIALOG */}
        <Dialog
          open={pharmacyOpen}
          onClose={() => setPharmacyOpen(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              bgcolor: 'rgba(15, 23, 42, 0.98)',
              backgroundImage: 'none',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)'
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: '900', color: 'white', px: 3, pt: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <PharmacyIcon sx={{ color: '#fbbf24', fontSize: 28 }} />
              <Typography variant="h6" fontWeight="900">Pharmacy Verification</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {pharmacyStatus === 'Idle' ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={32} sx={{ mb: 2, color: '#fbbf24' }} />
                <Typography variant="body1" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Processing prescription...
                </Typography>
              </Box>
            ) : orderData.fullStatus === 'Preparing' ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                  <CircularProgress size={80} thickness={2} sx={{ color: 'rgba(251, 191, 36, 0.2)' }} />
                  <CircularProgress size={80} thickness={4} sx={{ color: '#fbbf24', position: 'absolute', left: 0 }} />
                  <PharmacyIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fbbf24', fontSize: 32 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'white', mb: 1 }}>Preparing your order...</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', lineHeight: 1.6 }}>
                  The pharmacist at <strong style={{ color: 'white' }}>{orderData.hospitalName}</strong> is gathering your medicines.
                </Typography>
              </Box>
            ) : orderData.paymentStatus === 'Unpaid' ? (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'white', mb: 2 }}>
                  Select Payment Method
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 4, lineHeight: 1.6 }}>
                  Medicines are ready at <strong style={{ color: 'white' }}>{orderData.hospitalName}</strong>. Select a payment method to unlock your secure pickup code.
                </Typography>
                <Stack spacing={2}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<MedicationIcon />}
                    onClick={() => handleConfirmPayment('COD')}
                    sx={{
                      py: 1.5, borderRadius: 4, border: '2px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 700,
                      '&:hover': { border: '2px solid #fbbf24', bgcolor: 'rgba(251, 191, 36, 0.05)' }
                    }}
                  >
                    Cash on Delivery (COD)
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleConfirmPayment('UPI')}
                    sx={{
                      py: 1.5, borderRadius: 4, bgcolor: '#fbbf24', color: '#000', fontWeight: 900,
                      '&:hover': { bgcolor: '#f59e0b' }
                    }}
                  >
                    Pay via UPI
                  </Button>
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleConfirmPayment('Debit Card')}
                      sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, fontWeight: 700 }}
                    >
                      Debit
                    </Button>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleConfirmPayment('Credit Card')}
                      sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, fontWeight: 700 }}
                    >
                      Credit
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Show this code to the Pharmacist at:
                </Typography>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 800, mt: 0.5 }}>
                  {orderData.hospitalName}
                </Typography>

                <Box sx={{
                  my: 4, p: 4,
                  border: '3px dashed #10b981',
                  borderRadius: 5,
                  bgcolor: 'rgba(16, 185, 129, 0.05)',
                  display: 'flex', justifyContent: 'center'
                }}>
                  <Typography variant="h2" sx={{ fontWeight: 900, color: '#10b981', letterSpacing: 8 }}>
                    {orderData.verificationCode}
                  </Typography>
                </Box>

                <Chip
                  label={orderData.paymentStatus === 'Paid' ? "VERIFIED PAYMENT" : "PENDING AT COUNTER"}
                  sx={{
                    fontWeight: 900, mb: 3,
                    bgcolor: orderData.paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: orderData.paymentStatus === 'Paid' ? '#10b981' : '#ef4444'
                  }}
                />

                <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>MEDICINES PREPARED</Typography>
                  <Typography variant="body2" sx={{ color: 'white', mt: 1, fontWeight: 500, lineHeight: 1.6 }}>
                    {orderData.available.join(' • ')}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 4, borderRadius: 4, color: 'white', borderColor: 'rgba(255,255,255,0.2)', fontWeight: 700 }}
                  onClick={() => setPharmacyOpen(false)}
                >
                  Close Portal
                </Button>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* PROFILE DIALOG */}
        <Dialog
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              bgcolor: 'rgba(15, 23, 42, 0.98)',
              backgroundImage: 'none',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
            }
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 2 }}>
            <Avatar
              src={fullPatientData?.photoUrl ? `${API_BASE_URL}/${fullPatientData.photoUrl}` : ''}
              sx={{
                width: 100, height: 100, mx: 'auto', mb: 2,
                bgcolor: '#6366f1', fontSize: '2.5rem', fontWeight: 900,
                border: '4px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 0 30px rgba(99, 102, 241, 0.2)'
              }}
            >
              {fullPatientData?.firstName?.[0]}
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'white' }}>{fullPatientData?.firstName} {fullPatientData?.lastName}</Typography>
            <Chip
              label={fullPatientData?.mediId}
              sx={{ mt: 1, bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 800, px: 1 }}
            />
          </DialogTitle>
          <DialogContent sx={{ px: 3, pb: 4 }}>
            {fullPatientData && (
              <Stack spacing={2.5}>
                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>CONTACT DETAILS</Typography>
                  <Typography variant="body2" sx={{ color: 'white', mt: 1, fontWeight: 600 }}>📞 {fullPatientData.phone || 'N/A'}</Typography>
                  <Typography variant="body2" sx={{ color: 'white', mt: 0.5, fontWeight: 600 }}>✉️ {fullPatientData.email || 'N/A'}</Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>PERSONAL DETAILS</Typography>
                  <Stack direction="row" spacing={3} sx={{ mt: 1 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Date of Birth</Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {fullPatientData.dob ? new Date(fullPatientData.dob).toLocaleDateString('en-GB') : 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Age</Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {fullPatientData.dob ? (() => {
                          const birthDate = new Date(fullPatientData.dob);
                          const today = new Date();
                          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                          const m = today.getMonth() - birthDate.getMonth();
                          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                            calculatedAge--;
                          }
                          return `${calculatedAge} years`;
                        })() : (fullPatientData.age ? `${fullPatientData.age} years` : 'N/A')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>Gender</Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, textTransform: 'capitalize' }}>
                        {fullPatientData.gender || 'N/A'}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>IDENTITY</Typography>
                  <Typography variant="body2" sx={{ color: 'white', mt: 1, fontWeight: 600 }}>🆔 Aadhar: {fullPatientData.aadharNumber ? `XXXX-XXXX-${fullPatientData.aadharNumber.slice(-4)}` : 'N/A'}</Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>RESIDENTIAL ADDRESS</Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1, lineHeight: 1.6 }}>{fullPatientData.address || 'No address listed.'}</Typography>
                </Box>
              </Stack>
            )}
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 4, bgcolor: '#6366f1', py: 1.5, borderRadius: 4, fontWeight: 900, boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }}
              onClick={() => setProfileOpen(false)}
            >
              Close Profile
            </Button>
          </DialogContent>
        </Dialog>

        {/* BLOOD DONOR HUB DIALOG */}
        <Dialog
          open={donorHubOpen}
          onClose={() => setDonorHubOpen(false)}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: {
              bgcolor: 'rgba(15, 23, 42, 0.98)',
              backgroundImage: 'none',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
            }
          }}
        >
          <DialogTitle sx={{
            fontWeight: '900', display: 'flex', alignItems: 'center', gap: 2,
            color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', px: 4, py: 3
          }}>
            <BloodtypeIcon sx={{ color: '#e11d48', fontSize: 28 }} /> Incoming Blood Requests
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {incomingRequests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, opacity: 0.5 }}>
                <BloodtypeIcon sx={{ fontSize: 64, mb: 2, color: '#94a3b8' }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>No active requests</Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>You will see matching blood requests here.</Typography>
              </Box>
            ) : (
              <Stack spacing={3}>
                {incomingRequests.map((req) => (
                  <Card
                    key={req._id}
                    sx={{
                      borderRadius: 5, bgcolor: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${req.status === 'Pending' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: 'white' }}>🏥 {req.hospitalName}</Typography>
                          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                            Required group: <strong style={{ color: '#e11d48' }}>{req.bloodGroup}</strong>
                          </Typography>
                        </Box>
                        <Chip
                          label={req.status}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            bgcolor: req.status === 'Accepted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: req.status === 'Accepted' ? '#10b981' : '#ef4444'
                          }}
                        />
                      </Stack>

                      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#64748b', fontWeight: 700 }}>
                        REQUESTED ON: {new Date(req.requestDate).toLocaleDateString()}
                      </Typography>
                    </Box>

                    {req.status === 'Pending' && (
                      <Box sx={{ p: 2, bgcolor: 'rgba(225, 29, 72, 0.05)', display: 'flex', gap: 2, borderTop: '1px solid rgba(225, 29, 72, 0.1)' }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={() => handleUpdateRequestStatus(req._id, 'Ignored')}
                          sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', fontWeight: 800 }}
                        >
                          Ignore
                        </Button>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{ bgcolor: '#e11d48', fontWeight: 900, '&:hover': { bgcolor: '#be123c' } }}
                          onClick={() => handleUpdateRequestStatus(req._id, 'Accepted')}
                        >
                          Accept & Donate
                        </Button>
                      </Box>
                    )}

                    {req.status === 'Accepted' && req.tokenNumber && (
                      <Box sx={{ p: 3, bgcolor: 'rgba(16, 185, 129, 0.05)', borderTop: '1px solid rgba(16, 185, 129, 0.1)', textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, color: '#10b981', letterSpacing: 2 }}>LIVE DONATION TOKEN</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#10b981', letterSpacing: 8, my: 1 }}>#{req.tokenNumber}</Typography>
                        {req.bloodReceived && (
                          <Chip label="DONATION RECEIVED ✅" size="small" sx={{ fontWeight: 900, bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', mt: 1 }} />
                        )}
                      </Box>
                    )}
                  </Card>
                ))}
              </Stack>
            )}
          </DialogContent>
          <Box sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => setDonorHubOpen(false)}
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', fontWeight: 800 }}
            >
              Close Portal
            </Button>
          </Box>
        </Dialog>

        {/* OUTGOING BLOOD REQUESTS DIALOG */}
        <Dialog
          open={outgoingHubOpen}
          onClose={() => setOutgoingHubOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(15, 23, 42, 0.98)',
              backgroundImage: 'none',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.1)',
            }
          }}
        >
          <DialogTitle sx={{
            fontWeight: '900', display: 'flex', alignItems: 'center', gap: 2,
            color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', px: 4, py: 3
          }}>
            <BloodtypeIcon sx={{ color: '#94a3b8', fontSize: 28 }} /> My Sent Blood Requests
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            {outgoingRequests.length === 0 ? (
              <Typography align="center" sx={{ color: '#94a3b8', py: 4 }}>No outgoing requests found.</Typography>
            ) : (
              <Stack spacing={3}>
                {outgoingRequests.map((req) => (
                  <Card
                    key={req._id}
                    sx={{
                      borderRadius: 5, bgcolor: 'rgba(255,255,255,0.03)',
                      borderLeft: `6px solid ${req.status === 'Accepted' ? '#10b981' : req.status === 'Ignored' ? '#ef4444' : '#f59e0b'}`,
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      borderRight: '1px solid rgba(255,255,255,0.08)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Grid container justifyContent="space-between" alignItems="center">
                        <Grid item xs={7}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1 }}>FOR: {req.requesterName}</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: 'white', mt: 0.5 }}>{req.hospitalName}</Typography>
                          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                            Blood Group: <strong style={{ color: 'white' }}>{req.bloodGroup}</strong>
                          </Typography>
                        </Grid>
                        <Grid item xs={5} sx={{ textAlign: 'right' }}>
                          {req.status === 'Accepted' ? (
                            <Box sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', p: 1.5, borderRadius: 4, border: '1px dashed #10b981' }}>
                              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 900, display: 'block' }}>TOKEN</Typography>
                              <Typography variant="h5" sx={{ fontWeight: 900, color: '#10b981', letterSpacing: 2 }}>#{req.tokenNumber}</Typography>
                              {req.bloodReceived && <Typography variant="caption" sx={{ fontWeight: 900, color: '#10b981' }}>✅ RECEIVED</Typography>}
                            </Box>
                          ) : req.status === 'Ignored' ? (
                            <Typography sx={{ color: '#ef4444', fontWeight: 900 }}>Ignored</Typography>
                          ) : (
                            <CircularProgress size={24} sx={{ color: '#f59e0b' }} />
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button onClick={() => setOutgoingHubOpen(false)} sx={{ color: 'white', fontWeight: 800 }}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default PatientDashboard;
