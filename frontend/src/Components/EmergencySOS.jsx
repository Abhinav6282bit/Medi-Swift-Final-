import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Stack, Avatar, IconButton, Grid, Divider, Stepper, Step, StepLabel } from '@mui/material';
import { Warning, GpsFixed, LocalHospital, ShutterSpeed, Map, DirectionsCar, Coronavirus, LocalFireDepartment, MedicalServices, HelpOutline, CheckCircle, Person, Phone } from '@mui/icons-material';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const EmergencySOS = () => {
    const [phase, setPhase] = useState('ready'); // ready, selecting, searching, found, completed
    const [status, setStatus] = useState("Initializing Secure Uplink...");
    const [ambulance, setAmbulance] = useState(null);
    const [arrivalTime, setArrivalTime] = useState(null);
    const [emergencyId, setEmergencyId] = useState(null);
    const [pollInterval, setPollInterval] = useState(null);
    const [emergencyType, setEmergencyType] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const [canSelect, setCanSelect] = useState(false); // Gate to prevent auto-trigger

    // Press & Hold States
    const [holdActive, setHoldActive] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimerRef = useRef(null);

    // Effect to unlock selection after entering selecting phase
    useEffect(() => {
        if (phase === 'selecting') {
            const timer = setTimeout(() => setCanSelect(true), 600);
            return () => clearTimeout(timer);
        } else {
            setCanSelect(false);
        }
    }, [phase]);

    const EMERGENCY_TYPES = [
        { id: 'Accident', label: 'Accident', icon: <DirectionsCar />, color: '#f44336' },
        { id: 'Cardiac', label: 'Cardiac/Heart', icon: <MedicalServices />, color: '#e91e63' },
        { id: 'Respiratory', label: 'Breathing', icon: <Coronavirus />, color: '#2196f3' },
        { id: 'Fire', label: 'Fire/Burn', icon: <LocalFireDepartment />, color: '#ff9800' },
        { id: 'General', label: 'General Task', icon: <HelpOutline />, color: '#607d8b' },
    ];

    const MISSION_STEPS = ['Request Sent', 'Finding Unit', 'En Route', 'Arrived'];

    const calculateRealTime = (userLat, userLng, ambLat, ambLng) => {
        const R = 6371;
        const dLat = (ambLat - userLat) * Math.PI / 180;
        const dLon = (ambLng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(ambLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        // Logic: 0.5km to 3km distance at ~40km/h
        return Math.max(2, Math.round((distance / 40) * 60) + 1);
    };

    const handleHoldStart = () => {
        setHoldActive(true);
        setHoldProgress(0);
        const startTime = Date.now();
        holdTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / 3000) * 100, 100); // 3 sec hold for reliability
            setHoldProgress(progress);
            if (progress >= 100) {
                clearInterval(holdTimerRef.current);
                setHoldActive(false);
                setPhase('selecting');
            }
        }, 50);
    };

    const handleHoldEnd = () => {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldActive(false);
        setHoldProgress(0);
    };

    const selectEmergency = (type) => {
        if (!canSelect) return; // Prevent accidental selection from hold release
        setEmergencyType(type);
        setPhase('searching');
        setActiveStep(0);
        triggerSOS(type);
    };

    const triggerSOS = (type) => {
        if (navigator.geolocation) {
            setStatus("Fetching current location...");
            navigator.geolocation.getCurrentPosition(async (pos) => {
                setActiveStep(1);
                setStatus("Broadcasting SOS to nearby units...");
                try {
                    const user = JSON.parse(localStorage.getItem('user'));
                    const res = await axios.post(`${API_BASE_URL}/api/emergency/trigger-sos`, {
                        requesterId: user?.mediId || `GUEST-${Date.now()}`,
                        requesterName: user ? `${user.firstName} ${user.lastName}` : "Emergency Guest",
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                        emergencyType: type
                    });

                    if (res.data.success && res.data.emergency) {
                        setEmergencyId(res.data.emergency._id);
                        startPolling(res.data.emergency._id, pos.coords.latitude, pos.coords.longitude);
                    }
                } catch (err) {
                    console.error("SOS Trigger Error:", err);
                    setStatus("Server connection failed. Retrying...");
                    // Don't go back to ready, stay in searching and retry if needed (simplified here)
                }
            }, (error) => {
                console.error("Geolocation Error:", error);
                alert("GPS Accuracy too low or permission denied. Please ensure Location is ON.");
                setPhase('ready');
            }, { enableHighAccuracy: true, timeout: 15000 });
        } else {
            alert("This device does not support GPS services.");
            setPhase('ready');
        }
    };

    const startPolling = (id, userLat, userLng) => {
        if (pollInterval) clearInterval(pollInterval);
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/emergency/status/${id}`);
                if (!res.data.success) return;

                const currentStatus = res.data.status;

                // Sync with Responder
                if (currentStatus === 'Completed') {
                    setPhase('completed');
                    clearInterval(interval);
                    return;
                }
                if (currentStatus === 'Cancelled') {
                    alert("SOS cancelled per system or administrator action.");
                    resetSOS();
                    clearInterval(interval);
                    return;
                }

                if (['Accepted', 'OnWay', 'Arrived'].includes(currentStatus)) {
                    const ambData = res.data.emergency;
                    if (ambData && ambData.ambulanceLocation && ambData.ambulanceLocation.lat) {
                        setAmbulance(ambData);
                        setActiveStep(currentStatus === 'Arrived' ? 3 : 2); // 2=En Route, 3=Arrived

                        const mins = calculateRealTime(userLat, userLng, ambData.ambulanceLocation.lat, ambData.ambulanceLocation.lng);
                        setArrivalTime(mins);

                        // Keep phase as 'found' until 'completed'
                        if (phase !== 'found') setPhase('found');
                    }
                }
            } catch (e) { console.error("Poll fail", e); }
        }, 1500); // Faster polling for real-time updates
        setPollInterval(interval);
    };

    const resetSOS = async () => {
        if (pollInterval) clearInterval(pollInterval);
        setPollInterval(null);

        // Notify backend of cancellation if an ID exists
        if (emergencyId) {
            try {
                await axios.put(`${API_BASE_URL}/api/emergency/cancel/${emergencyId}`);
            } catch (err) { console.error("Cancel notify fail", err); }
        }

        setPhase('ready');
        setEmergencyId(null);
        setAmbulance(null);
        setArrivalTime(null);
        setActiveStep(0);
    };

    useEffect(() => {
        return () => { if (pollInterval) clearInterval(pollInterval); };
    }, [pollInterval]);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, position: 'relative', overflow: 'hidden' }}>
            {/* Background Glows */}
            <Box sx={{ position: 'absolute', top: '-10%', left: '-10%', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 60%)', zIndex: 0 }} />

            <Paper elevation={24} sx={{ p: 4, maxWidth: 450, width: '100%', textAlign: 'center', borderRadius: 6, bgcolor: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', position: 'relative', zIndex: 1 }}>

                {/* PHASE 1: READY */}
                {phase === 'ready' && (
                    <Box sx={{ py: 2 }}>
                        <Avatar sx={{ bgcolor: '#fee2e2', width: 100, height: 100, mx: 'auto', mb: 2 }}>
                            <Warning sx={{ fontSize: 60, color: '#dc2626' }} />
                        </Avatar>
                        <Typography variant="h4" fontWeight="900" sx={{ color: '#1e293b', mb: 1 }}>EMERGENCY SOS</Typography>
                        <Typography variant="body2" sx={{ mb: 6, color: '#64748b' }}>
                            One-tap secure dispatch. Your real-time GPS and medical ID will be shared with responders.
                        </Typography>

                        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 8, height: 180 }}>
                            <CircularProgress variant="determinate" value={holdProgress} size={200} thickness={4} sx={{ color: '#dc2626', position: 'absolute', zIndex: 2 }} />
                            <CircularProgress variant="determinate" value={100} size={200} thickness={4} sx={{ color: '#f1f5f9', position: 'absolute', zIndex: 1 }} />
                            <Button
                                onMouseDown={handleHoldStart} onMouseUp={handleHoldEnd} onMouseLeave={handleHoldEnd}
                                onTouchStart={handleHoldStart} onTouchEnd={handleHoldEnd}
                                variant="contained"
                                sx={{
                                    width: 160, height: 160, borderRadius: '50%', bgcolor: '#dc2626',
                                    fontWeight: '900', fontSize: '1.2rem', boxShadow: '0 15px 35px rgba(220, 38, 38, 0.4)',
                                    zIndex: 3, '&:hover': { bgcolor: '#b91c1c' },
                                    display: 'flex', flexDirection: 'column', gap: 1,
                                    transform: holdActive ? 'scale(0.92)' : 'scale(1)',
                                    transition: 'transform 0.1s ease-in-out, background-color 0.3s'
                                }}
                            >
                                {holdActive ? (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="h4" fontWeight="900" sx={{ lineHeight: 1 }}>{Math.round(holdProgress)}%</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>HOLDING...</Typography>
                                    </Box>
                                ) : (
                                    <>
                                        <GpsFixed sx={{ fontSize: 40 }} />
                                        <Typography variant="button" fontWeight="900" sx={{ mt: 1 }}>PRESS & HOLD</Typography>
                                    </>
                                )}
                            </Button>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 2, display: 'block' }}>
                            Press and hold for 2 seconds to trigger
                        </Typography>
                    </Box>
                )}

                {/* PHASE: SELECTING */}
                {phase === 'selecting' && (
                    <Box sx={{ py: 1 }}>
                        <Typography variant="h5" fontWeight="900" sx={{ mb: 1 }}>SELECT TYPE</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>Categorizing helps us send specialized medics.</Typography>
                        <Grid container spacing={2}>
                            {EMERGENCY_TYPES.map((type) => (
                                <Grid item xs={6} key={type.id}>
                                    <Paper
                                        onClick={() => selectEmergency(type.id)}
                                        sx={{
                                            p: 3, borderRadius: 4, cursor: 'pointer', border: '2px solid transparent',
                                            transition: '0.2s', '&:hover': { borderColor: type.color, bgcolor: '#f8fafc', transform: 'translateY(-4px)' }
                                        }}
                                    >
                                        <Box sx={{ color: type.color, mb: 1 }}>{type.icon}</Box>
                                        <Typography variant="subtitle2" fontWeight="bold">{type.label}</Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                        <Button variant="text" sx={{ mt: 3, color: '#64748b' }} onClick={() => setPhase('ready')}>Cancel</Button>
                    </Box>
                )}

                {/* PHASE: SEARCHING */}
                {phase === 'searching' && (
                    <Box sx={{ py: 3 }}>
                        <Box sx={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4 }}>
                            <Box className="sonar-ring r1" />
                            <Box className="sonar-ring r2" />
                            <Box className="sonar-ring r3" />
                            <Box className="sonar-sweep" />
                            <GpsFixed sx={{ fontSize: 60, color: '#dc2626', zIndex: 10 }} />
                        </Box>

                        <Typography variant="h5" fontWeight="900" sx={{ color: '#1e293b', mb: 1 }}>{activeStep === 0 ? "Detecting Location" : "Searching Units"}</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>{status}</Typography>

                        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                            {MISSION_STEPS.map((label) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>

                        <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 4, textAlign: 'left', border: '1px solid #e2e8f0' }}>
                            <Typography variant="caption" fontWeight="bold" color="primary">STAY CALM & SAFE:</Typography>
                            <Typography variant="body2" sx={{ color: '#475569' }}>
                                Find a clear area if possible. Keep your phone line open for dispatch calls.
                            </Typography>
                        </Box>
                        <Button variant="text" color="error" fullWidth sx={{ mt: 4 }} onClick={resetSOS}>Cancel Request</Button>
                    </Box>
                )}

                {/* PHASE: FOUND */}
                {phase === 'found' && (
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 3 }}>
                            <CheckCircle sx={{ color: '#10b981', fontSize: 28 }} />
                            <Typography variant="h5" fontWeight="900">RESPONDER DISPATCHED</Typography>
                        </Stack>

                        <Paper variant="outlined" sx={{ p: 4, borderRadius: 6, bgcolor: '#f0fdf4', border: '2px solid #bbf7d0', mb: 3 }}>
                            <Typography variant="overline" color="textSecondary" fontWeight="bold">ESTIMATED ARRIVAL</Typography>
                            <Typography variant="h2" fontWeight="900" sx={{ color: '#166534', my: 1 }}>
                                {arrivalTime} <small style={{ fontSize: '1.2rem', fontWeight: 600 }}>MIN</small>
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>DRIVER</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Person sx={{ fontSize: 18, color: '#166534' }} />
                                        <Typography variant="body1" fontWeight="bold">{ambulance?.driverName || 'Dispatch Officer'}</Typography>
                                    </Stack>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>UNIT ID</Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <LocalHospital sx={{ fontSize: 18, color: '#166534' }} />
                                        <Typography variant="body1" fontWeight="bold">#{ambulance?.ambulanceId || '000'}</Typography>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Paper>

                        <Stack spacing={2}>
                            <Button
                                variant="contained" fullWidth size="large"
                                startIcon={<Phone />}
                                href={`tel:${ambulance?.driverPhone || '911'}`}
                                sx={{ bgcolor: '#0f172a', py: 2, borderRadius: 4, fontWeight: 'bold' }}
                            >
                                CALL DRIVER: {ambulance?.driverPhone}
                            </Button>
                            <Button
                                variant="outlined" fullWidth size="large"
                                startIcon={<Map />}
                                onClick={() => alert("Tracking view active. Please stay at your GPS point.")}
                                sx={{ py: 2, borderRadius: 4, fontWeight: 'bold' }}
                            >
                                TRACK ON MAP
                            </Button>
                            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1 }}>
                                Mission ID: {emergencyId?.slice(-6).toUpperCase()}
                            </Typography>
                        </Stack>
                    </Box>
                )}

                {/* PHASE: COMPLETED */}
                {phase === 'completed' && (
                    <Box sx={{ py: 4 }}>
                        <Avatar sx={{ bgcolor: '#dcfce7', width: 100, height: 100, mx: 'auto', mb: 3 }}>
                            <CheckCircle sx={{ fontSize: 60, color: '#10b981' }} />
                        </Avatar>
                        <Typography variant="h4" fontWeight="900" sx={{ color: '#1e293b', mb: 1 }}>MISSION COMPLETE</Typography>
                        <Typography variant="body1" sx={{ color: '#64748b', mb: 6 }}>
                            Medical assistance has reached your location or the emergency has been successfully resolved.
                        </Typography>
                        <Button
                            variant="contained" fullWidth size="large"
                            onClick={resetSOS}
                            sx={{ bgcolor: '#0f172a', py: 2, borderRadius: 4, fontWeight: 'bold' }}
                        >
                            RETURN TO DASHBOARD
                        </Button>
                    </Box>
                )}

                <style>{`
                    .sonar-ring { position: absolute; border: 2px solid rgba(220, 38, 38, 0.2); border-radius: 50%; animation: sonar 3s linear infinite; }
                    .r1 { width: 60px; height: 60px; animation-delay: 0s; }
                    .r2 { width: 120px; height: 120px; animation-delay: 1s; }
                    .r3 { width: 180px; height: 180px; animation-delay: 2s; }
                    
                    @keyframes sonar {
                        0% { transform: scale(1); opacity: 0.8; }
                        100% { transform: scale(1.5); opacity: 0; }
                    }

                    .sonar-sweep {
                        position: absolute; width: 150px; height: 150px;
                        background: conic-gradient(from 0deg, rgba(220, 38, 38, 0.3) 0%, transparent 45%);
                        border-radius: 50%; animation: rotate 2s linear infinite;
                    }

                    @keyframes rotate {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </Paper>
        </Box>
    );
};

export default EmergencySOS;
