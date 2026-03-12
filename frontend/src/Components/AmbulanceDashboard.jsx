import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar, Box, Toolbar, Typography, Button, Switch, Paper,
  Stack, IconButton, Dialog, DialogContent, Avatar, Divider, Slider, CircularProgress
} from '@mui/material';
import {
  Logout as LogoutIcon,
  NotificationsActive as AlarmIcon,
  Navigation as NavIcon,
  CheckCircle as CheckIcon,
  LocalHospital,
  DirectionsCar,
  Coronavirus,
  LocalFireDepartment,
  MedicalServices,
  HelpOutline,
  KeyboardDoubleArrowRight,
  PhoneInTalk,
  Map as MapIcon,
  Warning as WarningIcon,
  ArrowForwardIos,
  EmojiTransportation
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, useMap, Tooltip } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import intenseSiren from '../assets/freesound_community-siren-alert-96052.mp3';

// Leaflet Icons Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const patientIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/564/564171.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

const ambulanceIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1032/1032989.png',
  iconSize: [45, 45],
  iconAnchor: [22, 45]
});

const RecenterMap = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number' && isFinite(coords.lat) && isFinite(coords.lng)) {
      map.flyTo([coords.lat, coords.lng], map.getZoom(), {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [coords, map]);
  return null;
};

