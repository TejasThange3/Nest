import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Development mode flag
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize Twilio client conditionally (only in production)
const twilioClient = !isDevelopment && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize email transporter - use Mailtrap for development
const emailTransporter = nodemailer.createTransport({
  host: isDevelopment ? 'sandbox.smtp.mailtrap.io' : 'smtp.gmail.com',
  port: isDevelopment ? 2525 : 587,
  secure: false,
  auth: {
    user: isDevelopment ? process.env.MAILTRAP_USER : process.env.EMAIL_USER,
    pass: isDevelopment ? process.env.MAILTRAP_PASS : process.env.EMAIL_PASSWORD
  }
});

// SMS sending function with development simulation
export const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
  try {
    if (isDevelopment) {
      // In development, just log the SMS instead of sending
      console.log('📱 [DEV] SMS SIMULATION:');
      console.log(`📞 To: ${phoneNumber}`);
      console.log(`💬 Message: ${message}`);
      console.log('✅ SMS simulated successfully (development mode)');
      return;
    }
    
    if (!twilioClient) {
      throw new Error('Twilio not configured for production');
    }
    
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    console.log(`SMS sent to ${phoneNumber}`);
  } catch (error) {
    console.error('SMS sending error:', error);
    throw new Error('Failed to send SMS');
  }
};

// Email sending function
export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Nest Video Calling <noreply@nestvideocalling.com>',
      to,
      subject,
      text,
      html: html || text
    };

    await emailTransporter.sendMail(mailOptions);
    
    if (isDevelopment) {
      console.log('📧 [DEV] Email sent to Mailtrap inbox:');
      console.log(`📬 To: ${to}`);
      console.log(`📝 Subject: ${subject}`);
    } else {
      console.log(`Email sent to ${to}`);
    }
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};
