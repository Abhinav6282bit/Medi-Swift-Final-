import React, { useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, Chip, Stack } from '@mui/material';
import { LocalPharmacy, Bed, Warning } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NurseDashboard = () => {
    const navigate = useNavigate();
    const session = JSON.parse(localStorage.getItem('userSession')) || {};

    useEffect(() => {
        if (session.role !== 'NURSE') navigate('/');
    }, [session, navigate]);

    return (
        <Box sx={{ p: 4, bgcolor: '#fdfdfd', minHeight: '100vh' }}>
            <Typography variant="h4" fontWeight="bold" color="#2e7d32">Nurse Station</Typography>
            <Typography sx={{ mb: 4 }}>{session.hospitalName} | Floor 2 Ward</Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 4, borderTop: '5px solid #2e7d32' }}>
                        <Typography variant="h6"><LocalPharmacy /> Medication Schedule</Typography>
                        <Stack spacing={2} sx={{ mt: 2 }}>
                            <Chip label="Room 101 - Antibiotics (Due Now)" color="error" />
                            <Chip label="Room 105 - IV Fluid (Check)" color="warning" />
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 4 }}>
                        <Typography variant="h6"><Bed /> Ward Occupancy</Typography>
                        <Typography variant="h3" fontWeight="bold" sx={{ mt: 2 }}>14 / 20</Typography>
                        <Typography color="textSecondary">Beds Occupied</Typography>
                    </Paper>
                </Grid>
            </Grid>
            <Button variant="contained" color="error" sx={{ mt: 4 }} onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</Button>
        </Box>
    );
};

export default NurseDashboard;