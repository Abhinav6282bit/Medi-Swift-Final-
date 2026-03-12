import React, { useState } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Stack,
    Container, Grid, IconButton, InputAdornment
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    PersonAdd as PersonAddIcon,
    AppRegistration as RegisterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const RegisterPatient = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        age: '',
        gender: '',
        dob: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFinalRegistration = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE_URL}/api/admin/add-hospital`, {
                ...formData,
                role: 'PATIENT'
            });

            if (res.data.success) {
                const newId = res.data.generatedId;
                alert(`✅ Patient Registered! ID: ${newId}`);

                navigate('/hospital-dashboard', { state: { newId: newId } });
            }
        } catch (err) {
            alert("Registration failed.");
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7fe', py: 5 }}>
            <Container maxWidth="md">
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => navigate(-1)}
                    sx={{ mb: 3, color: '#4318ff', fontWeight: 'bold' }}
                >
                    Back to Dashboard
                </Button>

                <Paper sx={{ p: { xs: 3, md: 6 }, borderRadius: 5, boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <PersonAddIcon sx={{ fontSize: 50, color: '#4318ff', mb: 2 }} />
                        <Typography variant="h4" fontWeight="bold" color="#1b254b">
                            Patient Enrollment
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Create a global Medi-Swift ID for clinical access.
                        </Typography>
                    </Box>

                    <form onSubmit={handleFinalRegistration}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="First Name" name="firstName" required onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Last Name" name="lastName" required onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Phone Number" name="phone" required onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Email Address" name="email" type="email" onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Age" name="age" type="number" value={formData.age} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth select label="Gender" name="gender"
                                    value={formData.gender} onChange={handleChange}
                                    SelectProps={{ native: true }}
                                >
                                    <option value=""></option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="DOB" name="dob" type="date" InputLabelProps={{ shrink: true }} value={formData.dob} onChange={handleChange} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth label="Set Login Password" name="password" type="password" required value={formData.password} onChange={handleChange} />
                            </Grid>

                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={loading}
                                    sx={{
                                        bgcolor: '#4318ff',
                                        py: 2,
                                        borderRadius: 3,
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        '&:hover': { bgcolor: '#3311cc' }
                                    }}
                                >
                                    {loading ? "Registering..." : "Complete Registration & Book Appointment"}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
};

export default RegisterPatient;