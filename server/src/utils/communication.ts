import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Development mode flag - make it dynamic
const isDevelopment = () => process.env.NODE_ENV === 'development';

// Initialize Twilio client lazily (after dotenv is loaded)
let twilioClient: any = null;
const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    console.log('🔧 Initializing Twilio client...');
    console.log(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing'}`);
    console.log(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.log(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || '❌ Missing'}`);
    
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized successfully');
  }
  return twilioClient;
};

// Reset function to force re-initialization
export const resetEmailTransporter = () => {
  emailTransporter = null;
  console.log('🔄 Email transporter reset');
};

// Initialize email transporter lazily (after dotenv is loaded)
let emailTransporter: any = null;
const getEmailTransporter = () => {
  if (!emailTransporter) {
    console.log('📧 Initializing Email transporter...');
    console.log(`MAILTRAP_USER: ${process.env.MAILTRAP_USER ? '✅ Set' : '❌ Missing'}`);
    console.log(`MAILTRAP_PASS: ${process.env.MAILTRAP_PASS ? '✅ Set' : '❌ Missing'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`isDevelopment: ${isDevelopment()}`);
    
    if (isDevelopment()) {
      // Development: Use Mailtrap
      const config = {
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        secure: false,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        }
      };
      console.log('🔧 Email config for Mailtrap:', {
        host: config.host,
        port: config.port,
        user: config.auth.user ? '✅ Set' : '❌ Missing',
        pass: config.auth.pass ? '✅ Set' : '❌ Missing'
      });
      
      emailTransporter = nodemailer.createTransport(config);
      console.log('✅ Email transporter initialized for Mailtrap (development)');
    } else {
      // Production: Use Gmail
      emailTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
      console.log('✅ Email transporter initialized for Gmail (production)');
    }
  }
  return emailTransporter;
};

// Force reset transporter
emailTransporter = null;

// SMS sending function with international support and enhanced error handling
export const sendSMS = async (phoneNumber: string, message: string): Promise<void> => {
  try {
    // Validate phone number format
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      throw new Error('Phone number must be in international format (e.g., +919876543210)');
    }
    
    const client = getTwilioClient();
    
    if (!client) {
      if (isDevelopment()) {
        // In development, simulate SMS
        console.log('📱 [DEV] SMS SIMULATION (Twilio not configured):');
        console.log(`📞 To: ${phoneNumber}`);
        console.log(`💬 Message: ${message}`);
        console.log('✅ SMS simulated successfully (development mode)');
        return;
      }
      throw new Error('Twilio not configured. Please check your TWILIO credentials in .env file');
    }
    
    console.log(`📱 Sending SMS to ${phoneNumber}...`);
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`✅ SMS sent successfully to ${phoneNumber}`);
    console.log(`📋 Message SID: ${result.sid}`);
    console.log(`💰 Cost: $${result.price || 'Unknown'} ${result.priceUnit || ''}`);
    
    // Log if it's an international SMS
    const isInternational = !phoneNumber.startsWith('+1');
    if (isInternational) {
      console.log(`🌍 International SMS sent to ${phoneNumber.substring(0, 3)}***`);
    }
    
  } catch (error: any) {
    console.error('❌ SMS sending error:', error);
    
    // Enhanced error handling for different scenarios
    if (error.code) {
      switch (error.code) {
        case 21211:
          throw new Error('Invalid phone number format. Please use international format (e.g., +919876543210)');
        case 21408:
          throw new Error('Phone number not permitted for SMS. Please check if the number can receive SMS');
        case 21610:
          throw new Error('SMS not supported for this phone number or region');
        case 21614:
          throw new Error('Invalid phone number format for this region');
        case 30003:
          throw new Error('Unreachable destination - phone number may be invalid or carrier issues');
        case 30008:
          throw new Error('Message delivery failed - unknown error');
        case 63016:
          throw new Error('Phone number is not reachable or does not exist');
        default:
          throw new Error(`SMS delivery failed: ${error.message} (Code: ${error.code})`);
      }
    }
    
    throw new Error(`Failed to send SMS: ${error.message}`);
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
    const transporter = getEmailTransporter();
    
    if (!transporter) {
      if (isDevelopment()) {
        // In development, simulate email
        console.log('📧 [DEV] EMAIL SIMULATION (Mailtrap not configured):');
        console.log(`📬 To: ${to}`);
        console.log(`📝 Subject: ${subject}`);
        console.log(`💬 Text: ${text}`);
        console.log('✅ Email simulated successfully (development mode)');
        return;
      }
      throw new Error('Email not configured. Please check your EMAIL credentials in .env file');
    }
    
    console.log('📧 Preparing to send email...');
    console.log(`📬 To: ${to}`);
    console.log(`📝 Subject: ${subject}`);
    console.log(`🔧 Using ${isDevelopment() ? 'Mailtrap' : 'Gmail'} SMTP`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Nest Video Calling <noreply@nestvideocalling.com>',
      to,
      subject,
      text,
      html: html || text
    };

    console.log('📤 Sending email via SMTP...');
    const result = await transporter.sendMail(mailOptions);
    
    if (isDevelopment()) {
      console.log('📧 ✅ Email sent successfully to Mailtrap inbox!');
      console.log(`📬 To: ${to}`);
      console.log(`📝 Subject: ${subject}`);
      console.log(`📋 Message ID: ${result.messageId}`);
    } else {
      console.log(`✅ Email sent successfully to ${to}`);
      console.log(`📋 Message ID: ${result.messageId}`);
    }
  } catch (error: any) {
    console.error('❌ Email sending error:', error);
    console.error('❌ Error details:', {
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command
    });
    
    // Enhanced error handling
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your email credentials.');
    } else if (error.code === 'ECONNECTION') {
      throw new Error('Cannot connect to email server. Please check your internet connection.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Email sending timed out. Please try again.');
    }
    
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
