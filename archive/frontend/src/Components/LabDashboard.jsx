import React, { useState, useEffect, useRef } from 'react';
import { AppBar, Box, Toolbar, Typography, Button, Grid, Card, CardContent, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, ListItemButton, Chip, Divider, LinearProgress, Container, Avatar } from '@mui/material';
import { Menu as MenuIcon, Dashboard as DashboardIcon, Science as ScienceIcon, UploadFile as UploadIcon, History as HistoryIcon, Logout as LogoutIcon, CloudUpload as CloudUploadIcon, Biotech as BiotechIcon, Thermostat as TempIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LabDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [labQueue, setLabQueue] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const sessionData = JSON.parse(localStorage.getItem('userSession')) || {};

  const fetchLabQueue = async () => {
    try {
        const session = JSON.parse(localStorage.getItem('userSession'));
        const hId = session?.hospitalName || session?.hospitalId; 
        if (!hId) return;
        const res = await axios.get(`http://localhost:5000/api/get-hospital-labs/${encodeURIComponent(hId)}`);
        const activeTasks = res.data.filter(lab => lab.status === 'Requested' || lab.status === 'Sample Collected');
        setLabQueue(activeTasks);
    } catch (err) { console.error("Lab fetch failed", err); }
  };

  useEffect(() => {
    fetchLabQueue(); 
    const interval = setInterval(fetchLabQueue, 15000); 
    return () => clearInterval(interval);
  }, []);

  
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/update-lab-status`, { orderId, status: newStatus });
      fetchLabQueue();
    } catch (err) { alert("Failed to update status"); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !uploadingId) return;
    const techNote = prompt("Enter clinical observation summary:");
    if (techNote === null) return;

    try {
      await axios.put(`http://localhost:5000/api/update-lab-status`, {
        orderId: uploadingId, status: 'Completed',
        results: `${techNote} (Ref: ${file.name})`
      });
      alert("Diagnostic Report Finalized!");
      fetchLabQueue();
    } catch (err) { alert("Upload error."); } finally { setUploadingId(null); }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1a3a35, #050f0e)',
      color: '#e0f2f1',
      pb: 5
    }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />

      {/* --- NEON TOP BAR --- */}
      <AppBar position="sticky" sx={{ background: 'rgba(11, 37, 33, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(0, 255, 200, 0.2)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
          <BiotechIcon sx={{ ml: 2, mr: 1, color: '#00ffc8' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 900, letterSpacing: 2 }}>CORE-LAB OS</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
             <Chip label="SYSTEM ACTIVE" size="small" sx={{ bgcolor: 'rgba(0, 255, 200, 0.1)', color: '#00ffc8', border: '1px solid #00ffc8' }} />
             <Button color="error" variant="outlined" size="small" onClick={() => { localStorage.clear(); navigate('/'); }} startIcon={<LogoutIcon />}>Exit</Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          
          {/* --- STATS SECTION --- */}
          <Grid item xs={12} md={4}>
            <Card sx={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              <CardContent>
                <Typography color="cyan" variant="overline">Diagnostic Overview</Typography>
                <Typography variant="h3" fontWeight="bold">{labQueue.length}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.6 }}>Active Analysis Requests</Typography>
                <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                   <Typography variant="caption"><TempIcon sx={{ fontSize: 12 }} /> Storage: 4°C</Typography>
                   <Typography variant="caption">Buffer Status: Optimal</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* --- MAIN QUEUE --- */}
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon sx={{ color: '#00ffc8' }} /> ANALYSIS PIPELINE
            </Typography>

            <Grid container spacing={2}>
              {labQueue.map((task) => (
                <Grid item xs={12} key={task._id}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: task.status === 'Requested' ? '4px solid #ff9800' : '4px solid #00ffc8',
                    transition: '0.3s',
                    '&:hover': { background: 'rgba(255, 255, 255, 0.07)', transform: 'translateX(10px)' },
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {uploadingId === task._id && <LinearProgress color="secondary" sx={{ position: 'absolute', top: 0, width: '100%' }} />}
                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" sx={{ color: '#00ffc8' }}>{task.patientName}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>PID: {task.patientMediId} | Doctor: {task.doctorName}</Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                           {task.testNames.split(',').map(test => (
                             <Chip key={test} label={test} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.7rem' }} />
                           ))}
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" display="block" sx={{ mb: 1, color: task.status === 'Requested' ? '#ff9800' : '#00ffc8' }}>
                          ● {task.status.toUpperCase()}
                        </Typography>
                        {task.status === 'Requested' ? (
                          <Button variant="contained" size="small" onClick={() => handleUpdateStatus(task._id, 'Sample Collected')} sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#e68900' } }}>
                            Log Sample
                          </Button>
                        ) : (
                          <Button variant="contained" color="success" size="small" startIcon={<CloudUploadIcon />} 
                            onClick={() => { setUploadingId(task._id); setTimeout(() => fileInputRef.current.click(), 100); }}>
                            Upload Results
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default LabDashboard;