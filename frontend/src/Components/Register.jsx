import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Card, CardContent, TextField, MenuItem, InputAdornment, Grid, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PhotoCamera, Badge } from '@mui/icons-material';
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
        phone: '', address: '', password: '', aadharNumber: '',
        hospitalName: '', generalBeds: 20, icuBeds: 10, maternityBeds: 5
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
            if (!imageFile) {
                alert("Please upload a mandatory photo.");
                return;
            }

            const activeRole = role === 'PAT' ? 'PATIENT' : 'AMBULANCE';

            const data = new FormData();
            data.append('role', activeRole);
            data.append('photo', imageFile);
            data.append('password', formData.password);
            data.append('phone', formData.phone);
            data.append('address', formData.address);
            data.append('aadharNumber', formData.aadharNumber);

            if (activeRole === 'PATIENT') {
                data.append('firstName', formData.firstName);
                data.append('lastName', formData.lastName);
                data.append('email', formData.email);
                data.append('dob', formData.dob);
                data.append('gender', formData.gender);
            } else if (activeRole === 'AMBULANCE') {
                data.append('driverName', formData.driverName);
                data.append('vehicleNo', formData.vehicleNo);
                data.append('licenseNo', formData.licenseNo || formData.rcNumber);
                data.append('email', formData.email);
            }

            const res = await axios.post('http://localhost:5000/api/register-user', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                alert(`REGISTRATION SUCCESSFUL!\nYour Medi-Swift ID is: ${res.data.mediId}\nPlease keep this ID safe to login.`);
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            alert("Registration failed: " + (err.response?.data?.message || "Server Error"));
        }
    };

    return (
        <Box sx={{ backgroundImage: `url(${BackgroundImage})`, minHeight: '100vh', backgroundSize: 'cover', backgroundPosition: 'center', pb: 5 }}>
            <AppBar position="static" color="transparent" elevation={0}>
                <Toolbar sx={{ height: '80px', justifyContent: 'space-between' }}>
                    <img src={Logo} alt="Logo" style={{ height: '250px', cursor: 'pointer', position: 'relative', top: '10px', left: '-50px' }} onClick={() => navigate('/')} />
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
                                    <Grid item xs={12}><TextField label="Date of Birth" name="dob" type="date" fullWidth InputLabelProps={{ shrink: true }} onChange={handleChange} /></Grid>
                                    <Grid item xs={12}><TextField sx={{ width: '150px' }} select fullWidth label="Gender" name="gender" onChange={handleChange}>
                                        <MenuItem value="Male">Male</MenuItem>
                                        <MenuItem value="Female">Female</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </TextField></Grid>
                                </Grid>
                            )}

                            {/* --- AMBULANCE --- */}
                            {role === 'AMB' && (
                                <Grid container spacing={2}>
                                    <Grid item xs={12}><TextField label="Driver Name" name="driverName" fullWidth onChange={handleChange} required /></Grid>
                                    <Grid item xs={6}><TextField label="Vehicle No" name="vehicleNo" fullWidth onChange={handleChange} required /></Grid>
                                    <Grid item xs={6}><TextField label="License / RC Number" name="rcNumber" fullWidth onChange={handleChange} required /></Grid>
                                </Grid>
                            )}


                            {/* --- COMMON FIELDS --- */}
                            <TextField label="Email Address" name="email" fullWidth onChange={handleChange} required />
                            <TextField label="Contact Number" name="phone" fullWidth onChange={handleChange} required />
                            <TextField label="Address" name="address" fullWidth multiline rows={2} onChange={handleChange} required />

                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <Button variant="outlined" component="label" fullWidth startIcon={<PhotoCamera />} sx={{ height: '55px', borderRadius: '10px', color: '#14222f', borderColor: '#14222f' }}>
                                        {imageFile ? "Vehicle/Profile Photo Added" : "Upload Mandatory Photo"}
                                        <input hidden type="file" accept="image/*" onChange={handleCapturePhoto} />
                                    </Button>
                                    {imageFile && (
                                        <Box sx={{ mt: 1, textAlign: 'center' }}>
                                            <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }} />
                                        </Box>
                                    )}
                                </Grid>
                            </Grid>

                            <TextField
                                label="Aadhar Number (12 Digits)"
                                name="aadharNumber"
                                fullWidth
                                onChange={handleChange}
                                inputProps={{ maxLength: 12 }}
                                helperText="Mandatory for Identity Verification"
                                required
                            />

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
