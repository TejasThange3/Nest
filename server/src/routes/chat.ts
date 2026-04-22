import express from 'express';
import { auth } from '../middleware';
import { Message, IMessage } from '../models/Message';
import { User, IUser } from '../models/User';
import { body, validationResult } from 'express-validator';

const router = express.Router();

interface PopulatedMessage extends Omit<IMessage, 'sender' | 'recipient'> {
  sender: IUser;
  recipient: IUser;
}

// @route   GET /api/chat/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', auth, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get latest message for each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.userId },
            { recipient: req.userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", req.userId] },
              "$recipient",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            id: '$user._id',
            name: '$user.name',
            phoneNumber: '$user.phoneNumber',
            profilePicture: '$user.profilePicture',
            isOnline: '$user.isOnline',
            lastSeen: '$user.lastSeen'
          },
          lastMessage: {
            id: '$lastMessage._id',
            content: '$lastMessage.content',
            messageType: '$lastMessage.messageType',
            sender: '$lastMessage.sender',
            recipient: '$lastMessage.recipient',
            isRead: '$lastMessage.isRead',
            createdAt: '$lastMessage.createdAt'
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    res.status(200).json({
      success: true,
      conversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
      }
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// @route   GET /api/chat/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get('/messages/:userId', auth, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: userId },
        { sender: userId, recipient: req.userId }
      ]
    })
    .populate('sender', 'name profilePicture')
    .populate('recipient', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Mark messages as read
    await Message.updateMany(
      {
        sender: userId,
        recipient: req.userId,
        isRead: false
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      messages: messages.reverse().map(message => {
        const populatedMessage = message as unknown as PopulatedMessage;
        return {
          id: populatedMessage._id,
          content: populatedMessage.content,
          messageType: populatedMessage.messageType,
          sender: {
            id: populatedMessage.sender._id,
            name: populatedMessage.sender.name,
            profilePicture: populatedMessage.sender.profilePicture
          },
          recipient: {
            id: populatedMessage.recipient._id,
            name: populatedMessage.recipient.name,
            profilePicture: populatedMessage.recipient.profilePicture
          },
          isRead: populatedMessage.isRead,
          createdAt: populatedMessage.createdAt
        };
      }),
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// @route   POST /api/chat/send
// @desc    Send a message
// @access  Private
router.post('/send', [
  auth,
  body('recipient').isMongoId().withMessage('Please provide a valid recipient ID'),
  body('content').notEmpty().withMessage('Message content is required'),
  body('messageType').isIn(['text', 'image', 'video', 'audio']).withMessage('Invalid message type')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { recipient, content, messageType } = req.body;

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    const message = new Message({
      sender: req.userId,
      recipient,
      content,
      messageType: messageType || 'text'
    });

    await message.save();
    await message.populate('sender', 'name profilePicture');
    await message.populate('recipient', 'name profilePicture');

    const populatedMessage = message as unknown as PopulatedMessage;

    res.status(201).json({
      success: true,
      message: {
        id: populatedMessage._id,
        content: populatedMessage.content,
        messageType: populatedMessage.messageType,
        sender: {
          id: populatedMessage.sender._id,
          name: populatedMessage.sender.name,
          profilePicture: populatedMessage.sender.profilePicture
        },
        recipient: {
          id: populatedMessage.recipient._id,
          name: populatedMessage.recipient.name,
          profilePicture: populatedMessage.recipient.profilePicture
        },
        isRead: populatedMessage.isRead,
        createdAt: populatedMessage.createdAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// @route   PUT /api/chat/mark-read/:messageId
// @desc    Mark a message as read
// @access  Private
router.put('/mark-read/:messageId', auth, async (req: any, res: any) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOneAndUpdate(
      {
        _id: messageId,
        recipient: req.userId
      },
      { isRead: true },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// @route   GET /api/chat/unread-count
// @desc    Get unread messages count
// @access  Private
router.get('/unread-count', auth, async (req: any, res: any) => {
  try {
    const unreadCount = await Message.countDocuments({
      recipient: req.userId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

export default router;
