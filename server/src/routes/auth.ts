import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { sendEmail } from '../utils';

const router = express.Router();
const HARDCODED_PHONE_OTP = '0000';
const PHONE_OTP_EXPIRES_MS = 10 * 60 * 1000;
const VERIFIED_PHONE_SESSION_MS = 30 * 60 * 1000;
const pendingPhoneVerifications = new Map<string, { code: string; expiresAt: number }>();
const verifiedPhoneSessions = new Map<string, number>();

const clearExpiredPhoneState = () => {
  const now = Date.now();
  for (const [phone, entry] of pendingPhoneVerifications.entries()) {
    if (entry.expiresAt <= now) pendingPhoneVerifications.delete(phone);
  }
  for (const [phone, expiresAt] of verifiedPhoneSessions.entries()) {
    if (expiresAt <= now) verifiedPhoneSessions.delete(phone);
  }
};

// Generate verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
};

const isDevelopment = (): boolean => process.env.NODE_ENV !== 'production';

// @route   POST /api/auth/send-phone-code
// @desc    Send verification code to phone
// @access  Public
router.post('/send-phone-code', [
  body('phoneNumber').isMobilePhone('any').withMessage('Please provide a valid phone number')
], async (req: any, res: any) => {
  try {
    clearExpiredPhoneState();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phoneNumber } = req.body;
    pendingPhoneVerifications.set(phoneNumber, {
      code: HARDCODED_PHONE_OTP,
      expiresAt: Date.now() + PHONE_OTP_EXPIRES_MS,
    });
    verifiedPhoneSessions.delete(phoneNumber);

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error: any) {
    console.error('Phone verification error:', error);
    const message =
      typeof error?.message === 'string' && error.message.trim().length > 0
        ? error.message
        : 'Failed to send verification code';
    res.status(500).json({ success: false, error: message });
  }
});

// @route   POST /api/auth/verify-phone
// @desc    Verify phone number with code
// @access  Public
router.post('/verify-phone', [
  body('phoneNumber').isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('code').isLength({ min: 4, max: 4 }).withMessage('Verification code must be 4 digits')
], async (req: any, res: any) => {
  try {
    clearExpiredPhoneState();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phoneNumber, code } = req.body;
    const pending = pendingPhoneVerifications.get(phoneNumber);

    if (!pending || pending.expiresAt <= Date.now() || pending.code !== String(code).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    pendingPhoneVerifications.delete(phoneNumber);
    verifiedPhoneSessions.set(phoneNumber, Date.now() + VERIFIED_PHONE_SESSION_MS);

    res.status(200).json({
      success: true,
      message: 'Phone verification successful'
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// @route   POST /api/auth/send-email-code
// @desc    Send verification code to email
// @access  Public
router.post('/send-email-code', [
  body('email').isEmail().withMessage('Please provide a valid email address')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const verificationCode = generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        name: email.split('@')[0], // Use email prefix as temporary name
        verificationCode,
        verificationCodeExpires,
        isVerified: false
      });
    } else {
      user.verificationCode = verificationCode;
      user.verificationCodeExpires = verificationCodeExpires;
    }

    await user.save();

    // Send email
    await sendEmail(
      email,
      'Nest Verification Code',
      `Your verification code is: ${verificationCode}`
    );

    res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification code' });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with code
// @access  Public
router.post('/verify-email', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// @route   POST /api/auth/register
// @desc    Complete user registration with phone and email verification
// @access  Public
router.post('/register', [
  body('phoneNumber').isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('firstName').isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req: any, res: any) => {
  try {
    clearExpiredPhoneState();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phoneNumber, email, username, firstName, lastName, password } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();
    const phoneVerifiedUntil = verifiedPhoneSessions.get(phoneNumber);
    if (!phoneVerifiedUntil || phoneVerifiedUntil <= Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be verified before registration.'
      });
    }

    const existingPhone = await User.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(409).json({
        success: false,
        error: 'Phone number is already registered. Please sign in.'
      });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email is already registered. Please sign in.'
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    const targetUser = new User({
      phoneNumber,
      email: normalizedEmail,
      username,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      password,
      isVerified: true,
      verificationCode: undefined,
      verificationCodeExpires: undefined,
    });
    await targetUser.save();
    verifiedPhoneSessions.delete(phoneNumber);

    const token = generateToken(targetUser._id.toString());

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      token,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        name: targetUser.name,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        phoneNumber: targetUser.phoneNumber,
        email: targetUser.email,
        profilePicture: targetUser.profilePicture,
        isVerified: targetUser.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user with email/username and password
// @access  Public
router.post('/login', [
  body('login').notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { login, password } = req.body;
    const normalizedLogin = String(login).trim().toLowerCase();

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: normalizedLogin },
        { username: String(login).trim() }
      ],
      isVerified: true
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        email: user.email,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// @route   DELETE /api/auth/cleanup-users
// @desc    Clean up duplicate users (development only)
// @access  Public
router.delete('/cleanup-users', async (req: any, res: any) => {
  if (!isDevelopment()) {
    return res.status(403).json({ success: false, error: 'Forbidden in production' });
  }

  try {
    // Delete all users to start fresh
    const result = await User.deleteMany({});
    
    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deletedCount} users`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, error: 'Cleanup failed' });
  }
});

// @route   DELETE /api/auth/force-delete-user/:id
// @desc    Force delete specific user by ID (development only)
// @access  Public
router.delete('/force-delete-user/:id', async (req: any, res: any) => {
  if (!isDevelopment()) {
    return res.status(403).json({ success: false, error: 'Forbidden in production' });
  }

  try {
    const { id } = req.params;
    const result = await User.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: `Force deleted user ${id}`,
      deletedUser: result
    });
  } catch (error) {
    console.error('Force delete error:', error);
    res.status(500).json({ success: false, error: 'Force delete failed' });
  }
});

// @route   GET /api/auth/debug-user/:email
// @desc    Debug user data (development only)
// @access  Public
router.get('/debug-user/:email', async (req: any, res: any) => {
  if (!isDevelopment()) {
    return res.status(403).json({ success: false, error: 'Forbidden in production' });
  }

  try {
    const { email } = req.params;
    const user = await User.findOne({ email: String(email).toLowerCase() });
    
    res.status(200).json({
      success: true,
      user: user ? {
        id: user._id,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName
      } : null
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, error: 'Debug failed' });
  }
});

export default router;
