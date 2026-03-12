import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Button, Stack, TextField, Avatar, Divider,
    CircularProgress, Paper, Dialog, Chip, IconButton, Popover,
    InputAdornment, List, ListItem, ListItemAvatar, ListItemText, ListItemButton,
    Drawer, ListItemIcon, Badge, Tooltip, LinearProgress, Autocomplete,
    Checkbox, FormControlLabel, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    Print as PrintIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    Logout as LogoutIcon,
    Bed as BedIcon,
    CheckCircle as CheckIcon,
    AccessTime as TimeIcon,
    LocalHospital as HospitalIcon,
    ArrowForward as ArrowIcon,
    MoreVert as MoreIcon,
    Notifications as BellIcon,
    FiberManualRecord as DotIcon,
    Menu as MenuIcon,
    Science as LabIcon,
    Medication as MedicineIcon,
    HistoryEdu as HistoryEduIcon,
    EventAvailable as BookingIcon,
    LocalHospital as AdmitIcon
} from '@mui/icons-material';

const MEDICINE_LIST = [
    "Paracetamol 500mg", "Amoxicillin 250mg", "Metformin 500mg", "Atorvastatin 10mg",
    "Amlodipine 5mg", "Ibuprofen 400mg", "Omeprazole 20mg", "Losartan 50mg",
    "Albuterol Inhaler", "Gabapentin 300mg", "Hydrochlorothiazide 25mg", "Sertraline 50mg",
    "Pantoprazole 40mg", "Montelukast 10mg", "Fluticasone Nasal Spray", "Rosuvastatin 10mg",
    "Escitalopram 10mg", "Prednisone 5mg", "Meloxicam 15mg", "Insulin Glargine",
    "Azithromycin 250mg", "Clopidogrel 75mg", "Furosemide 40mg", "Warfarin 5mg",
    "Tamsulosin 0.4mg", "Quetiapine 25mg", "Levothyroxine 50mcg", "Venlafaxine 75mg",
    "Duloxetine 30mg", "Ranitidine 150mg", "Citalopram 20mg", "Tramadol 50mg"
];
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const DoctorDashboard = () => {
    const navigate = useNavigate();

    // Premium Animations
    const pulseKeyframes = `
        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes sweep {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
    `;

    const session = JSON.parse(localStorage.getItem('user')) || {};

    const [view, setView] = useState('Overview');
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openPrescription, setOpenPrescription] = useState(false);
    const [openPreConsultation, setOpenPreConsultation] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientHistory, setPatientHistory] = useState([]);
    const [activePatientProfile, setActivePatientProfile] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [treatmentData, setTreatmentData] = useState({
        diagnosis: '', medicines: '', labTests: '',
        nextAppointmentDate: '', expectedDischargeDate: '', followUpInstructions: '',
        preBookingDate: '', medicalHistory: '',
        needsPreBooking: false,
        sendToPharmacy: false,
        sendToLab: false
    });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [inPatients, setInPatients] = useState([]);
    const [isIPDMode, setIsIPDMode] = useState(false);
    const [ipdPatientLocal, setIpdPatientLocal] = useState(null);

    // --- NOTIFICATION STATES ---
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (session.role !== 'DOCTOR') navigate('/');
        fetchDoctorQueue();
        fetchInPatients();
        fetchNotifications();
        const interval = setInterval(() => {
            fetchDoctorQueue();
            fetchInPatients();
            fetchNotifications();
        }, 20000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const hId = session.hospitalId || session.hospitalMediId;
            if (!hId) return;
            const res = await axios.get(`${API_BASE_URL}/api/hospital/notifications/${hId}`);
            if (res.data.success) {
                // Map backend notifications to the display format
                const backendNotifs = res.data.notifications.map(n => ({
                    _id: n._id,
                    msg: n.message,
                    title: n.title,
                    type: n.type,
                    time: new Date(n.createdAt),
                    read: n.read,
                    metadata: n.metadata || {}
                }));
                // Sort by time descending
                backendNotifs.sort((a, b) => b.time - a.time);
                setNotifications(backendNotifs);
                setUnreadCount(backendNotifs.filter(n => !n.read).length);
            } else {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (err) {
            console.error('Fetch Notifications Error:', err);
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    const fetchDoctorQueue = async () => {
        try {
            const hId = session.hospitalId || session.hospitalMediId;
            if (!hId) return;
            const res = await axios.get(`${API_BASE_URL}/api/get-hospital-appointments/${hId}`);
            setAppointments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch Queue Error:', err);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchInPatients = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/doctor/ipd-patients/${session.mediId}`);
            if (res.data.success) {
                setInPatients(res.data.patients);
            }
        } catch (err) {
            console.error('Fetch IPD Error:', err);
        }
    };

    const handleNotificationOpen = (event) => setNotificationAnchor(event.currentTarget);
    const handleNotificationClose = () => setNotificationAnchor(null);

    const handleDeleteNotification = async (notifId) => {
        try {
            const res = await axios.delete(`${API_BASE_URL}/api/notifications/${notifId}`);
            if (res.data.success) {
                fetchNotifications();
            }
        } catch (err) {
            console.error("Error deleting notification:", err);
            setNotifications(notifications.filter(n => n._id !== notifId));
        }
    };

    const handleClearAllNotifications = async () => {
        if (!window.confirm("Clear all notifications?")) return;
        try {
            const hId = session.hospitalId || session.hospitalMediId;
            const res = await axios.delete(`${API_BASE_URL}/api/notifications/clear-all/${hId}`);
            if (res.data.success) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (err) {
            console.error("Error clearing notifications:", err);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/search-patient/${encodeURIComponent(searchQuery)}`);
            if (res.data.success) {
                setSearchResults(res.data.patients || [res.data.patient]);
                setView('Search');
            }
        } catch (err) {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const fetchPatientDetails = async (patient) => {
        setSelectedPatient(patient);
        setLoadingHistory(true);
        try {
            const histRes = await axios.get(`${API_BASE_URL}/api/patient-history/${patient.mediId}`);
            setPatientHistory(histRes.data);
            const profRes = await axios.get(`${API_BASE_URL}/api/patient-profile/${patient.mediId}`);
            if (profRes.data.success) {
                setActivePatientProfile(profRes.data.patient);
                // Also populate the editable medical history for the current session
                setTreatmentData(prev => ({
                    ...prev,
                    medicalHistory: profRes.data.patient.medicalHistory || ''
                }));
            }
        } catch (err) {
            console.error('Data fetch failed', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchDateSummary = async (date) => {
        setLoadingSummary(true);
        try {
            const hId = session.hospitalId || session.hospitalMediId;
            const res = await axios.get(`${API_BASE_URL}/api/get-hospital-appointments/${encodeURIComponent(hId)}`);
            const filtered = res.data.filter(apt => {
                const aptDate = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
                return apt.doctorId === session.mediId && aptDate === date && apt.status === 'Completed';
            });
            setSummaryData(filtered);
        } catch (err) {
            console.error('Fetch summary failed', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            await axios.put(`${API_BASE_URL}/api/update-appointment-status/${appointmentId}`, { status: newStatus });
            fetchDoctorQueue();
            if (newStatus === 'Consulting') {
                const target = appointments.find(a => a._id === appointmentId);
                if (target?.patientId) fetchPatientDetails({ mediId: target.patientId, firstName: target.patientName });
                setOpenPrescription(true);
            }
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const handleDischargeRequest = async (appointmentId) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/discharge/request/${appointmentId}`);
            if (res.data.success) {
                alert("Discharge requested successfully. Hospital will process the billing.");
                fetchInPatients(); // Refresh to show updated button state
            }
        } catch (err) {
            console.error('Discharge request failed:', err);
            alert("Failed to request discharge: " + (err.response?.data?.message || err.message));
        }
    };

    const handleCompleteConsultation = async (activeId, finalStatus = 'Completed') => {
        try {
            const targetId = activeId || ipdPatientLocal?._id || ipdPatientLocal?.appointmentId;
            if (!targetId) return;
            const payload = { appointmentId: targetId, ...treatmentData };
            if (finalStatus === 'Admitted') payload.admissionDate = new Date().toLocaleString();

            const res = await axios.post(`${API_BASE_URL}/api/complete-session`, payload);
            if (res.data.success) {
                // Handle Pre-Booking Request
                if (treatmentData.needsPreBooking && treatmentData.preBookingDate) {
                    await axios.post(`${API_BASE_URL}/api/pre-booking/request`, {
                        patientId: activePatient.patientId,
                        doctorId: session.mediId,
                        doctorName: `${session.firstName} ${session.lastName || ''}`,
                        hospitalId: session.hospitalMediId || session.hospitalId,
                        hospitalName: session.hospitalName,
                        date: treatmentData.preBookingDate
                    });
                }

                // Handle Admission Request (Scheduled or Urgent)
                if (finalStatus === 'Admitted') {
                    await axios.post(`${API_BASE_URL}/api/admission/request`, {
                        appointmentId: activeId,
                        patientId: activePatient.patientId,
                        patientName: activePatient.patientName,
                        doctorId: session.mediId,
                        doctorName: `${session.firstName} ${session.lastName || ''}`,
                        hospitalId: activePatient.hospitalId || session.hospitalMediId,
                        hospitalName: activePatient.hospitalName || session.hospitalName,
                        admissionDate: new Date().toISOString(),
                        isUrgent: finalStatus === 'Admitted'
                    });
                }

                if (finalStatus !== 'Completed') {
                    await axios.put(`${API_BASE_URL}/api/update-appointment-status/${activeId}`, {
                        status: finalStatus,
                        admissionDate: payload.admissionDate
                    });
                }

                setOpenPrescription(false);
                setOpenPreConsultation(false);
                setTreatmentData({
                    diagnosis: '', medicines: '', labTests: '',
                    nextAppointmentDate: '', expectedDischargeDate: '', followUpInstructions: '',
                    preBookingDate: '', medicalHistory: '',
                    needsPreBooking: false,
                    sendToPharmacy: false,
                    sendToLab: false
                });
                fetchDoctorQueue();
                fetchInPatients();
                if (finalStatus === 'Admitted') setView('IPD');
            }
        } catch (err) {
            console.error('Consultation completion failed:', err);
            alert(`Failed to save: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleUpdateIPD = async (appointmentId, field, value) => {
        try {
            await axios.put(`${API_BASE_URL}/api/update-appointment-status/${appointmentId}`, { [field]: value });
            fetchDoctorQueue();
            fetchInPatients();
        } catch (err) {
            console.error('Update IPD failed:', err);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const myAppointments = safeAppointments.filter(apt => {
        try {
            const isMyPatient = apt.doctorId === session.mediId;
            const aptDate = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
            return isMyPatient && aptDate === todayStr;
        } catch (e) {
            return false;
        }
    });

    const activePatient = myAppointments.find(a => a.status === 'Consulting') || myAppointments.find(a => a.status === 'Waiting');
    const upcomingQueue = myAppointments.filter(a =>
        (a.status === 'Waiting' || a.status === 'Skipped') &&
        (activePatient ? a._id !== activePatient._id : true)
    ).sort((a, b) => Number(a.token) - Number(b.token));
    const completedCount = myAppointments.filter(a => a.status === 'Completed').length;
    const totalToday = myAppointments.length;

    if (loading) return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#060d1f' }}>
            <Stack alignItems="center" spacing={2}>
                <CircularProgress thickness={3} sx={{ color: '#6366f1' }} size={48} />
                <Typography sx={{ color: '#94a3b8' }}>Loading Workstation...</Typography>
            </Stack>
        </Box>
    );

    const menuItems = [
        { text: 'Overview', icon: <DashboardIcon />, view: 'Overview', badge: upcomingQueue.length },
        { text: 'In-Patients (IPD)', icon: <BedIcon />, view: 'IPD', badge: inPatients.length },
        { text: 'Medical Records', icon: <HistoryIcon />, view: 'History' },
    ];

    const statCards = [
        {
            label: "Today's Patients",
            value: totalToday,
            sub: 'Registered today',
            accent: '#6366f1',
            icon: <PeopleIcon sx={{ fontSize: 28, opacity: 0.9 }} />
        },
        {
            label: 'Completed',
            value: completedCount,
            sub: 'Consultations done',
            accent: '#10b981',
            icon: <CheckIcon sx={{ fontSize: 28, opacity: 0.9 }} />
        },
        {
            label: 'Waiting',
            value: upcomingQueue.length,
            sub: 'Patients in queue',
            accent: '#f59e0b',
            icon: <TimeIcon sx={{ fontSize: 28, opacity: 0.9 }} />
        },
        {
            label: 'Admitted (IPD)',
            value: inPatients.length,
            sub: 'Under your care',
            accent: '#ef4444',
            icon: <BedIcon sx={{ fontSize: 28, opacity: 0.9 }} />
        }
    ];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0d0f1e 0%, #101828 35%, #0f1b30 65%, #0b1220 100%)' }}>
            {/* Sidebar (Drawer) */}
            <Drawer
                variant="temporary"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{
                    [`& .MuiDrawer-paper`]: {
                        width: 280,
                        boxSizing: 'border-box',
                        background: 'linear-gradient(160deg, #0d0f1e 0%, #111827 60%, #0d1526 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '10px 0 40px rgba(0,0,0,0.6)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': {
                            display: 'none'
                        }
                    },
                }}
            >

                {/* Logo */}
                <Box sx={{ p: 3, pb: 2.5, position: 'relative', zIndex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{
                            width: 46, height: 46, borderRadius: 2.5,
                            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 16px rgba(99,102,241,0.5)'
                        }}>
                            <HospitalIcon sx={{ color: 'white', fontSize: 26 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight="900" sx={{ lineHeight: 1, letterSpacing: 1, fontSize: '1rem' }}>MEDI-SWIFT</Typography>
                            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700, letterSpacing: 2, fontSize: '0.6rem' }}>DOCTOR PORTAL</Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* Doctor Profile Card */}
                <Box sx={{ mx: 2, mb: 3, p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 100%)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 1 }}>
                    <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                src={session.photoUrl ? `${API_BASE_URL}/${session.photoUrl}` : ''}
                                sx={{ width: 64, height: 64, bgcolor: '#6366f1', fontWeight: 'bold', fontSize: 24, border: '3px solid rgba(99,102,241,0.5)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}
                            >
                                {session.firstName?.charAt(0)}
                            </Avatar>
                            <Box sx={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', bgcolor: '#10b981', border: '2px solid #0d0f1e', boxShadow: '0 0 8px #10b981' }} />
                        </Box>
                        <Box>
                            <Typography variant="body1" fontWeight="800" sx={{ lineHeight: 1.2 }}>
                                {session.firstName} {session.lastName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600 }}>
                                {session.specialization || 'General Physician'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', px: 1.5, py: 0.5, borderRadius: 10, bgcolor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                            <DotIcon sx={{ color: '#10b981', fontSize: 8 }} />
                            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.7rem' }}>ON DUTY</Typography>
                            <Typography variant="caption" sx={{ color: '#475569', ml: 0.5, fontSize: '0.65rem' }}>{session.mediId}</Typography>
                        </Box>
                    </Stack>
                </Box>

                <Box sx={{ px: 3, mb: 1, zIndex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#334155', fontWeight: 700, letterSpacing: 1.5, fontSize: '0.65rem' }}>NAVIGATION</Typography>
                </Box>

                {/* Nav Items */}
                <List sx={{ px: 2, flex: 1, zIndex: 1 }}>
                    {menuItems.map((item) => (
                        <ListItemButton
                            key={item.text}
                            onClick={() => { setView(item.view); setDrawerOpen(false); }}
                            selected={view === item.view}
                            sx={{
                                borderRadius: 2.5, mb: 0.5, py: 1.3,
                                position: 'relative', overflow: 'hidden',
                                '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.9))',
                                    boxShadow: '0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    '&:hover': { background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.9))' },
                                    '&::before': {
                                        content: '""', position: 'absolute', left: 0, top: '20%', bottom: '20%',
                                        width: 3, borderRadius: '0 3px 3px 0',
                                        bgcolor: 'white', boxShadow: '0 0 8px white'
                                    }
                                },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', transform: 'translateX(2px)', transition: '0.15s' }
                            }}
                        >
                            <ListItemIcon sx={{ color: view === item.view ? 'white' : '#64748b', minWidth: 38 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{ fontSize: '0.885rem', fontWeight: view === item.view ? 700 : 500, color: view === item.view ? 'white' : '#94a3b8' }}
                            />
                            {item.badge > 0 && (
                                <Box sx={{
                                    minWidth: 24, height: 24, borderRadius: 10,
                                    background: view === item.view ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: view === item.view ? 'none' : '0 2px 8px rgba(99,102,241,0.5)'
                                }}>
                                    <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.7rem' }}>{item.badge}</Typography>
                                </Box>
                            )}
                        </ListItemButton>
                    ))}
                </List>

                {/* Logout — always pinned to bottom */}
                <Box sx={{ p: 2, zIndex: 1 }}>
                    <Button
                        fullWidth
                        startIcon={<LogoutIcon />}
                        onClick={() => { localStorage.clear(); navigate('/'); }}
                        sx={{
                            color: '#f87171', justifyContent: 'flex-start', px: 2,
                            borderRadius: 2.5, fontWeight: 700,
                            border: '1px solid rgba(239,68,68,0.2)',
                            '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.4)' }
                        }}
                    >
                        Sign Out
                    </Button>
                </Box>
            </Drawer>

            {/* ── Main Content ── */}
            <Box component="main" sx={{ flexGrow: 1, p: 4, overflow: 'auto' }}>

                {/* Top Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <IconButton
                            onClick={() => setDrawerOpen(true)}
                            sx={{
                                bgcolor: 'rgba(99,102,241,0.1)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 2,
                                color: '#818cf8',
                                '&:hover': { bgcolor: 'rgba(99,102,241,0.2)' }
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Box>
                            <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 700, letterSpacing: 1.5 }}>
                                MEDI-SWIFT / COMMAND OVERSIGHT
                            </Typography>
                            <Typography variant="h4" fontWeight="800" sx={{ color: 'white', mt: 0.5, textShadow: '0 2px 16px rgba(99,102,241,0.4)' }}>
                                {view === 'Overview' ? 'Clinical Command Center' : view === 'IPD' ? 'In-Patient Rounds' : view === 'History' ? 'Medical Records' : view}
                            </Typography>
                        </Box>
                    </Box>

                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            placeholder="Search patients..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            sx={{
                                width: 240,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.07)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    '& fieldset': { border: 'none' },
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                },
                                '& input': { color: 'white' },
                                '& input::placeholder': { color: '#64748b', opacity: 1 }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#6366f1', fontSize: 20 }} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSearch}
                            sx={{
                                borderRadius: 3, px: 3,
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                                fontWeight: 700
                            }}
                        >
                            Search
                        </Button>
                        <IconButton
                            onClick={handleNotificationOpen}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 2,
                                backdropFilter: 'blur(8px)',
                                position: 'relative'
                            }}
                        >
                            <Badge badgeContent={unreadCount} color="error" overlap="circular">
                                <BellIcon sx={{ color: unreadCount > 0 ? '#6366f1' : '#94a3b8' }} />
                            </Badge>
                        </IconButton>
                        <IconButton onClick={fetchDoctorQueue} sx={{ bgcolor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, backdropFilter: 'blur(8px)' }}>
                            <RefreshIcon sx={{ color: '#94a3b8' }} />
                        </IconButton>
                    </Stack>
                </Box>

                {/* ── OVERVIEW VIEW ── */}
                {view === 'Overview' && (
                    <Stack spacing={4}>
                        {/* Command Oversight Section — TOP PRIORITY SINGLE ROW */}
                        <Box>
                            <Grid container spacing={2} alignItems="stretch">
                                {/* Global Velocity Metrics — 4 Columns on XL */}
                                <Grid item xs={12} xl={4}>
                                    <Paper sx={{
                                        p: 2.5, borderRadius: 4, height: '100%',
                                        bgcolor: 'rgba(255,255,255,0.03)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                                    }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#818cf8', mb: 1.5, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.6rem' }}>
                                                Service Velocity
                                            </Typography>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Typography variant="h3" fontWeight="900" sx={{ color: 'white', lineHeight: 1 }}>
                                                    {totalToday > 0 ? Math.round((completedCount / totalToday) * 100) : 0}%
                                                </Typography>
                                                <Box sx={{ flex: 1 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={totalToday > 0 ? (completedCount / totalToday) * 100 : 0}
                                                        sx={{
                                                            height: 6, borderRadius: 3, mb: 0.5,
                                                            bgcolor: 'rgba(255,255,255,0.05)',
                                                            '& .MuiLinearProgress-bar': {
                                                                background: 'linear-gradient(90deg, #6366f1, #10b981)',
                                                            }
                                                        }}
                                                    />
                                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Shift Efficiency</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#444c66', fontWeight: 800, fontSize: '0.55rem', letterSpacing: 1, textTransform: 'uppercase' }}>CLINICAL UNIT</Typography>
                                                    <Typography variant="body2" fontWeight="800" sx={{ color: '#94a3b8', fontSize: '0.75rem', mt: 0.2 }}>{session.specialization || 'General Medicine'}</Typography>
                                                </Box>
                                                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 1 }} />
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" sx={{ color: '#444c66', fontWeight: 800, fontSize: '0.55rem', letterSpacing: 1, textTransform: 'uppercase' }}>CMD IDENTIFIER</Typography>
                                                    <Typography variant="body2" fontWeight="800" sx={{ color: '#94a3b8', fontSize: '0.75rem', mt: 0.2 }}>{session.mediId}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                    </Paper>
                                </Grid>

                                {/* High-Density Stat Cards — 4 Equal Columns (2/12 each) */}
                                {statCards.map((card, i) => (
                                    <Grid item xs={12} sm={6} md={3} xl={2} key={i}>
                                        <Paper sx={{
                                            p: 2.5, borderRadius: 4, height: '100%',
                                            bgcolor: 'rgba(255, 255, 255, 0.03)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderTop: `3px solid ${card.accent}`,
                                            color: 'white',
                                            transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                bgcolor: 'rgba(255, 255, 255, 0.06)',
                                            }
                                        }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, letterSpacing: 1, fontSize: '0.65rem' }}>
                                                        {card.label.toUpperCase()}
                                                    </Typography>
                                                    <Typography variant="h3" fontWeight="900" sx={{ mt: 1, lineHeight: 1 }}>
                                                        {card.value}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{
                                                    p: 1.2, borderRadius: 1.5,
                                                    bgcolor: `${card.accent}15`,
                                                    color: card.accent,
                                                    '& .MuiSvgIcon-root': { fontSize: 20 }
                                                }}>
                                                    {card.icon}
                                                </Box>
                                            </Stack>
                                            <Typography variant="caption" sx={{ color: '#64748b', mt: 1, display: 'block', fontWeight: 600, fontSize: '0.7rem' }}>
                                                {card.sub}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>

                        {/* Active Patient Panel — Full Width Table Strip */}
                        <Paper sx={{
                            borderRadius: 4, overflow: 'hidden',
                            bgcolor: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                            position: 'relative',
                            '&::after': {
                                content: '""', position: 'absolute', top: 0, left: '-100%',
                                width: '50%', height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                                transform: 'skewX(-25deg)',
                                animation: 'sweep 8s infinite cubic-bezier(0.4, 0, 0.2, 1)'
                            }
                        }}>
                            <style>{pulseKeyframes}</style>
                            {/* Dedicated Section Header */}
                            <Box sx={{
                                px: 3, py: 1.5,
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Box sx={{
                                        width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981',
                                        boxShadow: '0 0 12px #10b981',
                                        animation: 'pulse 1.5s infinite'
                                    }} />
                                    <Typography variant="subtitle2" fontWeight="900" sx={{ color: 'white', letterSpacing: 3, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                        Live Queue
                                    </Typography>
                                </Stack>
                                {activePatient && (
                                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5 }}>
                                        ACTIVE CHANNEL
                                    </Typography>
                                )}
                            </Box>

                            {/* Data Row below Header */}
                            <Box sx={{ p: 3 }}>
                                {activePatient ? (
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: 4
                                    }}>
                                        {/* Column 1: Token Unit (Normal/Simplified) */}
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, mb: 1, display: 'block' }}>TOKEN</Typography>
                                            <Box sx={{
                                                width: 50, height: 50, borderRadius: 2,
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1.5px solid rgba(255,255,255,0.08)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Typography variant="h5" fontWeight="900" sx={{ color: 'white' }}>
                                                    {activePatient.token}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                        {/* Column 2: Patient Identity */}
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, mb: 0.5, display: 'block' }}>PATIENT NAME</Typography>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Avatar
                                                    src={activePatient.photoUrl ? `${API_BASE_URL}/${activePatient.photoUrl}` : ''}
                                                    sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', width: 44, height: 44, fontWeight: 900, border: '1px solid rgba(99,102,241,0.2)' }}
                                                >
                                                    {activePatient.patientName?.charAt(0)}
                                                </Avatar>
                                                <Typography variant="h6" fontWeight="900" sx={{ color: 'white', letterSpacing: -0.5 }}>
                                                    {activePatient.patientName}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                        {/* Column 3: Patient Metadata */}
                                        <Box sx={{ minWidth: 140 }}>
                                            <Box sx={{ mb: 1.5 }}>
                                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, display: 'block' }}>CASE IDENTIFIER</Typography>
                                                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 800 }}>{activePatient.patientId}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, display: 'block' }}>VISIT CATEGORY</Typography>
                                                <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 800 }}>OPD Visiting</Typography>
                                            </Box>
                                        </Box>

                                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                        {/* Column 4: Operational Status */}
                                        <Box sx={{ minWidth: 120 }}>
                                            <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, mb: 1, display: 'block' }}>STAGE</Typography>
                                            <Chip
                                                label={activePatient.status === 'Consulting' ? 'IN CONSULTATION' : 'WAITING'}
                                                size="small"
                                                sx={{
                                                    bgcolor: activePatient.status === 'Consulting' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color: activePatient.status === 'Consulting' ? '#34d399' : '#fcd34d',
                                                    fontWeight: 900, border: '1px solid', fontSize: '0.62rem', height: 22, px: 1,
                                                    borderColor: activePatient.status === 'Consulting' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'
                                                }}
                                            />
                                        </Box>

                                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                        {/* Column 5: Command Actions */}
                                        <Box>
                                            <Stack direction="row" spacing={1.5}>
                                                {activePatient.status === 'Waiting' ? (
                                                    <Button
                                                        variant="contained"
                                                        onClick={() => handleStatusUpdate(activePatient._id, 'Consulting')}
                                                        sx={{
                                                            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                                                            borderRadius: 2, fontWeight: 900, px: 3, py: 1,
                                                            fontSize: '0.75rem', letterSpacing: 1,
                                                            boxShadow: '0 8px 20px -5px rgba(79,70,229,0.5)',
                                                            '&:hover': { transform: 'translateY(-2px)' }
                                                        }}
                                                    >
                                                        CONSULT
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        color="success"
                                                        onClick={() => setOpenPrescription(true)}
                                                        sx={{
                                                            borderRadius: 2, fontWeight: 900, px: 3, py: 1,
                                                            fontSize: '0.75rem', letterSpacing: 1,
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            boxShadow: '0 8px 20px -5px rgba(16,185,129,0.5)'
                                                        }}
                                                    >
                                                        CONTINUE
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => handleStatusUpdate(activePatient._id, 'Skipped')}
                                                    sx={{
                                                        borderRadius: 2, fontWeight: 900, px: 2,
                                                        borderColor: 'rgba(239,68,68,0.2)', color: '#f87171',
                                                        fontSize: '0.75rem', letterSpacing: 1,
                                                        borderWidth: '1.5px',
                                                        '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239,68,68,0.08)' }
                                                    }}
                                                >
                                                    SKIP
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box sx={{ py: 1.5, textAlign: 'center' }}>
                                        <Typography sx={{ color: '#94a3b8', fontWeight: 700, fontStyle: 'italic', fontSize: '0.9rem' }}>
                                            Shift Objectives Completed. Patient queue is currently clear.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>

                        {/* Upcoming Queue — Premium List */}
                        {upcomingQueue.length > 0 && (
                            <Paper sx={{
                                borderRadius: 4, overflow: 'hidden',
                                bgcolor: 'rgba(255,255,255,0.02)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
                            }}>
                                <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <PeopleIcon sx={{ color: '#818cf8', fontSize: 20 }} />
                                        <Typography variant="subtitle2" fontWeight="800" sx={{ color: 'white', letterSpacing: 1 }}>Next in Queue</Typography>
                                    </Stack>
                                    <Chip
                                        label={`${upcomingQueue.length} pending`}
                                        size="small"
                                        sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 800, fontSize: '0.65rem' }}
                                    />
                                </Box>
                                <Box sx={{ p: 2, maxHeight: 400, overflowY: 'auto' }}>
                                    {upcomingQueue.map((apt, idx) => (
                                        <Box
                                            key={apt._id}
                                            sx={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                p: 2.5, borderRadius: 3, mb: 1.5,
                                                bgcolor: 'rgba(255,255,255,0.02)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                gap: 4,
                                                transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    bgcolor: 'rgba(255,255,255,0.04)',
                                                    borderColor: 'rgba(99,102,241,0.2)',
                                                    transform: 'translateX(4px)'
                                                }
                                            }}
                                        >
                                            {/* Column 1: Token Unit (Standardized) */}
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, mb: 1, display: 'block' }}>TOKEN</Typography>
                                                <Box sx={{
                                                    width: 50, height: 50, borderRadius: 2,
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1.5px solid rgba(255,255,255,0.08)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Typography variant="h5" fontWeight="900" sx={{ color: 'white' }}>
                                                        {apt.token}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                            {/* Column 2: Patient Identity */}
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, mb: 0.5, display: 'block' }}>PATIENT NAME</Typography>
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <Avatar
                                                        src={apt.photoUrl ? `${API_BASE_URL}/${apt.photoUrl}` : ''}
                                                        sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', width: 32, height: 32, fontSize: 13, fontWeight: 900, border: '1px solid rgba(255,255,255,0.05)' }}
                                                    >
                                                        {apt.patientName?.charAt(0)}
                                                    </Avatar>
                                                    <Typography variant="body1" fontWeight="800" sx={{ color: 'white' }}>
                                                        {apt.patientName}
                                                    </Typography>
                                                </Stack>
                                            </Box>

                                            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                            {/* Column 3: Patient Metadata */}
                                            <Box sx={{ minWidth: 140 }}>
                                                <Box sx={{ mb: 1.5 }}>
                                                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, display: 'block' }}>CASE IDENTIFIER</Typography>
                                                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 800 }}>{apt.patientId}</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, display: 'block' }}>VISIT CATEGORY</Typography>
                                                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 800 }}>OPD Visiting</Typography>
                                                </Box>
                                            </Box>

                                            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                            {/* Column 4: Operational Status */}
                                            <Box sx={{ minWidth: 120 }}>
                                                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 900, fontSize: '0.6rem', letterSpacing: 1.5, mb: 1, display: 'block' }}>STAGE</Typography>
                                                {apt.status === 'Skipped' ? (
                                                    <Chip
                                                        label="SKIPPED"
                                                        size="small"
                                                        sx={{
                                                            bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171',
                                                            fontWeight: 900, border: '1px solid', fontSize: '0.6rem', height: 20, px: 1,
                                                            borderColor: 'rgba(239,68,68,0.2)', letterSpacing: 1
                                                        }}
                                                    />
                                                ) : idx === 0 ? (
                                                    <Chip
                                                        label="UP NEXT"
                                                        size="small"
                                                        sx={{
                                                            bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8',
                                                            fontWeight: 900, border: '1px solid', fontSize: '0.6rem', height: 20, px: 1,
                                                            borderColor: 'rgba(99,102,241,0.2)', letterSpacing: 1
                                                        }}
                                                    />
                                                ) : (
                                                    <Chip
                                                        label="PENDING"
                                                        size="small"
                                                        sx={{
                                                            bgcolor: 'rgba(71,85,105,0.1)', color: '#94a3b8',
                                                            fontWeight: 900, border: '1px solid', fontSize: '0.6rem', height: 20, px: 1,
                                                            borderColor: 'rgba(71,85,105,0.2)', letterSpacing: 1
                                                        }}
                                                    />
                                                )}
                                            </Box>

                                            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                            {/* Column 5: Command Actions */}
                                            <Box sx={{ minWidth: 100, textAlign: 'right' }}>
                                                {apt.status === 'Skipped' ? (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleStatusUpdate(apt._id, 'Waiting')}
                                                        sx={{
                                                            borderRadius: 2, px: 2, fontWeight: 900,
                                                            fontSize: '0.65rem', color: '#f59e0b',
                                                            borderColor: 'rgba(245,158,11,0.3)',
                                                            bgcolor: 'rgba(245,158,11,0.05)',
                                                            letterSpacing: 1,
                                                            '&:hover': { bgcolor: 'rgba(245,158,11,0.1)', borderColor: '#f59e0b' }
                                                        }}
                                                    >
                                                        RECALL
                                                    </Button>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, fontSize: '0.6rem', letterSpacing: 1 }}>
                                                        {idx + 1} POSITIONS
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        )}
                    </Stack>
                )}

                {/* ── IPD VIEW ── */}
                {view === 'IPD' && (
                    <Stack spacing={3}>
                        <TableContainer component={Paper} sx={{
                            bgcolor: 'rgba(15,23,42,0.6)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            overflow: 'hidden'
                        }}>
                            <Box sx={{
                                px: 3, py: 2.5,
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                borderBottom: '1px solid rgba(255,255,255,0.07)'
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <BedIcon sx={{ color: '#818cf8', fontSize: 20 }} />
                                    <Typography variant="h6" fontWeight="800" sx={{ color: 'white', letterSpacing: 0.5 }}>
                                        Admitted Patients Under My Care
                                    </Typography>
                                </Stack>
                                <Chip label={`${inPatients.length} patients`} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 800, border: '1px solid rgba(99,102,241,0.3)' }} />
                            </Box>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.07)' }}>
                                        {['PATIENT', 'PATIENT ID', 'DIAGNOSIS', 'ADMITTED ON', 'ACTIONS'].map(col => (
                                            <TableCell key={col} sx={{ color: '#818cf8', fontWeight: 900, fontSize: '0.7rem', letterSpacing: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5 }}>{col}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {inPatients.map((p) => (
                                        <TableRow key={p._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: '0.2s' }}>
                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)', py: 2 }}>
                                                <Stack direction="row" spacing={1.5} alignItems="center">
                                                    <Avatar
                                                        src={p.photoUrl ? `${API_BASE_URL}/${p.photoUrl}` : ''}
                                                        sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', width: 36, height: 36, fontSize: 14, fontWeight: 900, border: '1px solid rgba(255,255,255,0.05)' }}
                                                    >
                                                        {p.patientName?.charAt(0)}
                                                    </Avatar>
                                                    <Typography fontWeight="800" sx={{ color: 'white' }} variant="body2">{p.patientName}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <Chip label={p.patientId} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, fontSize: '0.7rem', border: '1px solid rgba(99,102,241,0.2)' }} />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem' }}>
                                                {p.diagnosis || <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic' }}>Initial observation</Typography>}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: '0.8rem' }}>
                                                {p.admissionDate ? new Date(p.admissionDate).toLocaleString() : <Typography variant="caption" sx={{ color: '#475569' }}>N/A</Typography>}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <Stack direction="row" spacing={1}>
                                                    <Button
                                                        size="small" variant="outlined"
                                                        onClick={() => fetchPatientDetails({ mediId: p.patientId, firstName: p.patientName })}
                                                        sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.6rem', color: '#818cf8', borderColor: 'rgba(99,102,241,0.4)', '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' }, whiteSpace: 'nowrap' }}
                                                    >
                                                        HISTORY
                                                    </Button>
                                                    <Button
                                                        size="small" variant="outlined"
                                                        onClick={() => {
                                                            setIpdPatientLocal(p);
                                                            setIsIPDMode(true);
                                                            fetchPatientDetails({ mediId: p.patientId, firstName: p.patientName });
                                                            setOpenPrescription(true);
                                                        }}
                                                        sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.6rem', color: '#34d399', borderColor: 'rgba(52,211,153,0.4)', '&:hover': { bgcolor: 'rgba(52,211,153,0.1)' }, whiteSpace: 'nowrap' }}
                                                    >
                                                        ADD REPORT
                                                    </Button>
                                                    {p.dischargeRequested ? (
                                                        <Button
                                                            size="small" variant="contained" disabled
                                                            sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.6rem', bgcolor: '#f59e0b', color: 'white', whiteSpace: 'nowrap', '&.Mui-disabled': { bgcolor: 'rgba(245,158,11,0.5)', color: 'white' } }}
                                                        >
                                                            REQUESTED
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="small" variant="contained"
                                                            onClick={() => handleDischargeRequest(p._id)}
                                                            sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.6rem', bgcolor: '#ef4444', color: 'white', '&:hover': { bgcolor: '#dc2626' }, whiteSpace: 'nowrap' }}
                                                        >
                                                            DISCHARGE
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {inPatients.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 10, borderBottom: 'none' }}>
                                                <BedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.08)', mb: 2, display: 'block', mx: 'auto' }} />
                                                <Typography sx={{ color: '#475569', fontWeight: 600 }}>No admitted patients under your care.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Stack>
                )}

                {/* ── SEARCH VIEW ── */}
                {view === 'Search' && (
                    <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                            <Typography variant="h6" fontWeight="700" sx={{ color: 'white' }}>Search Results</Typography>
                            <Button onClick={() => setView('Overview')} startIcon={<CloseIcon />} sx={{ borderRadius: 2, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                Close
                            </Button>
                        </Stack>
                        <Grid container spacing={3}>
                            {searchResults.map((p) => (
                                <Grid item xs={12} sm={6} md={3} key={p._id}>
                                    <Paper
                                        onClick={() => fetchPatientDetails(p)}
                                        sx={{
                                            p: 3, borderRadius: 3, textAlign: 'center', cursor: 'pointer',
                                            bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                            backdropFilter: 'blur(10px)', transition: '0.2s',
                                            '&:hover': { borderColor: 'rgba(99,102,241,0.4)', boxShadow: '0 4px 20px rgba(99,102,241,0.15)', transform: 'translateY(-2px)', bgcolor: 'rgba(99,102,241,0.05)' }
                                        }}
                                    >
                                        <Avatar
                                            src={p.photoUrl ? `${API_BASE_URL}/${p.photoUrl}` : ''}
                                            sx={{ width: 64, height: 64, mx: 'auto', mb: 1.5, bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 24, fontWeight: 700, border: '2px solid rgba(99,102,241,0.2)' }}
                                        >
                                            {p.firstName?.charAt(0)}
                                        </Avatar>
                                        <Typography fontWeight="700" sx={{ color: 'white' }}>{p.firstName} {p.lastName}</Typography>
                                        <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 600 }}>{p.mediId}</Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                        {searchResults.length === 0 && !searching && (
                            <Box sx={{ py: 8, textAlign: 'center' }}>
                                <SearchIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.08)', mb: 1 }} />
                                <Typography sx={{ color: '#94a3b8' }}>No patients found for your search.</Typography>
                            </Box>
                        )}
                    </Paper>
                )}

                {/* ── HISTORY VIEW ── */}
                {view === 'History' && (
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                        <Box sx={{
                            px: 3, py: 2.5,
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.07)'
                        }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <HistoryIcon sx={{ color: '#818cf8', fontSize: 20 }} />
                                <Typography variant="h6" fontWeight="800" sx={{ color: 'white' }}>Clinical Archives</Typography>
                            </Stack>
                        </Box>
                        <Box sx={{ p: 3 }}>
                            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                                <TextField
                                    type="date" size="small" value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': { borderRadius: 2, color: 'white', bgcolor: 'rgba(255,255,255,0.05)', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' } },
                                        '& .MuiInputBase-input': { colorScheme: 'dark' }
                                    }}
                                />
                                <Button
                                    variant="contained" startIcon={loadingSummary ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                                    onClick={() => fetchDateSummary(selectedDate)}
                                    sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', fontWeight: 700 }}
                                >
                                    Fetch Records
                                </Button>
                            </Stack>
                            <Stack spacing={2}>
                                {summaryData.map((row) => (
                                    <Paper
                                        key={row._id}
                                        sx={{
                                            p: 2.5, borderRadius: 3,
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(99,102,241,0.15)',
                                            backdropFilter: 'blur(10px)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            '&:hover': { borderColor: 'rgba(99,102,241,0.3)', bgcolor: 'rgba(99,102,241,0.03)' },
                                            transition: '0.2s'
                                        }}
                                    >
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Box sx={{
                                                width: 44, height: 44, borderRadius: 2,
                                                bgcolor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Typography fontWeight="900" sx={{ color: '#818cf8' }}>#{row.token}</Typography>
                                            </Box>
                                            <Box>
                                                <Typography fontWeight="700" sx={{ color: 'white' }}>{row.patientName}</Typography>
                                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                    {row.diagnosis || 'No diagnosis recorded'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <Tooltip title="Print Record">
                                            <IconButton onClick={() => window.print()} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                                                <PrintIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Paper>
                                ))}
                                {summaryData.length === 0 && !loadingSummary && (
                                    <Box sx={{ py: 8, textAlign: 'center' }}>
                                        <HistoryIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.08)', mb: 1 }} />
                                        <Typography sx={{ color: '#94a3b8' }} fontWeight={600}>No records for the selected date.</Typography>
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    </Paper>
                )}
            </Box>

            {/* ── Patient EHR Dialog ── */}
            <Dialog open={Boolean(selectedPatient)} onClose={() => setSelectedPatient(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, bgcolor: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' } }}>
                {selectedPatient && (
                    <Box sx={{ p: 4 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                            <Typography variant="h6" fontWeight="800">Patient Health Record</Typography>
                            <IconButton onClick={() => setSelectedPatient(null)} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, color: 'white', '&:hover': { bgcolor: 'rgba(239,68,68,0.2)', color: '#ef4444' } }}>
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                        <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mb: 3, p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Avatar
                                src={selectedPatient.photoUrl ? `${API_BASE_URL}/${selectedPatient.photoUrl}` : ''}
                                sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 28, fontWeight: 900, border: '2px solid rgba(99,102,241,0.2)' }}
                            >
                                {selectedPatient.firstName?.charAt(0)}
                            </Avatar>
                            <Box>
                                <Typography variant="h5" fontWeight="800">{selectedPatient.firstName} {selectedPatient.lastName}</Typography>
                                <Typography sx={{ color: '#6366f1', fontWeight: 700 }}>{selectedPatient.mediId}</Typography>
                                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                    {selectedPatient.gender} • {selectedPatient.age} yrs
                                </Typography>
                            </Box>
                        </Stack>
                        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1.5, color: '#94a3b8', letterSpacing: 1 }}>CLINICAL HISTORY</Typography>
                        <Box sx={{ maxHeight: 320, overflow: 'auto', pr: 1 }}>
                            {loadingHistory ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={28} sx={{ color: '#6366f1' }} /></Box>
                            ) : patientHistory.length > 0 ? patientHistory.map((h, i) => (
                                <Paper key={i} sx={{ p: 2.5, mb: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700 }}>{h.date}</Typography>
                                        <Typography variant="caption" sx={{ color: '#64748b' }}>{h.hospitalName}</Typography>
                                    </Stack>
                                    <Typography variant="body2" fontWeight="700" sx={{ color: 'white' }}>{h.diagnosis}</Typography>
                                    {h.medicines && h.medicines.length > 0 && (
                                        <Typography variant="caption" display="block" sx={{ color: '#34d399', mt: 0.5 }}>
                                            Rx: {Array.isArray(h.medicines) ? h.medicines.join(', ') : h.medicines}
                                        </Typography>
                                    )}
                                    {h.labTests && (
                                        <Box sx={{ mt: 1, p: 1, borderRadius: 2, bgcolor: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.1)' }}>
                                            <Typography variant="caption" sx={{ color: '#22d3ee', fontWeight: 800 }}>LAB: {h.labTests}</Typography>
                                            {h.labResultSummary && (
                                                <Typography variant="caption" display="block" sx={{ color: '#94a3b8', mt: 0.5, fontStyle: 'italic' }}>
                                                    Result: {h.labResultSummary}
                                                </Typography>
                                            )}
                                            {h.reportUrl && (
                                                <Button
                                                    size="small"
                                                    startIcon={<LabIcon sx={{ fontSize: '0.8rem' }} />}
                                                    onClick={() => window.open(`${API_BASE_URL}/${h.reportUrl}`, '_blank')}
                                                    sx={{ mt: 0.5, color: '#22d3ee', fontSize: '0.65rem', fontWeight: 900, p: 0 }}
                                                >
                                                    VIEW REPORT
                                                </Button>
                                            )}
                                        </Box>
                                    )}
                                </Paper>
                            )) : (
                                <Box sx={{ py: 6, textAlign: 'center' }}>
                                    <HistoryIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.1)', mb: 2 }} />
                                    <Typography sx={{ color: '#94a3b8' }}>No previous encounters found.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Dialog>

            {/* ── Consultation Workspace (Balanced 50/50 Optimization) ── */}
            <Dialog
                open={openPrescription}
                onClose={() => {
                    setOpenPrescription(false);
                    setIsIPDMode(false);
                    setIpdPatientLocal(null);
                }}
                fullWidth
                maxWidth={false}
                PaperProps={{
                    sx: {
                        borderRadius: 5,
                        width: 'calc(100vw - 48px)',
                        maxWidth: 'calc(100vw - 48px)',
                        bgcolor: '#050a18',
                        backgroundImage: 'radial-gradient(at 0% 0%, rgba(99,102,241,0.05) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(234,88,12,0.05) 0px, transparent 50%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
                        overflow: 'hidden'
                    }
                }}
            >
                <Box sx={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Glass Header */}
                    <Box sx={{
                        px: 2, py: 2,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: 'rgba(15,23,42,0.6)',
                        backdropFilter: 'blur(20px)'
                    }}>
                        <Box>
                            <Typography variant="h6" fontWeight="950" sx={{ color: 'white', letterSpacing: 2, textTransform: 'uppercase' }}>
                                {isIPDMode ? 'IPD Progress Note' : 'Clinical Consultation Hub'}
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.2 }}>
                                <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 900, fontSize: '0.85rem' }}>
                                    {isIPDMode ? ipdPatientLocal?.patientName : activePatient?.patientName}
                                </Typography>
                                <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)', height: 12, my: 'auto' }} />
                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 1.5 }}>
                                    ID: {isIPDMode ? ipdPatientLocal?.patientId : activePatient?.patientId} • {isIPDMode ? 'IPD RECORD' : `TKN: #${activePatient?.token}`}
                                </Typography>
                            </Stack>
                        </Box>
                        <IconButton
                            onClick={() => setOpenPrescription(false)}
                            sx={{
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                '&:hover': { bgcolor: '#ef4444', borderColor: '#ef4444' }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ px: 1, py: 1, width: '100%', flex: 1, maxHeight: '85vh', overflowY: 'auto', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 10 } }}>
                        {/* 4-Column Flexbox Row */}
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, width: '100%', alignItems: 'stretch' }}>

                            {/* COLUMN 1: DIAGNOSIS & FINDINGS */}
                            <Paper sx={{
                                p: 1, flex: 1, borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', flexDirection: 'column', minWidth: 0
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'rgba(99,102,241,0.15)', display: 'flex' }}>
                                        <HistoryEduIcon sx={{ color: '#818cf8', fontSize: 20 }} />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight="950" sx={{ color: 'white', letterSpacing: 1, textTransform: 'uppercase' }}>DIAGNOSIS & FINDINGS</Typography>
                                </Stack>
                                <TextField
                                    placeholder="Type primary findings and diagnostic report here..."
                                    fullWidth multiline rows={16}
                                    value={treatmentData.diagnosis}
                                    onChange={(e) => setTreatmentData({ ...treatmentData, diagnosis: e.target.value })}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 3, bgcolor: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.95rem',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                            '& .MuiInputBase-input': { color: 'white !important' }
                                        }
                                    }}
                                />
                            </Paper>

                            {/* COLUMN 2: PRESCRIPTIONS */}
                            <Paper sx={{
                                p: 1, flex: 1, borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                display: 'flex', flexDirection: 'column', minWidth: 0
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'rgba(236,72,153,0.1)', display: 'flex' }}>
                                        <MedicineIcon sx={{ color: '#f472b6', fontSize: 20 }} />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight="950" sx={{ color: 'white', letterSpacing: 1, textTransform: 'uppercase' }}>PRESCRIPTIONS</Typography>
                                    <Box sx={{ flex: 1 }} />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={treatmentData.sendToPharmacy}
                                                onChange={(e) => setTreatmentData({ ...treatmentData, sendToPharmacy: e.target.checked })}
                                                sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#f472b6' } }}
                                            />
                                        }
                                        label={<Typography variant="caption" sx={{ color: treatmentData.sendToPharmacy ? '#f472b6' : '#64748b', fontWeight: 900 }}>SEND TO PHARMACY</Typography>}
                                    />
                                </Stack>
                                <Autocomplete
                                    multiple freeSolo autoSelect options={MEDICINE_LIST}
                                    value={treatmentData.medicines ? treatmentData.medicines.split(', ').filter(x => x) : []}
                                    onChange={(e, v) => setTreatmentData({ ...treatmentData, medicines: v.join(', ') })}
                                    componentsProps={{ paper: { sx: { bgcolor: '#0f172a', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } } }}
                                    sx={{
                                        '& .MuiChip-root': { bgcolor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' },
                                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } },
                                        '& input': { color: 'white !important', WebkitTextFillColor: 'white !important' }
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} placeholder="Search or Type Medicine..." sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3, bgcolor: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '1rem',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                                '& .MuiInputBase-input': { color: 'white !important', WebkitTextFillColor: 'white !important' }
                                            }
                                        }} />
                                    )}
                                />
                                <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.2)', border: '1px dashed rgba(255,255,255,0.05)' }}>
                                    <Typography variant="caption" sx={{ display: 'block', color: '#64748b', fontWeight: 800, textAlign: 'center' }}>
                                        CLINICAL DICTIONARY ACTIVE
                                    </Typography>
                                </Box>
                            </Paper>

                            {/* COLUMN 3: MEDICAL HISTORY */}
                            <Paper sx={{
                                p: 1, flex: 1, borderRadius: 4,
                                bgcolor: 'rgba(255,255,255,0.02)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.03)',
                                display: 'flex', flexDirection: 'column', minWidth: 0
                            }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                    <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'rgba(148,163,184,0.1)', display: 'flex' }}>
                                        <HistoryIcon sx={{ color: '#94a3b8', fontSize: 18 }} />
                                    </Box>
                                    <Typography variant="caption" fontWeight="950" sx={{ color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>MEDICAL HISTORY</Typography>
                                </Stack>
                                <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', flex: 1, overflowY: 'auto' }}>
                                    <TextField
                                        placeholder="Record permanent medical history (allergies, chronic conditions, etc.)"
                                        fullWidth multiline rows={8}
                                        value={treatmentData.medicalHistory}
                                        onChange={(e) => setTreatmentData({ ...treatmentData, medicalHistory: e.target.value })}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2, bgcolor: 'transparent', color: '#94a3b8', fontSize: '0.9rem',
                                                '& fieldset': { border: 'none' },
                                                '& .MuiInputBase-input': { color: '#94a3b8 !important', fontStyle: 'italic', lineHeight: 1.6 }
                                            }
                                        }}
                                    />
                                </Box>
                            </Paper>

                            {/* COLUMN 4: LAB REQUESTS & DISPOSITION */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                                <Paper sx={{
                                    p: 1, borderRadius: 4,
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                                        <Box sx={{ p: 0.8, borderRadius: 1.5, bgcolor: 'rgba(6,182,212,0.1)', display: 'flex' }}>
                                            <LabIcon sx={{ color: '#22d3ee', fontSize: 18 }} />
                                        </Box>
                                        <Typography variant="caption" fontWeight="950" sx={{ color: 'white', letterSpacing: 1, textTransform: 'uppercase' }}>LAB REQUESTS</Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={treatmentData.sendToLab}
                                                    onChange={(e) => setTreatmentData({ ...treatmentData, sendToLab: e.target.checked })}
                                                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#22d3ee' } }}
                                                />
                                            }
                                            label={<Typography variant="caption" sx={{ color: treatmentData.sendToLab ? '#22d3ee' : '#64748b', fontWeight: 900 }}>SEND TO LAB</Typography>}
                                        />
                                    </Stack>
                                    <TextField
                                        placeholder="Investigations needed..."
                                        fullWidth multiline rows={5}
                                        value={treatmentData.labTests}
                                        onChange={(e) => setTreatmentData({ ...treatmentData, labTests: e.target.value })}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3, bgcolor: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.85rem',
                                                '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                                '& .MuiInputBase-input': { color: 'white !important' }
                                            }
                                        }}
                                    />
                                </Paper>

                                {!isIPDMode && (
                                    <Paper sx={{
                                        p: 2, borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)',
                                        bgcolor: treatmentData.needsPreBooking ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.01)'
                                    }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" fontWeight="950" sx={{ color: treatmentData.needsPreBooking ? '#34d399' : '#475569' }}>PRE-BOOKING</Typography>
                                            <Checkbox
                                                size="small"
                                                checked={treatmentData.needsPreBooking}
                                                onChange={(e) => setTreatmentData({ ...treatmentData, needsPreBooking: e.target.checked })}
                                                sx={{ py: 0, color: 'rgba(255,255,255,0.1)', '&.Mui-checked': { color: '#10b981' } }}
                                            />
                                        </Stack>
                                        {treatmentData.needsPreBooking && (
                                            <TextField
                                                type="date" fullWidth size="small" sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'rgba(0,0,0,0.25)', color: 'white', fontSize: '0.8rem' }, '& .MuiInputBase-input': { color: 'white !important', colorScheme: 'dark' } }}
                                                value={treatmentData.preBookingDate}
                                                onChange={(e) => setTreatmentData({ ...treatmentData, preBookingDate: e.target.value })}
                                            />
                                        )}
                                    </Paper>
                                )}
                            </Box>
                        </Box>

                        {/* FOOTER BUTTONS */}
                        <Stack direction="row" spacing={2} sx={{ mt: 1.5, width: '100%', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained" size="small"
                                onClick={() => handleCompleteConsultation(isIPDMode ? null : activePatient?._id)}
                                sx={{
                                    px: 3, py: 1, borderRadius: 3, fontWeight: 950, fontSize: '0.75rem', letterSpacing: 1,
                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                    boxShadow: '0 8px 16px rgba(99,102,241,0.2)',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(99,102,241,0.4)' }
                                }}
                            >
                                {isIPDMode ? 'SAVE REPORT' : 'COMPLETE CONSULTATION'}
                            </Button>
                            {!isIPDMode && (
                                <Button
                                    variant="contained" size="small"
                                    startIcon={<AdmitIcon sx={{ fontSize: '1rem' }} />}
                                    onClick={() => handleCompleteConsultation(activePatient?._id, 'Admitted')}
                                    sx={{
                                        px: 3, py: 1, borderRadius: 3, fontWeight: 950, fontSize: '0.75rem', letterSpacing: 1,
                                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                        boxShadow: '0 8px 16px rgba(234,88,12,0.2)',
                                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(234,88,12,0.4)' }
                                    }}
                                >
                                    ADMIT PATIENT NOW
                                </Button>
                            )}
                        </Stack>
                    </Box>
                </Box>
            </Dialog>

            {/* ── Follow-up Dialog ── */}
            <Dialog open={openPreConsultation} onClose={() => setOpenPreConsultation(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
                <Box sx={{ p: 4 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                        <Typography variant="h6" fontWeight="800">Schedule Follow-up</Typography>
                        <IconButton onClick={() => setOpenPreConsultation(false)} sx={{ bgcolor: '#f1f5f9', borderRadius: 2 }}>
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="caption" fontWeight="700" sx={{ mb: 1, display: 'block', color: '#64748b' }}>
                                NEXT APPOINTMENT / PLANNED ADMISSION
                            </Typography>
                            <TextField
                                type="datetime-local" fullWidth
                                value={treatmentData.nextAppointmentDate}
                                onChange={(e) => setTreatmentData({ ...treatmentData, nextAppointmentDate: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption" fontWeight="700" sx={{ mb: 1, display: 'block', color: '#64748b' }}>
                                FOLLOW-UP NOTES
                            </Typography>
                            <TextField
                                fullWidth multiline rows={3}
                                placeholder="Instructions for next visit..."
                                value={treatmentData.followUpInstructions}
                                onChange={(e) => setTreatmentData({ ...treatmentData, followUpInstructions: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                        </Box>
                        <Button
                            fullWidth variant="contained" size="large"
                            onClick={() => handleCompleteConsultation(activePatient?._id)}
                            sx={{
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                borderRadius: 2.5, fontWeight: 700, py: 1.5,
                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
                            }}
                        >
                            Final Submit
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            {/* Notification Popover */}
            <Popover
                open={Boolean(notificationAnchor)}
                anchorEl={notificationAnchor}
                onClose={handleNotificationClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        bgcolor: '#1e293b',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        mt: 1.5,
                        width: 320,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>Notifications</Typography>
                        {notifications.length > 0 && (
                            <Button size="small" onClick={handleClearAllNotifications} sx={{ color: '#ef4444', fontWeight: 700, p: 0, minWidth: 'auto', '&:hover': { background: 'none', textDecoration: 'underline' } }}>
                                Clear All
                            </Button>
                        )}
                    </Stack>
                    <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                    {notifications.length === 0 ? (
                        <Typography variant="body2" color="#94a3b8" sx={{ py: 3, textAlign: 'center' }}>No new notifications</Typography>
                    ) : (
                        <List sx={{ maxHeight: 350, overflow: 'auto', p: 0 }}>
                            {notifications.map((notif, idx) => (
                                <Box key={idx} sx={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.5 }}>
                                    <IconButton
                                        onClick={() => handleDeleteNotification(notif._id)}
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 0,
                                            color: 'rgba(255,255,255,0.3)',
                                            '&:hover': { color: '#ef4444' },
                                            zIndex: 1
                                        }}
                                        size="small"
                                    >
                                        <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <ListItem
                                        alignItems="flex-start"
                                        sx={{ px: 0 }}
                                    >
                                        <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', mr: 2, width: 32, height: 32 }}>
                                            <BellIcon fontSize="small" />
                                        </Avatar>
                                        <ListItemText
                                            primary={notif.msg || notif.message}
                                            secondary={
                                                <Typography component="span" variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                                    {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            }
                                            primaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'white', pr: 3 }}
                                        />
                                    </ListItem>
                                </Box>
                            ))}
                        </List>
                    )}
                </Box>
            </Popover>
        </Box>
    );
};

export default DoctorDashboard;
