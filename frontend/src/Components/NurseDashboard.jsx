import React, { useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, Chip, Stack, Avatar } from '@mui/material';
import { LocalPharmacy, Bed, Warning, Logout } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NurseDashboard = () => {
    const navigate = useNavigate();
    const session = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        if (session.role !== 'NURSE') navigate('/');
    }, [session, navigate]);

    return (
        <Box sx={{
            p: 4,
            background: 'radial-gradient(circle at 10% 20%, #111827 0%, #030712 100%)',
            minHeight: '100vh',
            color: 'white'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
                <Avatar sx={{ bgcolor: '#10b981', width: 56, height: 56, fontSize: '1.5rem', fontWeight: 900, boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                    {session.firstName?.[0] || 'N'}
                </Avatar>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1 }}>Nurse Station</Typography>
                    <Typography sx={{ color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.8rem' }}>
                        {session.hospitalName} | Floor 2 Ward
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Logout />}
                    sx={{ ml: 'auto', borderRadius: 3, fontWeight: 900, border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    onClick={() => { localStorage.clear(); navigate('/'); }}
                >
                    Logout
                </Button>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{
                        p: 4, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
                        transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', bgcolor: 'rgba(255,255,255,0.05)', borderColor: '#10b981' }
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                            <LocalPharmacy sx={{ color: '#10b981' }} /> Medication Schedule
                        </Typography>
                        <Stack spacing={2}>
                            <Box sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: 4, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#f87171' }}>Room 101 - Antibiotics</Typography>
                                <Chip label="DUE NOW" size="small" sx={{ fontWeight: 900, bgcolor: '#ef4444', color: 'white' }} />
                            </Box>
                            <Box sx={{ p: 2, bgcolor: 'rgba(245, 158, 11, 0.1)', borderRadius: 4, border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: '#fbbf24' }}>Room 105 - IV Fluid</Typography>
                                <Chip label="CHECK" size="small" sx={{ fontWeight: 900, bgcolor: '#f59e0b', color: 'white' }} />
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{
                        p: 4, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)',
                        transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', bgcolor: 'rgba(255,255,255,0.05)', borderColor: '#38bdf8' }
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                            <Bed sx={{ color: '#38bdf8' }} /> Ward Occupancy
                        </Typography>
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h2" sx={{ fontWeight: 900, color: 'white', letterSpacing: -2 }}>14 <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>/ 20</span></Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>Beds Active</Typography>
                        </Box>
                        <Box sx={{ mt: 3, height: 8, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                            <Box sx={{ width: '70%', height: '100%', bgcolor: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }} />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default NurseDashboard;
