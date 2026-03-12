import React, { useState, useEffect } from 'react';
import { Box, Drawer, AppBar, Toolbar, List, Typography, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, CssBaseline, Card, CardContent, Button, Grid, styled, TextField, Paper, Divider, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Avatar, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Menu as MenuIcon, Dashboard, LocalHospital, LocalShipping, Science, Storefront, Logout, Home as HomeIcon, People, AdminPanelSettings, Hotel, Delete, Refresh, Bloodtype as BloodBankIcon, AddCircleOutline as AddIcon, Explore, Edit, Block, LockOpen } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const drawerWidth = 280;

const AdminContainer = styled(Box)({
    background: 'radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%)',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    display: 'flex',
    color: 'white'
});

const textFieldStyle = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 4,
        bgcolor: 'rgba(255,255,255,0.03)',
        color: 'white',
        '& input:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 1000px #0f172a inset',
            WebkitTextFillColor: 'white',
            transition: 'background-color 5000s ease-in-out 0s',
        }
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }
};

const MainContent = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        flexGrow: 1,
        padding: theme.spacing(4),
        marginTop: '80px',
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: `-${drawerWidth}px`,
        ...(open && {
            marginLeft: 0,
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
        }),
    }),
);

const AdminDashboard = () => {
    const [open, setOpen] = useState(true);
    const [view, setView] = useState('dashboard');
    const [stats, setStats] = useState({ hospitals: 0, labs: 0, ambulances: 0, pharmacies: 0, patients: 0, doctors: 0, bloodBanks: 0 });
    const [listData, setListData] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('all');
    const [loading, setLoading] = useState(false);

    const [hospitalData, setHospitalData] = useState({
        hospitalName: '', licenseNo: '', address: '', specialization: '',
        totalBeds: '', icuBeds: '', phone: '', email: '', password: ''
    });

    const [bloodBankData, setBloodBankData] = useState({
        bloodBankName: '', licenseNo: '', address: '', phone: '', email: '', password: ''
    });

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const navigate = useNavigate();

    const roleMapping = {
        'view-hospitals': 'HOSPITAL',
        'view-labs': 'LAB',
        'view-doctors': 'DOCTOR',
        'view-amb': 'AMBULANCE',
        'view-pha': 'PHARMACY',
        'view-patients': 'PATIENT',
        'view-blood-banks': 'BLOOD_BANK'
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const statsRes = await axios.get(`${API_BASE_URL}/api/admin/stats`);
            setStats(statsRes.data);

            // Always fetch hospitals for the filter
            const hospRes = await axios.get(`${API_BASE_URL}/api/admin/view-all/HOSPITAL`);
            setHospitals(hospRes.data);

            if (roleMapping[view]) {
                const listRes = await axios.get(`${API_BASE_URL}/api/admin/view-all/${roleMapping[view]}`);
                setListData(listRes.data);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setListData([]);
        setSelectedHospital('all'); // Reset filter on view change
        fetchData();
    }, [view]);

    const handleDrawerToggle = () => setOpen(!open);

    const handleLogout = () => {
        localStorage.removeItem('isAdminAuthenticated');
        navigate('/');
    };

    const handleEnrollHospital = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/admin/add-hospital`, {
                ...hospitalData,
                role: 'HOSPITAL'
            });
            if (res.data.success) {
                alert(`Hospital Enrolled Successfully!\nGenerated Medi-ID: ${res.data.generatedId}`);
                setView('view-hospitals');
                setHospitalData({ hospitalName: '', licenseNo: '', address: '', specialization: '', totalBeds: '', icuBeds: '', phone: '', email: '', password: '' });
            }
        } catch (err) {
            alert("Error enrolling hospital.");
        }
    };

    const handleEnrollBloodBank = async () => {
        if (!bloodBankData.bloodBankName || !bloodBankData.email || !bloodBankData.password) {
            return alert('Please fill in all required fields.');
        }
        try {
            const res = await axios.post(`${API_BASE_URL}/api/admin/register-blood-bank`, bloodBankData);
            if (res.data.success) {
                alert(`Blood Bank Registered!\nMedi-ID: ${res.data.generatedId}`);
                setView('view-blood-banks');
                setBloodBankData({ bloodBankName: '', licenseNo: '', address: '', phone: '', email: '', password: '' });
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error registering blood bank.');
        }
    };

    const deleteEntity = async (id) => {
        if (window.confirm("Are you sure you want to remove this record?")) {
            try {
                await axios.delete(`${API_BASE_URL}/api/admin/delete-entity/${id}`);
                fetchData();
            } catch (err) {
                alert("Delete failed.");
            }
        }
    };

    const toggleBlockStatus = async (id) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/admin/toggle-status/${id}`);
            if (res.data.success) {
                fetchData();
            }
        } catch (err) {
            alert("Status update failed.");
        }
    };

    const handleEditOpen = (item) => {
        setEditingItem(item);
        setEditFormData({ ...item });
        setEditDialogOpen(true);
    };

    const handleEditSave = async () => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/admin/update-entity/${editingItem._id}`, editFormData);
            if (res.data.success) {
                setEditDialogOpen(false);
                fetchData();
            }
        } catch (err) {
            alert("Update failed.");
        }
    };

    const menuItems = [
        { text: 'Analytics', icon: <Dashboard />, view: 'dashboard', color: '#6366f1' },
        { text: 'Register Hospital', icon: <LocalHospital />, view: 'add-hospital', color: '#10b981' },
        { text: 'Register Blood Bank', icon: <BloodBankIcon />, view: 'add-blood-bank', color: '#e11d48' },
        { text: 'Managed Hospitals', icon: <Hotel />, view: 'view-hospitals', color: '#38bdf8' },
        { text: 'Blood Banks', icon: <BloodBankIcon />, view: 'view-blood-banks', color: '#f43f5e' },
        { text: 'Laboratories', icon: <Science />, view: 'view-labs', color: '#fbbf24' },
        { text: 'Medical Staff', icon: <People />, view: 'view-doctors', color: '#818cf8' },
        { text: 'Emergency Fleet', icon: <LocalShipping />, view: 'view-amb', color: '#f97316' },
        { text: 'Pharmacies', icon: <Storefront />, view: 'view-pha', color: '#ef4444' },
        { text: 'Registered Patients', icon: <People />, view: 'view-patients', color: '#a855f7' },
    ];

    return (
        <AdminContainer>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    bgcolor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    zIndex: (theme) => theme.zIndex.drawer + 1
                }}
            >
                <Toolbar sx={{ height: 80, px: 4 }}>
                    <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 3, bgcolor: 'rgba(255,255,255,0.05)', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                        <MenuIcon />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
                        <Avatar sx={{ bgcolor: '#6366f1', width: 40, height: 40, boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}>
                            <AdminPanelSettings />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, letterSpacing: 0.5 }}>ADMIN CONSOLE</Typography>
                            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800, letterSpacing: 1 }}>MEDI-SWIFT NETWORK CONTROL</Typography>
                        </Box>
                    </Box>
                    <Button
                        onClick={handleLogout}
                        variant="outlined"
                        color="error"
                        startIcon={<Logout />}
                        sx={{ borderRadius: 3, fontWeight: 900, border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                        Sign Out
                    </Button>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="persistent"
                anchor="left"
                open={open}
                sx={{
                    width: drawerWidth,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        mt: '80px',
                        bgcolor: 'rgba(3, 7, 18, 0.4)',
                        backdropFilter: 'blur(30px)',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        px: 2
                    }
                }}
            >
                <List sx={{ mt: 3 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1.5 }}>
                            <ListItemButton
                                onClick={() => setView(item.view)}
                                selected={view === item.view}
                                sx={{
                                    borderRadius: 4,
                                    transition: '0.3s',
                                    '&.Mui-selected': {
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        borderLeft: `4px solid ${item.color}`,
                                        '& .MuiListItemIcon-root': { color: item.color }
                                    },
                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }
                                }}
                            >
                                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.4)', minWidth: 45 }}>{item.icon}</ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        sx: { fontWeight: 800, fontSize: '0.9rem', color: view === item.view ? 'white' : 'rgba(255,255,255,0.6)' }
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

            </Drawer>

            <MainContent open={open}>
                {loading && (
                    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
                        <CircularProgress sx={{ color: '#6366f1' }} />
                    </Box>
                )}

                {/* --- DASHBOARD VIEW --- */}
                {view === 'dashboard' && (
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, letterSpacing: -1, color: 'white' }}>Network Overview</Typography>
                        <Grid container spacing={3}>
                            {[
                                { label: 'Active Hospitals', val: stats.hospitals, icon: <LocalHospital />, color: '#6366f1' },
                                { label: 'Blood Banks', val: stats.bloodBanks, icon: <BloodBankIcon />, color: '#e11d48' },
                                { label: 'Laboratories', val: stats.labs, icon: <Science />, color: '#10b981' },
                                { label: 'Ambulances', val: stats.ambulances, icon: <LocalShipping />, color: '#f59e0b' },
                                { label: 'Pharmacies', val: stats.pharmacies, icon: <Storefront />, color: '#ef4444' },
                                { label: 'Total Doctors', val: stats.doctors, icon: <People />, color: '#38bdf8' },
                                { label: 'Registered Patients', val: stats.patients, icon: <People />, color: '#a855f7' }
                            ].map((stat, i) => (
                                <Grid item xs={12} sm={6} md={3} lg={2.4} key={i}>
                                    <Paper sx={{
                                        p: 3, borderRadius: 6, display: 'flex', alignItems: 'center',
                                        bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                                        transition: '0.3s',
                                        '&:hover': { transform: 'translateY(-5px)', bgcolor: 'rgba(255,255,255,0.05)', borderColor: stat.color }
                                    }}>
                                        <Box sx={{
                                            p: 1.5, bgcolor: `${stat.color}10`, borderRadius: 4, color: stat.color,
                                            mr: 2.5, display: 'flex', border: `1px solid ${stat.color}30`
                                        }}>
                                            {stat.icon}
                                        </Box>
                                        <Box>
                                            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1, color: 'white' }}>{stat.val}</Typography>
                                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* --- ADD BLOOD BANK VIEW --- */}
                {view === 'add-blood-bank' && (
                    <Paper sx={{ p: 5, borderRadius: 7, bgcolor: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', maxWidth: '900px', mx: 'auto' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                            <Box sx={{ p: 1.5, bgcolor: '#e11d4820', color: '#e11d48', borderRadius: 4 }}>
                                <BloodBankIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: 'white' }}>Enroll New Blood Bank</Typography>
                        </Box>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Blood Bank Name" value={bloodBankData.bloodBankName} onChange={(e) => setBloodBankData({ ...bloodBankData, bloodBankName: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="License Number" value={bloodBankData.licenseNo} onChange={(e) => setBloodBankData({ ...bloodBankData, licenseNo: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Contact Phone" value={bloodBankData.phone} onChange={(e) => setBloodBankData({ ...bloodBankData, phone: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Official Email" type="email" value={bloodBankData.email} onChange={(e) => setBloodBankData({ ...bloodBankData, email: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Physical Address" value={bloodBankData.address} onChange={(e) => setBloodBankData({ ...bloodBankData, address: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Security Password" type="password" value={bloodBankData.password} onChange={(e) => setBloodBankData({ ...bloodBankData, password: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12}><Button onClick={handleEnrollBloodBank} variant="contained" fullWidth sx={{ py: 2, borderRadius: 5, bgcolor: '#e11d48', fontWeight: 900, fontSize: '1.1rem', '&:hover': { bgcolor: '#be123c', transform: 'translateY(-2px)' } }}>Confirm Registration</Button></Grid>
                        </Grid>
                    </Paper>
                )}

                {/* --- ADD HOSPITAL VIEW --- */}
                {view === 'add-hospital' && (
                    <Paper sx={{ p: 5, borderRadius: 7, bgcolor: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', maxWidth: '900px', mx: 'auto' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                            <Box sx={{ p: 1.5, bgcolor: '#10b98120', color: '#10b981', borderRadius: 4 }}>
                                <LocalHospital sx={{ fontSize: 32 }} />
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 900, color: 'white' }}>Hospital Enrollment Flow</Typography>
                        </Box>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Hospital Full Name" value={hospitalData.hospitalName} onChange={(e) => setHospitalData({ ...hospitalData, hospitalName: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="License Identifier" value={hospitalData.licenseNo} onChange={(e) => setHospitalData({ ...hospitalData, licenseNo: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Registry Phone" value={hospitalData.phone} onChange={(e) => setHospitalData({ ...hospitalData, phone: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Administrative Email" value={hospitalData.email} onChange={(e) => setHospitalData({ ...hospitalData, email: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={8}><TextField fullWidth label="Medical Specializations" value={hospitalData.specialization} onChange={(e) => setHospitalData({ ...hospitalData, specialization: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={2}><TextField fullWidth label="Total Beds" type="number" value={hospitalData.totalBeds} onChange={(e) => setHospitalData({ ...hospitalData, totalBeds: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12} md={2}><TextField fullWidth label="Critical Care" type="number" value={hospitalData.icuBeds} onChange={(e) => setHospitalData({ ...hospitalData, icuBeds: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Facility Location" value={hospitalData.address} onChange={(e) => setHospitalData({ ...hospitalData, address: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="System Security Key" type="password" value={hospitalData.password} onChange={(e) => setHospitalData({ ...hospitalData, password: e.target.value })} sx={textFieldStyle} /></Grid>
                            <Grid item xs={12}><Button onClick={handleEnrollHospital} variant="contained" fullWidth sx={{ py: 2, borderRadius: 5, bgcolor: '#6366f1', fontWeight: 900, fontSize: '1.1rem', '&:hover': { bgcolor: '#4f46e5', transform: 'translateY(-2px)' } }}>Enroll Facility</Button></Grid>
                        </Grid>
                    </Paper>
                )}

                {/* --- DYNAMIC UNIVERSAL TABLE VIEW --- */}
                {view !== 'dashboard' && view !== 'add-hospital' && view !== 'add-blood-bank' && (
                    <Box sx={{ bgcolor: 'rgba(15, 23, 42, 0.4)', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(30px)' }}>
                        <Box sx={{ p: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, color: '#818cf8', textShadow: '0 0 20px rgba(129, 140, 248, 0.3)' }}>{view === 'view-pha' ? 'PHARMACY' : view === 'view-amb' ? 'AMBULANCE' : view.replace('view-', '').replace('-', ' ')} DATABASE</Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>MASTER RECORDING SYSTEM</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {['view-doctors', 'view-labs', 'view-pha', 'view-patients'].includes(view) && (
                                    <FormControl size="small" sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)', color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: '#818cf8' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}>
                                        <InputLabel>Filter by Hospital</InputLabel>
                                        <Select
                                            value={selectedHospital}
                                            label="Filter by Hospital"
                                            onChange={(e) => setSelectedHospital(e.target.value)}
                                            sx={{ color: 'white' }}
                                        >
                                            <MenuItem value="all">All Hospitals</MenuItem>
                                            {hospitals.map((h) => (
                                                <MenuItem key={h._id} value={h.mediId}>{h.hospitalName} ({h.mediId})</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                                <Button startIcon={<Refresh />} variant="outlined" onClick={fetchData} sx={{ borderRadius: 3, fontWeight: 800, color: 'white', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { borderColor: '#818cf8', color: '#818cf8' } }}>Refresh Ledger</Button>
                            </Box>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                                    <TableRow>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>REGISTRY ID</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>IDENTITY / EMAIL</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>CONTACT</TableCell>
                                        <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SPECIFICATIONS</TableCell>
                                        <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>MANAGEMENT</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {listData.filter(item => selectedHospital === 'all' || item.hospitalMediId === selectedHospital).length > 0 ?
                                        listData.filter(item => selectedHospital === 'all' || item.hospitalMediId === selectedHospital).map((item) => (
                                            <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Chip label={item.mediId} sx={{ fontWeight: 900, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderRadius: 2 }} />
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'white' }}>
                                                        {item.role === 'DOCTOR' || item.role === 'NURSE' || item.role === 'PATIENT'
                                                            ? `${item.firstName} ${item.lastName}`
                                                            : item.role === 'AMBULANCE'
                                                                ? (item.driverName || `${item.firstName} ${item.lastName}`)
                                                                : (item.hospitalName || item.labName || item.pharmacyName || item.bloodBankName || `${item.firstName} ${item.lastName}`)}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{item.email}</Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{item.phone}</TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, display: 'block' }}>
                                                        {item.specialization || item.vehicleNo || item.licenseNo || (item.dob && `DOB: ${new Date(item.dob).toLocaleDateString()}`)}
                                                    </Typography>
                                                    {item.totalBeds && (
                                                        <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800 }}>
                                                            Beds: <span style={{ color: 'white' }}>{item.totalBeds}</span> | ICU: <span style={{ color: 'white' }}>{item.icuBeds}</span>
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        <IconButton onClick={() => handleEditOpen(item)} sx={{ bgcolor: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.2)' } }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton onClick={() => toggleBlockStatus(item._id)} sx={{ bgcolor: item.status === 'blocked' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: item.status === 'blocked' ? '#10b981' : '#fbbf24', '&:hover': { opacity: 0.8 } }}>
                                                            {item.status === 'blocked' ? <LockOpen fontSize="small" /> : <Block fontSize="small" />}
                                                        </IconButton>
                                                        <IconButton color="error" onClick={() => deleteEntity(item._id)} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} align="center" sx={{ py: 6, opacity: 0.5, borderBottom: 'none' }}>
                                                    <Explore sx={{ fontSize: 40, mb: 1, color: 'rgba(255,255,255,0.2)' }} />
                                                    <Typography variant="body2">No active records found in this segment.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </MainContent>

            {/* --- EDIT DIALOG --- */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(20px)',
                        backgroundImage: 'none',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        minWidth: '500px'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 900, fontSize: '1.5rem' }}>Update Entry Details</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            label="Name / Identifier"
                            variant="outlined"
                            value={editFormData.hospitalName || editFormData.labName || editFormData.pharmacyName || editFormData.bloodBankName || editFormData.firstName || ''}
                            onChange={(e) => {
                                const key = editFormData.hospitalName ? 'hospitalName' :
                                    editFormData.labName ? 'labName' :
                                        editFormData.pharmacyName ? 'pharmacyName' :
                                            editFormData.bloodBankName ? 'bloodBankName' : 'firstName';
                                setEditFormData({ ...editFormData, [key]: e.target.value });
                            }}
                            sx={textFieldStyle}
                        />
                        <TextField
                            fullWidth
                            label="Phone / Contact"
                            variant="outlined"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            sx={textFieldStyle}
                        />
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Address / Location"
                            variant="outlined"
                            value={editFormData.address || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                            sx={textFieldStyle}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 4 }}>
                    <Button onClick={() => setEditDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" sx={{ bgcolor: '#818cf8', fontWeight: 900, borderRadius: 3, px: 4, '&:hover': { bgcolor: '#6366f1' } }}>Save Changes</Button>
                </DialogActions>
            </Dialog>
        </AdminContainer>
    );
};

export default AdminDashboard;
