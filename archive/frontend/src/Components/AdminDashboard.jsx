import React, { useState, useEffect } from 'react';
import { Box, Drawer, AppBar, Toolbar, List, Typography, IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText, CssBaseline, Card, CardContent, Button, Grid, styled, TextField, Paper, Divider, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Menu as MenuIcon, Dashboard, LocalHospital, LocalShipping, Science, Storefront, Logout, Home as HomeIcon, People, AdminPanelSettings, Hotel, Delete, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const drawerWidth = 280;

const AdminContainer = styled(Box)({
    backgroundImage: 'url("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop")',
    backgroundSize: 'cover',
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
    display: 'flex'
});

const MainContent = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        flexGrow: 1,
        padding: theme.spacing(4),
        marginTop: '64px',
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
    const [stats, setStats] = useState({ hospitals: 0, labs: 0, ambulances: 0, pharmacies: 0, patients: 0, doctors: 0 });
    const [listData, setListData] = useState([]);

    const [hospitalData, setHospitalData] = useState({
        hospitalName: '', licenseNo: '', address: '', specialization: '',
        totalBeds: '', icuBeds: '', phone: '', email: '', password: ''
    });

    const navigate = useNavigate();


    const fetchData = async () => {
        try {

            const statsRes = await axios.get('http://localhost:5000/api/admin/stats');
            setStats(statsRes.data);


            const roleMapping = {
                'view-hospitals': 'HOSPITAL',
                'view-doctors': 'DOCTOR',
                'view-labs': 'LAB',
                'view-amb': 'AMB',
                'view-pha': 'PHA',
                'view-patients': 'PATIENT'
            };

            if (roleMapping[view]) {
                const listRes = await axios.get(`http://localhost:5000/api/admin/view-all/${roleMapping[view]}`);
                setListData(listRes.data);
            }
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [view]);

    const handleDrawerToggle = () => setOpen(!open);

    const handleLogout = () => {
        localStorage.removeItem('isAdminAuthenticated');
        navigate('/');
    };

    const handleEnrollHospital = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/admin/add-hospital', {
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

    const deleteEntity = async (id) => {
        if (window.confirm("Are you sure you want to remove this record?")) {
            try {
                await axios.delete(`http://localhost:5000/api/admin/delete-entity/${id}`);
                fetchData();
            } catch (err) {
                alert("Delete failed.");
            }
        }
    };

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, view: 'dashboard' },
        { text: 'Add Hospital', icon: <LocalHospital />, view: 'add-hospital', color: '#1976d2' },
        { text: 'View Hospitals', icon: <Hotel />, view: 'view-hospitals', color: '#1565c0' },
        { text: 'Laboratories', icon: <Science />, view: 'view-labs', color: '#388e3c' },
        { text: 'Doctors', icon: <People />, view: 'view-doctors', color: '#00897b' },
        { text: 'Ambulances', icon: <LocalShipping />, view: 'view-amb', color: '#f57c00' },
        { text: 'Pharmacies', icon: <Storefront />, view: 'view-pha', color: '#d32f2f' },
        { text: 'Patients', icon: <People />, view: 'view-patients', color: '#9c27b0' },
    ];

    return (
        <AdminContainer>
            <CssBaseline />
            <AppBar position="fixed" sx={{ bgcolor: 'rgba(20, 34, 47, 0.95)', backdropFilter: 'blur(10px)', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar sx={{ height: 70 }}>
                    <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}><MenuIcon /></IconButton>
                    <AdminPanelSettings sx={{ mr: 1, color: '#4fc3f7' }} />
                    <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: '800', letterSpacing: '1px' }}>MEDI-SWIFT DEVELOPER CONTROL PAGE</Typography>
                    <IconButton color="error" onClick={handleLogout}><Logout /></IconButton>
                </Toolbar>
            </AppBar>

            <Drawer variant="persistent" anchor="left" open={open} sx={{ width: drawerWidth, '& .MuiDrawer-paper': { width: drawerWidth, mt: '70px', bgcolor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)' } }}>
                <List sx={{ px: 2, mt: 2 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton onClick={() => setView(item.view)} selected={view === item.view} sx={{ borderRadius: '12px' }}>
                                <ListItemIcon sx={{ color: item.color }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Drawer>

            <MainContent open={open}>
                {/* --- DASHBOARD VIEW (ALL CARDS ADDED) --- */}
                {view === 'dashboard' && (
                    <Grid container spacing={3}>
                        {[
                            { label: 'Active Hospitals', val: stats.hospitals, icon: <LocalHospital />, color: '#1976d2' },
                            { label: 'Laboratories', val: stats.labs, icon: <Science />, color: '#388e3c' },
                            { label: 'Ambulances', val: stats.ambulances, icon: <LocalShipping />, color: '#f57c00' },
                            { label: 'Pharmacies', val: stats.pharmacies, icon: <Storefront />, color: '#d32f2f' },
                            { label: 'Total Doctors', val: stats.doctors, icon: <People />, color: '#00897b' },
                            { label: 'Total Patients', val: stats.patients, icon: <People />, color: '#9c27b0' }
                        ].map((stat, i) => (
                            <Grid item xs={12} sm={6} md={2.4} key={i}>
                                <Paper sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', height: '100px' }}>
                                    <Box sx={{ p: 1.2, bgcolor: stat.color, borderRadius: 2, color: '#fff', mr: 2, display: 'flex' }}>{stat.icon}</Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold">{stat.val}</Typography>
                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>{stat.label}</Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* --- ADD HOSPITAL VIEW --- */}
                {view === 'add-hospital' && (
                    <Paper elevation={10} sx={{ p: 5, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.95)', maxWidth: '900px', mx: 'auto' }}>
                        <Typography variant="h4" fontWeight="900" gutterBottom>Enroll Hospital</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Hospital Name" value={hospitalData.hospitalName} onChange={(e) => setHospitalData({ ...hospitalData, hospitalName: e.target.value })} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="License No" value={hospitalData.licenseNo} onChange={(e) => setHospitalData({ ...hospitalData, licenseNo: e.target.value })} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Contact" value={hospitalData.phone} onChange={(e) => setHospitalData({ ...hospitalData, phone: e.target.value })} /></Grid>
                            <Grid item xs={12} md={6}><TextField fullWidth label="Email" value={hospitalData.email} onChange={(e) => setHospitalData({ ...hospitalData, email: e.target.value })} /></Grid>
                            <Grid item xs={12} md={8}><TextField fullWidth label="Specialization" value={hospitalData.specialization} onChange={(e) => setHospitalData({ ...hospitalData, specialization: e.target.value })} /></Grid>
                            <Grid item xs={12} md={2}><TextField fullWidth label="Beds" type="number" value={hospitalData.totalBeds} onChange={(e) => setHospitalData({ ...hospitalData, totalBeds: e.target.value })} /></Grid>
                            <Grid item xs={12} md={2}><TextField fullWidth label="ICU" type="number" value={hospitalData.icuBeds} onChange={(e) => setHospitalData({ ...hospitalData, icuBeds: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Address" value={hospitalData.address} onChange={(e) => setHospitalData({ ...hospitalData, address: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="Initial Password" type="password" value={hospitalData.password} onChange={(e) => setHospitalData({ ...hospitalData, password: e.target.value })} /></Grid>
                            <Grid item xs={12}><Button onClick={handleEnrollHospital} variant="contained" fullWidth sx={{ py: 2, borderRadius: 10, bgcolor: '#14222f' }}>Register</Button></Grid>
                        </Grid>
                    </Paper>
                )}

                {/* --- DYNAMIC UNIVERSAL TABLE VIEW --- */}
                {view !== 'dashboard' && view !== 'add-hospital' && (
                    <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: 5 }}>
                        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff' }}>
                            <Typography variant="h5" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>{view.replace('view-', '')} List</Typography>
                            <Button startIcon={<Refresh />} variant="outlined" onClick={fetchData}>Refresh Data</Button>
                        </Box>
                        <Table>
                            <TableHead sx={{ bgcolor: '#14222f' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#fff' }}>Medi-ID</TableCell>
                                    <TableCell sx={{ color: '#fff' }}>Name / Details</TableCell>
                                    <TableCell sx={{ color: '#fff' }}>Contact Info</TableCell>
                                    <TableCell sx={{ color: '#fff' }}>Extra Info</TableCell>
                                    <TableCell sx={{ color: '#fff' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {listData.length > 0 ? listData.map((item) => (
                                    <TableRow key={item._id} hover>
                                        <TableCell><Chip label={item.mediId} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} /></TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2">
                                                {item.hospitalName || item.labName || item.pharmacyName || item.driverName || `${item.firstName} ${item.lastName}`}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">{item.email}</Typography>
                                        </TableCell>
                                        <TableCell>{item.phone}</TableCell>
                                        <TableCell>
                                            {item.specialization && `Specialty: ${item.specialization}`}
                                            {item.vehicleNo && `Vehicle: ${item.vehicleNo}`}
                                            {item.licenseNo && `License: ${item.licenseNo}`}
                                            {item.dob && `DOB: ${new Date(item.dob).toLocaleDateString()}`}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton color="error" onClick={() => deleteEntity(item._id)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} align="center">No records found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </MainContent>
        </AdminContainer>
    );
};

export default AdminDashboard;