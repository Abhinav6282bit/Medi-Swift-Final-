import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, TextField, Button, Grid, Card, CardContent,
    Stack, MenuItem, Divider, CircularProgress, Chip, FormControlLabel, Radio, RadioGroup,
    Checkbox, Paper, IconButton, Snackbar, Alert
} from '@mui/material';
import {
    Bloodtype as BloodIcon,
    ArrowBack as BackIcon,
    CheckCircle as SuccessIcon,
    CalendarMonth as CalendarIcon,
    MonitorWeight as WeightIcon,
    Security as SecurityIcon,
    PauseCircle as PauseIcon,
    PlayCircle as ResumeIcon,
    CheckCircle as AcceptIcon,
    Cancel as IgnoreIcon,
    NotificationsActive as ReqIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const BloodDonation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState(null);
    const [donorData, setDonorData] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
    const [formData, setFormData] = useState({
        patientId: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        gender: '',
        age: '',
        bloodGroup: '',
        weight: '',
        lastDonationDate: '',
        medicalQuestions: {
            chronicConditions: false,
            recentSurgery: false,
            recentTattoo: false,
            onMedication: false,
            infectiousDiseases: false
        },
        consent: false
    });

    const sessionUser = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        const checkStatus = async () => {
            if (!sessionUser.mediId) { navigate('/'); return; }
            try {
                const res = await axios.get(`${API_BASE_URL}/api/blood-donation/status/${sessionUser.mediId}`);
                if (res.data.success && res.data.registered) {
                    setRegistrationStatus('registered');
                    setDonorData(res.data.data);
                    fetchIncoming(sessionUser.mediId);
                } else {
                    setRegistrationStatus('unregistered');
                    fetchProfile();
                }
            } catch (err) {
                setRegistrationStatus('unregistered');
                fetchProfile();
            } finally {
                setLoading(false);
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/search-patient/${sessionUser.mediId}`);
                if (res.data.success) {
                    const p = res.data.patient;
                    let computedAge = p.age || '';
                    if (p.dob) {
                        const birthDate = new Date(p.dob);
                        const today = new Date();
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const m = today.getMonth() - birthDate.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                        }
                        computedAge = age.toString();
                    }
                    setFormData(prev => ({ ...prev, patientId: p.mediId || '', firstName: p.firstName || '', lastName: p.lastName || '', phone: p.phone || '', email: p.email || '', gender: p.gender || '', age: computedAge }));
                }
            } catch (err) { console.error(err); }
        };

        const fetchIncoming = async (id) => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/blood-request/incoming/${id}`);
                if (res.data.success) setIncomingRequests(res.data.requests);
            } catch (err) { console.error(err); }
        };

        checkStatus();
    }, [sessionUser.mediId, navigate]);

    const handleQuestionChange = (question, value) => {
        setFormData(prev => ({ ...prev, medicalQuestions: { ...prev.medicalQuestions, [question]: value === 'yes' } }));
    };

    const handleToggleStatus = async () => {
        setToggling(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/blood-donation/toggle/${sessionUser.mediId}`);
            if (res.data.success) {
                setDonorData(prev => ({ ...prev, isActive: res.data.isActive }));
                setSnack({ open: true, msg: res.data.message, severity: res.data.isActive ? 'success' : 'warning' });
            }
        } catch (err) {
            setSnack({ open: true, msg: err.response?.data?.message || 'Failed to update status.', severity: 'error' });
        } finally {
            setToggling(false);
        }
    };

    const handleRequestAction = async (reqId, action) => {
        setActionLoading(reqId + action);
        try {
            const res = await axios.put(`${API_BASE_URL}/api/blood-request/update/${reqId}`, { status: action });
            if (res.data.success) {
                setIncomingRequests(prev => prev.filter(r => r._id !== reqId));
                setSnack({ open: true, msg: action === 'Accepted' ? `Request accepted! Token #${res.data.request.tokenNumber} generated.` : 'Request ignored.', severity: action === 'Accepted' ? 'success' : 'info' });
            }
        } catch (err) {
            setSnack({ open: true, msg: 'Action failed.', severity: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.consent) {
            alert("Please accept the privacy policy and consent to proceed.");
            return;
        }
        setRegistering(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/blood-donation/register`, formData);
            if (res.data.success) {
                setRegistrationStatus('registered');
                setDonorData(res.data.data);
                alert("Thank you! You are now a registered blood donor.");
            }
        } catch (err) {
            alert(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setRegistering(false);
        }
    };

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f8fafc' }}>
                <CircularProgress sx={{ color: '#ef4444' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#0d0f1e', py: 4, color: 'white' }}>
            <Container maxWidth="md">
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => navigate('/patient-dashboard')}
                    sx={{ mb: 3, color: '#fca5a5' }}
                >
                    Back to Dashboard
                </Button>

                {registrationStatus === 'registered' ? (
                    /* --- REGISTERED DONOR VIEW --- */
                    <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden', bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Box sx={{ background: donorData?.isActive ? 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.2))' : 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(100,116,139,0.1))', color: 'white', p: 4, textAlign: 'center', transition: 'background 0.4s', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <SuccessIcon sx={{ fontSize: 60, mb: 1, color: donorData?.isActive ? '#ef4444' : '#94a3b8' }} />
                            <Typography variant="h4" fontWeight="bold" sx={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Donor Registered</Typography>
                            <Typography variant="body1" sx={{ color: '#cbd5e1' }}>
                                {donorData?.isActive ? 'You are currently accepting blood requests.' : 'Donation paused. You are hidden from searches.'}
                            </Typography>
                        </Box>
                        <CardContent sx={{ p: 4, bgcolor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}>
                            {/* Stop / Resume Toggle */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={donorData?.isActive ? <PauseIcon /> : <ResumeIcon />}
                                    onClick={handleToggleStatus}
                                    disabled={toggling}
                                    sx={{
                                        borderRadius: 50,
                                        px: 4,
                                        py: 1,
                                        fontWeight: 'bold',
                                        borderColor: donorData?.isActive ? '#ef4444' : '#10b981',
                                        color: donorData?.isActive ? '#ef4444' : '#10b981',
                                        '&:hover': { bgcolor: donorData?.isActive ? '#fef2f2' : '#f0fdf4' }
                                    }}
                                >
                                    {toggling ? <CircularProgress size={20} color="inherit" /> : (donorData?.isActive ? 'Stop Donating' : 'Resume Donating')}
                                </Button>
                            </Box>
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 'bold', letterSpacing: 1 }}>DONOR NAME</Typography>
                                            <Typography variant="h6" color="white">{donorData.firstName} {donorData.lastName}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 'bold', letterSpacing: 1 }}>BLOOD GROUP</Typography>
                                            <Chip
                                                label={donorData.bloodGroup}
                                                icon={<BloodIcon />}
                                                sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', fontWeight: 'bold', fontSize: '1.1rem', px: 1, py: 2.5, border: '1px solid rgba(239, 68, 68, 0.3)' }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 'bold', letterSpacing: 1 }}>DONOR ID (MEDI-ID)</Typography>
                                            <Typography variant="body1" fontWeight="medium" color="#818cf8">{donorData.patientId}</Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 'bold', letterSpacing: 1 }}>REGISTRATION DATE</Typography>
                                            <Typography variant="body1" color="white">{new Date(donorData.registrationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 'bold', letterSpacing: 1 }}>WEIGHT</Typography>
                                            <Typography variant="body1" color="white">{donorData.weight} kg</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 'bold', letterSpacing: 1 }}>LAST DONATION</Typography>
                                            <Typography variant="body1" color="white">{donorData.lastDonationDate || 'First-time donor'}</Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

                            {/* Eligibility Summary */}
                            <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="#818cf8">Eligibility Screening Summary:</Typography>
                                <Grid container spacing={1}>
                                    {[
                                        { label: 'Chronic Conditions', value: donorData.medicalQuestions?.chronicConditions },
                                        { label: 'Recent Surgery', value: donorData.medicalQuestions?.recentSurgery },
                                        { label: 'Recent Tattoo/Piercing', value: donorData.medicalQuestions?.recentTattoo },
                                        { label: 'On Medication', value: donorData.medicalQuestions?.onMedication },
                                        { label: 'Infectious Diseases History', value: donorData.medicalQuestions?.infectiousDiseases }
                                    ].map((q, i) => (
                                        <Grid item xs={12} key={i}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2" color="#cbd5e1">{q.label}</Typography>
                                                <Chip size="small" label={q.value ? 'Yes' : 'No'} sx={{ color: q.value ? '#fbbf24' : '#4ade80', borderColor: q.value ? 'rgba(251, 191, 36, 0.3)' : 'rgba(74, 222, 128, 0.3)', bgcolor: 'rgba(255,255,255,0.02)' }} variant="outlined" />
                                            </Stack>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* --- Incoming Blood Requests (Pending) --- */}
                            {incomingRequests.filter(r => r.status === 'Pending').length > 0 && (
                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="h6" fontWeight="bold" color="error" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <ReqIcon /> New Blood Requests ({incomingRequests.filter(r => r.status === 'Pending').length})
                                    </Typography>
                                    <Stack spacing={2}>
                                        {incomingRequests.filter(r => r.status === 'Pending').map(req => (
                                            <Paper key={req._id} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(239, 68, 68, 0.3)', bgcolor: 'rgba(239, 68, 68, 0.05)' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                                                    <Box>
                                                        <Typography variant="subtitle2" fontWeight="bold" color="white">Requester: {req.requesterName}</Typography>
                                                        <Typography variant="body2" color="#cbd5e1">Hospital: {req.hospitalName}</Typography>

                                                        {/* Highlight Donation Time */}
                                                        {req.donationTime && (
                                                            <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                                <CalendarIcon fontSize="small" color="error" />
                                                                <Typography variant="body2" fontWeight="bold" color="#fca5a5">
                                                                    Preferred Time: {req.donationTime}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption" color="#64748b">{new Date(req.requestDate).toLocaleString('en-IN')}</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Stack direction="row" spacing={1} sx={{ mt: { xs: 2, sm: 0 } }}>
                                                        <Button size="small" variant="contained" color="success"
                                                            startIcon={<AcceptIcon />}
                                                            disabled={actionLoading === req._id + 'Accepted'}
                                                            onClick={() => handleRequestAction(req._id, 'Accepted')}
                                                            sx={{ borderRadius: 20, fontWeight: 'bold' }}>
                                                            Accept
                                                        </Button>
                                                        <Button size="small" variant="outlined" color="inherit"
                                                            startIcon={<IgnoreIcon />}
                                                            disabled={actionLoading === req._id + 'Ignored'}
                                                            onClick={() => handleRequestAction(req._id, 'Ignored')}
                                                            sx={{ borderRadius: 20 }}>
                                                            Ignore
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {/* --- Active Donation Tokens (Accepted) --- */}
                            {incomingRequests.filter(r => r.status === 'Accepted').length > 0 && (
                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="h6" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <AcceptIcon /> Active Donation Tokens
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {incomingRequests.filter(r => r.status === 'Accepted').map(req => (
                                            <Grid item xs={12} key={req._id}>
                                                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', bgcolor: req.bloodReceived ? 'rgba(74, 222, 128, 0.05)' : 'rgba(255,255,255,0.03)', position: 'relative', overflow: 'hidden' }}>
                                                    {req.bloodReceived && (
                                                        <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(22, 163, 74, 0.8)', color: 'white', px: 2, py: 0.5, borderBottomLeftRadius: 10, fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                            BLOOD RECEIVED
                                                        </Box>
                                                    )}
                                                    <Stack direction="row" spacing={3} alignItems="center">
                                                        <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#94a3b8', display: 'block' }}>TOKEN</Typography>
                                                            <Typography variant="h4" fontWeight="bold" color="#818cf8">#{req.tokenNumber}</Typography>
                                                        </Box>
                                                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                                                        <Box sx={{ flexGrow: 1 }}>
                                                            <Typography variant="subtitle1" fontWeight="bold" color="white">{req.hospitalName}</Typography>
                                                            <Typography variant="body2" color="#cbd5e1">Patient: {req.requesterName}</Typography>
                                                            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                                                <Chip size="small" label={req.bloodGroup} sx={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.5)', bgcolor: 'rgba(239, 68, 68, 0.1)', fontWeight: 'bold' }} variant="outlined" />
                                                                {req.donationTime && (
                                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'medium', color: '#cbd5e1' }}>
                                                                        <CalendarIcon fontSize="inherit" /> {req.donationTime}
                                                                    </Typography>
                                                                )}
                                                            </Stack>
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}

                            <Box sx={{ mt: 4, textAlign: 'center' }}>
                                <Button variant="outlined" sx={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => window.print()}>Print Donor Card</Button>
                            </Box>
                        </CardContent>
                    </Card>
                ) : (
                    /* --- REGISTRATION FORM VIEW --- */
                    <Card sx={{ borderRadius: 4, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden', bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Box sx={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(185,28,28,0.1))', color: 'white', p: 4, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                                <BloodIcon sx={{ fontSize: 40, color: '#ef4444' }} />
                                <Typography variant="h4" fontWeight="bold" sx={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>Become a LifeSaver</Typography>
                            </Stack>
                            <Typography variant="body1" sx={{ color: '#cbd5e1' }}>
                                One pint of blood can save up to three lives. Register today.
                            </Typography>
                        </Box>

                        <form onSubmit={handleSubmit}>
                            <CardContent sx={{ p: 4, bgcolor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)' }}>
                                <Typography variant="h6" gutterBottom fontWeight="bold" color="white">Profile Information</Typography>
                                <Typography variant="body2" color="#94a3b8" sx={{ mb: 3 }}>
                                    Some details are auto-filled from your profile.
                                </Typography>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <TextField label="First Name" fullWidth disabled value={formData.firstName} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-disabled fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField label="Last Name" fullWidth disabled value={formData.lastName} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-disabled fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField label="Phone" fullWidth disabled value={formData.phone} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-disabled fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField label="Email" fullWidth disabled value={formData.email} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-disabled fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField label="Age" fullWidth disabled value={formData.age} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-disabled fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField label="Gender" fullWidth disabled value={formData.gender} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&.Mui-disabled fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
                                    </Grid>
                                </Grid>

                                <Typography variant="h6" gutterBottom fontWeight="bold" color="white" sx={{ mt: 4 }}>
                                    Donation Details
                                </Typography>
                                <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={5}>
                                        <TextField
                                            select label="Blood Group" fullWidth required
                                            value={formData.bloodGroup}
                                            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                                            sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' }, '& .MuiSvgIcon-root': { color: 'white' } }}
                                        >
                                            {bloodGroups.map(bg => <MenuItem key={bg} value={bg}>{bg}</MenuItem>)}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            label="Weight (kg)" type="number" fullWidth required
                                            value={formData.weight}
                                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                            InputProps={{ startAdornment: <WeightIcon sx={{ color: '#94a3b8', mr: 1 }} /> }}
                                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            label="Last Donation Date" type="date" fullWidth
                                            value={formData.lastDonationDate}
                                            onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                                            InputLabelProps={{ shrink: true, sx: { color: '#94a3b8' } }}
                                            helperText="Leave empty if first time"
                                            FormHelperTextProps={{ sx: { color: '#64748b' } }}
                                            InputProps={{ startAdornment: <CalendarIcon sx={{ color: '#94a3b8', mr: 1 }} /> }}
                                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } } }}
                                        />
                                    </Grid>
                                </Grid>

                                <Typography variant="h6" gutterBottom fontWeight="bold" color="white" sx={{ mt: 4 }}>
                                    Medical Eligibility Questionnaire
                                </Typography>
                                <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                                <Grid container spacing={3}>

                                    <Grid item xs={12}>
                                        <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                            <Stack spacing={3}>
                                                {[
                                                    { id: 'chronicConditions', label: 'Do you have any chronic medical conditions (e.g., Diabetes, Hypertension, Heart disease)?' },
                                                    { id: 'recentSurgery', label: 'Have you undergone any major surgery in the last 6 months?' },
                                                    { id: 'recentTattoo', label: 'Have you received a tattoo or body piercing in the last 6 months?' },
                                                    { id: 'onMedication', label: 'Are you currently taking any long-term prescription medication?' },
                                                    { id: 'infectiousDiseases', label: 'Have you ever tested positive for HIV, Hepatitis B/C, or other infectious diseases?' }
                                                ].map((q) => (
                                                    <Box key={q.id}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#cbd5e1' }}>{q.label}</Typography>
                                                        <RadioGroup
                                                            row
                                                            value={formData.medicalQuestions[q.id] ? 'yes' : 'no'}
                                                            onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                                                        >
                                                            <FormControlLabel value="yes" control={<Radio color="error" sx={{ color: 'rgba(255,255,255,0.5)' }} />} label={<Typography color="#cbd5e1">Yes</Typography>} />
                                                            <FormControlLabel value="no" control={<Radio color="error" sx={{ color: 'rgba(255,255,255,0.5)' }} />} label={<Typography color="#cbd5e1">No</Typography>} />
                                                        </RadioGroup>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Typography variant="h6" gutterBottom fontWeight="bold" color="white" sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SecurityIcon color="error" /> Privacy & Consent
                                        </Typography>
                                        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Paper sx={{ p: 2.5, bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 2, border: '1px dashed rgba(255,255,255,0.2)' }}>
                                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="white">Privacy Policy Summary:</Typography>
                                            <Typography variant="caption" color="#94a3b8" component="div" sx={{ mb: 2, lineHeight: 1.6 }}>
                                                1. Your medical and contact information will be stored securely in our centralized donor database.<br />
                                                2. Only registered hospitals and blood banks may access your blood group and contact details in case of emergency need.<br />
                                                3. We will never share your medical questionnaire responses with third parties without your explicit legal consent.<br />
                                                4. By registering, you agree to receive urgent notifications when your blood group is required.
                                            </Typography>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        color="error"
                                                        checked={formData.consent}
                                                        onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                                                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2" fontWeight="bold" color="#cbd5e1">
                                                        I agree to the privacy policy and consent to be a voluntary blood donor.
                                                    </Typography>
                                                }
                                            />
                                        </Paper>
                                    </Grid>
                                </Grid>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    fullWidth
                                    size="large"
                                    disabled={registering}
                                    sx={{
                                        mt: 4,
                                        py: 1.5,
                                        bgcolor: '#ef4444',
                                        fontWeight: 'bold',
                                        '&:hover': { bgcolor: '#dc2626' }
                                    }}
                                >
                                    {registering ? <CircularProgress size={24} color="inherit" /> : 'CONFIRM REGISTRATION'}
                                </Button>
                            </CardContent>
                        </form>
                    </Card>
                )}
            </Container>
            <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
};

export default BloodDonation;
