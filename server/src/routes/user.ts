import express from 'express';
import { auth } from '../middleware';
import { User } from '../models/User';
import { body, validationResult } from 'express-validator';
import { upload } from '../utils';

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.userId).select('-verificationCode -verificationCodeExpires');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('name').optional().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email address')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email } = req.body;
    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: req.userId } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
      updateData.email = email;
      updateData.isVerified = false; // Reset verification if email is changed
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true }
    ).select('-verificationCode -verificationCodeExpires');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// @route   POST /api/user/upload-avatar
// @desc    Upload user profile picture
// @access  Private
router.post('/upload-avatar', auth, upload.single('avatar'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select('-verificationCode -verificationCodeExpires');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      profilePicture: profilePictureUrl,
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
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
});

// @route   GET /api/user/search
// @desc    Search users by name or phone number
// @access  Private
router.get('/search', auth, async (req: any, res: any) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      _id: { $ne: req.userId }, // Exclude current user
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phoneNumber: { $regex: q } }
      ]
    })
    .select('name phoneNumber profilePicture isOnline lastSeen')
    .limit(20);

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }))
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

// @route   GET /api/user/contacts
// @desc    Get user's contacts
// @access  Private
router.get('/contacts', auth, async (req: any, res: any) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: 'contacts',
      select: 'name phoneNumber profilePicture isOnline lastSeen'
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      contacts: user.contacts.map((contact: any) => ({
        id: contact._id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        profilePicture: contact.profilePicture,
        isOnline: contact.isOnline,
        lastSeen: contact.lastSeen
      }))
    });
  } catch (error) {
    console.error('Contacts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// @route   POST /api/user/add-contact
// @desc    Add user to contacts
// @access  Private
router.post('/add-contact', [
  auth,
  body('userId').isMongoId().withMessage('Please provide a valid user ID')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { userId } = req.body;

    if (userId === req.userId) {
      return res.status(400).json({ success: false, error: 'Cannot add yourself as a contact' });
    }

    const contactUser = await User.findById(userId);
    if (!contactUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Current user not found' });
    }

    // Check if contact already exists
    if (user.contacts.includes(userId)) {
      return res.status(400).json({ success: false, error: 'User is already in your contacts' });
    }

    // Add to both users' contact lists
    user.contacts.push(userId);
    contactUser.contacts.push(req.userId);

    await user.save();
    await contactUser.save();

    res.status(200).json({
      success: true,
      message: 'Contact added successfully',
      contact: {
        id: contactUser._id,
        name: contactUser.name,
        phoneNumber: contactUser.phoneNumber,
        profilePicture: contactUser.profilePicture,
        isOnline: contactUser.isOnline,
        lastSeen: contactUser.lastSeen
      }
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to add contact' });
  }
});

export default router;
