import React, { useState, useEffect, useRef } from 'react';
import { 
  AppBar, Box, Toolbar, Typography, Button, Switch, Paper, 
  Stack, IconButton, Dialog, DialogContent, Avatar 
} from '@mui/material';
import { 
  Logout as LogoutIcon, 
  NotificationsActive as AlarmIcon, 
  Navigation as NavIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';


import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng]);
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

  const audioRef = useRef(new Audio("https://actions.google.com/sounds/v1/emergency/ambulance_siren.ogg"));

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('userSession'));
    if (user) {
      setDriverData({
        name: `${user.firstName} ${user.lastName}`,
        mediId: user.mediId,
        phone: user.phone || "911"
      });
    } else {
      navigate('/');
    }

    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, null, { enableHighAccuracy: true });
  }, [navigate]);

  
  useEffect(() => {
    const siren = audioRef.current;
    siren.loop = true;

    if (showAlarm) {
      siren.play().catch(err => console.log("Audio play blocked until user interacts with page."));
    } else {
      siren.pause();
      siren.currentTime = 0;
    }

    return () => siren.pause();
  }, [showAlarm]);

  
  useEffect(() => {
    let pollInterval;
    
    const checkRequests = async () => {
      if (!isOnDuty || activeEmergency) return; 

      try {
        const res = await axios.get(`http://localhost:5000/api/ambulance/check-emergency/${driverData.mediId}`);
        console.log("Server found emergency:", res.data.emergency);

        if (res.data.emergency && !showAlarm) {
          if (res.data.emergency.status === 'Accepted' && res.data.emergency.ambulanceId === driverData.mediId) {
            setActiveEmergency(res.data.emergency);
          } else if (res.data.emergency.status === 'Searching') {
            setIncomingEmergency(res.data.emergency);
            setShowAlarm(true); 
          }
        }
      } catch (err) { 
        console.error("Polling error:", err); 
      }
    };

    if (isOnDuty && !activeEmergency) {
      pollInterval = setInterval(checkRequests, 3000); 
    }

    return () => clearInterval(pollInterval);
  }, [isOnDuty, driverData.mediId, showAlarm, activeEmergency]);

 
  useEffect(() => {
    let broadcastInterval;
    if (activeEmergency) {
      broadcastInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });
          try {
            await axios.put(`http://localhost:5000/api/emergency/update-location/${activeEmergency._id}`, {
              lat: latitude,
              lng: longitude
            });
          } catch (err) { console.error("Broadcast failed"); }
        }, null, { enableHighAccuracy: true });
      }, 5000); 
    }
    return () => clearInterval(broadcastInterval);
  }, [activeEmergency]);

  const handleToggleDuty = async () => {
    const newStatus = !isOnDuty;
    setIsOnDuty(newStatus);
    try {
        await axios.put(`http://localhost:5000/api/ambulance/toggle-status/${driverData.mediId}`, {
            isOnline: newStatus,
            lat: location.lat,
            lng: location.lng
        });
    } catch (err) { console.error("Status toggle failed"); }
  };

  const handleAcceptRequest = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const res = await axios.put(`http://localhost:5000/api/emergency/accept/${incomingEmergency._id}`, {
                ambulanceId: driverData.mediId,
                driverPhone: driverData.phone,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            });
            if (res.data.success) {
                setActiveEmergency(res.data.emergency);
                setShowAlarm(false);
            }
        } catch (err) { alert("Acceptance failed"); }
    });
  };

  const handleCompleteMission = async () => {
    if (!window.confirm("Mark mission as completed?")) return;
    try {
      const res = await axios.put(`http://localhost:5000/api/emergency/complete/${activeEmergency._id}`);
      if (res.data.success) {
        setActiveEmergency(null);
        alert("Mission Completed.");
      }
    } catch (err) { console.error("Completion error"); }
  };

  return (
    <Box sx={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', bgcolor: '#121212' }}>
      <AppBar position="static" sx={{ bgcolor: '#000', borderBottom: '1px solid #333' }}>
        <Toolbar>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#333', px: 2, py: 0.5, borderRadius: 5 }}>
                <Typography variant="body2" sx={{ color: isOnDuty ? '#4caf50' : '#f44336', fontWeight: 'bold', mr: 1 }}>
                  {isOnDuty ? "Online" : "Offline"}
                </Typography>
                <Switch size="small" checked={isOnDuty} onChange={handleToggleDuty} color="success" />
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" sx={{ border: '1px solid #444', px: 2, py: 0.5, borderRadius: 4, color: '#bbb' }}>
              ID: <strong>{driverData.mediId}</strong>
            </Typography>
            <IconButton sx={{ color: 'white' }} onClick={() => navigate('/ambulance-history')}><AlarmIcon /></IconButton>
            <Button color="inherit" onClick={() => { localStorage.clear(); navigate('/'); }} startIcon={<LogoutIcon />}>Logout</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <MapContainer center={[location.lat, location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Marker position={[location.lat, location.lng]} />
          {activeEmergency && (
            <Marker position={[activeEmergency.location.lat, activeEmergency.location.lng]} />
          )}
          <RecenterMap coords={location} />
        </MapContainer>

        <Paper sx={{ position: 'absolute', bottom: 0, width: '100%', zIndex: 1000, p: 3, borderRadius: '24px 24px 0 0', bgcolor: '#1e1e1e', color: 'white' }}>
          {activeEmergency ? (
            <Stack spacing={2}>
              <Typography variant="h6" color="error">MISSION IN PROGRESS</Typography>
              <Typography variant="body1">Patient: <strong>{activeEmergency.requesterName}</strong></Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Location: {activeEmergency.location.address}</Typography>
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="contained" fullWidth sx={{ bgcolor: '#ff4b2b' }} startIcon={<NavIcon />}
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeEmergency.location.lat},${activeEmergency.location.lng}`)}
                >NAVIGATE</Button>
                <Button variant="outlined" fullWidth color="success" onClick={handleCompleteMission} startIcon={<CheckIcon />}>COMPLETE</Button>
              </Stack>
            </Stack>
          ) : (
            <Typography textAlign="center" sx={{ py: 2, opacity: 0.6 }}>
              {isOnDuty ? "Waiting for nearby requests..." : "Go Online to start receiving duties"}
            </Typography>
          )}
        </Paper>
      </Box>

      <Dialog open={showAlarm} PaperProps={{ sx: { borderRadius: 8, p: 3, textAlign: 'center' } }}>
        <DialogContent>
          <Avatar sx={{ bgcolor: '#ffebee', width: 80, height: 80, mx: 'auto', mb: 2 }}>
            <AlarmIcon sx={{ fontSize: 40, color: 'red' }} />
          </Avatar>
          <Typography variant="h5" fontWeight="bold">EMERGENCY!</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>{incomingEmergency?.requesterName} needs help nearby.</Typography>
          <Button variant="contained" fullWidth color="error" size="large" onClick={handleAcceptRequest}>ACCEPT REQUEST</Button>
          <Button variant="text" fullWidth color="inherit" sx={{ mt: 1 }} onClick={() => setShowAlarm(false)}>Ignore</Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AmbulanceDashboard;