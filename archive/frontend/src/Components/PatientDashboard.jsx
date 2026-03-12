import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppBar, Box, Toolbar, Typography, Container, Button, Grid, Card,CardContent, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, ListItemButton, Dialog, DialogTitle, DialogContent, TextField, MenuItem, Stack, Divider, CircularProgress, Chip 
} from '@mui/material';
import { Menu as MenuIcon, Dashboard as DashboardIcon, History as HistoryIcon, Person as PersonIcon, Logout as LogoutIcon, Bloodtype as BloodtypeIcon, AddCircleOutline as AddIcon, Science as ScienceIcon, Medication as MedicationIcon, Download as DownloadIcon, LocalPharmacy as PharmacyIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [patientData, setPatientData] = useState({ name: '', mediId: '' });
  const [aptOpen, setAptOpen] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split('T')[0],
    hospitalId: '', hospitalName: '', doctorId: '', doctorName: '', speciality: ''
  });
  const [virtualToken, setVirtualToken] = useState(null);
  const [pharmacyOpen, setPharmacyOpen] = useState(false);
  const [pharmacyStatus, setPharmacyStatus] = useState('Idle');
  const [orderData, setOrderData] = useState({ 
  available: [], 
  orderId12: '', 
  hospitalName: '', 
  paymentStatus: 'Unpaid', 
  _id: '' 
});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [medicalHistory, setMedicalHistory] = useState([]);

const fetchHistory = async () => {
    const session = JSON.parse(localStorage.getItem('userSession'));
    const pId = session?.mediId;
    if (!pId) return;

    try {
        const res = await axios.get(`http://localhost:5000/api/patient-history/${pId}`);
        setMedicalHistory(res.data);
    } catch (err) {
        console.error("History fetch failed", err);
    }
};

