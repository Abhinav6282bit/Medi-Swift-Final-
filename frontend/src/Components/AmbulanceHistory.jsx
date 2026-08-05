import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Button } from '@mui/material';
import { History as HistoryIcon, ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const AmbulanceHistory = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const user = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/ambulance/history/${user.mediId}`);
                setHistory(res.data);
            } catch (err) { console.error("History fetch failed"); }
        };
        if (user.mediId) fetchHistory();
    }, [user.mediId]);
     
    return (
        <Box sx={{ p: 4, bgcolor: '#121212', minHeight: '100vh', color: 'white' }}>
            <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ color: 'white', mb: 3 }}>
                Back to Dashboard
            </Button>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <HistoryIcon /> Mission History
            </Typography>

            <Paper sx={{ bgcolor: '#1e1e1e', color: 'white', borderRadius: 4 }}>
                <List>
                    {history.length > 0 ? history.map((item, index) => (
                        <React.Fragment key={item._id}>
                            <ListItem>
                                <ListItemText
                                    primary={item.requesterName}
                                    secondary={`Status: ${item.status} | Date: ${new Date(item.createdAt).toLocaleString()}`}
                                    secondaryTypographyProps={{ sx: { color: 'rgba(255,255,255,0.6)' } }}
                                />
                            </ListItem>
                            {index < history.length - 1 && <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />}
                        </React.Fragment>
                    )) : (
                        <Typography sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>No missions completed yet.</Typography>
                    )}
                </List>
            </Paper>
        </Box>
    );
};

export default AmbulanceHistory;
