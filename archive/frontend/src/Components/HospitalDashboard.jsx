import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, Grid, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Paper, TextField, Stack, MenuItem, AppBar, Toolbar, Avatar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { 
    Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon, 
    LocalHospital as HospitalIcon, AddCircleOutline as AddIcon, 
    Logout as LogoutIcon, Bed as BedIcon, Opacity as OxygenIcon, 
    ReceiptLong as BillingIcon, Assignment as PatientIcon, Event as AppointmentIcon,
    VerifiedUser as SecurityIcon, Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const HospitalDashboard = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('Overview');
    const [isAdminVerified, setIsAdminVerified] = useState(false);
    const [securityOpen, setSecurityOpen] = useState(false);
    const [adminPass, setAdminPass] = useState('');
    const [records, setRecords] = useState([]); 
    const [aptOpen, setAptOpen] = useState(false);
    const [isRegistered, setIsRegistered] = useState(null);
    const [searchId, setSearchId] = useState('');
    const [foundPatient, setFoundPatient] = useState(null);
    const [selectedSpeciality, setSelectedSpeciality] = useState('');
    const [virtualToken, setVirtualToken] = useState(null);
    const [todayAptCount, setTodayAptCount] = useState(0);
    const [queue, setQueue] = useState([]);
    const [callingToken, setCallingToken] = useState(null);

    const sessionData = JSON.parse(localStorage.getItem('userSession')) || {};
    const hospitalName = sessionData.hospitalName || "Medical Center";
    const hospitalId = sessionData.mediId || "MS-HOSP-XXXX";
    const dbSecurityKey = sessionData.securityKey || 'swift-admin-2026';

   const fetchRecords = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/get-records?vault=${hospitalId}`);
            setRecords(res.data);
        } catch (err) { console.error("Error fetching records", err); }
    };

  
    const fetchTodayCount = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/get-hospital-appointments/${hospitalId}`);
            const today = new Date().toDateString();
            
          
            const count = res.data.filter(apt => new Date(apt.createdAt).toDateString() === today).length;
            setTodayAptCount(count);
        } catch (err) { 
            console.error("Error fetching today's count", err); 
        }
    };
  
const fetchLiveQueue = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await axios.get(`http://localhost:5000/api/get-hospital-appointments/${hospitalId}`);
            
            const dailyQueue = res.data.filter(apt => 
                new Date(apt.createdAt).toISOString().split('T')[0] === today
            ).sort((a, b) => Number(a.token) - Number(b.token));

            setQueue(dailyQueue);
            setCallingToken(dailyQueue.find(apt => apt.status === 'Waiting') || null);
        } catch (err) { console.error("Error fetching queue", err); }
    };
   
   const location = useLocation(); 

 useEffect(() => {
    if (!sessionData.mediId) { 
        navigate('/'); 
        return; 
    }
    fetchRecords();
    fetchTodayCount();

 
    if (view === 'LiveQueue') {
        fetchLiveQueue();
    }

    if (location.state?.newId) {
        setSearchId(location.state.newId);
        setIsRegistered('YES');
        setAptOpen(true);
    }
}, [location.state, view]);

    const handleVerifyAdmin = () => {
        if (adminPass === dbSecurityKey) { 
            setIsAdminVerified(true);
            setSecurityOpen(false);
            setView('Admin');
            setAdminPass('');
        } else {
            alert("❌ Incorrect Admin Security Key");
        }
    };

 const handleSearchPatient = async () => {
    if (!searchId) return alert("Please enter a Medi-ID");
    
    try {
        const res = await axios.get(`http://localhost:5000/api/search-patient/${searchId}`);
        if (res.data && res.data.success) {
            setFoundPatient(res.data.patient);
        }
    } catch (err) { 
        
        setFoundPatient(null);
        alert("Patient not found in Medi-Swift Database."); 
    }
};

