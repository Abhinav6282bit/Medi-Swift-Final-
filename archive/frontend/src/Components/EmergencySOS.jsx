import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Stack, Avatar } from '@mui/material';
import { Warning, GpsFixed, LocalHospital, ShutterSpeed, Map } from '@mui/icons-material';
import axios from 'axios';

const EmergencySOS = () => {
    const [phase, setPhase] = useState('ready');
    const [status, setStatus] = useState("Ready to Dispatch");
    const [ambulance, setAmbulance] = useState(null);
    const [arrivalTime, setArrivalTime] = useState(null);
    const [emergencyId, setEmergencyId] = useState(null);
    const [pollInterval, setPollInterval] = useState(null);

    // --- REAL CALCULATION ADDITION ---
    const calculateRealTime = (userLat, userLng, ambLat, ambLng) => {
        const R = 6371;
        const dLat = (ambLat - userLat) * Math.PI / 180;
        const dLon = (ambLng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(ambLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; 
        return Math.round((distance / 40) * 60) + 2;
    };
    // ---------------------------------

    const startSearch = () => {
        setPhase('searching');
        setStatus("Locating nearest ambulance...");
        
      
        setTimeout(() => {
            triggerSOS();
        }, 2000);
    };

    const triggerSOS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
               
                setPhase(prevPhase => {
                    if (prevPhase !== 'searching') return prevPhase;

                    (async () => {
                        try {
                            const user = JSON.parse(localStorage.getItem('userSession'));
                            
                            const res = await axios.post('http://localhost:5000/api/emergency/trigger-sos', {
                                requesterId: user?.mediId || `GUEST-${Date.now()}`,
                                requesterName: user ? `${user.firstName} ${user.lastName}` : "Emergency Guest",
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                            });

                            if (res.data.success && res.data.emergency) {
                                setEmergencyId(res.data.emergency._id);
                                setStatus("Request sent! Waiting for a driver to accept...");
                               
                                startPolling(res.data.emergency._id, pos.coords.latitude, pos.coords.longitude);
                            }
                        } catch (err) {
                            console.error("SOS Trigger Error:", err);
                            setStatus("Server connection failed.");
                            setPhase('ready');
                        }
                    })();
                    
                    return prevPhase;
                });

            }, (error) => {
                console.error("Geolocation Error:", error);
                alert("Location access denied. Please enable GPS and try again.");
                setPhase('ready');
            }, { enableHighAccuracy: true, timeout: 5000 }); 
        } else {
            alert("Geolocation is not supported by this browser.");
            setPhase('ready');
        }
    };

 const startPolling = (id, userLat, userLng) => {
    if (pollInterval) clearInterval(pollInterval);

    const interval = setInterval(async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/emergency/status/${id}`);
            
            if (res.data.success && res.data.status === 'Accepted') {
                const ambData = res.data.emergency;
                
           
                if (ambData && ambData.ambulanceLocation && ambData.ambulanceLocation.lat) {
                    setAmbulance(ambData);
                    
                    const realMins = calculateRealTime(
                        userLat, userLng, 
                        ambData.ambulanceLocation.lat, ambData.ambulanceLocation.lng
                    );
                    
                    setArrivalTime(realMins);
                    setPhase('found');
                    clearInterval(interval); 
                } else {
                    setStatus("Driver found! Getting live location...");
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 3000);

    setPollInterval(interval);
};

    useEffect(() => {
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [pollInterval]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a1a', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
            <Paper elevation={24} sx={{ p: 4, maxWidth: 450, width: '100%', textAlign: 'center', borderRadius: 8, bgcolor: '#fff' }}>
                
                {/* PHASE 1: READY */}
                {phase === 'ready' && (
                    <>
                        <Warning color="error" sx={{ fontSize: 100, mb: 2 }} />
                        <Typography variant="h4" fontWeight="900" gutterBottom>EMERGENCY</Typography>
                        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                            Clicking the button below will share your GPS location with our dispatch center.
                        </Typography>
                        <Button 
                            variant="contained" 
                            fullWidth 
                            size="large"
                            onClick={startSearch}
                            sx={{ bgcolor: '#d32f2f', height: 80, fontSize: '1.5rem', borderRadius: 4, '&:hover': { bgcolor: '#b71c1c' } }}
                        >
                            FIND AMBULANCE
                        </Button>
                    </>
                )}

                {/* PHASE 2: SEARCHING (The Animation) */}
                {phase === 'searching' && (
                    <Box sx={{ py: 5 }}>
                        <Box className="pulse-container">
                            <div className="pulse-ring"></div>
                            <GpsFixed sx={{ fontSize: 60, color: '#d32f2f' }} />
                        </Box>
                        <Typography variant="h5" sx={{ mt: 10, fontWeight: 'bold' }}>{status}</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>Scanning Neraest Ambulance...</Typography>
                    </Box>
                )}

                {/* PHASE 3: FOUND */}
                {phase === 'found' && (
                    <>
                        <LocalHospital color="success" sx={{ fontSize: 80, mb: 2 }} />
                        <Typography variant="h5" fontWeight="bold" color="success.main">AMBULANCE EN ROUTE</Typography>
                        
                        <Paper variant="outlined" sx={{ my: 3, p: 2, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: '#d32f2f' }}><ShutterSpeed /></Avatar>
                                <Box textAlign="left">
                                    <Typography variant="caption">ESTIMATED ARRIVAL</Typography>
                                    <Typography variant="h6" fontWeight="bold">{arrivalTime} Minutes</Typography>
                                </Box>
                            </Stack>
                            <Typography variant="h4">🚑</Typography>
                        </Paper>

                        <Typography variant="body2" sx={{ mb: 3 }}>Driver ID: {ambulance?.ambulanceId || 'N/A'}</Typography>
                        
                        {/* REAL PHONE LINK */}
                        <Button 
                            variant="contained" 
                            fullWidth 
                            sx={{ bgcolor: '#000', mb: 2 }} 
                            href={`tel:${ambulance?.driverPhone || '911'}`}
                        >
                            Call Driver
                        </Button>
                        <Button variant="text" color="error" onClick={() => {if (pollInterval) clearInterval(pollInterval);setPollInterval(null);setPhase('ready');setEmergencyId(null);}}>Cancel Request</Button>
                    </>
                )}

                <style>{`
                    .pulse-container {
                        position: relative;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .pulse-ring {
                        position: absolute;
                        width: 100px;
                        height: 100px;
                        border: 5px solid #d32f2f;
                        border-radius: 50%;
                        animation: pulsate 1.5s ease-out infinite;
                    }
                    @keyframes pulsate {
                        0% { transform: scale(0.1); opacity: 0; }
                        50% { opacity: 1; }
                        100% { transform: scale(1.5); opacity: 0; }
                    }
                `}</style>
            </Paper>
        </Box>
    );
};

export default EmergencySOS;