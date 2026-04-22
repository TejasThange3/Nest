import { Request, Response } from 'express';
import User from '../models/User';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class AuthController {
  // Send OTP via phone
  static async sendPhoneOTP(req: Request, res: Response) {
    try {
      const { phoneNumber, countryCode } = req.body;
      const fullNumber = `${countryCode}${phoneNumber}`;

      await twilioClient.verify.v2.services
        .create({ friendlyName: 'Nest App Verification' })
        .then(service => 
          twilioClient.verify.v2.services(service.sid)
            .verifications
            .create({ to: fullNumber, channel: 'sms' })
        );

      res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }

  // Verify phone OTP
  static async verifyPhoneOTP(req: Request, res: Response) {
    try {
      const { phoneNumber, countryCode, otp } = req.body;
      const fullNumber = `${countryCode}${phoneNumber}`;

      const verification = await twilioClient.verify.v2.services
        .create({ friendlyName: 'Nest App Verification' })
        .then(service =>
          twilioClient.verify.v2.services(service.sid)
            .verificationChecks
            .create({ to: fullNumber, code: otp })
        );

      if (verification.status === 'approved') {
        // Update user verification status
        await User.findOneAndUpdate(
          { phoneNumber, countryCode },
          { isPhoneVerified: true }
        );
        res.status(200).json({ message: 'Phone number verified successfully' });
      } else {
        res.status(400).json({ error: 'Invalid OTP' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Verification failed' });
    }
  }

  // Send email verification
  static async sendEmailVerification(req: Request, res: Response) {
    try {
      const { email, name } = req.body;
      const verificationToken = jwt.sign(
        { email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      const msg = {
        to: email,
        from: 'your-verified-sender@yourdomain.com',
        subject: 'Welcome to Nest - Verify Your Email',
        html: `
          <h1>Welcome to Nest, ${name}!</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${process.env.CLIENT_URL}/verify-email/${verificationToken}">
            Verify Email
          </a>
        `,
      };

      await sgMail.send(msg);
      res.status(200).json({ message: 'Verification email sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  }

  // Complete registration
  static async register(req: Request, res: Response) {
    try {
      const { name, email, phoneNumber, countryCode } = req.body;

      const newUser = new User({
        name,
        email,
        phoneNumber,
        countryCode,
      });

      await newUser.save();

      const token = jwt.sign(
        { userId: newUser._id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
}
