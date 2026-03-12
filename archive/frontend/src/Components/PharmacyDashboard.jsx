import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AppBar, Box, Toolbar, Typography, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, Modal, TextField, Stack, Fade,
  Checkbox, FormControlLabel, Alert, IconButton, Divider
} from '@mui/material';
import {
  Menu as MenuIcon, Logout as LogoutIcon, AddShoppingCart, AddShoppingCart as SaleIcon,
  VerifiedUser as VerifyIcon, Timer as TimerIcon, Inventory as StockIcon,
  Warning as WarningIcon, Print as PrintIcon, NotificationsActive as AlertIcon,
  AccountBalanceWallet as WalletIcon, BarChart as ChartIcon, ShoppingBag as PickupIcon,
  History as HistoryIcon
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
  const sessionData = JSON.parse(localStorage.getItem('userSession')) || {};
  const [openAddStockModal, setOpenAddStockModal] = useState(false);
  const [newStockForm, setNewStockForm] = useState({ name: '', qty: '', price: '', category: 'Tablet', minQty: 5 });
  const [searchQuery, setSearchQuery] = useState('');


  const filteredStock = (stock || []).filter(item =>
    item && item.name && typeof item.name === 'string' &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchPrescriptions = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.userData?.hospitalId || "City General Hospital";
      if (!hospitalId) return;
      const res = await axios.get(`http://localhost:5000/api/pharmacy/prescriptions/${hospitalId}`);

      setPrescriptions(res.data);
    } catch (err) { console.error("Fetch error:", err); }
  };

  const fetchStock = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.userData?.hospitalId || "City General Hospital";
      if (!hospitalId) return;
      const res = await axios.get(`http://localhost:5000/api/pharmacy/stock/${hospitalId}`);
      setStock(res.data);
      checkLowStock(res.data);
    } catch (err) {
      console.error("Stock fetch error:", err);
    }
  };


  useEffect(() => {
    if (sessionData.mediId) {
      fetchPrescriptions();
      fetchStock();
      const interval = setInterval(() => {
        fetchPrescriptions();
        fetchStock();
      }, 5000);
      return () => clearInterval(interval);
    } else {
      navigate('/');
    }
  }, [sessionData.mediId, navigate]);


  const handleAddStock = async () => {
    try {
      const hospitalId = sessionData.hospitalId || sessionData.userData?.hospitalId || "City General Hospital";
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
  const handleConfirmPickup = async (order, inputCode, paymentMethod) => {
    try {
      const res = await axios.post(`http://localhost:5000/api/pharmacy/verify-pickup`, {
        orderId: order._id,
        userInputCode: inputCode,
        paymentMethod: paymentMethod
      });

      if (res.data.success) {
        const totalValue = calculateTotal(order.medicines);
        await axios.put(`http://localhost:5000/api/pharmacy/bulk-deduct-stock`, {
          medicines: order.medicines,
          hospitalId: sessionData.hospitalId || sessionData.userData?.hospitalId || "City General Hospital"
        });


        setTransactions(prev => [{
          id: order._id,
          patient: order.patientName,
          amount: totalValue,
          method: paymentMethod,
          time: new Date().toLocaleTimeString(),
          items: order.medicines.join(', ')
        }, ...prev]);


        setDailyStats(prev => ({
          revenue: prev.revenue + totalValue,
          sales: prev.sales + 1
        }));

        fetchStock();
        fetchPrescriptions();
        setOpenVerifyModal(false);
        setVerificationCodeInput('');
        setIsOnlinePaid(false);
        alert(`PICKUP COMPLETE via ${paymentMethod}!`);
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
    <Box sx={{ minHeight: '100vh', bgcolor: '#39284d', color: 'white' }}>
      <AppBar position="static" sx={{ bgcolor: 'transparent', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <IconButton color="inherit" sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>MEDI-SWIFT: PHARMACY</Typography>
          <Button color="inherit" onClick={() => { localStorage.clear(); navigate('/'); }} startIcon={<LogoutIcon />}>LOGOUT</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 5 } }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#2e1a47', color: 'white', borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WalletIcon sx={{ color: '#b388ff' }} />
                <Box>
                  <Typography variant="caption">Revenue</Typography>
                  <Typography variant="h5">₹{dailyStats.revenue}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#2e1a47', color: 'white', borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ChartIcon sx={{ color: '#81c784' }} />
                <Box>
                  <Typography variant="caption">Sales</Typography>
                  <Typography variant="h5">{dailyStats.sales}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#2e1a47', color: 'white', borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarningIcon sx={{ color: lowStockAlerts.length > 0 ? '#ff5252' : '#b388ff' }} />
                <Box>
                  <Typography variant="caption">Low Stock</Typography>
                  <Typography variant="h5">{lowStockAlerts.length}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Typography variant="h3" fontWeight="bold">Pharmacy Center</Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.7 }}>Internal Hospital Dispensing Unit</Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3, minWidth: 120 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>PENDING ORDERS</Typography>
                <Typography variant="h4" color="#d199ff">{prescriptions.filter(p => p.status !== 'Ready for Pickup').length.toString().padStart(2, '0')}</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3, minWidth: 120 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>READY FOR PICKUP</Typography>
                <Typography variant="h4" color="#ff80ab">{prescriptions.filter(p => p.status === 'Ready for Pickup').length.toString().padStart(2, '0')}</Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="contained"
              startIcon={<SaleIcon />}
              onClick={() => { setReceipt(null); setOpenSaleModal(true); }}
              sx={{ bgcolor: '#b388ff', color: '#2e1a47', fontWeight: 'bold', px: 3, py: 1.5, borderRadius: 2 }}
            >
              NEW OFFLINE SALE
            </Button>
          </Grid>
        </Grid>

        <Button variant="outlined" startIcon={<SaleIcon />} onClick={() => setOpenAddStockModal(true)} sx={{ mb: 3, borderColor: '#b388ff', color: '#b388ff' }}>
          Add Stock
        </Button>



        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>Hospital Prescriptions</Typography>
        <TableContainer component={Paper} sx={{ bgcolor: '#2e1a47', borderRadius: 3, mb: 5 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Patient</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Medicine Availability</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {prescriptions.map((p) => (
                <TableRow key={p._id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ color: 'white' }}>
                    <Typography fontWeight="bold">{p.patientName}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>ID: {p.patientId || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={p.status === 'Ready for Pickup' ? 'Ready' : 'Pending'}
                      sx={{ bgcolor: p.status === 'Ready for Pickup' ? '#4caf50' : '#ff9800', color: 'white', fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    {p.medicines?.map((med, idx) => (
                      <FormControlLabel
                        key={idx}
                        control={<Checkbox size="small" sx={{ color: 'white' }} defaultChecked />}
                        label={<Typography variant="body2" sx={{ color: 'white' }}>{med}</Typography>}
                      />
                    ))}
                  </TableCell>
                  <TableCell align="right">
                    {p.status === 'Ready for Pickup' ? (
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {/* Resend Button */}
                        <IconButton
                          onClick={() => handleResendCode(p._id)}
                          title="Resend Code to Patient"
                          sx={{ color: '#8cff00', border: '1px solid #59ff00', borderRadius: 2 }}
                        >Resend Code
                          <TimerIcon />
                        </IconButton>

                        {/* Main Pickup Button */}
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<PickupIcon />}
                          onClick={() => {
                            setSelectedOrder(p);
                            setOpenVerifyModal(true);
                          }}
                        >
                          CONFIRM PICKUP
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        variant="contained"
                        disabled={isProcessing || (p.medicines || []).some(m => {
                          const item = stock.find(s => s && s.name && m.toLowerCase().includes(s.name.toLowerCase()));
                          return item && item.qty <= 0;
                        })}
                        sx={{ bgcolor: '#b388ff', color: '#2e1a47' }}
                        onClick={() => handleOpenStockCheck(p)}
                      >
                        {isProcessing ? 'PROCESSING...' : 'VERIFY & NOTIFY'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            <StockIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Inventory
          </Typography>
          <TextField
            size="small"
            placeholder="Search medicines..."
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1, input: { color: 'white' } }}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
          />
        </Box>
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#b388ff', fontWeight: 'bold' }}>Medicine</TableCell>
                <TableCell sx={{ color: '#b388ff', fontWeight: 'bold' }}>Stock</TableCell>
                <TableCell sx={{ color: '#b388ff', fontWeight: 'bold' }}>Price</TableCell>
                <TableCell sx={{ color: '#b388ff', fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>

              {filteredStock.length > 0 ? (
                filteredStock.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell sx={{ color: 'white' }}>{item.name}</TableCell>
                    <TableCell sx={{ color: item.qty <= item.minQty ? '#ff5252' : 'white' }}>
                      {item.qty}
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>₹{item.price}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.qty <= item.minQty ? "Low Stock" : "In Stock"}
                        color={item.qty <= item.minQty ? "error" : "success"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'rgba(255,255,255,0.3)', py: 3 }}>
                    No medicines found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* --- TRANSACTION HISTORY SECTION --- */}
      <Typography variant="h5" sx={{ mt: 6, mb: 2, fontWeight: 'bold' }}>
        <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Recent Transactions
      </Typography>

      <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', mb: 5 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#81c784', fontWeight: 'bold' }}>Time</TableCell>
              <TableCell sx={{ color: '#81c784', fontWeight: 'bold' }}>Patient</TableCell>
              <TableCell sx={{ color: '#81c784', fontWeight: 'bold' }}>Items</TableCell>
              <TableCell sx={{ color: '#81c784', fontWeight: 'bold' }}>Method</TableCell>
              <TableCell sx={{ color: '#81c784', fontWeight: 'bold' }} align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'rgba(255,255,255,0.3)', py: 3 }}>
                  No transactions completed yet today.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ color: 'white', opacity: 0.7 }}>{t.time}</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t.patient}</TableCell>
                  <TableCell sx={{ color: 'white', fontSize: '0.85rem' }}>{t.items}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.method}
                      size="small"
                      sx={{
                        bgcolor: t.method === 'Online' ? '#1a237e' : '#1b5e20',
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#81c784', fontWeight: 'bold' }}>₹{t.amount}</TableCell>
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
            width: 450, bgcolor: 'white', borderRadius: 4, p: 4, boxShadow: 24
          }}>
            <Typography variant="h5" fontWeight="bold" color="#2e1a47" mb={3}>
              Add New Inventory
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Medicine Name"
                fullWidth
                variant="outlined"
                value={newStockForm.name}
                onChange={(e) => setNewStockForm({ ...newStockForm, name: e.target.value })}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Quantity"
                  type="number"
                  fullWidth
                  value={newStockForm.qty}
                  onChange={(e) => setNewStockForm({ ...newStockForm, qty: e.target.value })}
                />
                <TextField
                  label="Price per Unit (₹)"
                  type="number"
                  fullWidth
                  value={newStockForm.price}
                  onChange={(e) => setNewStockForm({ ...newStockForm, price: e.target.value })}
                />
              </Stack>

              <TextField
                label="Category (Tablet, Syrup, etc.)"
                fullWidth
                value={newStockForm.category}
                onChange={(e) => setNewStockForm({ ...newStockForm, category: e.target.value })}
              />

              <TextField
                label="Minimum Alert Quantity"
                type="number"
                fullWidth
                value={newStockForm.minQty}
                helperText="You will get an alert when stock falls below this number"
                onChange={(e) => setNewStockForm({ ...newStockForm, minQty: e.target.value })}
              />

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setOpenAddStockModal(false)}
                  sx={{ color: '#2e1a47', borderColor: '#2e1a47' }}
                >
                  Cancel
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddStock}
                  sx={{ bgcolor: '#2e1a47', '&:hover': { bgcolor: '#39284d' } }}
                >
                  Save Stock
                </Button>
              </Box>
            </Stack>
          </Box>
        </Fade>
      </Modal>

      {/* PATIENT VERIFICATION & PAYMENT MODAL */}
      <Modal open={openVerifyModal} onClose={() => { setOpenVerifyModal(false); setIsOnlinePaid(false); }}>
        <Fade in={openVerifyModal}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 420, bgcolor: 'white', borderRadius: 4, p: 4, textAlign: 'center', boxShadow: 24 }}>
            <Box sx={{ mb: 2 }}>
              <IconButton disabled sx={{ bgcolor: '#2e1a47', color: 'white', mb: 1 }}>
                <VerifyIcon />
              </IconButton>
              <Typography variant="h5" fontWeight="bold" color="black">Finalize Pickup</Typography>
              <Typography variant="body2" color="textSecondary">Order for <b>{selectedOrder?.patientName}</b></Typography>
            </Box>

            <TextField
              label="Enter 6-Digit Code"
              fullWidth
              value={verificationCodeInput}
              onChange={(e) => setVerificationCodeInput(e.target.value)}
              sx={{ my: 2 }}
            />

            <Divider sx={{ my: 1 }}><Chip label="Payment Method" size="small" /></Divider>

            <Stack direction="row" spacing={2} sx={{ my: 2 }}>
              <Button
                fullWidth
                variant={paymentMethod === 'COD' ? "contained" : "outlined"}
                onClick={() => { setPaymentMethod('COD'); setIsOnlinePaid(false); }}
              >
                COD (Cash)
              </Button>
              <Button
                fullWidth
                variant={paymentMethod === 'Online' ? "contained" : "outlined"}
                onClick={() => setPaymentMethod('Online')}
              >
                Online Pay
              </Button>
            </Stack>

            {/* ONLINE PAYMENT & QR CODE SECTION */}
            {paymentMethod === 'Online' && (
              <Box sx={{ p: 2, bgcolor: '#f3e5f5', borderRadius: 3, mb: 2, border: '1px solid #b388ff' }}>
                <Typography variant="subtitle2" color="black">Total: <b>₹{selectedOrder ? calculateTotal(selectedOrder.medicines) : 0}</b></Typography>

                {!isOnlinePaid ? (
                  <Stack alignItems="center" spacing={2} sx={{ mt: 1 }}>
                    {/* Dynamic QR Code Generation */}
                    <Box
                      component="img"
                      sx={{ width: 150, height: 150, p: 1, bgcolor: 'white', borderRadius: 2, border: '1px solid #ddd' }}
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=hospital@bank%26pn=MediSwift%26am=${selectedOrder ? calculateTotal(selectedOrder.medicines) : 0}%26cu=INR`}
                      alt="Payment QR Code"
                    />
                    <Typography variant="caption" color="textSecondary">Scan using Any UPI App</Typography>

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => { setIsOnlinePaid(true); alert("Payment Confirmed!"); }}
                    >
                      Verify Payment
                    </Button>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="green" sx={{ mt: 1, fontWeight: 'bold' }}>✓ PAYMENT RECEIVED</Typography>
                )}
              </Box>
            )}

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!verificationCodeInput || (paymentMethod === 'Online' && !isOnlinePaid)}
              sx={{ py: 1.5, fontWeight: 'bold', bgcolor: '#2e1a47' }}
              onClick={() => {
                handleConfirmPickup(selectedOrder, verificationCodeInput, paymentMethod);
                setOpenVerifyModal(false);
                setVerificationCodeInput('');
                setIsOnlinePaid(false);
              }}
            >
              {paymentMethod === 'Online' && !isOnlinePaid ? "Awaiting Payment..." : "COMPLETE PICKUP"}
            </Button>
          </Box>
        </Fade>
      </Modal>

      {/* OFFLINE SALE MODAL */}
      <Modal open={openSaleModal} onClose={() => setOpenSaleModal(false)}>
        <Fade in={openSaleModal}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 450, bgcolor: 'white', borderRadius: 4, p: 4 }}>
            {!receipt ? (
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight="bold" color="black">New Counter Sale</Typography>
                <TextField label="Patient Name" fullWidth size="small" onChange={(e) => setSaleForm({ ...saleForm, patientName: e.target.value })} />
                <TextField label="Medicines (comma separated)" fullWidth size="small" onChange={(e) => setSaleForm({ ...saleForm, medicines: e.target.value })} />
                <TextField label="Quantity" type="number" fullWidth size="small" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} />
                <Button variant="contained" fullWidth sx={{ py: 1.5 }} onClick={handleOfflineSale}>COMPLETE SALE</Button>
              </Stack>
            ) : (
              <Box textAlign="center" color="black">
                <Typography variant="h6" fontWeight="bold">Sale Receipt</Typography>
                <Box sx={{ border: '1px dashed #ccc', p: 2, my: 2, textAlign: 'left' }}>
                  {receipt.items.map((it, i) => <Typography key={i} variant="body2">{it.name} x{it.qty} - ₹{it.price * it.qty}</Typography>)}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" align="right">Total: ₹{receipt.total}</Typography>
                </Box>
                <Button variant="contained" fullWidth onClick={() => window.print()}>PRINT RECEIPT</Button>
                <Button fullWidth sx={{ mt: 1 }} onClick={() => setReceipt(null)}>CLOSE</Button>
              </Box>
            )}
          </Box>
        </Fade>
      </Modal>

      {/* STOCK CHECK & BILL PREVIEW MODAL */}
      <Modal open={stockDialogOpen} onClose={() => setStockDialogOpen(false)}>
        <Fade in={stockDialogOpen}>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'white', borderRadius: 4, p: 4, color: 'black' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Inventory Verification</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Toggle items to confirm what's available for <b>{selectedOrder?.patientName}</b>.
            </Typography>

            <Stack spacing={1} sx={{ mb: 3 }}>
              {stockItems.map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, bgcolor: item.available ? '#f0fdf4' : '#fff1f2', borderRadius: 2 }}>
                  <FormControlLabel
                    control={<Checkbox checked={item.available} onChange={() => toggleStockItem(idx)} color="success" />}
                    label={<Typography sx={{ textDecoration: item.available ? 'none' : 'line-through' }}>{item.name}</Typography>}
                  />
                  <Typography variant="caption" fontWeight="bold">
                    ₹{stock.find(s => s.name.toLowerCase().trim() === item.name.toLowerCase().trim())?.price || 0}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold">Estimated Bill:</Typography>
              <Typography variant="h6" color="success.main" fontWeight="bold">
                ₹{calculateTotal(stockItems.filter(i => i.available).map(i => i.name))}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button fullWidth variant="outlined" onClick={() => setStockDialogOpen(false)}>Cancel</Button>
              <Button
                fullWidth
                variant="contained"
                disabled={isProcessing}
                sx={{ bgcolor: '#2e1a47' }}
                onClick={handleFinalizeStockAndNotify}
              >
                {isProcessing ? "Processing..." : "Confirm & Send"}
              </Button>
            </Stack>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default PharmacyDashboard;