import React, { useState } from 'react';
import { AppBar, Box, Toolbar, Typography, Button, Paper, TextField } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BackgroundImage from '../assets/bgimage.png';
import Logo from '../assets/logo.png';

const HomePage = () => {
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const handleLogin = async (e) => { 
        e.preventDefault();

    
        if (id === 'admin' && password === 'swift123') {
            localStorage.setItem('isAdminAuthenticated', 'true');
            alert("Welcome, Administrator!");
            navigate('/admin-dashboard');
            return; 
        }

  
        try {
            const res = await axios.post('http://localhost:5000/api/login', {
                mediId: id,
                password: password
            });

            if (res.data.success) {
                const { role, userData } = res.data;

       
                console.log("Login Success. Data received:", res.data);
                const sessionToStore = {
                    ...userData,
                    hospitalId: res.data.hospitalId || userData?.hospitalId,
                    role: role,
                    mediId: id 
                };

           
                localStorage.setItem('userSession', JSON.stringify(sessionToStore));
                if (role === 'PATIENT') navigate('/patient-dashboard');
                else if (role === 'HOSPITAL') navigate('/hospital-dashboard');
                else if (role === 'LAB') navigate('/lab-dashboard');
                else if (role === 'PHA' || role === 'PHARMACY') navigate('/pharmacy-dashboard');
                else if (role === 'AMB') navigate('/ambulance-dashboard');
                else if (role === 'DOCTOR') navigate('/doctor-dashboard');
                else if (role === 'NURSE') navigate('/nurse-dashboard');
                else if (role === 'STAFF') navigate('/staff-dashboard');
                else alert("Role not recognized. Contact Support.");
            }
        } catch (err) {
           
            alert(err.response?.data?.message || "Login failed. Check your ID and Password.");
        }
    };

    return (
        <div style={{
            backgroundImage: `url(${BackgroundImage})`,
            minHeight: '100vh',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* --- NAVIGATION BAR --- */}
            <Box sx={{ flexGrow: 1 }}>
                <AppBar position="sticky" color="transparent" elevation={0}>
                    <Toolbar sx={{ height: '80px' }}>
    <Typography variant="h6" component="div" sx={{ flexGrow: 1, position: 'relative', height: '64px', display: 'flex', alignItems: 'center' }}>
        <img src={Logo} alt="Logo" style={{ height: '250px', width: 'auto', position: 'absolute', top: '-50px', left: '-80px' }} />
    </Typography>
    
    {/* --- NEW SOS NAVBAR BUTTON --- */}
    <Button variant="contained" color="error" onClick={() => navigate('/emergency-sos')}
        sx={{ mr: 3, fontWeight: 'bold', borderRadius: '20px', px: 3,animation: 'pulse 2s infinite', bgcolor: '#d32f2f','&:hover': { bgcolor: '#b71c1c' }}}>EMERGENCY SOS</Button>
    <Button color="inherit">Home</Button>
    <Button color="inherit">Our Service</Button>
    <Button color="inherit">About Us</Button>
    <Button color="inherit">FAQ</Button>
    <Button color="inherit">Contact Us</Button>
                </Toolbar>
                </AppBar>
            </Box>

            {/* --- LOGIN CARD --- */}
            <Box sx={{ position: 'absolute', top: '55%', left: '80%', transform: 'translate(-50%, -50%)', width: '480px' }}>
                <Paper elevation={15} sx={{ p: 5, borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.36)', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, fontFamily: 'Times New Roman', color: '#14222f' }}>
                        Medi-Swift
                    </Typography>

                    <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="Medi-Swift ID"
                            variant="outlined"
                            value={id}
                            onChange={(e) => setId(e.target.value)}
                            placeholder="e.g. MS-HOSP-2651"
                        />
                        <TextField
                            label="Password"
                            type="password"
                            variant="outlined"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            sx={{ mt: 2, py: 1.5, borderRadius: '30px', bgcolor: '#14222f', '&:hover': { bgcolor: '#2c3e50' } }}
                        >
                            Sign In
                        </Button>
                    </Box>

                    <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                        <Typography variant="body2" sx={{ color: '#14222f', mb: 1 }}>New to the platform?</Typography>
                        <Link to="/register" style={{ textDecoration: 'none' }}>
                            <Button variant="outlined" sx={{ borderRadius: '30px', color: '#14222f', borderColor: '#14222f' }}>
                                Create New Account
                            </Button>
                        </Link>
                    </Box>

                    <Typography variant="caption" sx={{ display: 'block', mt: 3, color: 'gray' }}>
                        Doctors & Staff: Please contact your administrator for credentials.
                    </Typography>
                </Paper>
            </Box>

            {/* --- SERVICES SECTION --- */}
            <Box sx={{ marginTop: '650px', pb: 5, width: '100%', textAlign: 'center' }}>
                <Typography variant="h5" sx={{ textDecoration: 'underline', mb: 2, fontWeight: 'bold' }}>
                    Our Service
                </Typography>
                <Box sx={{ px: 10 }}>
                    <Typography variant="body1" sx={{ fontFamily: 'caption', textAlign: 'justify', color: '#14222f', maxWidth: '1200px', margin: '0 auto' }}>
                        A unified platform connecting Patients, Doctors, Labs, and Pharmacies through a secure Secret Code system.
                        No more physical files—your health history follows you everywhere. Real-time hospital bed availability
                        map to ensure zero time is wasted in transit. Medi-Swift has developed the e-Hospital project with
                        the vision to improve the delivery of healthcare services to the citizens across the country.
                    </Typography>
                </Box>
            </Box>
        </div>
    );
}

export default HomePage;