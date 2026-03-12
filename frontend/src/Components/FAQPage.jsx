import React from 'react';
import {
    AppBar, Toolbar, Typography, Button, Container, Box, Grid,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    ExpandMore as ExpandMoreIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import Logo from '../assets/logo.png';

const FAQPage = () => {
    const navigate = useNavigate();

    const faqs = [
        { q: "How does the Emergency SOS work?", a: "When you click the SOS button, your GPS location and medical profile are instantly sent to the nearest hospital and ambulance dispatch center for immediate response." },
        { q: "Is my medical data secure?", a: "Yes, Medi-Swift uses military-grade encryption and a unique 'Secure Secret Code System' to ensure that only authorized medical personnel can access your records." },
        { q: "How do I register as a blood donor?", a: "You can register directly from your Patient Dashboard. Once registered, hospitals can find you in emergency cases and send a request tokens." },
        { q: "Can I track my ambulance in real-time?", a: "Absolutely! Once an ambulance is dispatched, you'll receive a live tracking link on your dashboard showing its exact location and estimated time of arrival." },
        { q: "What should I do if I forget my Secret Code?", a: "You can reset your Secret Code through the 'Settings' section of your dashboard using your registered mobile number for OTP verification." },
        { q: "Are there any charges for using Medi-Swift?", a: "Medi-Swift is free for basic patient registration and SOS. Partner hospitals and pharmacies may have their own service charges which are clearly displayed before any transaction." },
        { q: "How can I book an appointment with a specific doctor?", a: "Navigate to the 'Smart Appointments' section in your dashboard. You can search for doctors by specialty, availability, or hospital and book a slot instantly." },
        { q: "What is the 'EHR Vault' and how do I use it?", a: "The EHR Vault is your personal digital locker for medical reports, prescriptions, and lab results. You can upload documents and share them securely with doctors using your Secret Code." },
        { q: "Can I order medicines through Medi-Swift?", a: "Yes, you can browse partner pharmacies through the 'Pharmacy' section. Upload your prescription from the EHR Vault to place an order for home delivery or store pickup." },
        { q: "What happens if there is no ambulance available?", a: "Our decentralized system cross-references multiple hospitals and private ambulance providers. If one is unavailable, the request is automatically routed to the next closest provider to ensure zero-latency care." },
        { q: "Can I register multiple family members under one account?", a: "Currently, each account is linked to a unique Medi-Swift ID for medical accuracy. However, you can use the 'Add Dependent' feature to manage records for children or elderly family members." },
        { q: "How do I become a partner hospital or pharmacy?", a: "Health providers can apply by clicking 'Partner With Us' in the footer or contact support. Our team will verify your credentials and onboard you to the Medi-Swift ecosystem." }
    ];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
            {/* --- CORNER LOGO (ABSOLUTE TOP-LEFT) --- */}
            <img
                src={Logo}
                alt="Logo"
                style={{
                    height: '250px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(1)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1300,
                    cursor: 'pointer'
                }}
                onClick={() => navigate('/')}
            />

            {/* --- NAVIGATION BAR --- */}
            <AppBar position="absolute" elevation={0} sx={{ bgcolor: 'transparent', color: '#fff', top: 0, left: 0, right: 0 }}>
                <Toolbar sx={{ height: '80px', px: 2, justifyContent: 'flex-end' }}>
                    <Button color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ fontWeight: 700 }}>
                        Back to Home
                    </Button>
                </Toolbar>
            </AppBar>

            {/* --- HERO SECTION --- */}
            <Box sx={{ py: 10, bgcolor: '#1e293b', color: '#fff', textAlign: 'center' }}>
                <Container maxWidth="md">
                    <Typography variant="overline" sx={{ color: '#3b82f6', fontWeight: 800, letterSpacing: 2, mb: 1, display: 'block' }}>
                        HELP CENTER
                    </Typography>
                    <Typography variant="h2" sx={{ fontWeight: 900, mb: 3, fontFamily: 'Times New Roman' }}>
                        Frequently Asked Questions
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400, maxWidth: '600px', mx: 'auto' }}>
                        Everything you need to know about Medi-Swift. Can't find the answer? <span style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 700 }}>Contact our support team.</span>
                    </Typography>
                </Container>
            </Box>

            {/* --- FAQ SECTION --- */}
            <Container maxWidth="md" sx={{ py: 12 }}>
                {faqs.map((faq, i) => (
                    <Accordion key={i} sx={{
                        mb: 2.5,
                        borderRadius: '20px !important',
                        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        '&:before': { display: 'none' },
                        transition: 'all 0.3s ease',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 15px 35px -5px rgba(0,0,0,0.1)' }
                    }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#3b82f6' }} />}>
                            <Typography sx={{ fontWeight: 800, color: '#1e293b', py: 1.5, fontSize: '1.1rem' }}>{faq.q}</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pb: 3 }}>
                            <Typography sx={{ color: '#64748b', lineHeight: 1.8, fontSize: '1.05rem' }}>{faq.a}</Typography>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Container>

            {/* --- CTA SECTION --- */}
            <Box sx={{ py: 10, textAlign: 'center', bgcolor: '#fff' }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#1e293b', mb: 2 }}>Still have questions?</Typography>
                <Typography variant="body1" sx={{ color: '#64748b', mb: 4 }}>We're available 24/7 to assist you with any medical urgency.</Typography>
                <Button variant="contained" size="large" onClick={() => navigate('/')} sx={{
                    bgcolor: '#1e293b',
                    px: 6,
                    py: 2,
                    borderRadius: 3,
                    fontWeight: 800,
                    '&:hover': { bgcolor: '#0f172a' }
                }}>
                    Contact Support
                </Button>
            </Box>

            {/* --- FOOTER --- */}
            <Box sx={{ bgcolor: '#0f172a', color: '#fff', py: 6, px: { xs: 3, md: 8 }, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ opacity: 0.5 }}>
                    © 2026 Medi-Swift Healthcare Platform. All rights reserved.
                </Typography>
            </Box>
        </Box>
    );
};

export default FAQPage;
