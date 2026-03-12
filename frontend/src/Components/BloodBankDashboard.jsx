import React, { useState, useEffect } from 'react';
import {
    Box, AppBar, Toolbar, Typography, Grid, Card, CardContent,
    Button, TextField, MenuItem, Select, FormControl, InputLabel,
    Stack, Divider, IconButton, Chip, CircularProgress, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert,
    Tabs, Tab, Badge, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
    Logout as LogoutIcon,
    Bloodtype as BloodIcon,
    Add as AddIcon,
    Remove as RemoveIcon,
    Refresh as RefreshIcon,
    LocalHospital as BankIcon,
    WarningAmber as WarnIcon,
    Notifications as NotifyIcon,
    Assignment as RequestIcon,
    CheckCircle as CheckIcon,
    Cancel as CancelIcon,
    FilterList as FilterIcon,
    CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_COLORS = {
    'A+': '#ef4444', 'A-': '#f87171',
    'B+': '#3b82f6', 'B-': '#60a5fa',
    'AB+': '#8b5cf6', 'AB-': '#a78bfa',
    'O+': '#10b981', 'O-': '#34d399'
};

const BloodBankDashboard = () => {
    const navigate = useNavigate();
    const [bankData, setBankData] = useState(null);
    const [stocks, setStocks] = useState([]);
    const [requests, setRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);

    // Filter state
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    // Update form state
    const [updateGroup, setUpdateGroup] = useState('A+');
    const [updateUnits, setUpdateUnits] = useState('');
    const [operation, setOperation] = useState('add');
    const [updateMsg, setUpdateMsg] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'BLOOD_BANK') {
            navigate('/');
            return;
        }
        setBankData(user);
        fetchAllData(user.mediId);
    }, []);

    const fetchAllData = async (mediId) => {
        setLoading(true);
        await Promise.all([
            fetchInventory(mediId),
            fetchRequests(mediId),
            fetchNotifications(mediId)
        ]);
        setLoading(false);
    };

    const fetchInventory = async (mediId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/blood-bank/inventory/${mediId}`);
            if (res.data.success) setStocks(res.data.stocks);
        } catch (err) {
            console.error('Inventory fetch error:', err);
        }
    };

    const fetchRequests = async (mediId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/blood-request/incoming/${mediId}`);
            if (res.data.success) setRequests(res.data.requests);
        } catch (err) {
            console.error('Requests fetch error:', err);
        }
    };

    const fetchNotifications = async (mediId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/patient/notifications/${mediId}`);
            if (res.data.success) setNotifications(res.data.notifications);
        } catch (err) {
            console.error('Notifications fetch error:', err);
        }
    };

    const handleUpdateStock = async () => {
        if (!updateUnits || Number(updateUnits) <= 0) return setUpdateMsg('Enter a valid unit count.');
        setUpdating(true);
        setUpdateMsg('');
        try {
            const res = await axios.put(`${API_BASE_URL}/api/blood-bank/update-stock`, {
                bloodBankId: bankData.mediId,
                bloodGroup: updateGroup,
                units: Number(updateUnits),
                operation
            });
            if (res.data.success) {
                setUpdateMsg(`✅ ${updateGroup} stock updated successfully!`);
                setUpdateUnits('');
                fetchInventory(bankData.mediId);
            }
        } catch (err) {
            setUpdateMsg('❌ Error updating stock.');
        } finally {
            setUpdating(false);
        }
    };

    const handleRequestStatus = async (requestId, status) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/blood-request/update/${requestId}`, { status });
            if (res.data.success) {
                alert(`Request ${status} successfully!`);
                fetchRequests(bankData.mediId);
                fetchInventory(bankData.mediId); // Refresh stock numbers
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Failed to update status.";
            alert(errorMsg);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const totalUnits = stocks.reduce((sum, s) => sum + (s.units || 0), 0);
    const criticalGroups = stocks.filter(s => s.units < 5);
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const pendingRequests = requests.filter(r => r.status === 'Pending').length;

    // Filtered requests based on daily filtration
    const filteredRequests = requests.filter(r => {
        const reqDate = new Date(r.requestDate).toISOString().split('T')[0];
        return reqDate === filterDate;
    });

    return (
        <Box sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        }}>
            {/* AppBar */}
            <AppBar position="sticky" sx={{ bgcolor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 1100 }}>
                <Toolbar>
                    <BloodIcon sx={{ mr: 1.5, color: '#f43f5e', fontSize: 32 }} />
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1 }}>
                            {bankData?.bloodBankName || 'Blood Bank'} Dashboard
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            ID: {bankData?.mediId}
                        </Typography>
                    </Box>

                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="inherit" indicatorColor="secondary" sx={{ mr: 4, display: { xs: 'none', md: 'flex' } }}>
                        <Tab label="Inventory" icon={<BloodIcon />} iconPosition="start" />
                        <Tab label={
                            <Badge badgeContent={pendingRequests} color="error" overlap="rectangular">
                                Requests
                            </Badge>
                        } icon={<RequestIcon />} iconPosition="start" />
                        <Tab label={
                            <Badge badgeContent={unreadNotifications} color="error" overlap="rectangular">
                                Notifications
                            </Badge>
                        } icon={<NotifyIcon />} iconPosition="start" />
                    </Tabs>

                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={() => fetchAllData(bankData?.mediId)}
                        sx={{ color: '#94a3b8', mr: 2 }}
                    >
                        Refresh
                    </Button>
                    <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ p: { xs: 2, md: 4 } }}>
                {/* Mobile Tabs */}
                <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, justifyContent: 'center' }}>
                    <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="inherit" variant="scrollable" scrollButtons="auto">
                        <Tab label="Inventory" />
                        <Tab label={`Requests (${pendingRequests})`} />
                        <Tab label={`Alerts (${unreadNotifications})`} />
                    </Tabs>
                </Box>

                {/* Critical Alert */}
                {criticalGroups.length > 0 && (
                    <Alert
                        severity="warning"
                        icon={<WarnIcon />}
                        sx={{ mb: 3, borderRadius: 3, fontWeight: 'bold' }}
                    >
                        ⚠️ Critical Stock: {criticalGroups.map(g => g.bloodGroup).join(', ')} — Less than 5 units available!
                    </Alert>
                )}

                {/* --- TAB CONTENT: INVENTORY --- */}
                {activeTab === 0 && (
                    <>
                        {/* Stats Row */}
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            <Grid item xs={12} sm={4}>
                                <Paper sx={{
                                    p: 3, borderRadius: 4, textAlign: 'center',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#f43f5e' }}>{totalUnits}</Typography>
                                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>Total Units Available</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper sx={{
                                    p: 3, borderRadius: 4, textAlign: 'center',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#10b981' }}>{stocks.filter(s => s.units >= 5).length}</Typography>
                                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>Blood Groups Well-Stocked</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <Paper sx={{
                                    p: 3, borderRadius: 4, textAlign: 'center',
                                    background: criticalGroups.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${criticalGroups.length > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)'}`
                                }}>
                                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#f59e0b' }}>{criticalGroups.length}</Typography>
                                    <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>Critical / Low Stock Groups</Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Grid container spacing={4}>
                            <Grid item xs={12} md={8}>
                                <Paper sx={{ p: 3, borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#f1f5f9', mb: 3 }}>
                                        🩸 Blood Group Inventory
                                    </Typography>
                                    {loading ? (
                                        <Box sx={{ textAlign: 'center', py: 6 }}>
                                            <CircularProgress sx={{ color: '#f43f5e' }} />
                                        </Box>
                                    ) : (
                                        <Grid container spacing={2}>
                                            {stocks.map((stock) => {
                                                const isCritical = stock.units < 5;
                                                const color = BLOOD_COLORS[stock.bloodGroup] || '#ef4444';
                                                return (
                                                    <Grid item xs={6} sm={3} key={stock.bloodGroup}>
                                                        <Box sx={{
                                                            p: 3, borderRadius: 4, textAlign: 'center',
                                                            background: isCritical ? 'rgba(239,68,68,0.15)' : `rgba(${hexToRgb(color)}, 0.1)`,
                                                            border: `2px solid ${isCritical ? '#ef4444' : color}`,
                                                            transition: '0.3s',
                                                            '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 25px ${color}40` }
                                                        }}>
                                                            <Typography variant="h4" fontWeight="900" sx={{ color }}>
                                                                {stock.bloodGroup}
                                                            </Typography>
                                                            <Typography variant="h3" fontWeight="bold" sx={{ color: '#f1f5f9', my: 1 }}>
                                                                {stock.units}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>units</Typography>
                                                            {isCritical && (
                                                                <Chip label="CRITICAL" size="small" color="error" sx={{ mt: 1, display: 'block', fontWeight: 'bold', fontSize: '0.65rem' }} />
                                                            )}
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    )}
                                </Paper>

                                {/* Inventory Table */}
                                <Paper sx={{ p: 3, borderRadius: 4, mt: 3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#f1f5f9', mb: 2 }}>
                                        📋 Detailed Stock Table
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: '#64748b', fontWeight: 'bold' }}>Blood Group</TableCell>
                                                    <TableCell sx={{ color: '#64748b', fontWeight: 'bold' }}>Units Available</TableCell>
                                                    <TableCell sx={{ color: '#64748b', fontWeight: 'bold' }}>Status</TableCell>
                                                    <TableCell sx={{ color: '#64748b', fontWeight: 'bold' }}>Last Updated</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {stocks.map(s => (
                                                    <TableRow key={s.bloodGroup} hover sx={{ '& td': { color: '#e2e8f0', borderColor: 'rgba(255,255,255,0.05)' } }}>
                                                        <TableCell>
                                                            <Chip
                                                                label={s.bloodGroup}
                                                                size="small"
                                                                sx={{ bgcolor: BLOOD_COLORS[s.bloodGroup], color: '#fff', fontWeight: 'bold' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell><Typography fontWeight="bold">{s.units}</Typography></TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={s.units === 0 ? 'OUT OF STOCK' : s.units < 5 ? 'CRITICAL' : s.units < 20 ? 'LOW' : 'ADEQUATE'}
                                                                size="small"
                                                                color={s.units === 0 ? 'error' : s.units < 5 ? 'error' : s.units < 20 ? 'warning' : 'success'}
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                                {s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : 'Not yet updated'}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Paper>
                            </Grid>

                            {/* Stock Update Panel */}
                            <Grid item xs={12} md={4}>
                                <Paper sx={{
                                    p: 3, borderRadius: 4,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    position: 'sticky', top: 100
                                }}>
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#f1f5f9', mb: 3 }}>
                                        ✏️ Update Stock
                                    </Typography>

                                    <Stack spacing={3}>
                                        <FormControl fullWidth>
                                            <InputLabel sx={{ color: '#94a3b8' }}>Blood Group</InputLabel>
                                            <Select
                                                value={updateGroup}
                                                onChange={(e) => setUpdateGroup(e.target.value)}
                                                label="Blood Group"
                                                sx={{ color: '#f1f5f9', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                                            >
                                                {BLOOD_GROUPS.map(bg => (
                                                    <MenuItem key={bg} value={bg}>{bg}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{ color: '#94a3b8' }}>Operation</InputLabel>
                                            <Select
                                                value={operation}
                                                onChange={(e) => setOperation(e.target.value)}
                                                label="Operation"
                                                sx={{ color: '#f1f5f9', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                                            >
                                                <MenuItem value="add">➕ Add Units (Received Donation)</MenuItem>
                                                <MenuItem value="subtract">➖ Subtract Units (Dispatched)</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            label="Number of Units"
                                            type="number"
                                            fullWidth
                                            value={updateUnits}
                                            onChange={(e) => setUpdateUnits(e.target.value)}
                                            inputProps={{ min: 1 }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': { color: '#f1f5f9', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
                                                '& .MuiInputLabel-root': { color: '#94a3b8' }
                                            }}
                                        />

                                        {updateMsg && (
                                            <Alert severity={updateMsg.includes('✅') ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
                                                {updateMsg}
                                            </Alert>
                                        )}

                                        <Button
                                            variant="contained"
                                            fullWidth
                                            onClick={handleUpdateStock}
                                            disabled={updating}
                                            startIcon={operation === 'add' ? <AddIcon /> : <RemoveIcon />}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 3,
                                                fontWeight: 'bold',
                                                bgcolor: operation === 'add' ? '#10b981' : '#ef4444',
                                                '&:hover': { bgcolor: operation === 'add' ? '#059669' : '#dc2626' }
                                            }}
                                        >
                                            {updating ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : `${operation === 'add' ? 'Add' : 'Subtract'} ${updateGroup} Units`}
                                        </Button>
                                    </Stack>

                                    <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                                    {/* Blood Bank Info */}
                                    <Typography variant="subtitle2" sx={{ color: '#64748b', mb: 2 }}>BLOOD BANK DETAILS</Typography>
                                    <Stack spacing={1.5}>
                                        {[
                                            { label: 'Medi-ID', value: bankData?.mediId },
                                            { label: 'Name', value: bankData?.bloodBankName },
                                            { label: 'Phone', value: bankData?.phone || 'N/A' },
                                            { label: 'Email', value: bankData?.email },
                                        ].map(({ label, value }) => (
                                            <Box key={label} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 2 }}>
                                                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold' }}>{label.toUpperCase()}</Typography>
                                                <Typography variant="body2" sx={{ color: '#e2e8f0', wordBreak: 'break-all' }}>{value}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </>
                )}

                {/* --- TAB CONTENT: BLOOD REQUESTS --- */}
                {activeTab === 1 && (
                    <Box>
                        <Paper sx={{ p: 4, borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="h5" fontWeight="bold" sx={{ color: '#f1f5f9' }}>
                                    📥 Incoming Blood Requests
                                </Typography>

                                {/* Daily Filtration */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.05)', p: 1.5, borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <CalendarIcon sx={{ color: '#94a3b8' }} />
                                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 'bold', mr: 1 }}>Filter by Date:</Typography>
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#f1f5f9',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </Box>
                            </Box>

                            {loading ? (
                                <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress color="error" /></Box>
                            ) : filteredRequests.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
                                    <RequestIcon sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
                                    <Typography variant="h6">No requests found for {new Date(filterDate).toLocaleDateString()}</Typography>
                                    <Typography variant="body2">Change the date or check back later.</Typography>
                                </Box>
                            ) : (
                                <Grid container spacing={3}>
                                    {filteredRequests.map((req) => (
                                        <Grid item xs={12} md={6} lg={4} key={req._id}>
                                            <Paper sx={{
                                                p: 3, borderRadius: 4,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${req.status === 'Accepted' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                                position: 'relative',
                                                transition: '0.3s',
                                                '&:hover': { background: 'rgba(255,255,255,0.08)', transform: 'translateY(-5px)' }
                                            }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                                    <Box>
                                                        <Chip
                                                            label={req.bloodGroup}
                                                            size="small"
                                                            sx={{ bgcolor: BLOOD_COLORS[req.bloodGroup], color: '#fff', fontWeight: 'bold' }}
                                                        />
                                                        {req.tokenNumber && (
                                                            <Typography variant="caption" sx={{ ml: 1, color: '#f43f5e', fontWeight: 'bold' }}>
                                                                TOKEN #{req.tokenNumber}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    <Chip
                                                        label={req.status}
                                                        color={req.status === 'Accepted' ? 'success' : 'warning'}
                                                        size="small"
                                                        variant="contained"
                                                    />
                                                </Stack>

                                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#f1f5f9' }}>{req.requesterName}</Typography>
                                                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>{req.hospitalName}</Typography>

                                                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />

                                                <Stack spacing={1} sx={{ mb: 3 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="caption" sx={{ color: '#64748b' }}>TIME:</Typography>
                                                        <Typography variant="caption" sx={{ color: '#e2e8f0' }}>{req.donationTime || 'N/A'}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="caption" sx={{ color: '#64748b' }}>DATE:</Typography>
                                                        <Typography variant="caption" sx={{ color: '#e2e8f0' }}>{new Date(req.requestDate).toLocaleDateString()}</Typography>
                                                    </Box>
                                                </Stack>

                                                {req.status === 'Pending' ? (
                                                    <Stack direction="row" spacing={1}>
                                                        <Button
                                                            fullWidth
                                                            variant="contained"
                                                            color="success"
                                                            onClick={() => handleRequestStatus(req._id, 'Accepted')}
                                                            sx={{ borderRadius: 2, fontWeight: 'bold' }}
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => handleRequestStatus(req._id, 'Ignored')}
                                                            sx={{ borderRadius: 2 }}
                                                        >
                                                            Ignore
                                                        </Button>
                                                    </Stack>
                                                ) : (
                                                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: req.bloodReceived ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', borderRadius: 2 }}>
                                                        <Typography variant="caption" sx={{ color: req.bloodReceived ? '#10b981' : '#3b82f6', fontWeight: 'bold' }}>
                                                            {req.status === 'Ignored' ? 'IGNORED' : req.bloodReceived ? 'DONATION RECEIVED ✓' : 'READY FOR DONATION 🩸'}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Paper>
                    </Box>
                )}

                {/* --- TAB CONTENT: NOTIFICATIONS --- */}
                {activeTab === 2 && (
                    <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
                        <Paper sx={{ p: 4, borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h5" fontWeight="bold" sx={{ color: '#f1f5f9' }}>
                                    🔔 Alerts & Notifications
                                </Typography>
                                <Button size="small" sx={{ color: '#94a3b8' }}>Mark all as read</Button>
                            </Box>

                            {notifications.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 8, color: '#64748b' }}>
                                    <NotifyIcon sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
                                    <Typography>No notifications yet</Typography>
                                </Box>
                            ) : (
                                <List sx={{ width: '100%' }}>
                                    {notifications.map((n, i) => (
                                        <React.Fragment key={n._id}>
                                            <ListItem alignItems="flex-start" sx={{
                                                borderRadius: 3, mb: 1.5,
                                                background: n.read ? 'transparent' : 'rgba(244,63,94,0.05)',
                                                border: `1px solid ${n.read ? 'rgba(255,255,255,0.05)' : 'rgba(244,63,94,0.2)'}`
                                            }}>
                                                <ListItemIcon sx={{ mt: 1, minWidth: 45 }}>
                                                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: n.read ? '#334155' : '#f43f5e', color: '#fff' }}>
                                                        <NotifyIcon fontSize="small" />
                                                    </Box>
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography fontWeight="bold" sx={{ color: n.read ? '#94a3b8' : '#f1f5f9' }}>{n.title}</Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                                {new Date(n.createdAt).toLocaleDateString()}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
                                                            {n.message}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                            {i < notifications.length - 1 && <Divider component="li" sx={{ borderColor: 'transparent', mb: 1 }} />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </Paper>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

// Helper to convert hex to rgb for CSS backgrounds
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '239, 68, 68';
}

export default BloodBankDashboard;
