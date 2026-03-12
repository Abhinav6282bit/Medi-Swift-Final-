import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Button, Stack, TextField, Avatar, Divider, CircularProgress, Paper, Container, Dialog, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdOutlineMedicalInformation } from "react-icons/md";
import { AiOutlineHistory, AiOutlinePrinter, AiOutlineSearch } from "react-icons/ai";
import { BiTestTube } from "react-icons/bi";

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const session = JSON.parse(localStorage.getItem('userSession')) || {};
    const [appointments, setAppointments] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [openPrescription, setOpenPrescription] = useState(false);
    const [openDaySummary, setOpenDaySummary] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [summaryData, setSummaryData] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [treatmentData, setTreatmentData] = useState({ 
        diagnosis: '', 
        medicines: '', 
        labTests: '' 
    });

    const cardStyle = {
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.03)',
        border: '1px solid #f1f5f9',
        p: 3,
    };

    useEffect(() => {
        if (session.role !== 'DOCTOR') navigate('/');
        fetchDoctorQueue();
        const interval = setInterval(fetchDoctorQueue, 20000);
        return () => clearInterval(interval);
    }, []);

const fetchDoctorQueue = async () => {
    try {
        
        const hId = session.userData?.hospitalId || "MS-HOSP-3954"; 
        
        const res = await axios.get(`http://localhost:5000/api/get-hospital-appointments/${hId}`);
        console.log("Data from server:", res.data); 

        const todayStr = new Date().toISOString().split('T')[0];

        const myQueue = res.data.filter(apt => {
            const isMyPatient = apt.doctorId === session.mediId; 
            const isToday = apt.date === todayStr; 
            const isValidStatus = ['Waiting', 'Treating', 'Skipped', 'Completed'].includes(apt.status);
            
            return isMyPatient && isToday && isValidStatus; 
        })
       
            .sort((a, b) => {
               
                return Number(a.token) - Number(b.token);
             
            });
        setAppointments(myQueue);
        setLoading(false);
    } catch (err) { 
        console.error("Fetch Queue Error:", err);
    }
};

    const fetchDateSummary = async (date) => {
    setLoadingSummary(true);
    try {
        const hId = session.hospitalId || "MS-HOSP-3954";
        const res = await axios.get(`http://localhost:5000/api/get-hospital-appointments/${encodeURIComponent(hId)}`);
        
        const filtered = res.data.filter(apt => 
            apt.doctorId === session.mediId && 
            apt.date === date && 
        
            ['Completed', 'Waiting', 'Treating'].includes(apt.status) 
        );
        setSummaryData(filtered);
    } catch (err) {
        console.error("Fetch summary failed", err);
    } finally {
        setLoadingSummary(false);
    }
};

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/update-appointment-status/${appointmentId}`, { 
                status: newStatus 
            });

            if (newStatus === 'Treating') {
    const target = appointments.find(a => a._id === appointmentId);
    
    const pId = target?.patientMediId;
    if (pId && pId !== "N/A") {
        fetchPatientHistory(pId);
    }
    setOpenPrescription(true);
} else {
                fetchDoctorQueue();
            }
        } catch (err) { 
            console.error("Status update failed:", err); 
            alert("Could not update patient status.");
        }
    };

    const handleCompleteConsultation = async (activeId) => {
        try {
            if(!activeId) return alert("No active appointment ID found.");

            const res = await axios.post(`http://localhost:5000/api/complete-session`, {
                appointmentId: activeId,
                ...treatmentData
            });

            if (res.data.success) {
                setOpenPrescription(false);
                setTreatmentData({ diagnosis: '', medicines: '', labTests: '' }); 
                fetchDoctorQueue();
            }
        } catch (err) { 
            console.error("Save failed", err); 
            alert(err.response?.data?.message || "Failed to save consultation.");
        }
    };

    const fetchPatientHistory = async (patientId) => {
        if (!patientId || patientId === "N/A") return;
        setLoadingHistory(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/patient-history/${patientId}`);
            setHistory(res.data);
        } catch (err) { 
            console.error("History fetch failed", err); 
        } finally { 
            setLoadingHistory(false); 
        }
    };

    const handlePrint = () => { window.print(); };

    const activePatient = appointments.find(a => a.status === 'Waiting' || a.status === 'Treating');
    const upcomingQueue = appointments.filter(a => a.status === 'Waiting' || a.status === 'Skipped');
    const completedCount = appointments.filter(a => a.status === 'Completed').length;

    if (loading) return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
            <CircularProgress thickness={4} sx={{ color: '#0ea5e9' }} />
        </Box>
    );

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 6 }}>
            {/* --- TOP NAV BAR --- */}
            <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', mb: 4, py: 1.5 }} className="no-print">
                <Container maxWidth="xl">
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ width: 44, height: 44, bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: '800' }}>
                                {session.firstName?.charAt(0)}
                            </Avatar>
                            <Box>
                                <Typography variant="body1" sx={{ fontWeight: 700 }}>Dr. {session.firstName}</Typography>
                                <Typography variant="caption" color="textSecondary">{session.hospitalName} • {session.speciality}</Typography>
                            </Box>
                        </Stack>
                        <Button variant="outlined" color="error" size="small" onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</Button>
                    </Stack>
                </Container>
            </Box>

            <Container maxWidth="xl" className="no-print">
                <Grid container spacing={3} >
                    {/* 1. ACTIVE PATIENT BANNER */}
                    <Grid item xs={12} md={9}> 
                        <Paper elevation={0} sx={{ ...cardStyle, height: '120px',width:'1100px', borderLeft: '6px solid #0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                            <Stack direction="row" spacing={3} alignItems="center" width={900}>
                                <Box sx={{ p: 3, bgcolor: '#f0f9ff', borderRadius: '12px' }}><MdOutlineMedicalInformation size={32} color="#0ea5e9" /></Box>
                                <Box>
                                    <Typography variant="caption" sx={{ color: '#0ea5e9', fontWeight: 800, textTransform: 'uppercase' }}>Current Consultation</Typography>
                                    {activePatient ? (
                                        <Stack direction="row" spacing={2} alignItems="baseline" sx={{ mt: 0.5 }}>
                                            <Typography variant="h4" sx={{ fontWeight: 700 }}>{activePatient.patientName}</Typography>
                                            <Typography variant="subtitle1" color="textSecondary">Token: <b>#{activePatient.token}</b></Typography>
                                        </Stack>
                                    ) : <Typography variant="h6" color="textSecondary">No active patients</Typography>}
                                </Box>
                            </Stack>
                            {activePatient && (
                                <Stack direction="row" spacing={2}>
                                    <Button onClick={() => handleStatusUpdate(activePatient._id, 'Treating')} variant="contained" sx={{width:'150px',height:'40px'}} color="success">Treat Patient</Button>
                                    <Button onClick={() => handleStatusUpdate(activePatient._id, 'Skipped')} variant="contained" sx={{width:'150px',height:'40px'}} color="warning">Skip</Button>
                                </Stack>
                            )}
                        </Paper>
                    </Grid> 

                    <Grid item xs={12} md={9}>
                        <Stack spacing={3}>
                            <Paper elevation={0} sx={{ ...cardStyle ,bgcolor: '#1e293b', color: '#fff' }}>
                                <Typography variant="subtitle2" sx={{ opacity: 0.7, mb: 2 }}>Today's Progress</Typography>
                                <Stack direction="row" justifyContent="space-between">
                                    <Box><Typography variant="h4" sx={{ fontWeight: 700 }}>{completedCount}</Typography><Typography variant="caption" sx={{ opacity: 0.6 }}>Completed</Typography></Box>
                                    <Box sx={{ textAlign: 'right' }}><Typography variant="h4" sx={{ fontWeight: 700 }}>{upcomingQueue.length}</Typography><Typography variant="caption" sx={{ opacity: 0.6 }}>Waiting</Typography></Box>
                                </Stack>
                                <Button 
                                    fullWidth startIcon={<AiOutlineHistory />} 
                                    onClick={() => { setOpenDaySummary(true); fetchDateSummary(selectedDate); }}
                                    sx={{ mt: 3, bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    View Records & History
                                </Button>
                            </Paper>
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={9}>
                        <Box sx={cardStyle} width={1050}>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>Upcoming Queue</Typography>
                            <Stack spacing={1} width={1050} height={80}>
                                {upcomingQueue.map((apt) => (
                                    <Box key={apt._id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', bgcolor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <Typography variant="body2"><b>#{apt.token}</b> {apt.patientName}</Typography>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            {apt.status === 'Skipped' && <Button size="small" variant="outlined" onClick={() => handleStatusUpdate(apt._id, 'Waiting')}>Recall</Button>}
                                        </Stack>
                                    </Box>
                                ))}
                                {upcomingQueue.length === 0 && <Typography align="center" color="textSecondary">Queue is empty</Typography>}
                            </Stack>
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* --- DATE FILTERED SUMMARY DIALOG (Print View) --- */}
            <Dialog open={openDaySummary} onClose={() => setOpenDaySummary(false)} fullWidth maxWidth="lg">
                <Box sx={{ p: 4 }} id="printable-area">
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" className="no-print" sx={{ mb: 3 }}>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>Medical Records History</Typography>
                            <Typography variant="body2" color="textSecondary">Detailed reports including Diagnosis, Lab Tests, and Medicines</Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                            <Button startIcon={<AiOutlinePrinter />} variant="contained" onClick={handlePrint}>Print Page</Button>
                            <Button variant="outlined" onClick={() => setOpenDaySummary(false)}>Close</Button>
                        </Stack>
                    </Stack>

                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 2 }} className="no-print">
                        <TextField 
                            type="date" size="small" label="Select Report Date" 
                            InputLabelProps={{ shrink: true }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <Button startIcon={<AiOutlineSearch />} variant="contained" onClick={() => fetchDateSummary(selectedDate)}>Fetch Records</Button>
                    </Paper>

                    <Box className="print-only" sx={{ display: 'none', mb: 4 }}>
                        <Typography variant="h4" align="center" sx={{ fontWeight: 800 }}>{session.hospitalName}</Typography>
                        <Typography variant="h6" align="center">Consultation Summary - {selectedDate}</Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography><b>Doctor:</b> Dr. {session.firstName} ({session.speciality})</Typography>
                    </Box>

                    {loadingSummary ? (
                        <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={30} /></Box>
                    ) : (
                        <Stack spacing={2}>
                            {summaryData.length > 0 ? summaryData.map((apt, i) => (
                                <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: '12px', pageBreakInside: 'avoid' }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={2}>
                                            <Typography variant="caption" color="primary" sx={{ fontWeight: 800 }}>TOKEN #{apt.token}</Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{apt.patientName}</Typography>
                                        </Grid>
                                        <Grid item xs={3}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>DIAGNOSIS</Typography>
                                            <Typography variant="body2">{apt.diagnosis}</Typography>
                                        </Grid>
                                        <Grid item xs={3}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#0ea5e9' }}>LAB TESTS</Typography>
                                            <Typography variant="body2" sx={{ color: '#0369a1' }}>{apt.labTests || 'N/A'}</Typography>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b' }}>MEDICINES</Typography>
                                            <Typography variant="body2">{apt.medicines}</Typography>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            )) : (
                                <Typography align="center" sx={{ py: 6, color: '#94a3b8' }}>No records found.</Typography>
                            )}
                        </Stack>
                    )}
                </Box>
            </Dialog>

            {/* --- CONSULTATION POPUP (Active Treatment) --- */}
            <Dialog open={openPrescription} onClose={() => setOpenPrescription(false)} fullWidth maxWidth="sm">
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Clinical Record: {activePatient?.patientName}</Typography>
                    <Divider sx={{ mb: 2, mt: 1 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#0ea5e9' }}>
                        Previous Medical History
                    </Typography>
                    <Box sx={{ mb: 3, maxHeight: '180px', overflowY: 'auto', bgcolor: '#f8fafc', borderRadius: '8px', p: 2, border: '1px solid #e2e8f0' }}>
                        {loadingHistory ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CircularProgress size={16} />
                                <Typography variant="caption">Loading records...</Typography>
                            </Stack>
                        ) : history.length > 0 ? (
                            history.map((rec, i) => (
                                <Box key={i} sx={{ mb: 1.5, pb: 1, borderBottom: i !== history.length - 1 ? '1px dashed #cbd5e1' : 'none' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b' }}>{rec.date}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{rec.diagnosis}</Typography>
                                    
                                    {/* Display Past Lab Tests */}
                                    {rec.labTests && (
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ my: 0.5 }}>
                                            <BiTestTube size={12} color="#0ea5e9" />
                                            <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700 }}>Labs: {rec.labTests}</Typography>
                                        </Stack>
                                    )}
                                    
                                    <Typography variant="caption" sx={{ display: 'block', color: '#475569', fontStyle: 'italic' }}>Rx: {rec.medicines}</Typography>
                                </Box>
                            ))
                        ) : (
                            <Typography variant="caption" color="textSecondary">No previous records found.</Typography>
                        )}
                    </Box>

                    <Stack spacing={2}>
                        <TextField 
                            label="Current Diagnosis" 
                            fullWidth multiline rows={2} 
                            value={treatmentData.diagnosis} 
                            onChange={(e) => setTreatmentData({ ...treatmentData, diagnosis: e.target.value })} 
                        />

                        {/* 🧬 NEW LAB TESTS FIELD */}
                        <TextField 
                            label="Recommended Lab Tests" 
                            fullWidth multiline rows={2} 
                            placeholder="Enter tests (e.g. CBC, Lipid Profile, X-Ray)"
                            value={treatmentData.labTests} 
                            onChange={(e) => setTreatmentData({ ...treatmentData, labTests: e.target.value })}
                            sx={{ 
                                '& .MuiOutlinedInput-root': { bgcolor: '#f0f9ff' },
                                '& .MuiInputLabel-root': { color: '#0369a1' }
                            }}
                        />

                        <TextField 
                            label="Medicines & Dosage" 
                            fullWidth multiline rows={4} 
                            value={treatmentData.medicines} 
                            onChange={(e) => setTreatmentData({ ...treatmentData, medicines: e.target.value })} 
                        />
                        
                        <Button variant="contained" fullWidth onClick={() => handleCompleteConsultation(activePatient?._id)} sx={{ bgcolor: '#0ea5e9', py: 1.5, fontWeight: 700 }}>
                            Submit to Hospital Database
                        </Button>
                    </Stack>
                </Box>
            </Dialog>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; }
                    .MuiDialog-paper { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; width: 100% !important; overflow: visible !important; }
                }
            `}</style>
        </Box>
    );
};

export default DoctorDashboard;       