const handleConfirmAppointment = async (name) => {
    if (!records || records.length === 0) return alert("No doctor records loaded.");

    const availableDoc = records.find(r => 
        r.category === 'Doctors' && 
        r.detail?.toLowerCase().includes(selectedSpeciality?.toLowerCase())
    );

    if (!availableDoc) return alert(`No Doctor found for ${selectedSpeciality}`);

    // We no longer generate the token here; the backend will do it.
   const payload = {
    hospitalId: hospitalId, 
    patientId: foundPatient?.mediId || 'NEW',
    patientName: name,
    doctorId: availableDoc.mediId,
    doctorName: availableDoc.name,
    speciality: selectedSpeciality,
    date: new Date().toISOString().split('T')[0]
};
   try {
            const res = await axios.post('http://localhost:5000/api/book-appointment', payload);
            if (res.data.success) {
                setVirtualToken(res.data.appointment); 
                fetchTodayCount(); 
            }
        } catch (err) { 
            alert("Booking failed at server."); 
        }
    };
    const [formData, setFormData] = useState({ 
        name: '', 
        detail: '', 
        contact: '', 
        category: 'Doctor',
        password: '' 
    });

   const handleSavePersonnel = async () => {
    if (!formData.name || !formData.detail || !formData.password) {
        return alert("Please fill Name, Role, and set a Password for the user.");
    }
    
    try {
        const categoryMap = { 
            'Doctor': 'Doctors', 
            'Nurse': 'Nurses', 
            'Staff': 'Staff',
            'Pharmacy': 'Pharmacy'
        };
        
        const roleForLogin = formData.category.toUpperCase(); 
        
        const userReg = await axios.post('http://localhost:5000/api/admin/add-hospital', {
            role: roleForLogin,
            firstName: formData.name,
            password: formData.password,
            phone: formData.contact,
            hospitalName: hospitalName,
            hospitalMediId: hospitalId 
        });

        if (userReg.data.success) {
            const generatedId = userReg.data.generatedId;
            const payload = { 
                ...formData, 
                category: categoryMap[formData.category],
                mediId: generatedId 
            };
            
          
            await axios.post(`http://localhost:5000/api/add-record?vault=${hospitalId}`, payload);
            
            alert(`✅ Success!\n${formData.name} registered.\nMedi-ID: ${generatedId}\nPassword: ${formData.password}`);
            setFormData({ name: '', detail: '', contact: '', category: 'Doctor', password: '' });
            fetchRecords();
        }
    } catch (err) { 
        alert("Error registering personnel."); 
    }
};

   const menuItems = [
        { text: 'Overview', icon: <DashboardIcon />, view: 'Overview' },
        { text: 'Live Queue', icon: <PeopleIcon />, view: 'LiveQueue' }, 
        { text: 'Doctors INFO', icon: <HospitalIcon />, view: 'Doctors' },
        { text: 'Nurses INFO', icon: <PeopleIcon />, view: 'Nurses' },
        { text: 'Beds Management', icon: <BedIcon />, view: 'Beds' },
        { text: 'Financials', icon: <BillingIcon />, view: 'Billing' },
        { text: 'Admin Panel', icon: <SecurityIcon />, view: 'Admin_Lock' },
    ];

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7fe' }}>
            <Drawer variant="permanent" sx={{ width: 260, [`& .MuiDrawer-paper`]: { width: 260, bgcolor: '#0b1437', color: 'white' } }}>
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">MEDI-SWIFT</Typography>
                    <Typography variant="caption" sx={{ color: '#707eae' }}>{hospitalName}</Typography>
                </Box>
                <Divider sx={{ bgcolor: '#1b254b' }} />
                <List sx={{ p: 2 }}>
                    {menuItems.map((item) => (
                        <ListItemButton 
                            key={item.text} 
                            selected={view === item.view || (item.view === 'Admin_Lock' && view === 'Admin')}
                            onClick={() => {
                                if (item.view === 'Admin_Lock') {
                                    if (isAdminVerified) setView('Admin');
                                    else setSecurityOpen(true);
                                } else {
                                    setView(item.view);
                                }
                            }}
                            sx={{ borderRadius: 3, mb: 1, '&.Mui-selected': { bgcolor: '#4318ff' } }}
                        >
                            <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    ))}
                </List>
                <Button sx={{ mt: 'auto', mb: 2, color: '#ff5f5f' }} onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</Button>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                    <Typography variant="h4" fontWeight="bold">{view} Center</Typography>
                    <Button 
                        variant="contained" 
                        startIcon={<AppointmentIcon />} 
                        onClick={() => { setAptOpen(true); setIsRegistered(null); setFoundPatient(null); setVirtualToken(null); }}
                        sx={{ bgcolor: '#4318ff', borderRadius: 3 }}
                    >
                        Add Appointment
                    </Button>
                </Box>

               {/* OVERVIEW STATS */}
                {view === 'Overview' && (
                    <Grid container spacing={3}>
                        {[
                            { label: 'Today Appointments', count: todayAptCount.toString(), color: '#3182ce' },
                            { label: 'Beds Available', count: '12/50', color: '#38a169' },
                        ].map((stat) => (
                            <Grid item xs={12} sm={6} md={3} key={stat.label}>
                                <Paper sx={{ p: 3, borderRadius: 4, textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                    <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color }}>{stat.count}</Typography>
                                    <Typography variant="body2" color="textSecondary">{stat.label}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )} 
                 
                {/* RECORD LIST VIEWS */}
                {view === 'LiveQueue' && (
    <Box>
        <Paper sx={{ p: 4, mb: 4, borderRadius: 4, bgcolor: '#4318ff', color: 'white', textAlign: 'center' }}>
            <Typography variant="h6">Now Serving</Typography>
            <Typography variant="h1" fontWeight="bold">
                {callingToken ? `#${callingToken.token}` : "---"}
            </Typography>
            <Typography variant="h5">{callingToken?.patientName || "Waiting for Patients"}</Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Today's Waiting List</Typography>
            <List>
                {queue.length > 0 ? queue.map((apt, index) => (
                    <React.Fragment key={apt._id}>
                        <ListItem
                            secondaryAction={
                                <Button variant="contained" color="success">Call Next</Button>
                            }
                        >
                            <ListItemText 
                                primary={`Token #${apt.token} - ${apt.patientName}`} 
                                secondary={`${apt.speciality} | Dr. ${apt.doctorName}`} 
                            />
                        </ListItem>
                        {index < queue.length - 1 && <Divider />}
                    </React.Fragment>
                )) : <Typography sx={{ p: 2 }}>No appointments booked for today yet.</Typography>}
            </List>
        </Paper>
    </Box>
)}

                {(view === 'Doctors' || view === 'Nurses' || view === 'Staff') && (
                    <Grid container spacing={3}>
                        {records.filter(r => r.category === view).map((person) => (
                            <Grid item xs={12} md={4} key={person._id}>
                                <Card sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <Typography variant="h6" fontWeight="bold">{person.name}</Typography>
                                    <Typography color="primary" variant="body2">{person.detail}</Typography>
                                    <Typography variant="caption" display="block">ID: {person.mediId || 'N/A'}</Typography>
                                    <Typography variant="caption" display="block">Contact: {person.contact}</Typography>
                                    <Typography variant="caption" display="block">Email: {person.email || 'N/A'}</Typography>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {view === 'Admin' && (
                    <Card sx={{ p: 6, borderRadius: 5, maxWidth: 900 }}>
                        <Typography variant="h6">Register New Personnel</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>This will generate a Medi-ID for their private login.</Typography>
                        <Stack spacing={3}>
                            <TextField select label="Category" fullWidth value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                             <MenuItem value="Doctor">Doctor</MenuItem>
                             <MenuItem value="Nurse">Nurse</MenuItem>
                             <MenuItem value="Staff">General Staff</MenuItem>
                             <MenuItem value="Pharmacy">Hospital Pharmacy 🏥</MenuItem>
                             <MenuItem value="Lab">Hospital Lab🧪</MenuItem>
                            </TextField>
                            <TextField label="Full Name" fullWidth value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            <TextField label="Specialization / Role" fullWidth value={formData.detail} onChange={(e) => setFormData({...formData, detail: e.target.value})} />
                            <TextField label="Contact No" fullWidth value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} />
                            <TextField label="E-Mail" type="email" fullWidth value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                            <TextField label="Set Login Password" type="password" fullWidth value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                            <Button variant="contained" onClick={handleSavePersonnel} sx={{ bgcolor: '#0b1437', py: 1.5 }}>Create Account & Record</Button>
                        </Stack>
                    </Card>
                )}
            </Box>

            {/* APPOINTMENT REGISTRATION POP-UP */}
            <Dialog open={aptOpen} onClose={() => setAptOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Register Appointment</DialogTitle>
                <DialogContent dividers>
                    {isRegistered === null && (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                            <Typography variant="h6">Is the patient registered in Medi-Swift?</Typography>
                            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                                <Button variant="contained" onClick={() => setIsRegistered('YES')}>YES</Button>
                                <Button variant="outlined" onClick={() => setIsRegistered('NO')}>NO</Button>
                            </Stack>
                        </Box>
                    )}

                    {isRegistered === 'YES' && !virtualToken && (
                        <Box>
                            <Stack direction="row" spacing={1}>
                                <TextField fullWidth label="Enter Medi-Swift ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
                                <Button variant="contained" onClick={handleSearchPatient}><SearchIcon /></Button>
                            </Stack>
                            {foundPatient && (
                                <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f4ff', borderRadius: 2 }}>
                                    <Typography><b>Patient:</b> {foundPatient.firstName} {foundPatient.lastName}</Typography>
                                    <TextField 
                                        select fullWidth label="Required Speciality" 
                                        sx={{ mt: 2 }} value={selectedSpeciality}
                                        onChange={(e) => setSelectedSpeciality(e.target.value)}
                                    >
                                        {[...new Set(records.filter(r => r.category === 'Doctors').map(d => d.detail))].map(spec => (
                                            <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                                        ))}
                                    </TextField>
                                    <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={() => handleConfirmAppointment(foundPatient.firstName)}>Confirm</Button>
                                </Box>
                            )}
                        </Box>
                    )}

                    {isRegistered === 'NO' && !virtualToken && (
    <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography sx={{ mb: 2 }}>Patient must be registered in the system first.</Typography>
        <Button 
            variant="contained" 
            sx={{ bgcolor: '#4318ff' }}
            onClick={() => { 
                setAptOpen(false); 
                navigate('/register-patient'); 
            }}
        >
            Go to Registration Page
        </Button>
    </Box>
)}

                    {virtualToken && (
    <Box sx={{ textAlign: 'center', py: 3 }}>
        <Avatar 
            sx={{ bgcolor: '#4caf50', width: 80, height: 80, mx: 'auto', mb: 2 }}
        >
            <SecurityIcon sx={{ fontSize: 40 }} />
        </Avatar>
        
        <Typography variant="h6" color="textSecondary">
            Appointment Confirmed
        </Typography>
        
        <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#2e7d32', my: 1 }}>
            #{virtualToken.token}
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: '#f9f9f9' }}>
            <Stack spacing={1} sx={{ textAlign: 'left' }}>
                <Typography variant="body2"><strong>Patient:</strong> {virtualToken.patientName}</Typography>
                <Typography variant="body2"><strong>Doctor:</strong> {virtualToken.doctorName}</Typography>
                <Typography variant="body2"><strong>Department:</strong> {virtualToken.speciality}</Typography>
            </Stack>
        </Paper>

        <Button fullWidth variant="contained"sx={{ mt: 3, py: 1.5, borderRadius: '8px' }}onClick={() => {setAptOpen(false);setVirtualToken(null);setIsRegistered(null);}}>
            Done & Print Token
        </Button>
    </Box>
)}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAptOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={securityOpen} onClose={() => setSecurityOpen(false)}>
                <DialogTitle>Admin Verification</DialogTitle>
                <DialogContent>
                    <TextField fullWidth type="password" label="Security Key" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSecurityOpen(false)}>Cancel</Button>
                    <Button onClick={handleVerifyAdmin} variant="contained" sx={{ bgcolor: '#4318ff' }}>Verify</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default HospitalDashboard;