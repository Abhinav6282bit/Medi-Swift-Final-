import React, { useState, useEffect, useRef } from 'react';
import { AppBar, Box, Toolbar, Typography, Button, Grid, Card, CardContent, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, ListItemButton, Chip, Divider, LinearProgress, Container, Avatar, Stack, TextField, Tooltip, Badge, Popover, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Menu as MenuIcon, Dashboard as DashboardIcon, Science as ScienceIcon, UploadFile as UploadIcon, History as HistoryIcon, Logout as LogoutIcon, CloudUpload as CloudUploadIcon, Biotech as BiotechIcon, CheckCircle as DoneIcon, Search as SearchIcon, Hub as HubIcon, Settings as SettingsIcon, Notifications as BellIcon, Close as CloseIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const LabDashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [labQueue, setLabQueue] = useState([]);
  const [completedLabs, setCompletedLabs] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const [view, setView] = useState('pipeline'); // 'pipeline' or 'history'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionData = JSON.parse(localStorage.getItem('user')) || {};

  // --- NOTIFICATION STATES ---
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const hId = sessionData.hospitalId || sessionData.hospitalMediId;
      if (!hId) return;
      const res = await axios.get(`${API_BASE_URL}/api/hospital/notifications/${hId}`);
      if (res.data.success && Array.isArray(res.data.notifications)) {
        const backendNotifs = res.data.notifications.map(n => ({
          _id: n._id,
          msg: n.message,
          title: n.title,
          type: n.type,
          time: new Date(n.createdAt),
          read: n.read
        }));
        backendNotifs.sort((a, b) => b.time - a.time);
        setNotifications(backendNotifs);
        setUnreadCount(backendNotifs.filter(n => !n.read).length);
      }
    } catch (err) { console.error('Fetch Notifications Error:', err); }
  };

  const handleNotificationOpen = (event) => setNotificationAnchor(event.currentTarget);
  const handleNotificationClose = () => setNotificationAnchor(null);

  const handleDeleteNotification = async (notifId) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/notifications/${notifId}`);
      if (res.data.success) fetchNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
      setNotifications(notifications.filter(n => n._id !== notifId));
    }
  };

  const handleClearAllNotifications = async () => {
    if (!window.confirm("Clear all notifications?")) return;
    try {
      const hId = sessionData.hospitalId || sessionData.hospitalMediId;
      const res = await axios.delete(`${API_BASE_URL}/api/notifications/clear-all/${hId}`);
      if (res.data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) { console.error("Error clearing notifications:", err); }
  };

  const fetchLabQueue = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('user'));
      const hId = session?.hospitalId || session?.hospitalMediId || session?.userData?.hospitalId || session?.hospitalName;
      if (!hId) return;
      const res = await axios.get(`${API_BASE_URL}/api/get-hospital-labs/${encodeURIComponent(hId)}`);
      
      const data = Array.isArray(res.data) ? res.data : [];
      const active = data.filter(lab => lab.status === 'Requested' || lab.status === 'Sample Collected');
      const done = data.filter(lab => lab.status === 'Completed');
      setLabQueue(active);
      setCompletedLabs(done);
    } catch (err) { console.error("Lab fetch failed", err); }
  };

  useEffect(() => {
    const roleMatch = (sessionData.role || '').toUpperCase() === 'LAB';
    if (!roleMatch) navigate('/');
    fetchLabQueue();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchLabQueue();
      fetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API_BASE_URL}/api/update-lab-status`, { orderId, status: newStatus });
      fetchLabQueue();
    } catch (err) { alert("Failed to update status"); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !uploadingId) return;
    const techNote = prompt("Enter clinical observation summary:");
    if (techNote === null) return;

    const formData = new FormData();
    formData.append('report', file);
    setLoading(true);

    try {
      const uploadRes = await axios.post(`${API_BASE_URL}/api/upload-lab-report`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadRes.data.success) {
        await axios.put(`${API_BASE_URL}/api/update-lab-status`, {
          orderId: uploadingId,
          status: 'Completed',
          results: techNote,
          reportUrl: uploadRes.data.url
        });
        alert("Diagnostic Report Finalized!");
        fetchLabQueue();
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("Upload error.");
    } finally {
      setUploadingId(null);
      setLoading(false);
    }
  };

  const sanitizeLabResult = (text) => {
    if (!text) return '';
    return text.replace(/\s*\(Ref:.*?\)\s*/g, '').trim();
  };

  const parseTests = (testNames) => {
    if (!testNames || typeof testNames !== 'string') return [];
    return testNames.split(',').map(t => t.trim()).filter(t => t);
  };

  const filteredQueue = labQueue.filter(t =>
    (t.patientName || t.patientMediId || '').toLowerCase().includes(searchQuery) ||
    (t.testNames || '').toLowerCase().includes(searchQuery)
  );

  const filteredHistory = completedLabs.filter(t =>
    (t.patientName || t.patientMediId || '').toLowerCase().includes(searchQuery) ||
    (t.testNames || '').toLowerCase().includes(searchQuery)
  );

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0f1e 0%, #101828 35%, #0f1b30 65%, #0b1220 100%)',
      color: 'white',
      pb: 5
    }}>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />

      {/* --- PREMIUM NAVIGATION --- */}
      <AppBar
        position="sticky"
        sx={{
          background: 'rgba(13, 15, 30, 0.7)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none'
        }}
      >
        <Toolbar sx={{ height: 80, px: 4 }}>
          <IconButton color="inherit" onClick={() => setOpen(true)} edge="start" sx={{ mr: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
            <MenuIcon />
          </IconButton>
          <BiotechIcon sx={{ mr: 1.5, color: '#10b981', fontSize: 32 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ 
                fontWeight: 900, 
                letterSpacing: 0.5, 
                lineHeight: 1.2,
                background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>CORE-LAB OS</Typography>
            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800, letterSpacing: 2 }}>DIAGNOSTIC NETWORK</Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              onClick={handleNotificationOpen}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative',
                color: unreadCount > 0 ? '#10b981' : 'white'
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <BellIcon />
              </Badge>
            </IconButton>
            <Chip
              label="SYSTEM ACTIVE"
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                fontWeight: 900, border: '1px solid rgba(16, 185, 129, 0.2)'
              }}
            />
            <Button
              color="error"
              variant="outlined"
              size="small"
              onClick={() => { localStorage.clear(); navigate('/'); }}
              startIcon={<LogoutIcon />}
              sx={{ borderRadius: 3, fontWeight: 900, border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              Exit
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* --- SIDE DRAWER --- */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'rgba(13, 15, 30, 0.95)',
            backdropFilter: 'blur(30px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            color: 'white',
            px: 2
          }
        }}
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Avatar
            sx={{
              width: 80, height: 80, mx: 'auto', mb: 2,
              bgcolor: '#10b981', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
            }}
          >
            <BiotechIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Lab Terminal</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>{sessionData.hospitalName}</Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
        <List sx={{ mt: 2 }}>
          {[
            { text: 'Analysis Pipeline', icon: <ScienceIcon />, view: 'pipeline', color: '#10b981' },
            { text: 'Completed Reports', icon: <HistoryIcon />, view: 'history', color: '#38bdf8' }
          ].map((item) => (
            <ListItemButton
              key={item.text}
              onClick={() => { setView(item.view); setOpen(false); }}
              selected={view === item.view}
              sx={{
                borderRadius: 4, mb: 1.5,
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${item.color}` }
              }}
            >
              <ListItemIcon sx={{ color: view === item.view ? item.color : 'rgba(255,255,255,0.4)' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ sx: { fontWeight: 800, fontSize: '0.9rem' } }} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Container maxWidth="xl" sx={{ mt: 6 }}>
        <Grid container spacing={4}>

          {/* --- ANALYTICS PANEL --- */}
          <Grid item xs={12} md={3}>
            <Stack spacing={3}>
              <Paper sx={{ p: 3, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
                <Typography color="#38bdf8" variant="overline" sx={{ fontWeight: 900, letterSpacing: 1 }}>Pending Analysis</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>{labQueue.filter(l => l.status === 'Requested').length}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.5, fontWeight: 700 }}>Awaiting Sample Collection</Typography>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
                <Typography variant="overline" sx={{ color: '#fbbf24', fontWeight: 900, letterSpacing: 1 }}>In Process</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>{labQueue.filter(l => l.status === 'Sample Collected').length}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.5, fontWeight: 700 }}>Samples Under Analysis</Typography>
              </Paper>
              <Paper sx={{ p: 3, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
                <Typography variant="overline" sx={{ color: '#10b981', fontWeight: 900, letterSpacing: 1 }}>Completed Today</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, my: 1 }}>{completedLabs.length}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.5, fontWeight: 700 }}>Reports Finalized</Typography>
              </Paper>
            </Stack>
          </Grid>

          {/* --- MAIN WORKSPACE --- */}
          <Grid item xs={12} md={9}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, width: '100%' }}>
              <Box sx={{ flexGrow: 1 }} />
              <Stack direction="row" spacing={2}>
                <TextField
                  size="small"
                  placeholder="Filter by Name, ID or Test..."
                  sx={{
                    width: 300,
                    '& .MuiOutlinedInput-root': { 
                        color: 'white', 
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.03)',
                        transition: '0.3s',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        '&.Mui-focused fieldset': { borderColor: '#10b981' }
                    }
                  }}
                  onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                  InputProps={{ startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1 }} /> }}
                />
              </Stack>
            </Box>

            <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)', mt: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>PATIENT DETAILS</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>REQUESTED TESTS</TableCell>
                    <TableCell align="right" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>STATUS / ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(view === 'pipeline' ? filteredQueue : filteredHistory).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ borderBottom: 'none' }}>
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                           <BiotechIcon sx={{ fontSize: 50, color: '#10b981', opacity: 0.3, mb: 2 }} />
                           <Typography variant="h6" sx={{ color: 'white', fontWeight: 800 }}>No Records Found</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (view === 'pipeline' ? filteredQueue : filteredHistory).map((task) => (
                      <TableRow key={task._id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' }, transition: '0.2s' }}>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 900, width: 36, height: 36, fontSize: '1rem' }}>{task.patientName?.[0]}</Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{task.patientName}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>PID: {task.patientMediId} | DR: {task.doctorName}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                           <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                             {parseTests(task.testNames).map(test => (
                               <Chip key={test} label={test} size="small" sx={{ bgcolor: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', fontWeight: 800, border: '1px solid rgba(129, 140, 248, 0.2)' }} />
                             ))}
                           </Box>
                           {task.labResultSummary && (
                             <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                               {sanitizeLabResult(task.labResultSummary)}
                             </Typography>
                           )}
                        </TableCell>
                        <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                           {view === 'pipeline' ? (
                             <Stack spacing={1} alignItems="flex-end">
                                <Chip label={task.status.toUpperCase()} size="small" sx={{ fontWeight: 900, bgcolor: task.status === 'Requested' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: task.status === 'Requested' ? '#fbbf24' : '#10b981' }} />
                                {task.status === 'Requested' ? (
                                  <Button size="small" variant="contained" onClick={() => handleUpdateStatus(task._id, 'Sample Collected')} sx={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#1e293b', fontWeight: 900, borderRadius: 2, '&:hover': { transform: 'scale(1.02)' }, minWidth: 140 }}>Log Sample</Button>
                                ) : (
                                  <Button size="small" variant="contained" startIcon={<CloudUploadIcon />} onClick={() => { setUploadingId(task._id); setTimeout(() => fileInputRef.current.click(), 50); }} sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 900, borderRadius: 2, '&:hover': { transform: 'scale(1.02)' }, minWidth: 140 }}>
                                    {uploadingId === task._id ? 'Uploading...' : 'Upload Report'}
                                  </Button>
                                )}
                             </Stack>
                           ) : (
                             <Stack spacing={1} alignItems="flex-end">
                                <Chip label="FINALIZED" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontWeight: 900 }} />
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>{new Date(task.date).toLocaleDateString()}</Typography>
                             </Stack>
                           )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

        </Grid>
      </Container>

      {/* --- NOTIFICATION POPOVER --- */}
      <Popover
        open={Boolean(notificationAnchor)}
        anchorEl={notificationAnchor}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 380, maxHeight: 500, mt: 1.5,
            bgcolor: 'rgba(13, 15, 30, 0.95)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            color: 'white',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="subtitle1" fontWeight="900" sx={{ letterSpacing: 1 }}>NOTIFICATIONS</Typography>
          <Button size="small" onClick={handleClearAllNotifications} sx={{ color: '#10b981', fontWeight: 800, fontSize: '0.7rem' }}>
            CLEAR ALL
          </Button>
        </Box>
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <BellIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,0.1)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>No new notifications</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((n) => (
                <ListItem
                  key={n._id}
                  sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                    transition: '0.2s',
                    position: 'relative',
                    px: 3, py: 2
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteNotification(n._id)}
                    sx={{
                      position: 'absolute', top: 8, right: 8,
                      color: 'rgba(255,255,255,0.2)',
                      '&:hover': { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <ListItemText
                    primary={n.title}
                    secondary={
                      <React.Fragment>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mb: 0.5 }}>{n.msg}</Typography>
                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.65rem' }}>
                          {n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </React.Fragment>
                    }
                    primaryTypographyProps={{ sx: { fontWeight: 900, color: '#10b981', fontSize: '0.85rem', mb: 0.5 } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default LabDashboard;
