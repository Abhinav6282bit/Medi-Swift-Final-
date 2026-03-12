import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Stack, Avatar, IconButton, Grid,
    Divider, TextField, MenuItem, CircularProgress, Card, Badge, Chip
} from '@mui/material';
import {
    Bloodtype as BloodIcon,
    Phone as PhoneIcon,
    Search as SearchIcon,
    ArrowBack as BackIcon,
    GpsFixed as GpsIcon,
    AccountCircle as AccountIcon,
    Emergency as EmergencyIcon,
    Send as SendIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

const EmergencyBlood = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [donors, setDonors] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('');
    const [searching, setSearching] = useState(false);

    // Request Dialog State
    const [requestOpen, setRequestOpen] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [hospitalName, setHospitalName] = useState('');
    const [donationTime, setDonationTime] = useState('');
    const [hospitals, setHospitals] = useState([]);
    const [bloodFor, setBloodFor] = useState('Me');
    const [otherPatientId, setOtherPatientId] = useState('');
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const sessionData = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        fetchAllDonors();
        fetchHospitals();
    }, []);

    const fetchHospitals = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get-all-hospitals`);
            setHospitals(res.data);
        } catch (err) {
            console.error("Error fetching hospitals", err);
        }
    };

    const fetchAllDonors = async () => {
        try {
            setLoading(true);
            const requesterId = sessionData.mediId || '';

            // Fetch individual donors
            const donorRes = await axios.get(`${API_BASE_URL}/api/blood-donation/donors?requesterId=${requesterId}`);
            let allDonorsList = [];
            if (donorRes.data.success) {
                allDonorsList = donorRes.data.donors.map(d => ({
                    ...d,
                    id: d.patientId,
                    name: d.realName || 'Individual Donor',
                    type: 'Donor'
                }));
            }

            // Fetch Blood Banks
            const bankRes = await axios.get(`${API_BASE_URL}/api/blood-bank/all`);
            if (bankRes.data.success) {
                const banks = bankRes.data.bloodBanks.map(b => ({
                    ...b,
                    patientId: b.mediId, // Map for compatibility
                    id: b.mediId,
                    name: b.bloodBankName,
                    type: 'Blood Bank',
                    bloodGroup: 'All groups available' // Blood banks have multiple groups
                }));
                allDonorsList = [...allDonorsList, ...banks];
            }

            setDonors(allDonorsList);
        } catch (err) {
            console.error("Error fetching donors", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredDonors = selectedGroup
        ? donors.filter(d => d.bloodGroup === selectedGroup || d.type === 'Blood Bank')
        : [];

    const handleOpenRequest = (donor) => {
        setSelectedDonor(donor);
        setHospitalName('');
        setDonationTime('');
        setBloodFor('Me');
        setOtherPatientId('');
        // If it's a Blood Bank, default blood group to selectedGroup if available
        if (donor.type === 'Blood Bank' && selectedGroup) {
            setSelectedDonor({ ...donor, bloodGroup: selectedGroup });
        }
        setRequestOpen(true);
    };

    const handleSendRequest = async () => {
        if (!hospitalName.trim()) return alert('Please select a hospital.');
        if (!donationTime.trim()) return alert('Please enter the preferred donation time.');
        if (bloodFor === 'Others' && !otherPatientId.trim()) return alert('Please enter the Patient ID of the person needing blood.');
        if (selectedDonor.type === 'Blood Bank' && (selectedDonor.bloodGroup === 'All groups available' || !selectedDonor.bloodGroup)) {
            return alert('Please specify which blood group you need from the bank.');
        }

        try {
            const finalRequesterId = bloodFor === 'Me' ? (sessionData.mediId || `REQ-${Date.now()}`) : otherPatientId.trim();
            const payload = {
                requesterId: finalRequesterId,
                requesterName: `${sessionData.firstName || 'Guest'} ${sessionData.lastName || ''} (Requested by ${sessionData.mediId})`.trim(),
                hospitalName,
                donorId: selectedDonor.patientId,
                bloodGroup: selectedDonor.bloodGroup,
                donationTime
            };

            const res = await axios.post(`${API_BASE_URL}/api/blood-request/send`, payload);
            if (res.data.success) {
                alert(`Blood request sent to ${selectedDonor.type}! They will Accept or Ignore your request.`);
                setRequestOpen(true); // Keep open to show success or navigate? Actually alert is enough.
                setRequestOpen(false);
                fetchAllDonors();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send blood request.');
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            bgcolor: '#0f172a',
            p: { xs: 2, md: 4 },
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Glow */}
            <Box sx={{
                position: 'absolute',
                top: '20%',
                right: '10%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(225, 29, 72, 0.15) 0%, transparent 70%)',
                zIndex: 0
            }} />

            <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1200, mx: 'auto' }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                        <BackIcon />
                    </IconButton>
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <BloodIcon sx={{ color: '#e11d48', fontSize: 32 }} />
                            <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: -1 }}>EMERGENCY BLOOD</Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>Connect directly with life-saving donors in your area.</Typography>
                    </Box>
                </Stack>

                <Grid container spacing={4}>
                    {/* Left Panel: Search & Filters */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SearchIcon sx={{ color: '#e11d48' }} /> Find Donors
                            </Typography>

                            <Typography variant="caption" sx={{ opacity: 0.7, mb: 1, display: 'block' }}>SELECT BLOOD GROUP</Typography>
                            <Grid container spacing={1} sx={{ mb: 4 }}>
                                {bloodGroups.map((bg) => (
                                    <Grid item xs={3} key={bg}>
                                        <Button
                                            fullWidth
                                            variant={selectedGroup === bg ? 'contained' : 'outlined'}
                                            onClick={() => setSelectedGroup(bg === selectedGroup ? '' : bg)}
                                            sx={{
                                                minWidth: 0,
                                                p: 1.5,
                                                borderRadius: 3,
                                                borderColor: 'rgba(255,255,255,0.2)',
                                                color: 'white',
                                                bgcolor: selectedGroup === bg ? '#e11d48' : 'transparent',
                                                '&:hover': { bgcolor: selectedGroup === bg ? '#be123c' : 'rgba(255,255,255,0.1)' }
                                            }}
                                        >
                                            {bg}
                                        </Button>
                                    </Grid>
                                ))}
                            </Grid>

                            <Box sx={{ p: 2, bgcolor: 'rgba(225, 29, 72, 0.1)', borderRadius: 4, border: '1px dashed #e11d48' }}>
                                <Typography variant="caption" sx={{ color: '#fda4af', fontWeight: 'bold' }}>IMPORTANT NOTICE:</Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8, fontSize: '0.8rem' }}>
                                    This list is for emergency use only. Please contact donors respectfully and only when urgently required.
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Right Panel: Donor Registry */}
                    <Grid item xs={12} md={8}>
                        {loading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
                                <CircularProgress sx={{ color: '#e11d48' }} />
                                <Typography sx={{ mt: 2, opacity: 0.6 }}>Securing blood donor registry...</Typography>
                            </Box>
                        ) : (
                            <Stack spacing={2}>
                                {!selectedGroup ? (
                                    <Box sx={{ p: 10, textAlign: 'center', borderRadius: 6, bgcolor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <SearchIcon sx={{ fontSize: 60, opacity: 0.2, mb: 2, color: '#e11d48' }} />
                                        <Typography variant="h5" sx={{ opacity: 0.7, fontWeight: 'bold' }}>Find Active Donors</Typography>
                                        <Typography variant="body1" sx={{ mt: 1, opacity: 0.5 }}>Please select a blood group from the left panel to search for matching donors.</Typography>
                                    </Box>
                                ) : filteredDonors.length > 0 ? (
                                    filteredDonors.map((donor) => (
                                        <Card key={donor._id} sx={{
                                            p: 3,
                                            borderRadius: 5,
                                            bgcolor: 'rgba(255,255,255,0.03)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'white',
                                            transition: '0.3s',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', transform: 'translateX(10px)' }
                                        }}>
                                            <Grid container alignItems="center" spacing={2}>
                                                <Grid item>
                                                    <Badge
                                                        overlap="circular"
                                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                                        badgeContent={
                                                            <Box sx={{ width: 16, height: 16, bgcolor: '#10b981', borderRadius: '50%', border: '2px solid #0f172a' }} />
                                                        }
                                                    >
                                                        <Avatar sx={{ width: 64, height: 64, bgcolor: '#e11d48', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                                            {donor.bloodGroup}
                                                        </Avatar>
                                                    </Badge>
                                                </Grid>
                                                <Grid item xs>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                        <Chip
                                                            label={donor.type}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: donor.type === 'Blood Bank' ? '#3b82f6' : '#e11d48',
                                                                color: '#fff',
                                                                fontWeight: 'bold',
                                                                height: 20,
                                                                fontSize: '0.65rem'
                                                            }}
                                                        />
                                                        <Typography variant="h6" fontWeight="bold">
                                                            {donor.name}
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={2} sx={{ opacity: 0.6 }}>
                                                        <Typography variant="body2">
                                                            {donor.type === 'Blood Bank' ? `Medi-ID: ${donor.patientId}` : 'Registered Blood Donor'}
                                                        </Typography>
                                                    </Stack>
                                                </Grid>
                                                <Grid item>
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<SendIcon />}
                                                        onClick={() => handleOpenRequest(donor)}
                                                        sx={{
                                                            bgcolor: '#e11d48',
                                                            borderRadius: 50,
                                                            px: 3,
                                                            fontWeight: 'bold',
                                                            '&:hover': { bgcolor: '#be123c' }
                                                        }}
                                                    >
                                                        SEND REQUEST
                                                    </Button>
                                                </Grid>
                                            </Grid>
                                        </Card>
                                    ))
                                ) : (
                                    <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 6, bgcolor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                        <EmergencyIcon sx={{ fontSize: 48, opacity: 0.2, mb: 2 }} />
                                        <Typography variant="h6" sx={{ opacity: 0.5 }}>No donors found for group {selectedGroup}</Typography>
                                        <Button variant="text" sx={{ mt: 1, color: '#e11d48' }} onClick={() => setSelectedGroup('')}>Clear Filters</Button>
                                    </Paper>
                                )}
                            </Stack>
                        )}
                    </Grid>
                </Grid>
            </Box>

            <Dialog open={requestOpen} onClose={() => setRequestOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BloodIcon sx={{ color: '#e11d48' }} /> Request Blood Donation
                </DialogTitle>
                <DialogContent dividers>
                    <Typography gutterBottom>
                        You are requesting <strong>{selectedDonor?.bloodGroup}</strong> blood from <strong>{selectedDonor?.name}</strong>
                    </Typography>
                    <TextField
                        select
                        autoFocus
                        margin="dense"
                        label="Hospital Name (Where blood is required)"
                        fullWidth
                        variant="outlined"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        required
                    >
                        {hospitals.map((hosp) => (
                            <MenuItem key={hosp._id} value={hosp.hospitalName}>{hosp.hospitalName}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        margin="dense"
                        label="Preferred Donation Time (e.g. 10:00 AM – 11:00 AM)"
                        fullWidth
                        variant="outlined"
                        value={donationTime}
                        onChange={(e) => setDonationTime(e.target.value)}
                        required
                        sx={{ mt: 2 }}
                        placeholder="e.g. 10:00 AM – 11:00 AM"
                    />

                    <TextField
                        select
                        margin="dense"
                        label="Blood Required For"
                        fullWidth
                        variant="outlined"
                        value={bloodFor}
                        onChange={(e) => setBloodFor(e.target.value)}
                        required
                        sx={{ mt: 2 }}
                    >
                        <MenuItem value="Me">Me (Self)</MenuItem>
                        <MenuItem value="Others">Friend / Family (Other Patient)</MenuItem>
                    </TextField>

                    {bloodFor === 'Others' && (
                        <TextField
                            margin="dense"
                            label="Patient ID (Who needs the blood)"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={otherPatientId}
                            onChange={(e) => setOtherPatientId(e.target.value)}
                            required
                            sx={{ mt: 2 }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setRequestOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleSendRequest} variant="contained" sx={{ bgcolor: '#e11d48', '&:hover': { bgcolor: '#be123c' } }}>
                        Send Request
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmergencyBlood;
