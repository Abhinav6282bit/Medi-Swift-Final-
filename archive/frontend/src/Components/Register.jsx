import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Card, CardContent, TextField, MenuItem, InputAdornment, Grid, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PhotoCamera, AccountCircle, Home, Phone, Event, Badge, Storefront, LocalShipping, Description, Lock, Email } from '@mui/icons-material';
import axios from 'axios';
import BackgroundImage from '../assets/bgimage.png';
import Logo from '../assets/logo.png';

const Register = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('PAT');
    const [imageFile, setImageFile] = useState(null); 
    
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', dob: '',
        driverName: '', vehicleNo: '', rcNumber: '',
        phone: '', address: '', password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

   
    const handleCapturePhoto = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
            alert(`Photo "${e.target.files[0].name}" selected!`);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const roleMap = { 'PAT': 'PATIENT', 'AMB': 'AMB' };
          
            const payload = {
                ...formData,
                role: roleMap[role],
              
                photoAttached: imageFile ? imageFile.name : 'No Photo'
            };

            const res = await axios.post('http://localhost:5000/api/admin/add-hospital', payload);
            
            if (res.data.success) {
                alert(`REGISTRATION SUCCESSFUL!\nYour Medi-Swift ID is: ${res.data.generatedId}\nPlease keep this ID safe to login.`);
                navigate('/');
            }
        } catch (err) {
            alert("Registration failed: " + (err.response?.data?.message || "Server Error"));
        }
    };

    return (
        <Box sx={{ backgroundImage: `url(${BackgroundImage})`, minHeight: '100vh', backgroundSize: 'cover', backgroundPosition: 'center', pb: 5 }}>
            <AppBar position="static" color="transparent" elevation={0}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <img src={Logo} alt="Logo" style={{ height: '70px', cursor: 'pointer' }} onClick={() => navigate('/')} />
                    <Button sx={{ color: '#14222f', fontWeight: 'bold' }} onClick={() => navigate('/')}>Back to Home</Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4 }}>
                <Card sx={{ width: { xs: '90%', sm: 650 }, borderRadius: 5, bgcolor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(15px)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                    <CardContent sx={{ p: 5 }}>
                        <Typography variant="h4" align="center" sx={{ mb: 1, fontWeight: 'bold', color: '#14222f', fontFamily: 'serif' }}>Medi-Swift</Typography>
                        <Typography variant="body2" align="center" sx={{ mb: 4, color: '#333', letterSpacing: 1 }}>SECURE NETWORK REGISTRATION</Typography>

                        <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            
                            <TextField select label="I am registering as..." value={role} onChange={(e) => setRole(e.target.value)} fullWidth variant="outlined" InputProps={{ startAdornment: <InputAdornment position="start"><Badge /></InputAdornment> }}>
                                <MenuItem value="PAT">Patient (Personal User)</MenuItem>
                                <MenuItem value="AMB">Ambulance Service</MenuItem>
                            </TextField>

                            <Divider sx={{ my: 1 }}>{role} Information</Divider>

                            {/* --- PATIENT --- */}
                            {role === 'PAT' && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12}><TextField label="First Name" name="firstName" fullWidth onChange={handleChange} required /></Grid>
                                    <Grid item xs={12}><TextField label="Last Name" name="lastName" fullWidth onChange={handleChange} /></Grid>
                                    <Grid item xs={12}><TextField label="Email Address" name="email" fullWidth onChange={handleChange} required /></Grid>
                                    <Grid item xs={12}><TextField label="Date of Birth" name="dob" type="date" fullWidth InputLabelProps={{ shrink: true }} onChange={handleChange} /></Grid>
                                    <Grid item xs={12}><TextField sx={{width:'150px'}} select fullWidth label="Gender" name="gender" onChange={handleChange}>
                                        <MenuItem value="Male">Male</MenuItem>
                                        <MenuItem value="Female">Female</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </TextField></Grid>
                                </Grid>
                            )}

                            {/* --- AMBULANCE --- */}
                            {role === 'AMB' && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12}><TextField label="Driver Name" name="driverName" fullWidth onChange={handleChange} /></Grid>
                                    <Grid item xs={6}><TextField label="Vehicle No" name="vehicleNo" fullWidth onChange={handleChange} /></Grid>
                                    <Grid item xs={6}><TextField label="RC Number" name="rcNumber" fullWidth onChange={handleChange} /></Grid>
                                    <Grid item xs={12}>
                                        <Button variant="outlined" component="label" fullWidth startIcon={<PhotoCamera />} sx={{ height: '55px', borderRadius: '10px', color: '#14222f', borderColor: '#14222f' }}>
                                            {imageFile ? "Vehicle Photo Added" : "Upload Vehicle Photo"}
                                            <input hidden type="file" accept="image/*" onChange={handleCapturePhoto} />
                                        </Button>
                                    </Grid>
                                </Grid>
                            )}

                            {/* --- COMMON --- */}
                            <TextField label="Contact Number" name="phone" fullWidth onChange={handleChange} required />
                            <TextField label="Address" name="address" fullWidth multiline rows={2} onChange={handleChange} />
                            <TextField label="Create Password" name="password" type="password" fullWidth onChange={handleChange} required />

                            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2, py: 2, bgcolor: '#14222f', borderRadius: '50px', fontWeight: 'bold' }}>
                                Register Now
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default Register;