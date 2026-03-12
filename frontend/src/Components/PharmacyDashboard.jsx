import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar, Box, Toolbar, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer,  TableHead, TableRow, Paper, Chip, Modal, TextField, Stack, Fade,
  Checkbox, FormControlLabel, Alert, IconButton, Divider, Badge, Popover,
  List, ListItem, ListItemText
} from '@mui/material';
import {
  Menu as MenuIcon, Logout as LogoutIcon, AddShoppingCart, AddShoppingCart as SaleIcon,
  VerifiedUser as VerifyIcon, Timer as TimerIcon, Inventory as StockIcon,
  Warning as WarningIcon, Print as PrintIcon, NotificationsActive as AlertIcon,
  AccountBalanceWallet as WalletIcon, BarChart as ChartIcon, ShoppingBag as PickupIcon,
  History as HistoryIcon, Notifications as BellIcon, Close as CloseIcon, Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const [openSaleModal, setOpenSaleModal] = useState(false);
  const [openVerifyModal, setOpenVerifyModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [dailyStats, setDailyStats] = useState({ revenue: 0, sales: 0 });
  const [saleForm, setSaleForm] = useState({ patientName: '', medicines: '', quantity: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [isOnlinePaid, setIsOnlinePaid] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [stock, setStock] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const sessionData = JSON.parse(localStorage.getItem('user')) || {};
  const [openAddStockModal, setOpenAddStockModal] = useState(false);
  const [newStockForm, setNewStockForm] = useState({ name: '', qty: '', price: '', category: 'Tablet', minQty: 5 });
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionDateFilter, setTransactionDateFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // --- NOTIFICATION STATES ---
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const hId = sessionData.hospitalId || sessionData.hospitalMediId;
      if (!hId) return;
      const res = await axios.get(`http://localhost:5000/api/hospital/notifications/${hId}`);
      if (res.data.success) {
        const backendNotifs = res.data.notifications.map(n => ({
          _id: n._id,
          msg: n.message,
          title: n.title,
          time: new Date(n.createdAt),
          read: n.read
        }));
        backendNotifs.sort((a,b) => b.time - a.time);
        setNotifications(backendNotifs);
        setUnreadCount(backendNotifs.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Fetch Notifications Error:', err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const handleNotificationOpen = (event) => setNotificationAnchor(event.currentTarget);
  const handleNotificationClose = () => setNotificationAnchor(null);

  const handleDeleteNotification = async (notifId) => {
    try {
      const res = await axios.delete(`http://localhost:5000/api/notifications/${notifId}`);
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
      const res = await axios.delete(`http://localhost:5000/api/notifications/clear-all/${hId}`);
      if (res.data.success) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) { console.error("Error clearing notifications:", err); }
  };


  const filteredStock = (stock || []).filter(item =>
    item && item.name && typeof item.name === 'string' &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchPrescriptions = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.hospitalMediId || sessionData.userData?.hospitalId || sessionData.userData?.hospitalMediId;
      if (!hospitalId) return;
      const res = await axios.get(`http://localhost:5000/api/pharmacy/prescriptions/${hospitalId}`);

      setPrescriptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error("Fetch error:", err); }
  };

  const fetchTransactions = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.userData?.hospitalId;
      if (!hospitalId) return;
      const res = await axios.get(`http://localhost:5000/api/pharmacy/transactions/${hospitalId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setTransactions(data);

      // Update daily stats from fetched transactions (Today only)
      const todayString = new Date().toLocaleDateString();
      const todayTxs = data.filter(t => new Date(t.timestamp).toLocaleDateString() === todayString);
      const revenue = todayTxs.reduce((sum, t) => sum + t.amount, 0);
      setDailyStats({ revenue, sales: todayTxs.length });
    } catch (err) {
      console.error("Transaction fetch error:", err);
    }
  };

  const fetchStock = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.userData?.hospitalId;
      if (!hospitalId) return;
      const res = await axios.get(`http://localhost:5000/api/pharmacy/stock/${hospitalId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setStock(data);
      checkLowStock(data);
    } catch (err) {
      console.error("Stock fetch error:", err);
    }
  };

  useEffect(() => {
    const mediId = sessionData.mediId || sessionData.userData?.mediId;
    if (mediId) {
      fetchPrescriptions();
      fetchStock();
      fetchTransactions();
      fetchNotifications();
      const interval = setInterval(() => {
        fetchPrescriptions();
        fetchStock();
        fetchTransactions();
        fetchNotifications();
      }, 10000);
      return () => clearInterval(interval);
    } else {
      navigate('/');
    }
  }, []);


  const handleAddStock = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.userData?.hospitalId;
      const res = await axios.post('http://localhost:5000/api/pharmacy/add-stock', {
        ...newStockForm,
        hospitalId
      });

      if (res.data.success) {
        alert("Stock Updated!");
        setOpenAddStockModal(false);
        fetchStock();
        setNewStockForm({ name: '', qty: '', price: '', category: 'Tablet', minQty: 5 });
      }
    } catch (err) {
      alert("Error adding stock");
    }
  };


  const handleOpenStockCheck = (order) => {
    setSelectedOrder(order);
    const items = order.medicines.map(m => {
      const inStock = stock.find(s => m.toLowerCase().trim() === s.name.toLowerCase().trim());
      return { name: m, available: !!(inStock && inStock.qty > 0) };
    });
    setStockItems(items);
    setStockDialogOpen(true);
  };

  const toggleStockItem = (index) => {
    const updated = [...stockItems];
    updated[index].available = !updated[index].available;
    setStockItems(updated);
  };

  const handleFinalizeStockAndNotify = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const available = stockItems.filter(i => i.available).map(i => i.name);


      await axios.put('http://localhost:5000/api/pharmacy/update-stock', {
        orderId: selectedOrder._id,
        availableMedicines: available
      });


      const res = await axios.put(`http://localhost:5000/api/pharmacy/prepare-order`, {
        orderId: selectedOrder._id
      });

      if (res.data.success) {
        alert(`Patient Notified! Bill Total: ₹${calculateTotal(available)}`);
        setStockDialogOpen(false);
        fetchPrescriptions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HELPERS & ACTIONS ---
  const calculateTotal = (meds) => {
    if (!meds || !Array.isArray(meds)) return 0;
    return meds.reduce((total, mName) => {
      const item = stock.find(s => mName.toLowerCase().trim() === s.name.toLowerCase().trim());
      return total + (item ? item.price : 0);
    }, 0);
  };

  const checkLowStock = (updatedStock) => {
    setLowStockAlerts(updatedStock.filter(item => item.qty <= item.minQty));
  };


  // --- STEP 1: NOTIFY (Generates Dynamic Random Code) ---


  // --- STEP 2: VERIFY CODE (Final Pickup) ---
  const handleSetPreparing = async (orderId) => {
    try {
      const res = await axios.post('http://localhost:5000/api/pharmacy/set-preparing', { orderId });
      if (res.data.success) {
        fetchPrescriptions();
      }
    } catch (err) { alert("Failed to update status to Preparing"); }
  };

  const handleSetReady = async (orderId) => {
    try {
      const res = await axios.put('http://localhost:5000/api/pharmacy/prepare-order', { orderId });
      if (res.data.success) {
        fetchPrescriptions();
      }
    } catch (err) { alert("Failed to update status to Ready"); }
  };

  const handleVerifyCOD = async (orderId) => {
    try {
      const res = await axios.post('http://localhost:5000/api/pharmacy/verify-cod', { orderId });
      if (res.data.success) {
        alert("COD Received! Verification OTP has been sent to the patient.");
        fetchPrescriptions();
      }
    } catch (err) { alert("Failed to verify COD"); }
  };

  const handleConfirmPickup = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/pharmacy/verify-pickup', {
        orderId: selectedOrder._id,
        userInputCode: verificationCodeInput
      });
      if (res.data.success) {
        fetchStock();
        fetchPrescriptions();
        setOpenVerifyModal(false);
        setVerificationCodeInput('');
        setIsOnlinePaid(false);
        alert(`PICKUP COMPLETE! Stock deducted and ledger updated.`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Invalid Code");
    }
  };

  const handleResendCode = async (orderId) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/pharmacy/prepare-order`, {
        orderId: orderId
      });
      if (res.data.success) {
        alert("A new verification code has been sent to the patient.");
      }
    } catch (err) {
      console.error("Resend error:", err);
      alert("Failed to resend code.");
    }
  };

  // --- OFFLINE SALE ---
  const handleOfflineSale = () => {
    const names = saleForm.medicines.split(',').map(m => m.trim().toLowerCase());
    let bill = 0;
    let newStock = [...stock];
    let soldItems = [];

    for (const n of names) {
      const item = newStock.find(s => s.name.toLowerCase() === n);
      if (!item || item.qty < saleForm.quantity) return alert(`Stock Issue: ${n}`);
      bill += item.price * saleForm.quantity;
      soldItems.push({ name: item.name, price: item.price, qty: saleForm.quantity });
      newStock = newStock.map(s => s.name.toLowerCase() === n ? { ...s, qty: s.qty - saleForm.quantity } : s);
    }

    setStock(newStock);
    checkLowStock(newStock);
    setDailyStats(prev => ({ revenue: prev.revenue + bill, sales: prev.sales + 1 }));
    setReceipt({ name: saleForm.patientName || "Walk-in", items: soldItems, total: bill });
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d0f1e 0%, #101828 35%, #0f1b30 65%, #0b1220 100%)', color: 'white' }}>
      <AppBar position="static" sx={{ background: 'rgba(13, 15, 30, 0.7)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: '900', letterSpacing: 1, color: '#6366f1' }}>MEDI-SWIFT <span style={{ color: 'white', opacity: 0.8, fontSize: '0.9rem', fontWeight: 600 }}>| PHARMACY</span></Typography>
          </Stack>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={handleNotificationOpen} color="inherit" sx={{ 
              bgcolor: 'rgba(255,255,255,0.03)', 
              '&:hover': { bgcolor: 'rgba(99,102,241,0.1)', color: '#6366f1' } 
            }}>
              <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 900 } }}>
                <BellIcon />
              </Badge>
            </IconButton>
            <Button 
                variant="outlined"
                onClick={() => { localStorage.clear(); navigate('/'); }} 
                startIcon={<LogoutIcon />}
                sx={{ 
                    borderColor: 'rgba(239, 68, 68, 0.3)', 
                    color: '#f87171', 
                    fontWeight: 'bold',
                    '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.05)' }
                }}
            >
                LOGOUT
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 5 } }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Revenue', value: `₹${dailyStats.revenue}`, icon: <WalletIcon />, color: '#6366f1' },
            { label: 'Sales', value: dailyStats.sales, icon: <ChartIcon />, color: '#10b981' },
            { label: 'Low Stock', value: lowStockAlerts.length, icon: <WarningIcon />, color: lowStockAlerts.length > 0 ? '#ef4444' : '#6366f1' }
          ].map((stat, i) => (
            <Grid item xs={12} md={4} key={i}>
                <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'white', 
                    borderRadius: 4,
                    transition: '0.3s',
                    '&:hover': { transform: 'translateY(-5px)', bgcolor: 'rgba(255,255,255,0.05)' }
                }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, p: 3 }}>
                    <Box sx={{ 
                        p: 1.5, borderRadius: 3, 
                        bgcolor: `${stat.color}15`, 
                        color: stat.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {stat.icon}
                    </Box>
                    <Box>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>{stat.label}</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{stat.value}</Typography>
                    </Box>
                </CardContent>
                </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 6 }}>
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight="900" sx={{ letterSpacing: -1 }}>Pharmacy <span style={{ color: '#6366f1' }}>Center</span></Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.6, fontWeight: 500 }}>Internal Hospital Dispensing Unit • Active Workstation</Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
              <Box sx={{ p: 2.5, background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: 4, minWidth: 160 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800, color: '#818cf8', letterSpacing: 1 }}>PENDING ORDERS</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'white' }}>{prescriptions.filter(p => p.status !== 'Ready for Pickup').length.toString().padStart(2, '0')}</Typography>
              </Box>
              <Box sx={{ p: 2.5, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 4, minWidth: 160 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 800, color: '#34d399', letterSpacing: 1 }}>READY FOR PICKUP</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'white' }}>{prescriptions.filter(p => p.status === 'Ready for Pickup').length.toString().padStart(2, '0')}</Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="contained"
              startIcon={<SaleIcon />}
              onClick={() => { setReceipt(null); setOpenSaleModal(true); }}
              sx={{ 
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                  color: 'white', 
                  fontWeight: '900', 
                  px: 4, py: 2, 
                  borderRadius: 3.5,
                  boxShadow: '0 10px 20px rgba(99,102,241,0.3)',
                  '&:hover': { transform: 'scale(1.02)', boxShadow: '0 12px 25px rgba(99,102,241,0.4)' }
              }}
            >
              NEW OFFLINE SALE
            </Button>
          </Grid>
        </Grid>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: '900', color: '#6366f1', letterSpacing: 0.5 }}>Hospital Prescriptions</Typography>
        <TableContainer component={Paper} sx={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            backdropFilter: 'blur(10px)',
            borderRadius: 4, 
            border: '1px solid rgba(255,255,255,0.08)',
            mb: 6,
            overflow: 'hidden'
        }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(99, 102, 241, 0.08)' }}>
              <TableRow>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800', py: 2.5 }}>PATIENT</TableCell>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800' }}>STATUS</TableCell>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800' }}>MEDICINES</TableCell>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800' }} align="right">ACTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prescriptions.map((p) => (
                <TableRow key={p._id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell>
                    <Typography fontWeight="900" sx={{ color: 'white' }}>{p.patientName}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>ID: {p.patientId || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.status.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: p.status === 'Ready for Pickup' ? 'rgba(16, 185, 129, 0.15)' :
                                p.status === 'Preparing' ? 'rgba(99, 102, 241, 0.15)' :
                                p.status === 'Completed' ? 'rgba(100, 116, 139, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: p.status === 'Ready for Pickup' ? '#10b981' :
                               p.status === 'Preparing' ? '#6366f1' :
                               p.status === 'Completed' ? '#94a3b8' : '#f59e0b',
                        fontWeight: '900',
                        fontSize: '0.65rem',
                        border: `1px solid rgba(${p.status === 'Ready for Pickup' ? '16, 185, 129' : '99, 102, 241'}, 0.2)`
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {p.medicines?.map((med, idx) => (
                            <Chip 
                                key={idx} 
                                label={med} 
                                size="small" 
                                sx={{ 
                                    bgcolor: 'rgba(255,255,255,0.05)', 
                                    color: 'rgba(255,255,255,0.8)', 
                                    fontSize: '0.65rem', 
                                    fontWeight: 600,
                                    borderRadius: 1,
                                    mb: 0.5
                                }} 
                            />
                        ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {p.status === 'Consulting' || p.status === 'Completed' ? (
                      <Button
                        variant="contained" size="small"
                        sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', fontWeight: 800, borderRadius: 2 }}
                        onClick={() => handleSetPreparing(p._id)}
                      >
                        START PREPARING
                      </Button>
                    ) : p.status === 'Preparing' ? (
                      <Button
                        variant="contained" size="small"
                        sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', fontWeight: 800, borderRadius: 2 }}
                        onClick={() => handleSetReady(p._id)}
                      >
                        MARK READY
                      </Button>
                    ) : p.status === 'Ready for Pickup' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {!p.isPaid && !p.verificationCode && (
                          <Button
                            variant="outlined" size="small"
                            color="warning"
                            onClick={() => handleVerifyCOD(p._id)}
                            startIcon={<WalletIcon />}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          >
                            COD RECEIVED
                          </Button>
                        )}
                        <Button
                          variant="contained" size="small"
                          color="success"
                          disabled={!p.verificationCode}
                          startIcon={<PickupIcon />}
                          onClick={() => {
                            setSelectedOrder(p);
                            setOpenVerifyModal(true);
                          }}
                          sx={{ 
                              fontWeight: 800, borderRadius: 2,
                              background: p.verificationCode ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)'
                          }}
                        >
                          {p.verificationCode ? "CONFIRM PICKUP" : "AWAITING PAYMENT"}
                        </Button>
                      </Stack>
                    ) : (
                      <Chip label="COMPLETED" size="small" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: '900', color: '#6366f1' }}>
            <StockIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Medical Inventory
          </Typography>
          <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                startIcon={<SaleIcon />} 
                onClick={() => setOpenAddStockModal(true)} 
                sx={{ 
                    borderRadius: 2.5, fontWeight: 800, 
                    borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8',
                    '&:hover': { borderColor: '#6366f1', bgcolor: 'rgba(99,102,241,0.05)' }
                }}
              >
                ADD STOCK
              </Button>
              <TextField
                size="small"
                placeholder="Search Inventory..."
                InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', mr: 1, fontSize: 20 }} />,
                }}
                sx={{ 
                    width: 280,
                    bgcolor: 'rgba(255,255,255,0.03)', 
                    borderRadius: 2, 
                    '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    }
                }}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              />
          </Stack>
        </Box>
        <TableContainer component={Paper} sx={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            backdropFilter: 'blur(10px)',
            borderRadius: 4, 
            border: '1px solid rgba(255,255,255,0.08)',
            mb: 5,
            overflow: 'hidden'
        }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(99, 102, 241, 0.08)' }}>
              <TableRow>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800', py: 2 }}>MEDICINE NAME</TableCell>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800' }}>STOCK LEVEL</TableCell>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800' }}>UNIT PRICE</TableCell>
                <TableCell sx={{ color: '#818cf8', fontWeight: '800' }}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStock.length > 0 ? (
                filteredStock.map((item) => (
                  <TableRow key={item._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell sx={{ color: item.qty <= item.minQty ? '#ef4444' : 'white', fontWeight: 800 }}>
                      {item.qty} units
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 700 }}>₹{item.price}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.qty <= item.minQty ? "LOW STOCK" : "OPTIMAL"}
                        size="small"
                        sx={{
                            bgcolor: item.qty <= item.minQty ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: item.qty <= item.minQty ? '#ef4444' : '#10b981',
                            fontWeight: 900,
                            fontSize: '0.6rem',
                            border: `1px solid rgba(${item.qty <= item.minQty ? '239, 68, 68' : '16, 185, 129'}, 0.2)`
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'rgba(255,255,255,0.3)', py: 5 }}>
                    No medicines found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* --- TRANSACTION HISTORY SECTION --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 8, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: '900', color: '#10b981', letterSpacing: 0.5 }}>
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Recent Transactions
        </Typography>
        <TextField
            type="date"
            size="small"
            value={transactionDateFilter}
            onChange={(e) => setTransactionDateFilter(e.target.value)}
            sx={{ 
                bgcolor: 'rgba(255,255,255,0.03)', 
                borderRadius: 2, 
                '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                },
                colorScheme: 'dark'
            }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(10px)',
          borderRadius: 4, 
          border: '1px solid rgba(255,255,255,0.08)',
          mb: 8,
          overflow: 'hidden'
      }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(16, 185, 129, 0.08)' }}>
            <TableRow>
              <TableCell sx={{ color: '#34d399', fontWeight: '800', py: 2 }}>TIME</TableCell>
              <TableCell sx={{ color: '#34d399', fontWeight: '800' }}>PATIENT</TableCell>
              <TableCell sx={{ color: '#34d399', fontWeight: '800' }}>DISPENSED ITEMS</TableCell>
              <TableCell sx={{ color: '#34d399', fontWeight: '800' }}>METHOD</TableCell>
              <TableCell sx={{ color: '#34d399', fontWeight: '800' }} align="right">AMOUNT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(transactionDateFilter 
                ? transactions.filter(t => t.timestamp && new Date(t.timestamp).toISOString().split('T')[0] === transactionDateFilter)
                : transactions
            ).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'rgba(255,255,255,0.3)', py: 5 }}>
                  No transactions found for the selected date.
                </TableCell>
              </TableRow>
            ) : (
              (transactionDateFilter 
                ? transactions.filter(t => t.timestamp && new Date(t.timestamp).toISOString().split('T')[0] === transactionDateFilter)
                : transactions
              ).map((t, index) => (
                <TableRow key={index} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{t.time}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: '900' }}>{t.patient}</TableCell>
                  <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{t.items}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.method.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: t.method === 'Online' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: t.method === 'Online' ? '#818cf8' : '#34d399',
                        fontWeight: '900',
                        fontSize: '0.6rem',
                        border: `1px solid rgba(${t.method === 'Online' ? '99, 102, 241' : '16, 185, 129'}, 0.2)`
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#10b981', fontWeight: '900' }}>₹{t.amount.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- ADD STOCK MODAL --- */}
      <Modal open={openAddStockModal} onClose={() => setOpenAddStockModal(false)}>
        <Fade in={openAddStockModal}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 480, background: '#0d0f1e', borderRadius: 5, p: 4, 
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            <Typography variant="h5" fontWeight="900" color="#6366f1" mb={3} sx={{ letterSpacing: 0.5 }}>
              Manage Inventory
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Medicine Name" fullWidth variant="outlined"
                value={newStockForm.name}
                onChange={(e) => setNewStockForm({ ...newStockForm, name: e.target.value })}
                sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Quantity" type="number" fullWidth
                  value={newStockForm.qty}
                  onChange={(e) => setNewStockForm({ ...newStockForm, qty: e.target.value })}
                  sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                />
                <TextField
                  label="Price (₹)" type="number" fullWidth
                  value={newStockForm.price}
                  onChange={(e) => setNewStockForm({ ...newStockForm, price: e.target.value })}
                  sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                />
              </Stack>

              <TextField
                label="Category" fullWidth
                value={newStockForm.category}
                onChange={(e) => setNewStockForm({ ...newStockForm, category: e.target.value })}
                sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
              />

              <TextField
                label="Alert Level" type="number" fullWidth
                value={newStockForm.minQty}
                helperText="System will flag low stock at this level"
                FormHelperTextProps={{ sx: { color: 'rgba(255,255,255,0.3)' } }}
                onChange={(e) => setNewStockForm({ ...newStockForm, minQty: e.target.value })}
                sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
              />

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  fullWidth variant="text"
                  onClick={() => setOpenAddStockModal(false)}
                  sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth variant="contained"
                  onClick={handleAddStock}
                  sx={{ 
                      bgcolor: '#6366f1', fontWeight: 900, borderRadius: 2.5,
                      '&:hover': { bgcolor: '#4f46e5' }
                  }}
                >
                  SAVE INVENTORY
                </Button>
              </Box>
            </Stack>
          </Box>
        </Fade>
      </Modal>

      {/* PATIENT VERIFICATION & PAYMENT MODAL */}
      <Modal open={openVerifyModal} onClose={() => { setOpenVerifyModal(false); setIsOnlinePaid(false); }}>
        <Fade in={openVerifyModal}>
          <Box sx={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
              width: 440, background: '#0d0f1e', borderRadius: 5, p: 4, textAlign: 'center', 
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            <Box sx={{ mb: 3 }}>
              <IconButton disabled sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', mb: 2, p: 2 }}>
                <VerifyIcon sx={{ fontSize: 32 }} />
              </IconButton>
              <Typography variant="h5" fontWeight="900" color="white" sx={{ letterSpacing: 0.5 }}>Finalize Pickup</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>Order Verification for <b>{selectedOrder?.patientName}</b></Typography>
            </Box>

            <TextField
              label="Enter 6-Digit Pickup Code"
              fullWidth
              value={verificationCodeInput}
              onChange={(e) => setVerificationCodeInput(e.target.value)}
              sx={{ 
                  my: 3,
                  '& label': { color: 'rgba(255,255,255,0.5)' },
                  '& .MuiOutlinedInput-root': { 
                      color: 'white', fontWeight: 900, fontSize: '1.2rem', letterSpacing: 4,
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } 
                  }
              }}
            />

            <Divider sx={{ my: 2, '&::before, &::after': { borderColor: 'rgba(255,255,255,0.1)' } }}>
                <Chip label="PAYMENT METHOD" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.6rem' }} />
            </Divider>

            <Stack direction="row" spacing={2} sx={{ my: 3 }}>
              <Button
                fullWidth
                variant={paymentMethod === 'COD' ? "contained" : "outlined"}
                onClick={() => { setPaymentMethod('COD'); setIsOnlinePaid(false); }}
                sx={{ 
                    borderRadius: 2.5, fontWeight: 800,
                    bgcolor: paymentMethod === 'COD' ? '#6366f1' : 'transparent',
                    borderColor: paymentMethod === 'COD' ? '#6366f1' : 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: paymentMethod === 'COD' ? '#4f46e5' : 'rgba(255,255,255,0.05)' }
                }}
              >
                CASH (COD)
              </Button>
              <Button
                fullWidth
                variant={paymentMethod === 'Online' ? "contained" : "outlined"}
                onClick={() => setPaymentMethod('Online')}
                sx={{ 
                    borderRadius: 2.5, fontWeight: 800,
                    bgcolor: paymentMethod === 'Online' ? '#10b981' : 'transparent',
                    borderColor: paymentMethod === 'Online' ? '#10b981' : 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: paymentMethod === 'Online' ? '#059669' : 'rgba(255,255,255,0.05)' }
                }}
              >
                ONLINE PAY
              </Button>
            </Stack>

            {paymentMethod === 'Online' && (
              <Box sx={{ p: 3, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 4, mb: 3, border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <Typography variant="subtitle2" sx={{ color: '#34d399', mb: 2 }}>Bill Total: <b>₹{selectedOrder ? calculateTotal(selectedOrder.medicines).toLocaleString() : 0}</b></Typography>

                {!isOnlinePaid ? (
                  <Stack alignItems="center" spacing={2}>
                    <Box
                      component="img"
                      sx={{ width: 160, height: 160, p: 1.5, bgcolor: 'white', borderRadius: 3, boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=upi://pay?pa=hospital@bank%26pn=MediSwift%26am=${selectedOrder ? calculateTotal(selectedOrder.medicines) : 0}%26cu=INR`}
                      alt="Payment QR Code"
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Scan with any UPI application</Typography>

                    <Button
                      variant="contained"
                      onClick={() => { setIsOnlinePaid(true); alert("Payment Confirmed!"); }}
                      sx={{ bgcolor: '#10b981', color: 'white', fontWeight: 900, borderRadius: 2, '&:hover': { bgcolor: '#059669' } }}
                    >
                      VERIFY TRANSACTION
                    </Button>
                  </Stack>
                ) : (
                  <Typography variant="body1" sx={{ mt: 1, fontWeight: '900', color: '#10b981' }}>✓ PAYMENT SECURED</Typography>
                )}
              </Box>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!verificationCodeInput || (paymentMethod === 'Online' && !isOnlinePaid)}
              sx={{ 
                  py: 2, borderRadius: 3, fontWeight: '900', 
                  bgcolor: '#6366f1',
                  boxShadow: '0 10px 20px rgba(99,102,241,0.2)',
                  '&:hover': { bgcolor: '#4f46e5', boxShadow: '0 12px 25px rgba(99,102,241,0.3)' }
              }}
              onClick={() => {
                handleConfirmPickup(selectedOrder, verificationCodeInput, paymentMethod);
                setOpenVerifyModal(false);
                setVerificationCodeInput('');
                setIsOnlinePaid(false);
              }}
            >
              {paymentMethod === 'Online' && !isOnlinePaid ? "Awaiting Payment..." : "CONFIRM & DISPENSE"}
            </Button>
          </Box>
        </Fade>
      </Modal>

      {/* OFFLINE SALE MODAL */}
      <Modal open={openSaleModal} onClose={() => setOpenSaleModal(false)}>
        <Fade in={openSaleModal}>
          <Box sx={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
              width: 480, background: '#0d0f1e', borderRadius: 5, p: 4,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            {!receipt ? (
              <Stack spacing={3}>
                <Typography variant="h5" fontWeight="900" color="#6366f1" sx={{ letterSpacing: 0.5 }}>New Counter Sale</Typography>
                <TextField 
                    label="Patient Name (Optional)" fullWidth size="small" 
                    onChange={(e) => setSaleForm({ ...saleForm, patientName: e.target.value })} 
                    sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                />
                <TextField 
                    label="Medicines (Comma Separated)" fullWidth size="small" 
                    placeholder="Paracetamol, Cetirizine..."
                    onChange={(e) => setSaleForm({ ...saleForm, medicines: e.target.value })} 
                    sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                />
                <TextField 
                    label="Quantity Per Unit" type="number" fullWidth size="small" 
                    value={saleForm.quantity} 
                    onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} 
                    sx={{ '& label': { color: 'rgba(255,255,255,0.5)' }, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
                />
                <Button 
                    variant="contained" fullWidth sx={{ 
                        py: 2, borderRadius: 3, fontWeight: '900', 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }} 
                    onClick={handleOfflineSale}
                >
                    GENERATE BILLING
                </Button>
              </Stack>
            ) : (
              <Box textAlign="center">
                <Typography variant="h6" fontWeight="900" color="#10b981" sx={{ letterSpacing: 1 }}>SALE COMPLETED</Typography>
                <Box sx={{ border: '1px dashed rgba(255,255,255,0.1)', p: 3, my: 3, textAlign: 'left', borderRadius: 3, background: 'rgba(255,255,255,0.02)' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>PATIENT: {receipt.name.toUpperCase()}</Typography>
                  <Box sx={{ mt: 2 }}>
                    {receipt.items.map((it, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{it.name} x{it.qty}</Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>₹{it.price * it.qty}</Typography>
                        </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 900 }}>Grand Total</Typography>
                      <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 900 }}>₹{receipt.total.toLocaleString()}</Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button 
                        variant="contained" fullWidth 
                        sx={{ bgcolor: '#6366f1', borderRadius: 2.5, fontWeight: 900 }}
                        onClick={() => window.print()}
                    >
                        PRINT RECEIPT
                    </Button>
                    <Button 
                        fullWidth sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }} 
                        onClick={() => setReceipt(null)}
                    >
                        CLOSE
                    </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* STOCK CHECK & BILL PREVIEW MODAL */}
      <Modal open={stockDialogOpen} onClose={() => setStockDialogOpen(false)}>
        <Fade in={stockDialogOpen}>
          <Box sx={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
              width: 440, background: '#0d0f1e', borderRadius: 5, p: 4, 
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}>
            <Typography variant="h6" fontWeight="900" sx={{ mb: 1, color: '#6366f1', letterSpacing: 0.5 }}>Inventory Verification</Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'rgba(255,255,255,0.5)' }}>
              Confirm medicine availability for <b>{selectedOrder?.patientName}</b>.
            </Typography>

            <Stack spacing={1.5} sx={{ mb: 4 }}>
              {stockItems.map((item, idx) => (
                <Box key={idx} sx={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, 
                    background: item.available ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: item.available ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                    transition: '0.2s'
                }}>
                  <FormControlLabel
                    control={<Checkbox checked={item.available} onChange={() => toggleStockItem(idx)} sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} />}
                    label={<Typography sx={{ fontWeight: 800, color: item.available ? 'white' : 'rgba(255,255,255,0.3)', textDecoration: item.available ? 'none' : 'line-through' }}>{item.name}</Typography>}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 900, color: item.available ? '#10b981' : 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', px: 1, py: 0.5, borderRadius: 1 }}>
                    ₹{stock.find(s => s.name.toLowerCase().trim() === item.name.toLowerCase().trim())?.price || 0}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, p: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>STATION BILL TOTAL</Typography>
              <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 900 }}>
                ₹{calculateTotal(stockItems.filter(i => i.available).map(i => i.name)).toLocaleString()}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button fullWidth variant="text" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }} onClick={() => setStockDialogOpen(false)}>Cancel</Button>
              <Button
                fullWidth
                variant="contained"
                disabled={isProcessing}
                sx={{ 
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                    color: 'white', fontWeight: 900, borderRadius: 2.5,
                    boxShadow: '0 8px 16px rgba(99,102,241,0.2)'
                }}
                onClick={handleFinalizeStockAndNotify}
              >
                {isProcessing ? "Processing..." : "CONFIRM & NOTIFY"}
              </Button>
            </Stack>
          </Box>
        </Fade>
      </Modal>

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
            background: '#0d0f1e', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 5,
            color: 'white',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <Typography variant="subtitle1" fontWeight="900" sx={{ color: 'white', letterSpacing: 0.5 }}>System Alerts</Typography>
          <Button size="small" onClick={handleClearAllNotifications} sx={{ color: '#6366f1', fontWeight: '900', fontSize: '0.7rem' }}>
            CLEAR ALL
          </Button>
        </Box>
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <BellIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.03)', mb: 2 }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>No active notifications</Typography>
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
                    px: 3, py: 2.5
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteNotification(n._id)}
                    sx={{
                      position: 'absolute', top: 12, right: 12,
                      color: 'rgba(255,255,255,0.1)',
                      '&:hover': { color: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.1)' }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <ListItemText
                    primary={n.title}
                    secondary={
                      <React.Fragment>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.5, lineHeight: 1.4 }}>{n.msg}</Typography>
                        <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: '800', fontSize: '0.6rem', mt: 1, display: 'block' }}>
                          {n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </React.Fragment>
                    }
                    primaryTypographyProps={{ sx: { fontWeight: '900', color: '#818cf8', fontSize: '0.85rem' } }}
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

export default PharmacyDashboard;