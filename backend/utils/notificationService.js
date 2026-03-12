const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Notification Service
 * Handles Email (via Nodemailer)
 */
class NotificationService {
    constructor() {
        this.useRealServices = process.env.USE_REAL_SERVICES === 'true';

        // Setup Email Transporter
        if (this.useRealServices && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
        }
    }

    /**
     * Send Email Notification
     */
    async sendEmail(to, subject, text, html) {
        if (this.useRealServices && this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"Medi-Swift" <${process.env.EMAIL_USER}>`,
                    to,
                    subject,
                    text,
                    html
                });
                console.log(`[REAL EMAIL SENT] To: ${to}`);
            } catch (err) {
                console.error(`[EMAIL ERROR] To: ${to} | Error: ${err.message}`);
            }
        } else {
            console.log('\n--- MOCK EMAIL NOTIFICATION ---');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Message: ${text}`);
            console.log('-------------------------------\n');
        }
    }

    /**
     * Send Generic Notification Email to Patient
     */
    async sendNotificationEmail(patientId, type, title, message, metadata = {}) {
        try {
            // Lazy load User model to avoid circular dependency
            const User = require('../models/User');
            const user = await User.findOne({ mediId: patientId });
            
            if (!user || !user.email) {
                console.log(`[EMAIL SKIP] No email found for patient: ${patientId}`);
                return;
            }

            let accentColor = '#6366f1'; // Default Indigo
            let icon = '🔔';

            // Customize based on type
            switch (type) {
                case 'appointment_booked':
                    accentColor = '#10b981'; // Green
                    icon = '📅';
                    break;
                case 'session_completed':
                    accentColor = '#6366f1'; // Indigo
                    icon = '👨‍⚕️';
                    break;
                case 'lab_update':
                    accentColor = '#f59e0b'; // Amber
                    icon = '🔬';
                    break;
                case 'pharmacy_ready':
                case 'pharmacy_preparing':
                    accentColor = '#38bdf8'; // Sky Blue
                    icon = '💊';
                    break;
                case 'otp_delivery':
                    accentColor = '#ef4444'; // Red
                    icon = '🔐';
                    break;
            }

            const htmlMessage = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <div style="background-color: ${accentColor}; padding: 20px; text-align: center;">
                        <span style="font-size: 40px;">${icon}</span>
                        <h2 style="color: white; margin: 10px 0 0 0;">${title}</h2>
                    </div>
                    <div style="padding: 30px; line-height: 1.6;">
                        <p style="font-size: 16px;">Hello <strong>${user.firstName || 'there'}</strong>,</p>
                        <p style="font-size: 15px; color: #475569;">${message}</p>
                        
                        ${metadata.otp ? `
                        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Collection OTP</p>
                            <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold; color: ${accentColor}; letter-spacing: 5px;">${metadata.otp}</p>
                        </div>
                        ` : ''}

                        <p style="font-size: 14px; margin-top: 30px; color: #94a3b8;">
                            This is an automated update from Medi-Swift. You can view more details on your dashboard.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; 2026 Medi-Swift | Advanced Medical Networking</p>
                    </div>
                </div>
            `;

            await this.sendEmail(user.email, `Medi-Swift: ${title}`, message, htmlMessage);
        } catch (err) {
            console.error(`[NOTIFICATION EMAIL ERROR] ${err.message}`);
        }
    }

    /**
     * Send Registration Welcome (Email Only)
     */
    async sendWelcomeMessage(userData) {
        const { firstName, lastName, mediId, email, role } = userData;
        const name = firstName ? `${firstName} ${lastName || ''}`.trim() : 'User';

        const subject = `Welcome to Medi-Swift - Your Registration is Successful!`;
        const textMessage = `Hello ${name},\n\nWelcome to Medi-Swift! Your registration as a ${role} is complete.\n\nYour Unique Medi-Swift ID: ${mediId}\n\nPlease use this ID for all future logins and bookings.\n\nStay Healthy,\nTeam Medi-Swift`;

        const htmlMessage = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Welcome to Medi-Swift!</h2>
                </div>
                <div style="padding: 30px;">
                    <p>Registration Successful! You are now part of India's fastest medical networking system.</p>
                    <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #64748b;">YOUR MEDI-SWIFT ID</p>
                        <p style="margin: 0; font-size: 28px; font-weight: bold; color: #2563eb;">${mediId}</p>
                    </div>
                    <p style="margin-top: 20px;">Please use this ID to login to your dashboard.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">Team Medi-Swift | Emergency Medical Response System</p>
                </div>
            </div>
        `;

        // Send through Email
        await this.sendEmail(email, subject, textMessage, htmlMessage);
    }
}

module.exports = new NotificationService();