useEffect(() => {
    fetchHistory();
}, []);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('userSession'));
    if (savedUser && savedUser.mediId) {
      setPatientData({
        name: `${savedUser.firstName} ${savedUser.lastName}`,
        mediId: savedUser.mediId
      });
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchActivePrescriptions = async () => {
  if (!patientData.mediId) return;
  try {
    const res = await axios.get(`http://localhost:5000/api/get-patient-prescriptions/${patientData.mediId}`);
    const readyOrder = res.data.find(p => p.status === 'Ready for Pickup');
    
    if (readyOrder) {
  setPharmacyStatus('Ready');
  setOrderData({
    _id: readyOrder._id,
    orderId12: readyOrder.verificationCode,
    available: Array.isArray(readyOrder.medicines) ? readyOrder.medicines : [readyOrder.medicines],
    hospitalName: readyOrder.hospitalName || "Selected Hospital" ,
    paymentStatus: readyOrder.isPaid ? 'Paid' : 'Unpaid'
    });
    } else {
      setPharmacyStatus('Idle');
    }
  } catch (err) { 
    console.error("Pharmacy sync error", err); 
  }
};

    if (patientData.mediId) {
      fetchActivePrescriptions();
      const interval = setInterval(fetchActivePrescriptions, 15000);
      return () => clearInterval(interval);
    }
  }, [patientData.mediId]);

  const handleConfirmPayment = async (method) => {
  try {
    const res = await axios.put('http://localhost:5000/api/patient/confirm-payment-intent', {
      orderId: orderData._id,
      method: method
    });
    if (res.data.success) {
      setOrderData({ ...orderData, paymentStatus: method === 'Online' ? 'Paid' : 'Pending-COD' });
    }
  } catch (err) {
    alert("Payment selection failed.");
  }
};

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    try {
      const encodedId = encodeURIComponent(patientData.mediId);
      const pName = patientData.name || "";
      const encodedName = encodeURIComponent(pName);
      const res = await axios.get(`http://localhost:5000/api/patient-history/${encodedId}?name=${encodedName}`);
      setMedicalHistory(res.data);
    } catch (err) { 
      console.error("Error fetching medical history", err); 
    }
  };

  const handleDownloadReport = (record) => {
  if (record.reportUrl) {
    window.open(record.reportUrl, '_blank');
  } else {
    console.log("Generating report for:", record);
    alert(`Opening Verified Report for: ${record.labTests}\nResults: ${record.labResultSummary}`);
  }
};
  const handleOpenApt = async () => {
    setAptOpen(true);
    setVirtualToken(null);
    try {
      const res = await axios.get('http://localhost:5000/api/get-all-hospitals');
      setHospitals(res.data);
    } catch (err) { console.error("Error fetching hospitals"); }
  };

  const handleHospitalChange = async (hId, hName) => {
    setBookingData({ ...bookingData, hospitalId: hId, hospitalName: hName, doctorId: '', doctorName: '' });
    try {
      const res = await axios.get(`http://localhost:5000/api/get-records?vault=${hId}`);
      setDoctors(res.data.filter(r => r.category === 'Doctors'));
    } catch (err) { console.error("Error fetching doctors"); }
  };

  const handleFinalSubmit = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/book-appointment', { 
        ...bookingData, 
        patientId: patientData.mediId, 
        patientName: patientData.name 
      });
      if (res.data.success) setVirtualToken(res.data.appointment);
    } catch (err) { alert("Booking failed."); }
  };

  const toggleDrawer = (newOpen) => () => setOpen(newOpen);
  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/patient-dashboard' },
    { text: 'Blood Donation', icon: <BloodtypeIcon />, path: '/blood-donation' },
    { text: 'Medical History', icon: <HistoryIcon />, onClick: handleOpenHistory },
    { text: 'My Profile', icon: <PersonIcon />, path: '/profile' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url("https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&q=80&w=2000")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      <AppBar position="static" sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
        <Toolbar>
          <IconButton size="large" edge="start" color="inherit" sx={{ mr: 2 }} onClick={toggleDrawer(true)}><MenuIcon /></IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>Medi-Swift</Typography>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, mr: 3 }}>
            <Typography variant="caption" sx={{ border: '1px solid rgba(255,255,255,0.5)', px: 2, py: 1, borderRadius: 5 }}>
              Patient ID: <strong>{patientData.mediId}</strong>
            </Typography>
          </Box>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Drawer open={open} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 280, bgcolor: '#ffffff', height: '100%' }} role="presentation" onClick={toggleDrawer(false)}>
          <Box sx={{ p: 3, bgcolor: '#328da3', color: 'white', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{patientData.name}</Typography>
            <Typography variant="body2">{patientData.mediId}</Typography>
          </Box>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={item.onClick ? item.onClick : () => navigate(item.path)}>
                  <ListItemIcon sx={{ color: '#328da3' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: { xs: 2, md: 6 }, color: 'white' }}>
        <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold', fontSize: { xs: '2rem', md: '3rem' } }}>Welcome {patientData.name || 'User'}!</Typography>
        <Typography variant="h6" sx={{ mb: 5, opacity: 0.8, fontWeight: 300 }}>Your health records and appointments are up to date.</Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card onClick={handleOpenApt} sx={{ background: 'rgba(183, 183, 183, 0.4)', backdropFilter: 'blur(15px)', color: 'white', borderRadius: 5, border: '2px solid #cfcfcf', cursor: 'pointer', transition: '0.3s', '&:hover': { transform: 'scale(1.02)' } }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <AddIcon sx={{ fontSize: 50, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Book Appointment</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Select Hospital & Get Live Token</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(15px)', color: 'white', borderRadius: 5 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="overline">Upcoming Appointments</Typography>
                <Typography variant="h3" sx={{ fontWeight: 'bold', my: 1, color: "#60c7e9" }}>{virtualToken ? '01' : '00'}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{virtualToken ? `Token #${virtualToken.token} Active` : 'No active sessions'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card onClick={handleOpenHistory} sx={{ background: 'rgba(50, 141, 163, 0.4)', backdropFilter: 'blur(15px)', color: 'white', borderRadius: 5, border: '2px solid #328da3', cursor: 'pointer' }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <HistoryIcon sx={{ fontSize: 50, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Medical History</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>View Diagnosis & Lab Results</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
  <Card 
    onClick={() => setPharmacyOpen(true)} 
    sx={{ 
      background: pharmacyStatus === 'Ready' 
        ? 'linear-gradient(45deg, #2e7d32, #4caf50)' 
        : 'rgba(255, 255, 255, 0.12)', 
      backdropFilter: 'blur(15px)', 
      color: 'white', 
      borderRadius: 5, 
      cursor: 'pointer',
      transition: '0.3s',
      '&:hover': { transform: 'scale(1.02)' } 
    }}
  >
    <CardContent sx={{ p: 4, textAlign: 'center' }}>
      <PharmacyIcon sx={{ fontSize: 50, mb: 1, color: pharmacyStatus === 'Ready' ? 'white' : '#ff9800' }} />
      <Typography variant="h5" fontWeight="bold">Prescriptions</Typography>
      
      {pharmacyStatus === 'Ready' ? (
        <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }}>
          <Typography variant="subtitle2">✅ Ready for Pickup</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Code: {orderData.orderId12}</Typography>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ opacity: 0.9 }}>View status & pickup codes</Typography>
      )}
    </CardContent>
  </Card>
</Grid>
        </Grid>
      </Box>

      {/* EHR DIALOG */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f1f5f9' }}>
          <HistoryIcon color="primary" /> Electronic Health Record (EHR)
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: '#f8fafc' }}>
          {medicalHistory.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: 'gray' }}>No treatment records found for this ID.</Typography>
          ) : (
            <Stack spacing={3}>
              {medicalHistory.map((record, index) => (
                <Card key={index} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                  <Box sx={{ bgcolor: '#328da3', p: 1.5, color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" fontWeight="bold">Visit Date: {record.date}</Typography>
                    <Typography variant="subtitle2">Dr. {record.doctorName}</Typography>
                  </Box>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>Clinical Diagnosis</Typography>
                        <Typography variant="body1" sx={{ mt: 0.5, mb: 2, fontWeight: 500 }}>{record.diagnosis}</Typography>
                        <Divider />
                      </Grid>

                      {/* --- UPDATED LAB INVESTIGATIONS SECTION --- */}
                      <Grid item xs={12} md={6}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1 }}>
                          <ScienceIcon sx={{ color: '#0ea5e9', fontSize: 20 }} />
                          <Typography variant="subtitle2" fontWeight="bold">Lab Investigations</Typography>
                        </Stack>
                        <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #e0f2fe' }}>
                          <Typography variant="body2" sx={{ color: '#0369a1', fontWeight: 'bold', mb: 0.5 }}>
                            Tests: {record.labTests || "None Requested"}
                          </Typography>
                          
                          {/* Live Result Summary from Lab Dashboard */}
                          <Typography variant="body2" sx={{ color: '#334155', mb: 1, minHeight: '1.2em' }}>
                            <strong>Result:</strong> {record.labResultSummary || "Waiting for lab processing..."}
                          </Typography>

                          {/* Dynamic Status Chip */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Chip 
                              label={record.labStatus || 'Pending'} 
                              size="small" 
                              sx={{ 
                                height: 20, 
                                fontSize: '0.65rem', 
                                bgcolor: record.labStatus === 'Completed' ? '#dcfce7' : '#fef9c3', 
                                color: record.labStatus === 'Completed' ? '#166534' : '#854d0e',
                                fontWeight: 'bold'
                              }} 
                            />
                           {record.labStatus === 'Completed' && (
  <Stack direction="row" spacing={1}>
    <Button 
      variant="contained" 
      size="small" 
      startIcon={<DownloadIcon />} 
      onClick={() => handleDownloadReport(record)}
      sx={{ 
        fontSize: '0.7rem', 
        bgcolor: '#328da3',
        '&:hover': { bgcolor: '#2a768a' } 
      }}
    >
      Open Report
    </Button>
  </Stack>
)}
                          </Box>
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1 }}>
                          <MedicationIcon sx={{ color: '#059669', fontSize: 20 }} />
                          <Typography variant="subtitle2" fontWeight="bold">Prescribed Medication</Typography>
                        </Stack>
                        <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2 }}>
                          <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 500 }}>{record.medicines || "No medication prescribed."}</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <Box sx={{ p: 2, textAlign: 'right', bgcolor: '#f1f5f9' }}>
          <Button variant="contained" onClick={() => setHistoryOpen(false)} sx={{ bgcolor: '#328da3' }}>Close Records</Button>
        </Box>
      </Dialog>

      {/* PHARMACY DIALOG */}
<Dialog open={pharmacyOpen} onClose={() => setPharmacyOpen(false)} fullWidth maxWidth="xs">
  <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f8f9fa' }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <PharmacyIcon color="warning" />
      <Typography variant="h6">Pharmacy Verification</Typography>
    </Stack>
  </DialogTitle>
  <DialogContent dividers>
    {pharmacyStatus === 'Idle' ? (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={24} sx={{ mb: 2 }} />
        <Typography variant="body1" color="textSecondary">
          Processing prescription...
        </Typography>
      </Box>
    ) : orderData.paymentStatus === 'Unpaid' ? (
      <Box sx={{ py: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Select Payment Method
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Medicines are ready at {orderData.hospitalName}. Please select how you wish to pay to unlock your pickup code.
        </Typography>
        <Stack spacing={2}>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<MedicationIcon />} 
            onClick={() => handleConfirmPayment('COD')}
            sx={{ py: 1.5, borderRadius: 3 }}
          >
            Pay at Counter (COD)
          </Button>
          <Button 
            variant="contained" 
            fullWidth 
            onClick={() => handleConfirmPayment('Online')}
            sx={{ py: 1.5, borderRadius: 3, bgcolor: '#328da3' }}
          >
            Pay Online Now
          </Button>
        </Stack>
      </Box>
    ) : (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Show this code to the Pharmacist at:
          <br />
          <strong>{orderData.hospitalName}</strong>
        </Typography>
        
        <Box sx={{ 
          my: 3, p: 3, 
          border: '3px dashed #4caf50', 
          borderRadius: 4, 
          bgcolor: '#f1f8e9',
          letterSpacing: 8
        }}>
          <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
            {orderData.orderId12}
          </Typography>
        </Box>

        <Typography variant="caption" color={orderData.paymentStatus === 'Paid' ? "success.main" : "error"} sx={{ display: 'block', mb: 2, fontWeight: 'bold' }}>
          {orderData.paymentStatus === 'Paid' ? "✅ PAYMENT VERIFIED" : "⚠️ PAYMENT PENDING AT COUNTER"}
        </Typography>

        <Divider sx={{ mb: 2 }} />
        
        <Typography variant="subtitle2" align="left" fontWeight="bold">Medicines Prepared:</Typography>
        <Typography variant="body2" align="left" sx={{ color: 'text.secondary' }}>
          {orderData.available.join(', ')}
        </Typography>

        <Button fullWidth variant="contained" sx={{ mt: 3, bgcolor: '#328da3' }} onClick={() => setPharmacyOpen(false)}>
          Close
        </Button>
      </Box>
    )}
  </DialogContent>
</Dialog>

      {/* APPOINTMENT DIALOG */}
      <Dialog open={aptOpen} onClose={() => setAptOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Medi-Swift Live Token</DialogTitle>
        <DialogContent dividers>
          {!virtualToken ? (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField label="Date" type="date" fullWidth value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
              <TextField select label="Hospital" fullWidth value={bookingData.hospitalId} onChange={(e) => { const h = hospitals.find(h => h.mediId === e.target.value); handleHospitalChange(h.mediId, h.hospitalName); }}>
                {hospitals.map(h => <MenuItem key={h.mediId} value={h.mediId}>{h.hospitalName}</MenuItem>)}
              </TextField>
              <TextField select label="Doctor" fullWidth disabled={!bookingData.hospitalId} value={bookingData.doctorId} onChange={(e) => { const d = doctors.find(doc => doc.mediId === e.target.value); setBookingData({ ...bookingData, doctorId: d.mediId, doctorName: d.name, speciality: d.detail }); }}>
                {doctors.map(d => <MenuItem key={d.mediId} value={d.mediId}>{d.name} ({d.detail})</MenuItem>)}
              </TextField>
              <Button variant="contained" fullWidth sx={{ bgcolor: '#328da3', py: 1.5 }} onClick={handleFinalSubmit}>Get Token</Button>
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h1" fontWeight="bold" color="#2e7d32">#{virtualToken.token}</Typography>
              <Typography variant="body2" color="textSecondary">{bookingData.hospitalName}</Typography>
              <Button sx={{ mt: 3 }} fullWidth variant="outlined" onClick={() => setAptOpen(false)}>Back</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PatientDashboard;