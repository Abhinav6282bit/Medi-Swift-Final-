import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Card, Grid, Button, IconButton, Drawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Divider, Paper, TextField,
    Stack, MenuItem, AppBar, Toolbar, Avatar, Dialog, DialogTitle,
    DialogContent, DialogActions, Badge, Tooltip, Popover, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Menu,
    useMediaQuery, useTheme
} from '@mui/material';
import {
    Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon,
    LocalHospital as HospitalIcon, AddCircleOutline as AddIcon,
    Logout as LogoutIcon, Bed as BedIcon, Opacity as OxygenIcon,
    ReceiptLong as BillingIcon, Assignment as PatientIcon, Event as AppointmentIcon,
    VerifiedUser as SecurityIcon, Search as SearchIcon, Delete as DeleteIcon,
    AccountCircle as AccountIcon, PhotoCamera as PhotoIcon,
    Notifications as NotificationsIcon, Bloodtype as BloodIcon,
    Edit as EditIcon, CheckCircle as CheckCircleIcon, Block as BlockIcon,
    MoreVert as MoreVertIcon, Close as CloseIcon, Print as PrintIcon
} from '@mui/icons-material';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { useNavigate, useLocation } from 'react-router-dom';

const HospitalDashboard = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('Overview');
    const [isAdminVerified, setIsAdminVerified] = useState(false);
    const [securityOpen, setSecurityOpen] = useState(false);
    const [adminPass, setAdminPass] = useState('');
    const [staff, setStaff] = useState([]);
    const [aptOpen, setAptOpen] = useState(false);
    const [isRegistered, setIsRegistered] = useState(null);
    const [searchId, setSearchId] = useState('');
    const [foundPatient, setFoundPatient] = useState(null);
    const [bookingSpeciality, setBookingSpeciality] = useState('');
    const [formData, setFormData] = useState({ name: '', detail: '', contact: '', category: 'Doctor', password: '', email: '' });
    const [virtualToken, setVirtualToken] = useState(null);
    const [todayAptCount, setTodayAptCount] = useState(0);
    const [queue, setQueue] = useState([]);
    const [callingToken, setCallingToken] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [beds, setBeds] = useState([]);
    const [bedModalOpen, setBedModalOpen] = useState(false);
    const [selectedBed, setSelectedBed] = useState(null);
    const [bedPatientName, setBedPatientName] = useState('');
    const [bedPatientId, setBedPatientId] = useState('');
    const [bedAllocateType, setBedAllocateType] = useState('Occupied');
    const [allotmentDialogOpen, setAllotmentDialogOpen] = useState(false);
    const [activeRequest, setActiveRequest] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [donors, setDonors] = useState([]);
    const [bloodRequests, setBloodRequests] = useState([]);
    const [searchBloodGroup, setSearchBloodGroup] = useState('');
    const [liveQueueFilterDocId, setLiveQueueFilterDocId] = useState('ALL');
    const [treatmentFilterDocId, setTreatmentFilterDocId] = useState('ALL');
    const [expandedTreatmentId, setExpandedTreatmentId] = useState(null);
    const [allApts, setAllApts] = useState([]);
    const [adminSubView, setAdminSubView] = useState('Register Personnel');
    const [infoTabFilter, setInfoTabFilter] = useState('ALL');
    const [editingPersonnel, setEditingPersonnel] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [capacities, setCapacities] = useState({ General: 0, ICU: 0, Maternity: 0 });
    const [customWards, setCustomWards] = useState([]);
    const [newWardName, setNewWardName] = useState('');
    const [newWardCount, setNewWardCount] = useState(0);
    const [wardMenuAnchor, setWardMenuAnchor] = useState(null);
    const [wardMenuTarget, setWardMenuTarget] = useState(null); // { name, isCustom }
    
    // IPD Billing State
    const [billingAptId, setBillingAptId] = useState('');
    const [bedRate, setBedRate] = useState('');
    const [daysAdmitted, setDaysAdmitted] = useState(1);
    const [billModalOpen, setBillModalOpen] = useState(false);
    const [financeTab, setFinanceTab] = useState('Pending Bills');
    const [selectedBedApt, setSelectedBedApt] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

    const lastAptCount = React.useRef(-1);

    const sessionData = JSON.parse(localStorage.getItem('user')) || {};
    const hospitalName = sessionData.hospitalName || "Medical Center";
    const hospitalId = sessionData.mediId || "MS-HOSP-XXXX";
    const dbSecurityKey = sessionData.securityKey || 'Abhi@123';

    const fetchStaff = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/hospital-staff?hospitalMediId=${hospitalId}`);
            setStaff(res.data);
        } catch (err) { console.error("Error fetching staff", err); }
    };

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/hospital/notifications/${hospitalId}`);
            if (res.data.success) {
                const backendNotifs = res.data.notifications.map(n => ({
                    ...n,
                    msg: n.message,
                    time: new Date(n.createdAt),
                    source: 'backend'
                }));
                setNotifications(backendNotifs);
                setUnreadCount(res.data.unreadCount);
            }
        } catch (err) {
            console.error('Notification fetch error:', err);
        }
    };

    const fetchBeds = async () => {
        try {
            console.log("Fetching beds for hospital:", hospitalId);
            const res = await axios.get(`${API_BASE_URL}/api/hospital/beds/${hospitalId}`);
            console.log("Beds API Response:", res.data);
            if (res.data.success) {
                setBeds(res.data.beds);
                if (res.data.config) {
                    setCapacities({
                        General: res.data.config.general,
                        ICU: res.data.config.icu,
                        Maternity: res.data.config.maternity
                    });
                    setCustomWards(res.data.config.customWards);
                }
            }
        } catch (err) { console.error("Error fetching beds", err); }
    };

    const fetchTodayCount = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get-hospital-appointments/${hospitalId}`);
            const today = new Date().toISOString().split('T')[0];
            const count = res.data.filter(apt => {
                const aptDate = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
                return aptDate === today;
            }).length;
            setTodayAptCount(count);
        } catch (err) { console.error("Error fetching today's count", err); }
    };

    const fetchDonors = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/blood-donation/donors`);
            if (res.data.success) {
                setDonors(res.data.donors);
            }
        } catch (err) { console.error("Error fetching donors", err); }
    };

    const fetchBloodRequests = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/blood-request/hospital/${hospitalId}`);
            if (res.data.success) {
                setBloodRequests(res.data.requests);
            }
        } catch (err) { console.error("Error fetching blood requests", err); }
    };

    const handleMarkBloodReceived = async (requestId) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/blood-request/mark-received/${requestId}`);
            if (res.data.success) {
                alert("Blood marked as received! Patient has been notified.");
                fetchBloodRequests();
            }
        } catch (err) {
            alert("Failed to mark blood as received.");
        }
    };

    const fetchLiveQueue = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await axios.get(`${API_BASE_URL}/api/get-hospital-appointments/${hospitalId}`);

            // Filter for today
            const todayApts = res.data.filter(apt => {
                const aptDate = apt.date ? new Date(apt.date).toISOString().split('T')[0] : '';
                return aptDate === today;
            });

            // Group by doctor
            const grouped = {};
            todayApts.forEach(apt => {
                if (!grouped[apt.doctorId]) {
                    grouped[apt.doctorId] = {
                        doctorName: apt.doctorName,
                        speciality: apt.speciality,
                        appointments: []
                    };
                }
                grouped[apt.doctorId].appointments.push(apt);
            });

            // Sort appointments in each group by token
            Object.keys(grouped).forEach(docId => {
                grouped[docId].appointments.sort((a, b) => Number(a.token) - Number(b.token));
            });

            setQueue(grouped);
        } catch (err) { console.error("Error fetching queue", err); }
    };

    const fetchAllAppointments = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get-hospital-appointments/${hospitalId}`);
            setAllApts(res.data);
        } catch (err) { console.error("Error fetching all appointments", err); }
    };

    const location = useLocation();

    // Removed useEffect that was deriving capacities from beds array to prevent overwrites

    const handleSyncCapacity = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/hospital/update-capacity`, {
                hospitalMediId: hospitalId,
                general: capacities.General,
                icu: capacities.ICU,
                maternity: capacities.Maternity,
                customWards: customWards
            });
            if (res.data.success) {
                alert("✅ Capacity synchronized successfully!");
                fetchBeds();
            }
        } catch (err) {
            alert("❌ Failed to sync capacity: " + (err.response?.data?.message || err.message));
        }
    };

    useEffect(() => {
        if (!sessionData.mediId) {
            navigate('/');
            return;
        }
        fetchStaff();
        fetchNotifications();
        fetchTodayCount();
        fetchBeds();
        fetchAllAppointments(); // Always fetch — needed for Finance/Billing badge

        if (view === 'LiveQueue') fetchLiveQueue();
        if (view === 'BloodBank') {
            fetchDonors();
            fetchBloodRequests();
        }

        const intervalId = setInterval(() => {
            fetchNotifications();
            fetchTodayCount();
            fetchAllAppointments();
            if (view === 'LiveQueue') fetchLiveQueue();
            if (view === 'BloodBank') {
                fetchDonors();
                fetchBloodRequests();
            }
        }, 30000);

        if (location.state?.newId) {
            setSearchId(location.state.newId);
            setIsRegistered('YES');
            setAptOpen(true);
        }

        return () => clearInterval(intervalId);
    }, [location.state, view]);

    const handleVerifyAdmin = () => {
        if (adminPass === dbSecurityKey) {
            setIsAdminVerified(true);
            setSecurityOpen(false);
            setView('Admin');
            setAdminPass('');
        } else {
            alert("❌ Incorrect Admin Security Key");
        }
    };

    const handleSearchPatient = async () => {
        if (!searchId) return alert("Please enter a Medi-ID");
        try {
            const res = await axios.get(`${API_BASE_URL}/api/search-patient/${searchId}`);
            if (res.data && res.data.success) {
                setFoundPatient(res.data.patient);
            }
        } catch (err) {
            setFoundPatient(null);
            alert("Patient not found in Medi-Swift Database.");
        }
    };

    const handleBookAppointment = async () => {
        if (!foundPatient) return alert("Please search and select a patient first.");
        const availableDoc = staff.find(s =>
            s.role === 'DOCTOR' &&
            s.specialization?.toLowerCase().includes(bookingSpeciality?.toLowerCase())
        );

        if (!availableDoc) return alert(`No Doctor found for ${bookingSpeciality}`);

        const payload = {
            hospitalId: hospitalId,
            patientId: foundPatient.mediId,
            patientName: `${foundPatient.firstName} ${foundPatient.lastName}`,
            doctorId: availableDoc.mediId,
            doctorName: availableDoc.firstName,
            speciality: bookingSpeciality,
            date: new Date().toISOString().split('T')[0]
        };
        try {
            const res = await axios.post(`${API_BASE_URL}/api/book-appointment`, payload);
            if (res.data.success) {
                setVirtualToken(res.data.appointment);
                fetchTodayCount();
            }
        } catch (err) {
            alert("Booking failed at server.");
        }
    };

    const handleDeleteNotification = async (notifId) => {
        try {
            const res = await axios.delete(`${API_BASE_URL}/api/notifications/${notifId}`);
            if (res.data.success) {
                fetchNotifications();
            }
        } catch (err) {
            console.error("Error deleting notification:", err);
            // Fallback for UI if API fails
            setNotifications(notifications.filter(n => n._id !== notifId));
        }
    };

    const handleClearAllNotifications = async () => {
        if (!window.confirm("Clear all notifications?")) return;
        try {
            const res = await axios.delete(`${API_BASE_URL}/api/notifications/clear-all/${hospitalId}`);
            if (res.data.success) {
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (err) {
            console.error("Error clearing notifications:", err);
        }
    };



    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleOnboardPersonnel = async () => {
        if (!formData.name || !formData.password) {
            return alert("Please fill Name and set a Password.");
        }

        try {
            const form = new FormData();
            const role = formData.category.toUpperCase();
            form.append('role', role);

            // Sanitization: Remove existing "Dr." prefix if it's a doctor to avoid double-prefixing
            let sanitizedName = formData.name.trim();
            if (role === 'DOCTOR') {
                sanitizedName = sanitizedName.replace(/^dr\.?\s+/i, "");
            }
            form.append('firstName', sanitizedName);

            form.append('specialization', formData.detail);
            form.append('phone', formData.contact);
            form.append('email', formData.email);
            form.append('password', formData.password);
            form.append('hospitalName', hospitalName);
            form.append('hospitalMediId', hospitalId);
            if (selectedFile) form.append('photo', selectedFile);

            const res = await axios.post(`${API_BASE_URL}/api/hospital/add-personnel`, form);

            if (res.data.success) {
                alert(`✅ Success!\nPersonnel registered.\nMedi-ID: ${res.data.generatedId}`);
                setFormData({ name: '', detail: '', contact: '', category: 'Doctor', password: '', email: '' });
                setSelectedFile(null);
                setPreviewUrl(null);
                fetchStaff();
            }
        } catch (err) {
            alert("Error registering personnel.");
        }
    };

    const handleUpdatePersonnel = async (e) => {
        e.preventDefault();
        try {
            const formDataToSubmit = new FormData();
            formDataToSubmit.append('hospitalMediId', hospitalId);

            let sanitizedName = editingPersonnel.firstName.trim();
            if (editingPersonnel.role === 'DOCTOR') {
                sanitizedName = sanitizedName.replace(/^dr\.?\s+/i, "");
            }
            formDataToSubmit.append('firstName', sanitizedName);

            formDataToSubmit.append('email', editingPersonnel.email);
            formDataToSubmit.append('phone', editingPersonnel.phone);
            formDataToSubmit.append('specialization', editingPersonnel.specialization);
            formDataToSubmit.append('role', editingPersonnel.role);
            if (selectedFile) formDataToSubmit.append('photo', selectedFile);

            const res = await axios.put(`${API_BASE_URL}/api/hospital/update-personnel/${editingPersonnel.mediId}`, formDataToSubmit);
            if (res.data.success) {
                alert("Personnel updated successfully");
                setEditModalOpen(false);
                fetchStaff();
            }
        } catch (err) { alert("Update failed."); }
    };

    const handleTogglePersonnelStatus = async (mediId) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/hospital/toggle-status/${mediId}`, { hospitalMediId: hospitalId });
            if (res.data.success) {
                alert(res.data.message);
                fetchStaff();
            }
        } catch (err) { alert("Action failed."); }
    };

    const handleRemovePersonnel = async (mediId) => {
        if (!window.confirm("Are you sure you want to remove this personnel?")) return;
        try {
            const res = await axios.delete(`${API_BASE_URL}/api/admin/remove-personnel/${mediId}?hospitalMediId=${hospitalId}`);
            if (res.data.success) {
                alert("Personnel removed successfully");
                fetchStaff();
            }
        } catch (err) { alert("Removal failed."); }
    };

    const handleBedAction = async () => {
        if (!selectedBed) return;

        const isAdmitting = selectedBed.status === 'Available';
        if (isAdmitting && !bedPatientName.trim()) return alert("Please enter Patient Name");

        try {
            if (isAdmitting) {
                const payload = {
                    bedId: selectedBed._id,
                    status: bedAllocateType,
                    patientName: bedPatientName,
                    patientId: bedPatientId
                };
                const res = await axios.put(`${API_BASE_URL}/api/hospital/beds/update`, payload);
                if (res.data.success) {
                    setBedModalOpen(false);
                    setBedPatientName('');
                    setBedPatientId('');
                    setBedAllocateType('Occupied');
                    fetchBeds();
                }
            } else {
                // Discharge Flow: Move to billing instead of freeing bed
                if (!selectedBedApt) {
                    if (window.confirm("Active medical record not linked to this bed. Mark as Available immediately?")) {
                        const payload = {
                            bedId: selectedBed._id,
                            status: 'Available',
                            patientName: null,
                            patientId: null
                        };
                        const res = await axios.put(`${API_BASE_URL}/api/hospital/beds/update`, payload);
                        if (res.data.success) {
                            setBedModalOpen(false);
                            fetchBeds();
                        }
                    }
                    return;
                }
                
                const res = await axios.post(`${API_BASE_URL}/api/discharge/request/${selectedBedApt._id}`);
                if (res.data.success) {
                    alert("Discharge initiated! Patient moved to Finance section.");
                    setBedModalOpen(false);
                    fetchAllAppointments();
                    fetchBeds();
                }
            }
        } catch (err) {
            alert("Action failed: " + (err.response?.data?.message || err.message));
        }
    };

    const handleGenerateBill = async () => {
        if (!bedRate) return alert("Please enter Bed Rate per day");
        const totalAmount = Number(bedRate) * Number(daysAdmitted);
        
        try {
            const res = await axios.post(`${API_BASE_URL}/api/discharge/generate-bill/${billingAptId}`, { totalAmount });
            if (res.data.success) {
                alert(`Bill generated successfully for ₹${totalAmount}. Patient notified.`);
                setBillModalOpen(false);
                setBedRate('');
                fetchAllAppointments(); // Refresh the data
            }
        } catch (err) {
            alert("Error generating bill: " + (err.response?.data?.message || err.message));
        }
    };

    const handleConfirmCOD = async (aptId) => {
        if (!window.confirm("Confirm that you have received the COD payment? This will discharge the patient and free the bed.")) return;
        try {
            const res = await axios.post(`${API_BASE_URL}/api/discharge/confirm-cod/${aptId}`);
            if (res.data.success) {
                alert("Payment confirmed and patient discharged successfully.");
                fetchAllAppointments();
                fetchBeds(); // Refresh beds since one is freed
            }
        } catch (err) {
            alert("Error confirming COD: " + (err.response?.data?.message || err.message));
        }
    };

    const handlePrintReceipt = (apt) => {
        const printWindow = window.open('', '_blank');
        const content = `
            <html>
                <head>
                    <title>Medical Receipt - ${apt.patientName}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
                        .hospital-name { font-size: 28px; font-weight: bold; color: #6366f1; margin: 0; }
                        .receipt-title { font-size: 18px; color: #64748b; margin-top: 5px; }
                        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                        .detail-item { margin-bottom: 10px; }
                        .label { font-weight: bold; color: #64748b; font-size: 12px; text-transform: uppercase; }
                        .value { font-size: 16px; margin-top: 2px; }
                        .bill-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px; }
                        .bill-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
                        .total-row { display: flex; justify-content: space-between; padding: 20px 0; font-size: 20px; font-weight: bold; color: #10b981; }
                        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                        @media print {
                            body { padding: 20px; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <p class="hospital-name">${hospitalName.toUpperCase()}</p>
                        <p class="receipt-title">IPD DISCHARGE & BILLING RECEIPT</p>
                    </div>
                    
                    <div class="details-grid">
                        <div class="detail-item">
                            <div class="label">Patient Name</div>
                            <div class="value">${apt.patientName}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">Token / Medi-ID</div>
                            <div class="value">#${apt.token} / ${apt.patientId}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">Admission Date</div>
                            <div class="value">${new Date(apt.admissionDate).toLocaleDateString()}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">Discharge Date</div>
                            <div class="value">${new Date(apt.dischargeDate || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">Ward & Bed</div>
                            <div class="value">${apt.assignedWard} - Bed ${apt.assignedBed}</div>
                        </div>
                        <div class="detail-item">
                            <div class="label">Payment Status</div>
                            <div class="value" style="color: #10b981; font-weight: bold;">PAID</div>
                        </div>
                    </div>

                    <div class="bill-section">
                        <div class="bill-row">
                            <span>Hospital Stay & Treatment Charges</span>
                            <span>₹${apt.ipdBillAmount.toLocaleString()}</span>
                        </div>
                        <div class="total-row">
                            <span>Total Amount Paid</span>
                            <span>₹${apt.ipdBillAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>This is a computer-generated receipt and does not require a physical signature.</p>
                        <p>Thank you for choosing ${hospitalName}. We wish you a speedy recovery!</p>
                    </div>

                    <script>
                        window.onload = () => {
                            window.print();
                            // Optional: window.close(); 
                        };
                    </script>
                </body>
            </html>
        `;
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const pendingDischargeCount = allApts.filter(apt => apt.dischargeRequested && apt.ipdBillStatus === 'None').length;

    const menuItems = [
        { text: 'Overview', icon: <DashboardIcon />, view: 'Overview' },
        { text: 'Live Queue', icon: <PeopleIcon />, view: 'LiveQueue' },
        { text: 'Treatment Database', icon: <PatientIcon />, view: 'TreatmentDB' },
        { text: 'Beds Management', icon: <BedIcon />, view: 'Beds' },
        { text: 'Blood Bank', icon: <BloodIcon />, view: 'BloodBank' },
        { text: 'Finance / Billing', icon: <BillingIcon />, view: 'Finance', badge: pendingDischargeCount },
        { text: 'Admin Panel', icon: <SecurityIcon />, view: 'Admin_Lock' },
    ];

    const handleNotificationClick = (event) => {
        setNotificationAnchor(event.currentTarget);
        setUnreadCount(0);
    };
    const handleNotificationClose = () => setNotificationAnchor(null);
    const openNotification = Boolean(notificationAnchor);

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0d0f1e 0%, #101828 35%, #0f1b30 65%, #0b1220 100%)' }}>
            {/* Drawer - Responsive */}
            <Drawer
                variant={isMobile ? "temporary" : "permanent"}
                open={isMobile ? mobileOpen : true}
                onClose={() => setMobileOpen(false)}
                sx={{
                    width: 280,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: 280,
                        boxSizing: 'border-box',
                        background: '#0d0f1e',
                        color: 'white',
                        border: 'none',
                        boxShadow: '6px 0 30px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' }
                    }
                }}
            >
                <Box sx={{ p: 3, textAlign: 'center', mb: 2 }}>
                    <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: 1 }}>MEDI-SWIFT</Typography>
                    <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700, letterSpacing: 1 }}>{hospitalName.toUpperCase()}</Typography>
                </Box>

                <List sx={{ px: 2, flex: 1, zIndex: 1 }}>
                    {menuItems.map((item) => (
                        <ListItemButton
                            key={item.text}
                            selected={view === item.view || (item.view === 'Admin_Lock' && view === 'Admin')}
                            onClick={() => {
                                if (item.view === 'Admin_Lock') {
                                    if (isAdminVerified) setView('Admin');
                                    else setSecurityOpen(true);
                                } else {
                                    setView(item.view);
                                }
                                if (isMobile) setMobileOpen(false);
                            }}
                            sx={{
                                borderRadius: 3, mb: 1, py: 1.2,
                                '&.Mui-selected': {
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.9))',
                                    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                                    '&:hover': { background: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.9))' }
                                },
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', transform: 'translateX(2px)', transition: '0.15s' }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                            {item.badge > 0 && (
                                <Box sx={{
                                    minWidth: 22, height: 22, borderRadius: 10,
                                    bgcolor: '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.5)'
                                }}>
                                    <Typography variant="caption" fontWeight="900" sx={{ fontSize: '0.7rem', color: 'white' }}>{item.badge}</Typography>
                                </Box>
                            )}
                        </ListItemButton>
                    ))}
                </List>

                <Box sx={{ p: 2 }}>
                    <Button
                        fullWidth
                        startIcon={<LogoutIcon />}
                        onClick={() => { localStorage.clear(); navigate('/'); }}
                        sx={{
                            color: '#f87171', justifyContent: 'flex-start', px: 2,
                            borderRadius: 2.5, fontWeight: 700,
                            border: '1px solid rgba(239,68,68,0.2)',
                            '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: '#fca5a5' }
                        }}
                    >
                        Sign Out
                    </Button>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2.5, md: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {isMobile && (
                            <IconButton onClick={() => setMobileOpen(true)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }}>
                                <MenuIcon />
                            </IconButton>
                        )}
                        <Typography variant={isMobile ? "h5" : "h4"} fontWeight="800" sx={{ color: 'white', textShadow: '0 2px 12px rgba(99,102,241,0.3)' }}>{view} Center</Typography>
                    </Stack>
                    <Stack direction="row" spacing={isMobile ? 1 : 2} alignItems="center">
                        <IconButton size={isMobile ? "small" : "medium"} onClick={handleNotificationClick} sx={{ bgcolor: 'rgba(255,255,255,0.07)', p: isMobile ? 1 : 1.5, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                            <Badge badgeContent={unreadCount} color="error">
                                <NotificationsIcon sx={{ color: 'white', fontSize: isMobile ? 20 : 24 }} />
                            </Badge>
                        </IconButton>
                        <Button
                            variant="contained"
                            startIcon={<AppointmentIcon />}
                            onClick={() => { setAptOpen(true); setIsRegistered(null); setFoundPatient(null); setVirtualToken(null); }}
                            sx={{
                                borderRadius: 3, px: isMobile ? 2 : 3, py: 1,
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                                fontWeight: 700,
                                fontSize: isMobile ? '0.75rem' : '0.875rem'
                            }}
                        >
                            {isMobile ? "Add" : "Add Appointment"}
                        </Button>
                    </Stack>
                </Box>

                {view === 'Overview' && (
                    <Grid container spacing={4}>
                        {[
                            { label: 'Today Appointments', count: todayAptCount.toString(), color: '#6366f1', icon: <PeopleIcon /> },
                            {
                                label: 'Beds Available',
                                count: beds.length > 0 ? `${beds.filter(b => b.status === 'Available').length}/${beds.length}` : '0/0',
                                color: '#10b981', icon: <BedIcon />
                            },
                        ].map((stat) => (
                            <Grid item xs={12} sm={6} md={4} key={stat.label}>
                                <Paper sx={{
                                    p: 3, borderRadius: 4,
                                    bgcolor: 'rgba(255,255,255,0.06)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                                }}>
                                    <Box sx={{
                                        width: 60, height: 60, borderRadius: 3,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: `${stat.color}15`, color: stat.color, border: `1px solid ${stat.color}30`
                                    }}>
                                        {stat.icon}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5 }}>{stat.label.toUpperCase()}</Typography>
                                        <Typography variant="h4" fontWeight="900" sx={{ color: 'white' }}>{stat.count}</Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {view === 'LiveQueue' && (
                    <Box>
                        {Object.keys(queue).length > 0 ? (
                            <Box>
                                <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <TextField
                                        select
                                        fullWidth
                                        label="Sort by Doctor"
                                        value={liveQueueFilterDocId}
                                        onChange={(e) => setLiveQueueFilterDocId(e.target.value)}
                                        sx={{
                                            maxWidth: 400,
                                            '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 3 }, '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.5)' } },
                                            '& .MuiInputLabel-root': { color: '#94a3b8' }
                                        }}
                                    >
                                        <MenuItem value="ALL">All Doctors</MenuItem>
                                        {Object.keys(queue).map(docId => (
                                            <MenuItem key={docId} value={docId}>{queue[docId].doctorName} ({queue[docId].speciality})</MenuItem>
                                        ))}
                                    </TextField>
                                </Box>
                                <TableContainer component={Paper} sx={{
                                    bgcolor: 'rgba(15, 23, 42, 0.4)',
                                    backdropFilter: 'blur(20px)',
                                    borderRadius: 4,
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    overflow: 'hidden'
                                }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.1)' }}>
                                                <TableCell sx={{ color: '#818cf8', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>TOKEN</TableCell>
                                                <TableCell sx={{ color: '#818cf8', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>PATIENT NAME</TableCell>
                                                <TableCell sx={{ color: '#818cf8', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>DOCTOR</TableCell>
                                                <TableCell sx={{ color: '#818cf8', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SPECIALITY</TableCell>
                                                <TableCell sx={{ color: '#818cf8', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>STATUS</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.keys(queue)
                                                .filter(docId => liveQueueFilterDocId === 'ALL' || docId === liveQueueFilterDocId)
                                                .flatMap(docId => queue[docId].appointments.map(apt => ({ ...apt, speciality: queue[docId].speciality })))
                                                .sort((a, b) => Number(a.token) - Number(b.token))
                                                .map((apt) => (
                                                    <TableRow key={apt._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }, transition: '0.2s' }}>
                                                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <Chip
                                                                label={`#${apt.token}`}
                                                                sx={{
                                                                    bgcolor: apt.status === 'Consulting' ? '#10b981' : 'rgba(255,255,255,0.1)',
                                                                    color: 'white',
                                                                    fontWeight: 900,
                                                                    borderRadius: 2
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{apt.patientName}</TableCell>
                                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{apt.doctorName}</TableCell>
                                                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{apt.speciality}</TableCell>
                                                        <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <Chip
                                                                label={apt.status.toUpperCase()}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 900,
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: apt.status === 'Consulting' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                                    color: apt.status === 'Consulting' ? '#10b981' : '#f59e0b',
                                                                    border: `1px solid ${apt.status === 'Consulting' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                                                                }}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>


                            </Box>
                        ) : (
                            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Typography variant="h6" sx={{ color: '#94a3b8' }}>No appointments booked for today yet.</Typography>
                                <Button variant="outlined" sx={{ mt: 2, borderColor: '#6366f1', color: '#818cf8' }} onClick={fetchLiveQueue}>Refresh Queue</Button>
                            </Paper>
                        )}
                    </Box>
                )}

                {view === 'TreatmentDB' && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h5" fontWeight="900" sx={{ color: 'white' }}>Completed Consultations</Typography>
                            <TextField
                                select
                                size="small"
                                label="Filter by Doctor"
                                value={treatmentFilterDocId}
                                onChange={(e) => setTreatmentFilterDocId(e.target.value)}
                                sx={{
                                    width: 250,
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    },
                                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                                }}
                            >
                                <MenuItem value="ALL">All Doctors</MenuItem>
                                {staff.filter(s => s.role === 'DOCTOR').map(doc => (
                                    <MenuItem key={doc.mediId} value={doc.mediId}>{doc.firstName} ({doc.specialization})</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <TableContainer component={Paper} sx={{
                            bgcolor: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.1)' }}>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>DATE</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>PATIENT NAME</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>DOCTOR</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>SPECIALITY</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>ACTION</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allApts
                                        .filter(apt => apt.status === 'Completed')
                                        .filter(apt => treatmentFilterDocId === 'ALL' || apt.doctorId === treatmentFilterDocId)
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map((apt) => (
                                            <React.Fragment key={apt._id}>
                                                <TableRow
                                                    onClick={() => setExpandedTreatmentId(expandedTreatmentId === apt._id ? null : apt._id)}
                                                    sx={{
                                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                                        cursor: 'pointer',
                                                        transition: '0.2s',
                                                        bgcolor: expandedTreatmentId === apt._id ? 'rgba(99,102,241,0.05)' : 'transparent'
                                                    }}
                                                >
                                                    <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {new Date(apt.date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {apt.patientName}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {apt.doctorName}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {apt.speciality}
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <Button size="small" variant="outlined" sx={{ color: '#818cf8', borderColor: 'rgba(99,102,241,0.3)', fontWeight: 700 }}>
                                                            {expandedTreatmentId === apt._id ? 'CLOSE' : 'VIEW REPORT'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedTreatmentId === apt._id && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} sx={{ p: 0, borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                                                            <Box sx={{ p: 3, bgcolor: 'rgba(99,102,241,0.02)' }}>
                                                                <Grid container spacing={3}>
                                                                    <Grid item xs={12} md={6}>
                                                                        <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 900, mb: 1 }}>DIAGNOSIS</Typography>
                                                                        <Typography variant="body2" sx={{ color: '#e2e8f0', bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2 }}>
                                                                            {apt.diagnosis || 'No diagnosis recorded.'}
                                                                        </Typography>
                                                                    </Grid>
                                                                    <Grid item xs={12} md={6}>
                                                                        <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 900, mb: 1 }}>MEDICINES</Typography>
                                                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                                            {apt.medicines && apt.medicines.length > 0 ? apt.medicines.map((med, idx) => (
                                                                                <Chip key={idx} label={med} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', fontWeight: 700, mb: 1 }} />
                                                                            )) : <Typography variant="body2" sx={{ color: '#94a3b8' }}>No medicines prescribed.</Typography>}
                                                                        </Stack>
                                                                    </Grid>
                                                                    <Grid item xs={12} md={6}>
                                                                        <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 900, mb: 1 }}>LAB TESTS</Typography>
                                                                        <Typography variant="body2" sx={{ color: '#e2e8f0', bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2 }}>
                                                                            {apt.labTests || 'No lab tests requested.'}
                                                                        </Typography>
                                                                    </Grid>
                                                                    <Grid item xs={12} md={6}>
                                                                        <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 900, mb: 1 }}>FOLLOW-UP & NOTES</Typography>
                                                                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', p: 1.5, borderRadius: 2 }}>
                                                                            <Typography variant="body2" sx={{ color: '#e2e8f0', mb: 1 }}>
                                                                                {apt.followUpNotes || 'No follow-up notes.'}
                                                                            </Typography>
                                                                            {apt.nextAppointmentDate && (
                                                                                <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>
                                                                                    NEXT VISIT: {new Date(apt.nextAppointmentDate).toLocaleDateString()}
                                                                                </Typography>
                                                                            )}
                                                                        </Box>
                                                                    </Grid>
                                                                </Grid>
                                                            </Box>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    {allApts.filter(apt => apt.status === 'Completed').length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                                                No completed consultations found in the database.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {
                    view === 'Beds' && (
                        <Box>
                            {/* Derive unique ward names dynamically so custom wards also appear */}
                            {[...new Set(beds.map(b => b.ward))].map(wardName => {
                                const wardBeds = beds.filter(b => b.ward === wardName);
                                if (wardBeds.length === 0) return null;

                                return (
                                    <Box key={wardName} sx={{ mb: 4 }}>
                                        <Typography variant="h6" fontWeight="800" sx={{ mb: 2, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 4, height: 20, bgcolor: '#6366f1', borderRadius: 1 }} />
                                            {wardName} Ward
                                        </Typography>
                                        <Grid container spacing={3}>
                                            {wardBeds.map(bed => (
                                                <Grid item xs={6} sm={4} md={2.4} key={bed._id}>
                                                    <Paper
                                                        onClick={() => {
                                                            setSelectedBed(bed);
                                                            setBedPatientName(bed.patientName || '');
                                                            setBedPatientId(bed.patientId || '');
                                                            
                                                            // Find active appointment for occupied/reserved beds
                                                            if (bed.status !== 'Available') {
                                                                const apt = allApts.find(a => 
                                                                    (a.isAdmitted && a.assignedBed === bed.bedNumber && a.hospitalId === hospitalId) ||
                                                                    (a.patientId === bed.patientId && bed.patientId && a.hospitalId === hospitalId) ||
                                                                    (a.patientName?.toLowerCase() === bed.patientName?.toLowerCase() && a.assignedBed === bed.bedNumber)
                                                                );
                                                                setSelectedBedApt(apt);
                                                            } else {
                                                                setSelectedBedApt(null);
                                                            }
                                                            
                                                            setBedModalOpen(true);
                                                        }}
                                                        sx={{
                                                            p: 3,
                                                            textAlign: 'center',
                                                            borderRadius: 4,
                                                            cursor: 'pointer',
                                                            bgcolor: bed.status === 'Available' ? 'rgba(16,185,129,0.08)' : (bed.status === 'Reserved' ? 'rgba(252,165,165,0.1)' : 'rgba(239,68,68,0.15)'),
                                                            border: `1px solid ${bed.status === 'Available' ? 'rgba(16,185,129,0.3)' : (bed.status === 'Reserved' ? 'rgba(252,165,165,0.4)' : 'rgba(239,68,68,0.4)')}`,
                                                            backdropFilter: 'blur(12px)',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 24px rgba(0,0,0,0.4)', borderColor: bed.status === 'Available' ? '#10b981' : (bed.status === 'Reserved' ? '#fca5a5' : '#ef4444') }
                                                        }}
                                                    >
                                                        <BedIcon sx={{ fontSize: 44, color: bed.status === 'Available' ? '#10b981' : (bed.status === 'Reserved' ? '#fca5a5' : '#ef4444'), mb: 1.5 }} />
                                                        <Typography variant="h6" fontWeight="900" sx={{ color: 'white', lineHeight: 1 }}>{bed.bedNumber}</Typography>
                                                        <Typography variant="caption" sx={{ color: bed.status === 'Available' ? '#10b981' : (bed.status === 'Reserved' ? '#fca5a5' : '#ef4444'), fontWeight: 800, mt: 0.5, display: 'block', letterSpacing: 0.5 }}>
                                                            {bed.status.toUpperCase()}
                                                        </Typography>
                                                        {(bed.status === 'Occupied' || bed.status === 'Reserved') && (
                                                            <Typography variant="caption" display="block" sx={{ mt: 1.5, p: 0.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, color: '#e2e8f0' }}>
                                                                {bed.patientName}
                                                            </Typography>
                                                        )}
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                );
                            })}
                        </Box>
                    )
                }

                {view === 'Finance' && (
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                            <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                {[
                                    { label: 'Pending Bills', color: '#6366f1', count: allApts.filter(a => a.dischargeRequested && a.ipdBillStatus === 'None').length },
                                    { label: 'Awaiting Payment', color: '#f59e0b', count: allApts.filter(a => a.dischargeRequested && a.ipdBillStatus === 'Generated').length },
                                    { label: 'Pending COD', color: '#ef4444', count: allApts.filter(a => a.dischargeRequested && a.ipdBillStatus === 'Pending_COD').length },
                                    { label: 'Paid Dues', color: '#10b981', count: allApts.filter(a => a.dischargeRequested && a.ipdBillStatus === 'Paid').length },
                                ].map((tab) => (
                                    <Button
                                        key={tab.label}
                                        variant={financeTab === tab.label ? "contained" : "outlined"}
                                        onClick={() => { setFinanceTab(tab.label); fetchAllAppointments(); }}
                                        sx={{
                                            borderRadius: 2.5, px: 2.5, fontWeight: 800, whiteSpace: 'nowrap',
                                            bgcolor: financeTab === tab.label ? tab.color : 'transparent',
                                            borderColor: financeTab === tab.label ? tab.color : `${tab.color}66`,
                                            color: financeTab === tab.label ? 'white' : tab.color,
                                            '&:hover': { bgcolor: `${tab.color}22` },
                                            position: 'relative'
                                        }}
                                    >
                                        {tab.label.toUpperCase()}
                                        {tab.count > 0 && (
                                            <Box sx={{
                                                position: 'absolute', top: -6, right: -6,
                                                width: 18, height: 18, borderRadius: '50%',
                                                bgcolor: tab.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '2px solid #0d0f1e'
                                            }}>
                                                <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{tab.count}</Typography>
                                            </Box>
                                        )}
                                    </Button>
                                ))}
                            </Stack>
                            <Button
                                size="small" variant="outlined"
                                onClick={fetchAllAppointments}
                                sx={{ borderRadius: 2, px: 2, fontWeight: 700, borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }, whiteSpace: 'nowrap' }}
                            >
                                ↻ Refresh
                            </Button>
                        </Stack>

                        <TableContainer component={Paper} sx={{
                            bgcolor: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 4,
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.1)' }}>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>PATIENT</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>BED / WARD</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>ADMISSION</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>BILL AMOUNT</TableCell>
                                        <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>ACTION / STATUS</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {allApts.filter(apt => {
                                        if (!apt.dischargeRequested) return false;
                                        if (financeTab === 'Pending Bills') return apt.ipdBillStatus === 'None';
                                        if (financeTab === 'Awaiting Payment') return apt.ipdBillStatus === 'Generated';
                                        if (financeTab === 'Pending COD') return apt.ipdBillStatus === 'Pending_COD';
                                        if (financeTab === 'Paid Dues') return apt.ipdBillStatus === 'Paid';
                                        return false;
                                    }).map((apt) => (
                                        <TableRow key={apt._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                            <TableCell sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                {apt.patientName}
                                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>Token: #{apt.token} &bull; {apt.patientId}</Typography>
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                {apt.assignedWard || '—'} {apt.assignedBed ? `- Bed ${apt.assignedBed}` : ''}
                                            </TableCell>
                                            <TableCell sx={{ color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                {apt.admissionDate ? new Date(apt.admissionDate).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell sx={{ color: '#10b981', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                {apt.ipdBillAmount > 0 ? `₹${apt.ipdBillAmount.toLocaleString()}` : 'TBD'}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                {financeTab === 'Pending Bills' && (
                                                    <Button
                                                        size="small" variant="contained"
                                                        onClick={() => {
                                                            setBillingAptId(apt._id);
                                                            setBedRate('');
                                                            const adDate = new Date(apt.admissionDate);
                                                            const diffTime = Math.abs(new Date() - adDate);
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
                                                            setDaysAdmitted(diffDays);
                                                            setBillModalOpen(true);
                                                        }}
                                                        sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.65rem', bgcolor: '#6366f1', color: 'white', '&:hover': { bgcolor: '#4f46e5' } }}
                                                    >
                                                        GENERATE BILL
                                                    </Button>
                                                )}
                                                {financeTab === 'Awaiting Payment' && (
                                                    <Chip label="AWAITING PATIENT PAYMENT" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 900, fontSize: '0.6rem' }} />
                                                )}
                                                {financeTab === 'Pending COD' && (
                                                    <Button
                                                        size="small" variant="contained"
                                                        onClick={() => handleConfirmCOD(apt._id)}
                                                        sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.65rem', bgcolor: '#f59e0b', color: 'white', '&:hover': { bgcolor: '#d97706' } }}
                                                    >
                                                        CONFIRM COD RECEIPT
                                                    </Button>
                                                )}
                                                {financeTab === 'Paid Dues' && (
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Chip label="PAID" size="small" sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 900, fontSize: '0.6rem' }} />
                                                        <Button
                                                            size="small" variant="outlined"
                                                            startIcon={<PrintIcon />}
                                                            onClick={() => handlePrintReceipt(apt)}
                                                            sx={{ 
                                                                borderRadius: 2, fontWeight: 800, fontSize: '0.65rem', 
                                                                borderColor: 'rgba(255,255,255,0.2)', color: 'white',
                                                                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'white' }
                                                            }}
                                                        >
                                                            PRINT RECEIPT
                                                        </Button>
                                                    </Stack>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {allApts.filter(apt => {
                                        if (!apt.dischargeRequested) return false;
                                        if (financeTab === 'Pending Bills') return apt.ipdBillStatus === 'None';
                                        if (financeTab === 'Awaiting Payment') return apt.ipdBillStatus === 'Generated';
                                        if (financeTab === 'Pending COD') return apt.ipdBillStatus === 'Pending_COD';
                                        if (financeTab === 'Paid Dues') return apt.ipdBillStatus === 'Paid';
                                        return false;
                                    }).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 8, color: '#94a3b8' }}>
                                                <Typography sx={{ fontWeight: 600 }}>No records in this category.</Typography>
                                                <Typography variant="caption">Use the Refresh button if you expect data here.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}


                {
                    (view === 'Doctors' || view === 'Nurses') && (
                        <Grid container spacing={4}>
                            {staff.filter(s => s.role === (view === 'Doctors' ? 'DOCTOR' : 'NURSE')).map((person) => (
                                <Grid item xs={12} sm={6} md={4} key={person._id}>
                                    <Card sx={{
                                        p: 3, borderRadius: 4,
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                        position: 'relative',
                                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        '&:hover': { transform: 'translateY(-6px)', bgcolor: 'rgba(255,255,255,0.08)' }
                                    }}>
                                        <Stack direction="row" spacing={2.5} alignItems="center">
                                            <Avatar
                                                src={person.photoUrl ? `${API_BASE_URL}/${person.photoUrl.replace(/\\/g, '/')}` : ""}
                                                sx={{ width: 84, height: 84, bgcolor: 'rgba(99,102,241,0.2)', borderRadius: 3, border: '1px solid rgba(99,102,241,0.3)' }}
                                            >
                                                <AccountIcon fontSize="large" sx={{ color: '#818cf8' }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" fontWeight="900" sx={{ color: 'white' }}>{person.firstName}</Typography>
                                                <Typography sx={{ color: '#818cf8', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 0.5 }}>{(person.specialization || person.role).toUpperCase()}</Typography>
                                            </Box>
                                        </Stack>
                                        <Stack spacing={1} sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Medi-ID</Typography>
                                                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 800 }}>{person.mediId}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Contact</Typography>
                                                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{person.phone}</Typography>
                                            </Stack>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Email</Typography>
                                                <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 700 }}>{person.email || 'N/A'}</Typography>
                                            </Stack>
                                        </Stack>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )
                }

                {
                    view === 'BloodBank' && (
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                                <Box>
                                    <Typography variant="h4" fontWeight="800" sx={{ color: 'white' }}>Blood Donations</Typography>
                                    <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600 }}>Active donation tokens for today</Typography>
                                </Box>
                            </Stack>

                            <Stack spacing={3}>
                                {bloodRequests.length > 0 ? (
                                    bloodRequests.map((req) => (
                                        <Paper
                                            key={req._id}
                                            sx={{
                                                p: 3, borderRadius: 4,
                                                bgcolor: req.bloodReceived ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.05)',
                                                backdropFilter: 'blur(12px)',
                                                border: `1.5px solid ${req.bloodReceived ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                                transition: 'transform 0.2s',
                                                '&:hover': { transform: 'scale(1.01)', bgcolor: req.bloodReceived ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.08)' }
                                            }}
                                        >
                                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                                <Stack direction="row" spacing={3} alignItems="center">
                                                    <Box sx={{
                                                        width: 76, height: 76, borderRadius: 3.5,
                                                        bgcolor: req.bloodReceived ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                                                        display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        border: `1px solid ${req.bloodReceived ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`
                                                    }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', fontSize: '0.65rem', letterSpacing: 0.5 }}>TOKEN</Typography>
                                                        <Typography variant="h4" fontWeight="900" sx={{ color: req.bloodReceived ? '#10b981' : '#60a5fa', lineHeight: 1 }}>
                                                            #{req.tokenNumber}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                                                            <Typography variant="h6" fontWeight="900" sx={{ color: 'white' }}>
                                                                {req.requesterName}
                                                            </Typography>
                                                            <Chip
                                                                label={req.bloodGroup}
                                                                size="small"
                                                                sx={{ bgcolor: '#dc2626', color: 'white', fontWeight: 900, borderRadius: 1.5 }}
                                                            />
                                                        </Stack>
                                                        <Grid container spacing={3}>
                                                            <Grid item>
                                                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>DONOR ID</Typography>
                                                                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{req.donorId}</Typography>
                                                            </Grid>
                                                            <Grid item>
                                                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>PATIENT ID</Typography>
                                                                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{req.requesterId}</Typography>
                                                            </Grid>
                                                            <Grid item>
                                                                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>PREFERRED TIME</Typography>
                                                                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>{req.donationTime || 'Not Specified'}</Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </Box>
                                                </Stack>

                                                <Stack alignItems="flex-end" spacing={1.5}>
                                                    <Chip
                                                        label={req.bloodReceived ? '✓ RECEIVED' : '● PENDING'}
                                                        sx={{
                                                            fontWeight: 900,
                                                            bgcolor: req.bloodReceived ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                            color: req.bloodReceived ? '#10b981' : '#f59e0b',
                                                            border: `1px solid ${req.bloodReceived ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                                            borderRadius: 2
                                                        }}
                                                    />
                                                    {!req.bloodReceived && (
                                                        <Button
                                                            variant="contained"
                                                            onClick={() => handleMarkBloodReceived(req._id)}
                                                            sx={{
                                                                bgcolor: '#16a34a', fontWeight: 800, borderRadius: 2.5, px: 3, py: 1,
                                                                boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
                                                                '&:hover': { bgcolor: '#15803d' }
                                                            }}
                                                        >
                                                            Confirm Receipt
                                                        </Button>
                                                    )}
                                                    {req.bloodReceived && (
                                                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800, bgcolor: 'rgba(16,185,129,0.1)', px: 1, py: 0.5, borderRadius: 1 }}>
                                                            {new Date(req.bloodReceivedAt).toLocaleDateString()} {new Date(req.bloodReceivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    ))
                                ) : (
                                    <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <BloodIcon sx={{ fontSize: 72, color: 'rgba(255,255,255,0.05)', mb: 2 }} />
                                        <Typography variant="h6" sx={{ color: '#94a3b8', fontWeight: 600 }}>No active donation tokens yet.</Typography>
                                        <Typography variant="body2" sx={{ color: '#64748b' }}>Accepted blood requests will appear here for processing.</Typography>
                                    </Paper>
                                )}
                            </Stack>
                        </Box>
                    )
                }


                {
                    view === 'Admin' && (
                        <Box>
                            <Stack direction="row" spacing={2} sx={{ mb: 4, overflowX: 'auto', pb: 1 }}>
                                {['Register Personnel', 'Personnel Info', 'Manage Capacity'].map((sub) => (
                                    <Button
                                        key={sub}
                                        variant={adminSubView === sub ? "contained" : "outlined"}
                                        onClick={() => {
                                            setAdminSubView(sub);
                                            if (sub === 'Register Personnel') setFormData({ ...formData, category: 'Doctor' });
                                        }}
                                        sx={{
                                            borderRadius: 2.5, px: 3, fontWeight: 800, whiteSpace: 'nowrap',
                                            bgcolor: adminSubView === sub ? '#6366f1' : 'transparent',
                                            borderColor: adminSubView === sub ? '#6366f1' : 'rgba(99,102,241,0.4)',
                                            color: adminSubView === sub ? 'white' : '#818cf8',
                                            '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' }
                                        }}
                                    >
                                        {sub.toUpperCase()}
                                    </Button>
                                ))}
                            </Stack>

                            {adminSubView === 'Register Personnel' && (
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Card sx={{
                                        width: { xs: '100%', sm: 650 }, p: 6, borderRadius: 6,
                                        background: 'rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                                    }}>
                                        <Box sx={{ textAlign: 'center', mb: 5 }}>
                                            <AddIcon sx={{ fontSize: 64, color: '#6366f1', mb: 2, filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.5))' }} />
                                            <Typography variant="h4" fontWeight="900" sx={{ color: 'white', mb: 1 }}>Personnel Onboarding</Typography>
                                            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800, letterSpacing: 2, display: 'block' }}>CREATE A SECURE MEDI-SWIFT ID</Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>{formData.category.toUpperCase()} INFORMATION</Typography>
                                            </Divider>

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField select label="Personnel Role" fullWidth value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}>
                                                        {['Doctor', 'Nurse', 'LAB', 'PHARMACY'].map(role => (
                                                            <MenuItem key={role} value={role}>{role}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField label="Full Name / Lab Name" autoComplete="off" sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} fullWidth value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                                </Grid>
                                                <Grid item xs={12}>
                                                    <TextField label="Specialization / Details" autoComplete="off" sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} fullWidth value={formData.detail} onChange={(e) => setFormData({ ...formData, detail: e.target.value })} />
                                                </Grid>
                                            </Grid>

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField label="Email Address" autoComplete="off" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField label="Contact Number" autoComplete="off" fullWidth value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                                                </Grid>
                                            </Grid>

                                            <TextField
                                                label="Set Login Password" type="password" fullWidth autoComplete="new-password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2.5 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                                            />



                                            <Grid container spacing={2}>
                                                <Grid item xs={12}>
                                                    <Button variant="outlined" component="label" fullWidth startIcon={<PhotoIcon />} sx={{ height: '55px', borderRadius: '12px', color: '#818cf8', borderColor: 'rgba(99,102,241,0.4)', bgcolor: 'rgba(99,102,241,0.05)', fontWeight: 700, '&:hover': { bgcolor: 'rgba(99,102,241,0.1)', borderColor: '#6366f1' } }}>
                                                        {selectedFile ? "Photo Added ✓" : "Upload Photo (Optional for Labs/Pharmacies)"}
                                                        <input hidden type="file" accept="image/*" onChange={handleFileChange} />
                                                    </Button>
                                                    {previewUrl && (
                                                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                                                            <img src={previewUrl} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '16px', border: '2px solid #6366f1' }} />
                                                        </Box>
                                                    )}
                                                </Grid>
                                            </Grid>

                                            <Button
                                                variant="contained" fullWidth size="large" onClick={handleOnboardPersonnel}
                                                sx={{
                                                    mt: 2, py: 2, borderRadius: 3, fontWeight: 900, fontSize: '1.1rem',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                                    boxShadow: '0 10px 20px -5px rgba(99,102,241,0.4)',
                                                    '&:hover': { boxShadow: '0 15px 25px -5px rgba(99,102,241,0.5)', transform: 'translateY(-2px)' }
                                                }}
                                            >
                                                ONBOARD PERSONNEL
                                            </Button>
                                        </Box>
                                    </Card>
                                </Box>
                            )}

                            {adminSubView === 'Manage Capacity' && (
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Card sx={{
                                        width: { xs: '100%', sm: 600 }, p: 4, borderRadius: 5,
                                        background: 'rgba(255,255,255,0.05)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                                    }}>
                                        <Typography variant="h5" fontWeight="900" color="white" align="center" sx={{ mb: 4 }}>
                                            MANAGE WARD CAPACITY
                                        </Typography>
                                        <Stack spacing={4}>
                                            {/* Unified Ward List — Standard + Custom, all with 3-dot kebab */}
                                            {[
                                                ...['General', 'ICU', 'Maternity'].map(name => ({ name, isCustom: false })),
                                                ...customWards.map((cw, idx) => ({ name: cw.name, isCustom: true, idx }))
                                            ].filter(ward => {
                                                const count = ward.isCustom
                                                    ? (customWards.find(w => w.name === ward.name)?.count || 0)
                                                    : (capacities[ward.name] || 0);
                                                return count > 0;
                                            }).map((ward) => {
                                                const currentCount = ward.isCustom
                                                    ? customWards.find(w => w.name === ward.name)?.count || 0
                                                    : capacities[ward.name] || 0;
                                                const isMenuOpen = Boolean(wardMenuAnchor) && wardMenuTarget?.name === ward.name;
                                                return (
                                                    <Box key={ward.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: ward.isCustom ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.03)', borderRadius: 3, border: `1px solid ${ward.isCustom ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                                                        <Box>
                                                            <Typography variant="h6" fontWeight="800" color="white">{ward.name}</Typography>
                                                            <Typography variant="caption" color={ward.isCustom ? '#818cf8' : '#94a3b8'}>
                                                                {ward.isCustom ? 'Custom Ward · ' : ''}{beds.filter(b => b.ward === ward.name).length} Beds in DB
                                                            </Typography>
                                                        </Box>
                                                        <Stack direction="row" spacing={2} alignItems="center">
                                                            <Typography variant="h5" fontWeight="900" color="white" sx={{ minWidth: 40, textAlign: 'center' }}>
                                                                {currentCount}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                onClick={(e) => { setWardMenuAnchor(e.currentTarget); setWardMenuTarget(ward); }}
                                                                sx={{ color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
                                                            >
                                                                <MoreVertIcon sx={{ fontSize: 20 }} />
                                                            </IconButton>
                                                        </Stack>
                                                    </Box>
                                                );
                                            })}

                                            {/* Kebab menu for wards */}
                                            <Menu
                                                anchorEl={wardMenuAnchor}
                                                open={Boolean(wardMenuAnchor)}
                                                onClose={() => { setWardMenuAnchor(null); setWardMenuTarget(null); }}
                                                PaperProps={{ sx: { bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2 } }}
                                            >
                                                <MenuItem
                                                    onClick={() => {
                                                        if (!wardMenuTarget) return;
                                                        if (wardMenuTarget.isCustom) {
                                                            setCustomWards(customWards.map(w => w.name === wardMenuTarget.name ? { ...w, count: w.count + 1 } : w));
                                                        } else {
                                                            setCapacities({ ...capacities, [wardMenuTarget.name]: (capacities[wardMenuTarget.name] || 0) + 1 });
                                                        }
                                                        setWardMenuAnchor(null);
                                                    }}
                                                    sx={{ color: '#10b981', fontWeight: 700, gap: 1 }}
                                                >
                                                    <AddIcon fontSize="small" /> Increase Beds
                                                </MenuItem>
                                                <MenuItem
                                                    onClick={() => {
                                                        if (!wardMenuTarget) return;
                                                        if (wardMenuTarget.isCustom) {
                                                            setCustomWards(customWards.map(w => w.name === wardMenuTarget.name ? { ...w, count: Math.max(0, w.count - 1) } : w));
                                                        } else {
                                                            setCapacities({ ...capacities, [wardMenuTarget.name]: Math.max(0, (capacities[wardMenuTarget.name] || 0) - 1) });
                                                        }
                                                        setWardMenuAnchor(null);
                                                    }}
                                                    sx={{ color: '#f59e0b', fontWeight: 700, gap: 1 }}
                                                >
                                                    <DeleteIcon fontSize="small" /> Decrease Beds
                                                </MenuItem>
                                                <MenuItem
                                                    onClick={async () => {
                                                        if (!wardMenuTarget) return;
                                                        const wardName = wardMenuTarget.name;
                                                        if (!window.confirm(`Delete all beds in "${wardName}" ward? Occupied beds will NOT be deleted.`)) {
                                                            setWardMenuAnchor(null); return;
                                                        }
                                                        try {
                                                            const res = await axios.post(`${API_BASE_URL}/api/hospital/delete-ward`, {
                                                                hospitalMediId: hospitalId, wardName
                                                            });
                                                            if (res.data.success) {
                                                                alert(`✅ ${wardName} ward deleted.`);
                                                                fetchBeds();
                                                                if (wardMenuTarget.isCustom) {
                                                                    setCustomWards(customWards.filter(w => w.name !== wardName));
                                                                }
                                                            }
                                                        } catch (err) {
                                                            alert('Failed to delete ward: ' + (err.response?.data?.message || err.message));
                                                        }
                                                        setWardMenuAnchor(null);
                                                    }}
                                                    sx={{ color: '#f87171', fontWeight: 700, gap: 1 }}
                                                >
                                                    <DeleteIcon fontSize="small" /> Delete Ward
                                                </MenuItem>
                                            </Menu>


                                            {/* Add New Ward Box */}
                                            <Box sx={{ p: 2.5, bgcolor: 'rgba(99,102,241,0.04)', borderRadius: 3, border: '1px dashed rgba(99,102,241,0.4)' }}>
                                                <Typography variant="subtitle2" fontWeight="800" color="#818cf8" sx={{ mb: 2, letterSpacing: 1 }}>+ NEW WARD</Typography>
                                                <Stack spacing={2}>
                                                    <TextField
                                                        label="Ward Name"
                                                        value={newWardName}
                                                        onChange={(e) => setNewWardName(e.target.value)}
                                                        size="small"
                                                        fullWidth
                                                        autoComplete="off"
                                                        sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(99,102,241,0.3)', borderRadius: 2 }, '&:hover fieldset': { borderColor: '#6366f1' } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                                                    />
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Typography variant="body2" color="#94a3b8" sx={{ flex: 1 }}>Number of Beds:</Typography>
                                                        <IconButton size="small" onClick={() => setNewWardCount(Math.max(0, newWardCount - 1))} sx={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                                                            <DeleteIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                        <Typography variant="h6" fontWeight="900" color="white" sx={{ minWidth: 32, textAlign: 'center' }}>{newWardCount}</Typography>
                                                        <IconButton size="small" onClick={() => setNewWardCount(newWardCount + 1)} sx={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                            <AddIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </Stack>
                                                    <Button
                                                        variant="outlined"
                                                        fullWidth
                                                        startIcon={<AddIcon />}
                                                        onClick={() => {
                                                            const name = newWardName.trim();
                                                            if (!name) return alert('Please enter a ward name.');
                                                            if (newWardCount < 1) return alert('Please add at least 1 bed.');

                                                            if (['General', 'ICU', 'Maternity'].includes(name)) {
                                                                setCapacities({ ...capacities, [name]: (capacities[name] || 0) + newWardCount });
                                                            } else {
                                                                const existing = customWards.find(w => w.name.toLowerCase() === name.toLowerCase());
                                                                if (existing) {
                                                                    setCustomWards(customWards.map(w => w.name.toLowerCase() === name.toLowerCase() ? { ...w, count: (w.count || 0) + newWardCount } : w));
                                                                } else {
                                                                    setCustomWards([...customWards, { name, count: newWardCount }]);
                                                                }
                                                            }
                                                            setNewWardName('');
                                                            setNewWardCount(0);
                                                        }}
                                                        sx={{ borderRadius: 2.5, fontWeight: 800, borderColor: 'rgba(99,102,241,0.5)', color: '#818cf8', '&:hover': { bgcolor: 'rgba(99,102,241,0.1)' } }}
                                                    >
                                                        ADD WARD
                                                    </Button>
                                                </Stack>
                                            </Box>

                                            <Button
                                                fullWidth
                                                variant="contained"
                                                startIcon={<CheckCircleIcon />}
                                                onClick={handleSyncCapacity}
                                                sx={{
                                                    py: 1.5, borderRadius: 3, fontWeight: 900, fontSize: '1rem',
                                                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
                                                }}
                                            >
                                                SYNC CAPACITY
                                            </Button>
                                        </Stack>
                                    </Card>
                                </Box>
                            )}

                            {adminSubView === 'Personnel Info' && (
                                <Box>
                                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                        <TextField select size="small" value={infoTabFilter} onChange={e => setInfoTabFilter(e.target.value)} sx={{ width: 200, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } } }}>
                                            <MenuItem value="ALL">All Personnel</MenuItem>
                                            <MenuItem value="DOCTOR">Doctors</MenuItem>
                                            <MenuItem value="NURSE">Nurses</MenuItem>
                                            <MenuItem value="LAB">Laboratories</MenuItem>
                                            <MenuItem value="PHARMACY">Pharmacies</MenuItem>
                                        </TextField>
                                    </Box>
                                    <TableContainer component={Paper} sx={{
                                        bgcolor: 'rgba(15, 23, 42, 0.4)',
                                        backdropFilter: 'blur(20px)',
                                        borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.05)',
                                    }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.1)' }}>
                                                    <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>PHOTO</TableCell>
                                                    <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>NAME / MEDI-ID</TableCell>
                                                    <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>DETAILS / CONTACT</TableCell>
                                                    <TableCell sx={{ color: '#818cf8', fontWeight: 900 }}>STATUS</TableCell>
                                                    <TableCell sx={{ color: '#818cf8', fontWeight: 900 }} align="right">ACTIONS</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {staff.filter(s => infoTabFilter === 'ALL' || s.role === infoTabFilter).map((person) => (
                                                <TableRow key={person._id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                                                    <TableCell>
                                                        <Avatar
                                                            src={person.photoUrl ? `${API_BASE_URL}/${person.photoUrl.replace(/\\/g, '/')}` : ""}
                                                            sx={{ width: 50, height: 50, borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ color: 'white', fontWeight: 700 }}>{person.firstName}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 800 }}>{person.mediId}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography sx={{ color: '#e2e8f0', fontWeight: 600 }}>{person.specialization || person.role}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>{person.phone} | {person.email}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={person.status?.toUpperCase() || 'ACTIVE'}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 900,
                                                                bgcolor: person.status === 'blocked' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                color: person.status === 'blocked' ? '#f87171' : '#10b981',
                                                                border: `1px solid ${person.status === 'blocked' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            <IconButton
                                                                onClick={() => { setEditingPersonnel(person); setEditModalOpen(true); }}
                                                                sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', '&:hover': { bgcolor: 'rgba(99,102,241,0.2)' } }}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                onClick={() => handleTogglePersonnelStatus(person.mediId)}
                                                                sx={{ bgcolor: person.status === 'blocked' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: person.status === 'blocked' ? '#10b981' : '#f59e0b', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                                                            >
                                                                {person.status === 'blocked' ? <CheckCircleIcon fontSize="small" /> : <BlockIcon fontSize="small" />}
                                                            </IconButton>
                                                            <IconButton
                                                                onClick={() => handleRemovePersonnel(person.mediId)}
                                                                sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' } }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                </Box>
                            )}
                        </Box>
                    )}

                {view === 'Billing' && (
                    <Box sx={{ textAlign: 'center', py: 10 }}>
                        <BillingIcon sx={{ fontSize: 80, color: 'rgba(255,255,255,0.05)', mb: 2 }} />
                        <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>Financial Portal</Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>Secure billing and invoice management is under maintenance.</Typography>
                    </Box>
                )}
            </Box>

            {/* Appointment Dialog */}
            <Dialog open={aptOpen} onClose={() => setAptOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)' } }}>
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight="900" sx={{ mb: 3 }}>Book Appointment</Typography>
                    {!virtualToken ? (
                        <>
                            <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                                <TextField fullWidth label="Search Patient (Aadhar/Medi-ID)" value={searchId} onChange={(e) => setSearchId(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                                <Button variant="contained" onClick={handleSearchPatient} sx={{ px: 4, borderRadius: 2, bgcolor: '#6366f1', fontWeight: 700 }}>Search</Button>
                            </Box>
                            {foundPatient ? (
                                <Box sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4, textAlign: 'left', mb: 4, border: '1px solid rgba(99,102,241,0.3)' }}>
                                    <Typography fontWeight="800" variant="h6" sx={{ color: 'white', mb: 1 }}>{foundPatient.firstName} {foundPatient.lastName}</Typography>
                                    <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800 }}>PATIENT ID: {foundPatient.mediId}</Typography>
                                    <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                                    <Stack spacing={2}>
                                        <TextField select label="Select Speciality" fullWidth value={bookingSpeciality} onChange={(e) => setBookingSpeciality(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}>
                                            {Array.from(new Set(staff.filter(s => s.role === 'DOCTOR').map(s => s.specialization))).map(spec => (
                                                <MenuItem key={spec} value={spec}>{spec}</MenuItem>
                                            ))}
                                        </TextField>
                                        <Button variant="contained" fullWidth size="large" onClick={handleBookAppointment} sx={{ py: 2, borderRadius: 3, bgcolor: '#10b981', fontWeight: 900, fontSize: '1.1rem' }}>CONFIRM BOOKING</Button>
                                    </Stack>
                                </Box>
                            ) : (
                                <Box sx={{ py: 2 }}>
                                    <Typography sx={{ mb: 2, color: '#94a3b8' }}>Patient must be registered in the system first.</Typography>
                                    <Button variant="contained" sx={{ bgcolor: '#4338ca', fontWeight: 700 }} onClick={() => { setAptOpen(false); navigate('/register-patient'); }}>Register New Patient</Button>
                                </Box>
                            )}
                        </>
                    ) : (
                        <Paper sx={{ p: 4, mt: 3, bgcolor: 'rgba(16,185,129,0.1)', borderRadius: 4, border: '2px solid #10b981', textAlign: 'center' }}>
                            <Typography variant="h6" fontWeight="900" color="#10b981">TOKEN GENERATED ✅</Typography>
                            <Typography variant="h2" fontWeight="900" sx={{ mt: 2, color: 'white' }}>#{virtualToken.tokenNumber}</Typography>
                            <Typography variant="subtitle1" sx={{ color: '#e2e8f0', mt: 1 }}>{virtualToken.doctorName}</Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8' }}>Please proceed to the waiting area.</Typography>
                            <Button fullWidth variant="contained" sx={{ mt: 4, py: 1.5, borderRadius: 3, bgcolor: '#10b981', fontWeight: 900 }} onClick={() => { setAptOpen(false); setVirtualToken(null); setFoundPatient(null); setSearchId(""); }}>Done</Button>
                        </Paper>
                    )}
                </Box>
            </Dialog>

            {/* Edit Personnel Dialog */}
            <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)' } }}>
                <Box component="form" onSubmit={handleUpdatePersonnel} sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight="900" sx={{ mb: 3 }}>Edit Personnel Details</Typography>
                    {editingPersonnel && (
                        <Stack spacing={3}>
                            <TextField
                                label="Full Name" fullWidth
                                value={editingPersonnel.firstName}
                                onChange={(e) => setEditingPersonnel({ ...editingPersonnel, firstName: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                            />
                            <TextField
                                label="Specialization" fullWidth
                                value={editingPersonnel.specialization || ""}
                                onChange={(e) => setEditingPersonnel({ ...editingPersonnel, specialization: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                            />
                            <TextField
                                label="Email" fullWidth
                                value={editingPersonnel.email}
                                onChange={(e) => setEditingPersonnel({ ...editingPersonnel, email: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                            />
                            <TextField
                                label="Phone" fullWidth
                                value={editingPersonnel.phone}
                                onChange={(e) => setEditingPersonnel({ ...editingPersonnel, phone: e.target.value })}
                                sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}
                            />
                            <Button variant="outlined" component="label" fullWidth startIcon={<PhotoIcon />} sx={{ borderRadius: 2, color: '#818cf8', borderColor: 'rgba(99,102,241,0.4)', py: 1.5 }}>
                                {selectedFile ? "Photo Selected ✓" : "Change Profile Photo"}
                                <input hidden type="file" accept="image/*" onChange={handleFileChange} />
                            </Button>
                            <Button type="submit" variant="contained" fullWidth size="large" sx={{ py: 2, borderRadius: 3, bgcolor: '#6366f1', fontWeight: 900, mt: 1 }}>
                                SAVE CHANGES
                            </Button>
                        </Stack>
                    )}
                </Box>
            </Dialog>

            {/* Bed Action Modal */}
            <Dialog open={bedModalOpen} onClose={() => setBedModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)' } }}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {selectedBed?.status === 'Available' ? 'Admit Patient' : 'Discharge Patient'} - {selectedBed?.bedNumber} ({selectedBed?.ward})
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    {selectedBed?.status === 'Available' ? (
                        <Box sx={{ pt: 1 }}>
                            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>Allocate bed <b>{selectedBed.bedNumber}</b> to a patient.</Typography>
                            <TextField select fullWidth label="Allocation Type" value={bedAllocateType} onChange={(e) => setBedAllocateType(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }}>
                                <MenuItem value="Occupied">Admit Now (Occupied)</MenuItem>
                                <MenuItem value="Reserved">Pre-Book (Reserved)</MenuItem>
                            </TextField>
                            <TextField fullWidth label="Patient Name *" value={bedPatientName} onChange={(e) => setBedPatientName(e.target.value)} sx={{ mt: 2, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                            <TextField fullWidth label="Patient ID (Optional)" value={bedPatientId} onChange={(e) => setBedPatientId(e.target.value)} sx={{ mt: 2, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', width: 60, height: 60, mx: 'auto', mb: 2 }}><BedIcon sx={{ fontSize: 30 }} /></Avatar>
                            <Typography variant="h6" fontWeight="800">Current Patient: {selectedBed?.patientName}</Typography>
                            {selectedBed?.patientId && <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>ID: {selectedBed.patientId}</Typography>}
                            
                            {selectedBedApt && (
                                <Paper sx={{ mt: 3, p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3, textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Stack spacing={1}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Consulting Doctor</Typography>
                                            <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800 }}>{selectedBedApt.doctorName || 'General Ward'}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Admission Date</Typography>
                                            <Typography variant="caption" sx={{ color: '#e2e8f0', fontWeight: 800 }}>{selectedBedApt.admissionDate || new Date(selectedBedApt.date).toLocaleDateString()}</Typography>
                                        </Stack>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>Duration</Typography>
                                            <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>
                                                {selectedBedApt.admissionDate ? Math.max(1, Math.ceil((new Date() - new Date(selectedBedApt.admissionDate)) / (1000 * 60 * 60 * 24))) : 1} Days
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Paper>
                            )}

                            <Typography color="error" sx={{ mt: 3, fontWeight: 'bold' }}>
                                {selectedBedApt?.dischargeRequested ? 'Discharge pending payment confirmation.' : 'Initiate discharge process for this patient?'}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button onClick={() => setBedModalOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button 
                        disabled={selectedBedApt?.dischargeRequested && selectedBed?.status !== 'Available'}
                        onClick={handleBedAction} 
                        variant="contained" 
                        sx={{ bgcolor: selectedBed?.status === 'Available' ? '#10b981' : '#ef4444', color: 'white' }}
                    >
                        {selectedBed?.status === 'Available' ? 'Confirm Allocation' : (selectedBedApt?.dischargeRequested ? 'Pending Discharge' : 'Initiate Discharge')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Generate Bill Modal */}
            <Dialog open={billModalOpen} onClose={() => setBillModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)', color: 'white', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)' } }}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>Generate IPD Bill</DialogTitle>
                <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Box sx={{ pt: 1 }}>
                        <TextField 
                            fullWidth 
                            label="Days Admitted" 
                            type="number"
                            value={daysAdmitted} 
                            onChange={(e) => setDaysAdmitted(e.target.value)} 
                            sx={{ mb: 3, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} 
                        />
                        <TextField 
                            fullWidth 
                            label="Bed Rate per Day (₹)" 
                            type="number"
                            value={bedRate} 
                            onChange={(e) => setBedRate(e.target.value)} 
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)', borderRadius: 2 } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} 
                        />
                        <Paper sx={{ mt: 3, p: 2, bgcolor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 2 }}>
                            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 700 }}>
                                Total Estimated Bill: ₹{Number(bedRate || 0) * Number(daysAdmitted || 1)}
                            </Typography>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button onClick={() => setBillModalOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button onClick={handleGenerateBill} variant="contained" sx={{ bgcolor: '#6366f1', color: 'white', '&:hover': { bgcolor: '#4f46e5' } }}>
                        Generate & Notify Patient
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Admin Verification */}
            <Dialog open={securityOpen} onClose={() => setSecurityOpen(false)} PaperProps={{ sx: { background: '#1e293b', color: 'white', borderRadius: 4 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Admin Verification</DialogTitle>
                <DialogContent>
                    <TextField fullWidth type="password" label="Security Key" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } }, '& .MuiInputLabel-root': { color: '#94a3b8' } }} />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setSecurityOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button onClick={handleVerifyAdmin} variant="contained" sx={{ bgcolor: '#6366f1', fontWeight: 700 }}>Verify</Button>
                </DialogActions>
            </Dialog>

            <Popover
                open={openNotification}
                anchorEl={notificationAnchor}
                onClose={handleNotificationClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { bgcolor: '#1e293b', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, mt: 1 } }}
            >
                <Box sx={{ width: 320, p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Notifications</Typography>
                        {notifications.length > 0 && (
                            <Button size="small" onClick={handleClearAllNotifications} sx={{ color: '#ef4444', fontWeight: 700, p: 0, minWidth: 'auto', '&:hover': { background: 'none', textDecoration: 'underline' } }}>
                                Clear All
                            </Button>
                        )}
                    </Stack>
                    <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                    {notifications.length === 0 ? (
                        <Typography variant="body2" color="#94a3b8" sx={{ py: 2, textAlign: 'center' }}>No new notifications</Typography>
                    ) : (
                        <List sx={{ maxHeight: 350, overflow: 'auto' }}>
                            {notifications.map((notif, idx) => (
                                <Box key={idx} sx={{ position: 'relative', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 1.5 }}>
                                    <IconButton
                                        onClick={() => handleDeleteNotification(notif._id)}
                                        sx={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 0,
                                            color: 'rgba(255,255,255,0.3)',
                                            '&:hover': { color: '#ef4444' },
                                            zIndex: 1
                                        }}
                                        size="small"
                                    >
                                        <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <ListItem
                                        alignItems="flex-start"
                                        sx={{ px: 0 }}
                                    >
                                        <Avatar sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', mr: 2, width: 32, height: 32 }}>
                                            <NotificationsIcon fontSize="small" />
                                        </Avatar>
                                        <ListItemText
                                            primary={notif.msg || notif.message}
                                            secondary={
                                                <Stack component="span">
                                                    <Typography component="span" variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                                        {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                    {(notif.type === 'urgent_admission_request' || notif.metadata?.admissionDate) && (
                                                        <Typography component="span" variant="caption" sx={{ color: '#10b981', fontWeight: 700, mt: 0.5 }}>
                                                            {notif.type === 'urgent_admission_request' ? '🚨 URGENT: AUTOMATED ALLOTMENT COMPLETE' : `📅 ADMISSION DATE: ${notif.metadata.admissionDate}`}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            }
                                            primaryTypographyProps={{ 
                                                variant: 'body2', 
                                                fontWeight: 600, 
                                                color: notif.type === 'urgent_admission_request' ? '#f43f5e' : 'white', 
                                                pr: 3,
                                                sx: { whiteSpace: 'pre-wrap' }
                                            }}
                                        />
                                    </ListItem>
                                    {(notif.type === 'bed_allocation_request' || notif.type === 'urgent_admission_request') && !notif.read && (
                                        <Button
                                            fullWidth size="small" variant="contained"
                                            onClick={() => {
                                                setSelectedBed(null); // reset any previous selection
                                                setActiveRequest({
                                                    notificationId: notif._id,
                                                    appointmentId: notif.metadata?.appointmentId,
                                                    patientName: notif.metadata?.patientName,
                                                    patientId: notif.metadata?.patientId
                                                });
                                                setAllotmentDialogOpen(true);
                                                handleNotificationClose();
                                            }}
                                            sx={{ mt: 1, bgcolor: '#6366f1', fontWeight: 700, borderRadius: 2 }}
                                        >
                                            Allot Bed
                                        </Button>
                                    )}
                                </Box>
                            ))}
                        </List>
                    )}
                </Box>
            </Popover>

            {/* Allotment Dialog */}
            <Dialog open={allotmentDialogOpen} onClose={() => setAllotmentDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: '#0f172a', color: 'white', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Allot Bed for {activeRequest?.patientName}</DialogTitle>
                <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3 }}>Select an available bed to complete the admission process.</Typography>
                    <Grid container spacing={2}>
                        {beds.filter(b => b.status === 'Available').map(bed => (
                            <Grid item xs={6} sm={4} key={bed._id}>
                                <Paper
                                    onClick={() => setSelectedBed(bed)}
                                    sx={{
                                        p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 3,
                                        bgcolor: selectedBed?._id === bed._id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                                        border: `2px solid ${selectedBed?._id === bed._id ? '#6366f1' : 'transparent'}`,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                                    }}
                                >
                                    <BedIcon sx={{ color: '#10b981', mb: 1 }} />
                                    <Typography variant="body2" fontWeight="900">{bed.bedNumber}</Typography>
                                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>{bed.ward}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                    {beds.filter(b => b.status === 'Available').length === 0 && (
                        <Typography color="error" align="center" sx={{ py: 4, fontWeight: 700 }}>No beds available in any ward!</Typography>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setAllotmentDialogOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button
                        disabled={!selectedBed}
                        onClick={async () => {
                            try {
                                const res = await axios.post(`${API_BASE_URL}/api/admission/allot-bed`, {
                                    notificationId: activeRequest.notificationId,
                                    appointmentId: activeRequest.appointmentId,
                                    patientId: activeRequest.patientId,
                                    patientName: activeRequest.patientName,
                                    bedId: selectedBed._id,
                                    bedNumber: selectedBed.bedNumber,
                                    ward: selectedBed.ward
                                });
                                if (res.data.success) {
                                    alert(`✅ Bed ${selectedBed.bedNumber} allotted to ${activeRequest.patientName}!`);
                                    setAllotmentDialogOpen(false);
                                    setSelectedBed(null);
                                    setActiveRequest(null);
                                    fetchBeds();
                                    fetchNotifications();
                                }
                            } catch (err) {
                                alert("Failed to allot bed: " + (err.response?.data?.message || err.message));
                            }
                        }}
                        variant="contained"
                        sx={{ bgcolor: '#10b981', fontWeight: 800, borderRadius: 2 }}
                    >
                        Confirm Allotment
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default HospitalDashboard;