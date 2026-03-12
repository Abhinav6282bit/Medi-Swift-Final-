import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import BackgroundImage from '../assets/bgimage.png';
import AboutImage from '../assets/about_us.png';
import Logo from '../assets/logo.png';
import {
    LocalHospital as HospitalIcon,
    Medication as PharmacyIcon,
    Science as LabIcon,
    Bloodtype as BloodIcon,
    LocalShipping as AmbulanceIcon,
    Security as SecurityIcon,
    HealthAndSafety as HealthIcon,
    Hotel as BedIcon,
    ExpandMore as ExpandMoreIcon,
    Mail as MailIcon,
    Phone as PhoneIcon,
    LocationOn as LocationOnIcon
} from '@mui/icons-material';
import {
    AppBar, Toolbar, Typography, Button, Container, Box, Grid, Card, CardContent, Paper,
    TextField, Accordion, AccordionSummary, AccordionDetails, IconButton
} from '@mui/material';

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
                localStorage.setItem('user', JSON.stringify(res.data));

                // --- ROLE BASED REDIRECTION ---
                if (role === 'PATIENT') navigate('/patient-dashboard');
                else if (role === 'AMBULANCE' || role === 'AMB') navigate('/ambulance-dashboard');
                else if (role === 'HOSPITAL') navigate('/hospital-dashboard');
                else if (role === 'DOCTOR') navigate('/doctor-dashboard');
                else if (role === 'NURSE') navigate('/nurse-dashboard');
                else if (role === 'LAB') navigate('/lab-dashboard');
                else if (role === 'PHARMACY') navigate('/pharmacy-dashboard');
                else if (role === 'BLOOD_BANK') navigate('/blood-bank-dashboard');
                else alert("Role not recognized. Contact Support.");
            }
        } catch (err) {

            alert(err.response?.data?.message || "Login failed. Check your ID and Password.");
        }
    };

    // --- FORGOT PASSWORD STATES ---
    const [openForgot, setOpenForgot] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP & New Pass
    const [forgotIdentifier, setForgotIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const handleSendOtp = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/send-otp', { identifier: forgotIdentifier });
            if (res.data.success) {
                alert(res.data.message);
                setForgotStep(2);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send OTP");
        }
    };

    const handleResetPassword = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/reset-password', {
                identifier: forgotIdentifier,
                otp,
                newPassword
            });
            if (res.data.success) {
                alert("Password Reset Successfully! Please Login.");
                setOpenForgot(false);
                setForgotStep(1);
                setForgotIdentifier('');
                setOtp('');
                setNewPassword('');
            }
        } catch (err) {
            alert(err.response?.data?.message || "Reset Failed");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0, padding: 0, overflowX: 'hidden' }}>


            {/* --- HERO SECTION WITH BG IMAGE --- */}
            <Box sx={{
                backgroundImage: `url(${BackgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                minHeight: '100vh'
            }}>
                {/* --- CORNER LOGO (ABSOLUTE TOP-LEFT) --- */}
                <img
                    src={Logo}
                    alt="Logo"
                    style={{
                        height: '250px',
                        width: 'auto',
                        objectFit: 'contain',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1300,
                        cursor: 'pointer'
                    }}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
                {/* --- NAVIGATION BAR --- */}
                <AppBar position="sticky" color="transparent" elevation={0}>
                    <Toolbar sx={{ height: '80px', px: 2, justifyContent: 'flex-end' }}>

                        {/* --- NEW SOS NAVBAR BUTTON --- */}
                        <Button variant="contained" color="error" onClick={() => navigate('/emergency-sos')}
                            sx={{ mr: 3, fontWeight: 'bold', borderRadius: '20px', px: 3, animation: 'pulse 2s infinite', bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}>EMERGENCY SOS</Button>
                        <Button sx={{ color: '#000', fontWeight: 600 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</Button>
                        <Button sx={{ color: '#000', fontWeight: 600 }} onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Our Service</Button>
                        <Button sx={{ color: '#000', fontWeight: 600 }} onClick={() => document.getElementById('about-us')?.scrollIntoView({ behavior: 'smooth' })}>About Us</Button>
                        <Button sx={{ color: '#000', fontWeight: 600 }} onClick={() => navigate('/faq')}>FAQ</Button>
                        <Button sx={{ color: '#000', fontWeight: 600 }} onClick={() => document.getElementById('contact-us')?.scrollIntoView({ behavior: 'smooth' })}>Contact Us</Button>
                    </Toolbar>
                </AppBar>

                {/* --- LOGIN CARD --- */}
                <Box sx={{ position: 'absolute', top: '55%', left: '80%', transform: 'translate(-50%, -50%)', width: '480px' }}>
                    <Paper elevation={15} sx={{ p: 5, borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.36)', textAlign: 'center', backdropFilter: 'blur(5px)' }}>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4, fontFamily: 'Times New Roman', color: '#14222f' }}>
                            Medi-Swift
                        </Typography>

                        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField
                                label="Medi-Swift ID"
                                variant="outlined"
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                placeholder="e.g. MS-PATI-XXXX, MS-DOCT-XXXX"
                            />
                            <TextField
                                label="Password"
                                type="password"
                                variant="outlined"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button size="small" sx={{ textTransform: 'none', color: '#14222f' }} onClick={() => setOpenForgot(true)}>
                                    Forgot Password?
                                </Button>
                            </Box>

                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                sx={{ mt: 1, py: 1.5, borderRadius: '30px', bgcolor: '#14222f', '&:hover': { bgcolor: '#2c3e50' } }}
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
            </Box>

            {/* --- FORGOT PASSWORD MODAL --- */}
            {openForgot && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <Paper elevation={10} sx={{ p: 4, width: '400px', borderRadius: 4, bgcolor: 'white', position: 'relative' }}>
                        <Button onClick={() => setOpenForgot(false)} sx={{ position: 'absolute', top: 10, right: 10 }}>X</Button>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>Reset Password</Typography>

                        {forgotStep === 1 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body2">Enter your registered Email or Medi-ID to receive an OTP.</Typography>
                                <TextField label="Email or Medi-ID" fullWidth value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} />
                                <Button variant="contained" onClick={handleSendOtp}>Send OTP</Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography variant="body2">Enter the OTP sent to your email (Server Console) and your new password.</Typography>
                                <TextField label="OTP" fullWidth value={otp} onChange={(e) => setOtp(e.target.value)} />
                                <TextField label="New Password" type="password" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                <Button variant="contained" color="success" onClick={handleResetPassword}>Reset Password</Button>
                            </Box>
                        )}
                    </Paper>
                </div>
            )}

            {/* --- SERVICES SECTION --- */}
            <Box id="services" sx={{ py: 10, px: { xs: 3, md: 8 }, width: '100%', background: '#f8fafc' }}>
                <Typography variant="h4" sx={{ textAlign: 'center', mb: 1, fontWeight: 'bold', color: '#14222f' }}>
                    Our Services
                </Typography>
                <Typography variant="body1" sx={{ textAlign: 'center', mb: 5, color: '#475569', maxWidth: '700px', margin: '0 auto', mb: 5 }}>
                    A unified platform connecting Patients, Doctors, Labs, and Pharmacies — making healthcare seamless and accessible.
                </Typography>

                <Grid container spacing={3} justifyContent="center">
                    {[
                        { icon: <HospitalIcon />, color: '#3b82f6', title: 'Smart Appointments', desc: 'AI-powered doctor matching and live queue tracking with virtual tokens.' },
                        { icon: <HealthIcon />, color: '#10b981', title: 'Electronic Health Records', desc: 'Your complete medical history follows you everywhere — no more physical files.' },
                        { icon: <LabIcon />, color: '#8b5cf6', title: 'Lab Reports', desc: 'Instant digital lab reports delivered to your dashboard with notifications.' },
                        { icon: <PharmacyIcon />, color: '#f59e0b', title: 'Pharmacy & Prescriptions', desc: 'Order medicines, track preparation status, and get pickup codes instantly.' },
                        { icon: <BloodIcon />, color: '#ef4444', title: 'Emergency Blood Bank', desc: 'Find nearby blood donors, send requests, and receive live donation tokens.' },
                        { icon: <AmbulanceIcon />, color: '#f97316', title: 'SOS & Ambulance', desc: 'One-tap emergency SOS with GPS-based ambulance dispatch and live tracking.' },
                        { icon: <BedIcon />, color: '#06b6d4', title: 'Bed Availability', desc: 'Real-time hospital bed availability map to ensure zero time wasted in transit.' },
                        { icon: <SecurityIcon />, color: '#14b8a6', title: 'Secure Secret Code System', desc: 'Every interaction is verified through secure codes — privacy by design.' },
                    ].map((service, index) => (
                        <Grid item xs={12} sm={6} md={3} key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Card sx={{
                                width: '280px',
                                height: '280px',
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: 5, // Softer corners
                                textAlign: 'left',
                                p: 3.5,
                                background: '#fff',
                                border: '1px solid rgba(0,0,0,0.05)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                    transform: 'translateY(-10px)',
                                    boxShadow: `0 20px 40px ${service.color}15`,
                                    borderColor: service.color,
                                    '& .service-icon-box': {
                                        transform: 'scale(1.1) rotate(5deg)',
                                        bgcolor: service.color,
                                        color: '#fff',
                                        boxShadow: `0 10px 20px ${service.color}40`,
                                    },
                                    '& .service-divider': {
                                        width: '60px',
                                        bgcolor: service.color,
                                    }
                                }
                            }}>
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <Box className="service-icon-box" sx={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: `${service.color}10`,
                                        color: service.color,
                                        mb: 3,
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {React.cloneElement(service.icon, { sx: { fontSize: 32 } })}
                                    </Box>
                                    <Typography variant="h6" fontWeight="800" sx={{ mb: 1.5, color: '#1e293b', fontSize: '1.15rem', letterSpacing: '-0.02em' }}>
                                        {service.title}
                                    </Typography>
                                    <Box className="service-divider" sx={{ width: '30px', height: '3px', bgcolor: '#e2e8f0', borderRadius: '2px', mb: 2, transition: 'all 0.3s ease' }} />
                                    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.8, fontSize: '0.92rem', fontWeight: 500 }}>
                                        {service.desc}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* --- ABOUT US SECTION --- */}
            <Box id="about-us" sx={{ py: 12, px: { xs: 3, md: 8 }, bgcolor: '#fff' }}>
                <Grid container spacing={8} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Box sx={{ maxWidth: '540px' }}>
                            <Typography variant="overline" sx={{ color: '#3b82f6', fontWeight: 800, letterSpacing: 2, mb: 1, display: 'block' }}>
                                WHO WE ARE
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e293b', mb: 3, lineHeight: 1.2, fontFamily: 'Times New Roman' }}>
                                Medi-Swift: Redefining Medical Urgency
                            </Typography>
                            <Typography variant="body1" sx={{ color: '#475569', mb: 4, lineHeight: 1.8, fontSize: '1.1rem' }}>
                                At Medi-Swift, our mission is to revolutionize the healthcare landscape by providing a unified, real-time ecosystem. We bridge the gap between patients, hospitals, blood banks, and emergency services through cutting-edge technology and a commitment to zero-latency care.
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                                {[
                                    { title: 'Zero-Latency Dispatch', desc: 'Our GPS-based ambulance system ensures that help arrives at the fastest possible speed.', iconColor: '#3b82f6' },
                                    { title: 'Unified Data Ecosystem', desc: 'Secure, real-time access to EHR, lab reports, and pharmacy preparation for seamless care.', iconColor: '#10b981' },
                                    { title: 'Reliable Blood Registry', desc: 'Connecting donors and requesters instantly with verified tokens and live tracking.', iconColor: '#ef4444' }
                                ].map((item, i) => (
                                    <Box key={i} sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
                                        <Box sx={{
                                            minWidth: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            bgcolor: item.iconColor,
                                            mt: 1,
                                            boxShadow: `0 0 10px ${item.iconColor}80`
                                        }} />
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem', mb: 0.5 }}>
                                                {item.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                                                {item.desc}
                                            </Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Box sx={{ position: 'relative' }}>



                            {/* --- Image wrapper with hover zoom --- */}
                            <Box sx={{
                                position: 'relative',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 30px 60px -15px rgba(0,0,0,0.2), 0 10px 30px -10px rgba(59,130,246,0.15)',
                                zIndex: 1,
                                '&:hover img': { transform: 'scale(1.04)' },
                            }}>
                                <Box
                                    component="img"
                                    src={AboutImage}
                                    alt="Medi-Swift Medical Team"
                                    sx={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                />
                                {/* Subtle gradient overlay at bottom */}
                                <Box sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '45%',
                                    background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 100%)',
                                    zIndex: 1,
                                }} />
                            </Box>

                            {/* --- STAT BADGES --- */}

                            {/* Badge: 24/7 Expert Support — bottom left */}
                            <Box sx={{
                                position: 'absolute',
                                bottom: 24,
                                left: 24,
                                bgcolor: '#1e293b',
                                color: '#fff',
                                p: '14px 20px',
                                borderRadius: '14px',
                                boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                                zIndex: 3,
                                display: { xs: 'none', sm: 'flex' },
                                alignItems: 'center',
                                gap: 1.5,
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1, fontSize: '1.4rem' }}>24/7</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>Expert Support</Typography>
                                </Box>
                            </Box>


                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {/* --- CONTACT US SECTION --- */}
            <Box id="contact-us" sx={{ py: 12, px: { xs: 3, md: 8 }, bgcolor: '#fff' }}>
                <Grid container spacing={8}>
                    <Grid item xs={12} md={5}>
                        <Typography variant="overline" sx={{ color: '#ef4444', fontWeight: 800, letterSpacing: 2, mb: 1, display: 'block' }}>
                            GET IN TOUCH
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#1e293b', mb: 3, fontFamily: 'Times New Roman' }}>
                            We're Here to Help You 24/7
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#64748b', mb: 5, lineHeight: 1.8 }}>
                            Whether you're a patient seeking help, a hospital looking for a partnership, or a donor ready to save lives, reach out to us!
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                { icon: <LocationOnIcon />, title: 'Our Location', detail: 'Medical Plaza, Health City, ST 12345' },
                                { icon: <PhoneIcon />, title: 'Emergency Phone', detail: '+1 (234) 567-890' },
                                { icon: <MailIcon />, title: 'Email Support', detail: 'support@medi-swift.com' }
                            ].map((item, i) => (
                                <Box key={i} sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                                    <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: '12px', color: '#3b82f6' }}>{item.icon}</Box>
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#1e293b' }}>{item.title}</Typography>
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>{item.detail}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={7}>
                        <Card sx={{ p: 4, borderRadius: 6, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label="Full Name" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label="Email Address" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Subject" variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Message" multiline rows={4} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button variant="contained" fullWidth sx={{
                                        py: 2,
                                        borderRadius: 3,
                                        fontWeight: 800,
                                        bgcolor: '#1e293b',
                                        '&:hover': { bgcolor: '#0f172a' }
                                    }}>Send Message</Button>
                                </Grid>
                            </Grid>
                        </Card>
                    </Grid>
                </Grid>
            </Box>

            {/* --- FOOTER --- */}
            <Box sx={{ bgcolor: '#0f172a', color: '#fff', py: 8, px: { xs: 3, md: 8 } }}>
                <Grid container spacing={6}>
                    <Grid item xs={12} md={4}>
                        <img src={Logo} alt="Logo" style={{ height: '80px', marginBottom: '20px', filter: 'brightness(0) invert(1)' }} />
                        <Typography variant="body2" sx={{ opacity: 0.7, lineHeight: 1.8, maxWidth: '300px' }}>
                            Medi-Swift is the world's first decentralized medical urgency response platform, connecting lives with zero latency.
                        </Typography>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Quick Links</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }} onClick={() => navigate('/emergency-sos')}>Emergency SOS</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }} onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Our Services</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }} onClick={() => document.getElementById('about-us')?.scrollIntoView({ behavior: 'smooth' })}>About Us</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, cursor: 'pointer', '&:hover': { opacity: 1 } }} onClick={() => navigate('/faq')}>FAQ</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Services</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>Smart Appointments</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>Blood Bank</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>Ambulance SOS</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7 }}>EHR Vault</Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Newsletter</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7, mb: 3 }}>Ready to stay updated on the latest health tech?</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                placeholder="Email Address"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }
                                }}
                            />
                            <Button variant="contained" sx={{ bgcolor: '#3b82f6', borderRadius: 2 }}>Join</Button>
                        </Box>
                    </Grid>
                </Grid>
                <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ opacity: 0.5 }}>
                        © 2026 Medi-Swift Healthcare Platform. All rights reserved.
                    </Typography>
                </Box>
            </Box>
        </div>
    );
}

export default HomePage;