const AmbulanceDashboard = () => {
  const navigate = useNavigate();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [location, setLocation] = useState({ lat: 8.5241, lng: 76.9366 });
  const [activeEmergency, setActiveEmergency] = useState(null);
  const [showAlarm, setShowAlarm] = useState(false);
  const [driverData, setDriverData] = useState({ name: 'Driver', mediId: '', phone: '' });
  const [incomingEmergency, setIncomingEmergency] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [swipeValue, setSwipeValue] = useState(0);
  const [ignoredMissions, setIgnoredMissions] = useState(new Set());
  const [isAccepting, setIsAccepting] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [severityView, setSeverityView] = useState('question'); // 'question', 'hospital_select', 'completed'
  const [swipeReachedValue, setSwipeReachedValue] = useState(0);
  const SIREN_OPTIONS = [
    { id: 'intense', name: 'Hyper-Realistic wail', url: intenseSiren },
    { id: 'silent', name: 'Silent / Flash Only', url: null },
  ];

  const [sirenConfig, setSirenConfig] = useState(() => {
    const saved = localStorage.getItem('ambulanceSirenConfig');
    return saved ? JSON.parse(saved) : SIREN_OPTIONS[0];
  });

  const [openSirenSettings, setOpenSirenSettings] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const defaultUrl = 'https://actions.google.com/sounds/v1/emergency/ambulance_siren.ogg';
    const audio = new Audio(sirenConfig.url || defaultUrl);
    audio.volume = sirenConfig.id === 'silent' ? 0 : 1;
    audioRef.current = audio;
  }, [sirenConfig]);

  const countdownIntervalRef = useRef(null);

  const EMERGENCY_TYPES = {
    'Accident': { icon: <DirectionsCar />, color: '#f44336' },
    'Cardiac': { icon: <MedicalServices />, color: '#e91e63' },
    'Respiratory': { icon: <Coronavirus />, color: '#2196f3' },
    'Fire': { icon: <LocalFireDepartment />, color: '#ff9800' },
    'General': { icon: <HelpOutline />, color: '#607d8b' },
  };

  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem('user'));
    // The login response stores data at top level.
    // Ambulance users are registered with 'driverName', not 'firstName'.
    if (raw && (raw.mediId || raw.userData?.mediId)) {
      const data = raw.userData || raw;
      setDriverData({
        name: data.driverName || `${data.firstName || 'Driver'} ${data.lastName || ''}`.trim(),
        mediId: raw.mediId || data.mediId,
        phone: data.phone || '911'
      });
      const savedDuty = localStorage.getItem('isAmbulanceOnDuty') === 'true';
      setIsOnDuty(savedDuty);
    } else {
      navigate('/');
    }

    const watchId = navigator.geolocation.watchPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, null, { enableHighAccuracy: true });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [navigate]);

  useEffect(() => {
    const siren = audioRef.current;
    if (showAlarm) {
      if (siren) {
        siren.loop = true;
        siren.play().catch(() => console.log("Siren blocked"));
      }
      setCountdown(30);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setShowAlarm(false);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (siren) {
        siren.pause();
        siren.currentTime = 0;
      }
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showAlarm]);

  useEffect(() => {
    let pollInterval;
    const checkRequests = async () => {
      if (!isOnDuty || !driverData?.mediId) return;

      const savedId = localStorage.getItem('activeEmergencyId');
      if (savedId && !activeEmergency) {
        try {
          const res = await axios.get(`http://localhost:5000/api/emergency/status/${savedId}`);
          const activeStatuses = ['Accepted', 'OnWay', 'Arrived'];
          if (res.data.success && activeStatuses.includes(res.data.status)) {
            setActiveEmergency(res.data.emergency);
            return;
          } else {
            localStorage.removeItem('activeEmergencyId');
          }
        } catch (e) {
          localStorage.removeItem('activeEmergencyId');
        }
      }

      if (activeEmergency) return;

      try {
        const res = await axios.get(`http://localhost:5000/api/ambulance/check-emergency/${driverData.mediId}`);
        if (showAlarm && (!res.data.emergency || res.data.emergency._id !== incomingEmergency?._id)) {
          setShowAlarm(false);
          setIncomingEmergency(null);
          return;
        }
        if (res.data.emergency && !showAlarm) {
          if (ignoredMissions.has(res.data.emergency._id)) return;
          if (['Accepted', 'OnWay', 'Arrived'].includes(res.data.emergency.status) && res.data.emergency.ambulanceId === driverData.mediId) {
            setActiveEmergency(res.data.emergency);
            localStorage.setItem('activeEmergencyId', res.data.emergency._id);
          } else if (res.data.emergency.status === 'Searching') {
            setIncomingEmergency(res.data.emergency);
            setShowAlarm(true);
          }
        }
      } catch (err) { console.error("Poll fail"); }
    };

    pollInterval = setInterval(checkRequests, 2000);
    return () => clearInterval(pollInterval);
  }, [isOnDuty, driverData.mediId, showAlarm, activeEmergency, ignoredMissions, incomingEmergency]);

  useEffect(() => {
    let heartbeat;
    if (activeEmergency?._id) {
      heartbeat = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/emergency/status/${activeEmergency._id}`);
          if (res.data.success && (res.data.status === 'Cancelled' || res.data.status === 'Completed')) {
            alert(`Mission ${res.data.status}. Unit returning to scanning mode.`);
            setActiveEmergency(null);
            localStorage.removeItem('activeEmergencyId');
            setSeverityView('question');
            setSwipeReachedValue(0);
          }
        } catch (e) { console.log("Heartbeat fail"); }
      }, 3000);
    }
    return () => clearInterval(heartbeat);
  }, [activeEmergency]);

  useEffect(() => {
    let broadcastInterval;
    if (activeEmergency?._id) {
      broadcastInterval = setInterval(async () => {
        if (location.lat && location.lng) {
          try {
            await axios.put(`http://localhost:5000/api/emergency/update-location/${activeEmergency._id}`, {
              lat: location.lat, lng: location.lng
            });
          } catch (err) { console.error("Broadcast fail"); }
        }
      }, 3000);
    }
    return () => clearInterval(broadcastInterval);
  }, [activeEmergency, location]);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    localStorage.setItem('isAmbulanceOnDuty', newStatus);
    try {
      await axios.put(`http://localhost:5000/api/ambulance/toggle-status/${driverData.mediId}`, {
        isOnline: newStatus, lat: location.lat, lng: location.lng
      });
    } catch (err) { console.error("Toggle fail"); }

    if (newStatus) {
      try {
        const res = await axios.get('http://localhost:5000/api/get-all-hospitals');
        setHospitals(res.data);
      } catch (err) { console.error("Fetch hospitals fail"); }
    }
  };

  const handleReachedPickup = async () => {
    if (!activeEmergency?._id) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/emergency/reached-pickup/${activeEmergency._id}`);
      if (res.data.success) {
        setActiveEmergency(res.data.emergency);
        setSeverityView('question');
      }
    } catch (err) { alert("Action failed"); }
  };

  const handleSelectSeverity = async (serious) => {
    if (!serious) {
      // If not serious, mark as General and we skip hospital selection (or just keep as is)
      try {
        await axios.put(`http://localhost:5000/api/emergency/severity/${activeEmergency._id}`, { isSerious: false });
        setSeverityView('completed');
      } catch (e) { }
    } else {
      setSeverityView('hospital_select');
    }
  };

  const handleSelectHospital = async (hosp) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/emergency/severity/${activeEmergency._id}`, {
        isSerious: true,
        hospitalId: hosp.mediId,
        hospitalName: hosp.hospitalName
      });
      if (res.data.success) {
        setActiveEmergency(res.data.emergency);
        setSeverityView('completed');
      }
    } catch (e) { alert("Failed to notify hospital"); }
  };

  const handleAcceptRequest = async () => {
    if (!incomingEmergency?._id) return;
    setIsAccepting(true);
    setSwipeValue(0);
    try {
      const res = await axios.put(`http://localhost:5000/api/emergency/accept/${incomingEmergency._id}`, {
        ambulanceId: driverData.mediId,
        driverName: driverData.name,
        driverPhone: driverData.phone,
        lat: location.lat,
        lng: location.lng
      });
      if (res.data.success) {
        setActiveEmergency(res.data.emergency);
        localStorage.setItem('activeEmergencyId', res.data.emergency._id);
        setShowAlarm(false);
        setSwipeReachedValue(0);
        setSeverityView('question');
      }
    } catch (err) {
      alert(err.response?.data?.message || "Accept failed.");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCompleteMission = async () => {
    if (!activeEmergency?._id || !window.confirm("Complete Mission?")) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/emergency/complete/${activeEmergency._id}`);
      if (res.data.success) {
        setActiveEmergency(null);
        localStorage.removeItem('activeEmergencyId');
        setSeverityView('question');
        setSwipeReachedValue(0);
      }
    } catch (err) { console.error("Complete fail"); }
  };

  const onSwipeChange = (e, val) => {
    setSwipeValue(val);
    if (val >= 90) handleAcceptRequest();
  };

  const onSwipeReachedChange = (e, val) => {
    setSwipeReachedValue(val);
    if (val >= 90) handleReachedPickup();
  };

  const currentIncomingType = incomingEmergency?.emergencyType || 'General';
  const typeConfig = EMERGENCY_TYPES[currentIncomingType] || EMERGENCY_TYPES['General'];

  return (
    <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', bgcolor: '#0f172a', overflow: 'hidden' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, py: { xs: 1, sm: 0 }, px: { xs: 1.5, sm: 3 } }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
            <Avatar sx={{ bgcolor: isOnDuty ? '#10b981' : '#f43f5e', width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}><LocalHospital sx={{ fontSize: { xs: 18, sm: 24 } }} /></Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#f8fafc', lineHeight: 1, fontSize: { xs: '0.8rem', sm: '1rem' } }}>MEDI-SWIFT DISPATCH</Typography>
              <Typography variant="caption" sx={{ color: isOnDuty ? '#10b981' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                {isOnDuty && <Box className="pulse-dot" />} {isOnDuty ? 'Active' : 'Standby'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.05)', px: { xs: 1, sm: 2 }, py: 0.5, borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="caption" sx={{ color: '#fff', mr: 0.5, fontWeight: 'bold', fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>DUTY</Typography>
              <Switch size="small" checked={isOnDuty} onChange={handleToggleDuty} color="success" />
            </Box>
            <IconButton
              size="small"
              sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }}
              onClick={() => setOpenSirenSettings(true)}
              title="Notification alert"
            >
              <AlarmIcon sx={{ color: sirenConfig.id === 'silent' ? '#94a3b8' : '#ef4444', fontSize: { xs: 18, sm: 24 } }} />
            </IconButton>
            <IconButton size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }} onClick={() => navigate('/ambulance-history')}><CheckIcon sx={{ fontSize: { xs: 18, sm: 24 } }} /></IconButton>
            <IconButton size="small" sx={{ color: '#f87171', bgcolor: 'rgba(255,255,255,0.05)' }} onClick={() => { localStorage.clear(); navigate('/'); }}><LogoutIcon sx={{ fontSize: { xs: 18, sm: 24 } }} /></IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {location && typeof location.lat === 'number' && typeof location.lng === 'number' && isFinite(location.lat) && isFinite(location.lng) ? (
          <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
            />
            <Marker position={[location.lat, location.lng]} icon={ambulanceIcon}>
              <Tooltip permanent direction="top" offset={[0, -40]}>
                <Typography variant="caption" fontWeight="bold">CURRENT POSITION</Typography>
              </Tooltip>
            </Marker>
            {activeEmergency?.location?.lat && typeof activeEmergency.location.lat === 'number' && isFinite(activeEmergency.location.lat) && (
              <Marker position={[activeEmergency.location.lat, activeEmergency.location.lng]} icon={patientIcon}>
                <Tooltip permanent direction="top" offset={[0, -40]}>
                  <Typography variant="caption" fontWeight="bold" color="error">PATIENT: {activeEmergency.requesterName}</Typography>
                </Tooltip>
              </Marker>
            )}
            <RecenterMap coords={location} />
          </MapContainer>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1e293b' }}>
            <Stack alignItems="center" spacing={2}><CircularProgress color="primary" /><Typography sx={{ color: '#94a3b8' }}>Acquiring Secure Satellite Link...</Typography></Stack>
          </Box>
        )}

        <Paper sx={{ position: 'absolute', top: { xs: 8, sm: 20 }, left: { xs: 8, sm: 20 }, p: { xs: 1.2, sm: 2 }, bgcolor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', color: 'white', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', zIndex: 1000, maxWidth: { xs: 160, sm: 'none' } }}>
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', fontSize: { xs: '0.55rem', sm: '0.75rem' } }}>DRIVER UNIT</Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{driverData.name}</Typography>
          <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: { xs: '0.55rem', sm: '0.75rem' } }}>#{driverData.mediId}</Typography>
        </Paper>

        <Box sx={{ position: 'absolute', bottom: 0, width: '100%', p: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center', zIndex: 1000 }}>
          <Paper sx={{ maxWidth: 600, width: '100%', p: { xs: 2, sm: 3 }, borderRadius: { xs: 4, sm: 6 }, bgcolor: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(20px)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            {activeEmergency ? (
              <Stack spacing={2.5}>
                {/* MISSION HEADER */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#f43f5e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                      <Typography variant="overline" color="error" fontWeight="900" sx={{ letterSpacing: 2 }}>
                        {activeEmergency.status === 'OnWay' ? 'EN ROUTE TO PATIENT' : 
                         activeEmergency.status === 'Arrived' ? 'AT PICKUP LOCATION' : 
                         activeEmergency.status === 'EnRouteHospital' ? 'EN ROUTE TO HOSPITAL' : 'MISSION ACTIVE'}
                      </Typography>
                    </Box>
                    <Typography variant="h5" fontWeight="900">{activeEmergency.requesterName || "Anonymous Patient"}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: EMERGENCY_TYPES[activeEmergency.emergencyType]?.color || '#fff' }}>
                        {EMERGENCY_TYPES[activeEmergency.emergencyType]?.icon || <HelpOutline fontSize="small" />}
                      </Box>
                      {(activeEmergency.emergencyType || "General")} Emergency Case
                    </Typography>
                  </Box>
                  <Avatar sx={{ 
                    width: 56, height: 56, 
                    bgcolor: 'rgba(244, 63, 94, 0.1)', 
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    color: '#f43f5e' 
                  }}>
                    {activeEmergency.status === 'OnWay' ? <NavIcon sx={{ fontSize: 32 }} /> : <LocalHospital sx={{ fontSize: 32 }} />}
                  </Avatar>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                {/* DYNAMIC CONTROLS BASED ON STATUS */}
                {activeEmergency.status === 'OnWay' && (
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                      <Button 
                        variant="contained" fullWidth size="large"
                        sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 'bold', borderRadius: 4, py: 1.5, '&:hover': { bgcolor: '#059669' } }} 
                        startIcon={<PhoneInTalk />} 
                        onClick={() => window.open(`tel:${activeEmergency.driverPhone || '911'}`)}
                      >CALL</Button>
                      <Button 
                        variant="contained" fullWidth size="large"
                        sx={{ bgcolor: '#38bdf8', color: '#0f172a', fontWeight: 'bold', borderRadius: 4, py: 1.5, '&:hover': { bgcolor: '#0ea5e9' } }} 
                        startIcon={<MapIcon />}
                        onClick={() => {
                          const lat = activeEmergency?.location?.lat;
                          const lng = activeEmergency?.location?.lng;
                          if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                        }}
                      >NAVIGATE</Button>
                    </Stack>

                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1.2, borderRadius: 5, position: 'relative', height: 64, display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Typography variant="button" sx={{ width: '100%', textAlign: 'center', color: '#10b981', fontWeight: '900', opacity: 0.6 }}>SWIPE: REACHED PICKUP</Typography>
                      <Slider
                        value={swipeReachedValue}
                        onChange={onSwipeReachedChange}
                        onMouseUp={() => swipeReachedValue < 90 && setSwipeReachedValue(0)}
                        onTouchEnd={() => swipeReachedValue < 90 && setSwipeReachedValue(0)}
                        sx={{
                          position: 'absolute', width: '100%', left: 0, color: 'transparent',
                          '& .MuiSlider-thumb': {
                            width: 54, height: 54, bgcolor: '#10b981',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                            '&:before': { display: 'none' },
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          },
                          '& .MuiSlider-track, & .MuiSlider-rail': { display: 'none' }
                        }}
                        componentsProps={{ thumb: { children: <CheckIcon sx={{ color: 'white' }} /> } }}
                      />
                    </Box>
                  </Stack>
                )}

                {activeEmergency.status === 'Arrived' && (
                  <Box>
                    {severityView === 'question' ? (
                      <Stack spacing={2} textAlign="center">
                        <Typography variant="h6" fontWeight="800" sx={{ color: '#f59e0b' }}>Is this a SERIOUS case?</Typography>
                        <Stack direction="row" spacing={2}>
                          <Button 
                            variant="contained" fullWidth size="large"
                            sx={{ bgcolor: '#f43f5e', color: 'white', fontWeight: '900', borderRadius: 4, py: 2 }}
                            onClick={() => handleSelectSeverity(true)}
                            startIcon={<WarningIcon />}
                          >YES, SERIOUS</Button>
                          <Button 
                            variant="outlined" fullWidth size="large"
                            sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)', fontWeight: '900', borderRadius: 4 }}
                            onClick={() => handleSelectSeverity(false)}
                          >NO, GENERAL</Button>
                        </Stack>
                      </Stack>
                    ) : severityView === 'hospital_select' ? (
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" fontWeight="800" textAlign="center" sx={{ color: '#38bdf8' }}>SELECT DESTINATION HOSPITAL</Typography>
                        <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                          <Stack spacing={1}>
                            {hospitals.map(h => (
                              <Button 
                                key={h.mediId} variant="text" fullWidth
                                sx={{ 
                                  justifyContent: 'space-between', bgcolor: 'rgba(255,255,255,0.03)', 
                                  p: 1.5, borderRadius: 3, color: 'white',
                                  '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.1)' }
                                }}
                                onClick={() => handleSelectHospital(h)}
                                endIcon={<ArrowForwardIos sx={{ fontSize: 14 }} />}
                              >
                                <Typography fontWeight="bold">{h.hospitalName}</Typography>
                              </Button>
                            ))}
                          </Stack>
                        </Box>
                      </Stack>
                    ) : null}
                  </Box>
                )}

                {activeEmergency.status === 'EnRouteHospital' && (
                  <Stack spacing={2}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 'bold', display: 'block' }}>HOSPITAL NOTIFIED & READY</Typography>
                      <Typography variant="subtitle1" fontWeight="900">{activeEmergency.hospitalName}</Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                      <Button 
                        variant="contained" fullWidth size="large"
                        sx={{ bgcolor: '#38bdf8', color: '#0f172a', fontWeight: 'bold', borderRadius: 4, py: 1.5 }} 
                        startIcon={<MapIcon />}
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeEmergency.hospitalName}`)}
                      >NAVIGATE</Button>
                      <Button 
                        variant="contained" color="success" fullWidth size="large"
                        sx={{ fontWeight: '900', borderRadius: 4, py: 1.5 }}
                        onClick={handleCompleteMission}
                        startIcon={<CheckIcon />}
                      >REACHED HOSPITAL</Button>
                    </Stack>
                  </Stack>
                )}

                {/* FALLBACK FOR OTHER STATUSES */}
                {['Arrived', 'EnRouteHospital', 'Completed'].includes(activeEmergency.status) === false && activeEmergency.status !== 'OnWay' && (
                  <Button variant="outlined" fullWidth color="success" sx={{ borderRadius: 3, fontWeight: 'bold' }} onClick={handleCompleteMission} startIcon={<CheckIcon />}>COMPLETE MISSION</Button>
                )}
              </Stack>
            ) : (
              <Box textAlign="center" sx={{ py: 1 }}>
                {isOnDuty ? (
                  <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
                    <Box className="radar-ping" />
                    <Typography variant="body1" sx={{ color: '#94a3b8', fontWeight: 500 }}>Scanning for nearby casualties...</Typography>
                  </Stack>
                ) : (
                  <Typography variant="body1" sx={{ color: '#f43f5e', fontWeight: 'bold' }}>SYSTEM OFFLINE</Typography>
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      <Dialog
        open={showAlarm}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 8, bgcolor: '#0f172a', color: 'white', border: '2px solid #ef4444', p: 1 } }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
            <Box className="alarm-ring" />
            <Avatar sx={{ bgcolor: '#ef4444', width: 90, height: 90, boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}>
              {typeConfig.icon}
            </Avatar>
            <Box sx={{ position: 'absolute', top: -10, right: -10, bgcolor: '#fff', color: '#000', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '3px solid #ef4444' }}>
              {countdown}
            </Box>
          </Box>
          <Typography variant="h4" fontWeight="900" sx={{ mb: 1, letterSpacing: -1 }}>{(currentIncomingType || 'General').toUpperCase()}</Typography>
          <Typography variant="body1" sx={{ mb: 4, color: '#94a3b8' }}>
            Emergency reported by <strong>{incomingEmergency?.requesterName || 'Patient'}</strong>. {sirenConfig.id === 'silent' ? '(Silent Alert)' : 'Immediate response required.'}
          </Typography>
          <Box sx={{ mt: 4, bgcolor: 'rgba(255,255,255,0.05)', px: 2, py: 1, borderRadius: 6, position: 'relative', height: 64, display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography variant="button" sx={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontWeight: 'bold', opacity: 0.5 - (swipeValue / 200) }}>SWIPE TO ACCEPT</Typography>
            <Slider
              value={swipeValue}
              onChange={onSwipeChange}
              onMouseUp={() => swipeValue < 90 && setSwipeValue(0)}
              onTouchEnd={() => swipeValue < 90 && setSwipeValue(0)}
              disabled={isAccepting}
              sx={{
                position: 'absolute', width: '100%', left: 0, color: 'transparent',
                '& .MuiSlider-thumb': {
                  width: 52, height: 52, bgcolor: isAccepting ? '#94a3b8' : '#ef4444',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                  '&:before': { display: 'none' },
                  '&:hover, &.Mui-focusVisible, &.Mui-active': { boxShadow: '0 4px 20px rgba(239, 68, 68, 0.6)' },
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                },
                '& .MuiSlider-track, & .MuiSlider-rail': { display: 'none' }
              }}
              componentsProps={{ thumb: { children: isAccepting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <KeyboardDoubleArrowRight sx={{ color: 'white' }} /> } }}
            />
          </Box>
          <Button variant="text" fullWidth sx={{ mt: 3, color: 'rgba(255,255,255,0.4)' }} onClick={() => { setIgnoredMissions(prev => new Set(prev).add(incomingEmergency?._id)); setShowAlarm(false); }}>Ignore</Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openSirenSettings}
        onClose={() => setOpenSirenSettings(false)}
        PaperProps={{ sx: { borderRadius: 6, bgcolor: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.1)', minWidth: 320 } }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="900" sx={{ mb: 3 }}>Notification alert</Typography>
          <Stack spacing={2}>
            {SIREN_OPTIONS.map((opt) => (
              <Button
                key={opt.id}
                fullWidth
                variant={sirenConfig.id === opt.id ? "contained" : "outlined"}
                onClick={() => {
                  setSirenConfig(opt);
                  localStorage.setItem('ambulanceSirenConfig', JSON.stringify(opt));
                  if (opt.url) {
                    const preview = new Audio(opt.url);
                    preview.play().catch(() => { });
                    setTimeout(() => preview.pause(), 3000);
                  }
                }}
                sx={{
                  justifyContent: 'space-between',
                  py: 1.5,
                  borderRadius: 3,
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  bgcolor: sirenConfig.id === opt.id ? '#ef4444' : 'transparent',
                  '&:hover': { bgcolor: sirenConfig.id === opt.id ? '#dc2626' : 'rgba(255,255,255,0.05)' }
                }}
              >
                {opt.name}
                {sirenConfig.id === opt.id && <CheckIcon />}
              </Button>
            ))}
          </Stack>
          <Button
            fullWidth
            onClick={() => setOpenSirenSettings(false)}
            sx={{ mt: 3, color: '#94a3b8' }}
          >
            Close
          </Button>
        </Box>
      </Dialog>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .pulse-dot { width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; animation: pulse 2s infinite; }
        .radar-ping { width: 12px; height: 12px; background-color: #38bdf8; border-radius: 50%; border: 2px solid white; animation: pulse 1.5s infinite; }
        .alarm-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #ef4444; animation: pulse 1s infinite; }
      `}</style>
    </Box>
  );
};

export default AmbulanceDashboard;
