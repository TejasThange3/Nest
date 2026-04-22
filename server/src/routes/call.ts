import express from 'express';
import { auth } from '../middleware';
import { Call, ICall } from '../models/Call';
import { User, IUser } from '../models/User';
import { body, validationResult } from 'express-validator';

const router = express.Router();

interface PopulatedCall extends Omit<ICall, 'caller' | 'recipient'> {
  caller: IUser;
  recipient: IUser;
}

// @route   POST /api/call/initiate
// @desc    Initiate a call
// @access  Private
router.post('/initiate', [
  auth,
  body('recipient').isMongoId().withMessage('Please provide a valid recipient ID'),
  body('callType').isIn(['voice', 'video']).withMessage('Call type must be voice or video')
], async (req: any, res: any) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { recipient, callType } = req.body;

    // Verify recipient exists
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ success: false, error: 'Recipient not found' });
    }

    // Check if recipient is online
    if (!recipientUser.isOnline) {
      return res.status(400).json({ success: false, error: 'Recipient is not available' });
    }

    // Check if there's already an active call between these users
    const existingCall = await Call.findOne({
      $or: [
        { caller: req.userId, recipient, status: { $in: ['initiated', 'ringing', 'connected'] } },
        { caller: recipient, recipient: req.userId, status: { $in: ['initiated', 'ringing', 'connected'] } }
      ]
    });

    if (existingCall) {
      return res.status(400).json({ success: false, error: 'Call already in progress' });
    }

    const call = new Call({
      caller: req.userId,
      recipient,
      callType,
      status: 'initiated'
    });

    await call.save();
    await call.populate('caller', 'name profilePicture');
    await call.populate('recipient', 'name profilePicture');

    const populatedCall = call as unknown as PopulatedCall;

    res.status(201).json({
      success: true,
      call: {
        id: populatedCall._id,
        caller: {
          id: populatedCall.caller._id,
          name: populatedCall.caller.name,
          profilePicture: populatedCall.caller.profilePicture
        },
        recipient: {
          id: populatedCall.recipient._id,
          name: populatedCall.recipient.name,
          profilePicture: populatedCall.recipient.profilePicture
        },
        callType: populatedCall.callType,
        status: populatedCall.status,
        createdAt: populatedCall.createdAt
      }
    });
  } catch (error) {
    console.error('Call initiate error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate call' });
  }
});

// @route   PUT /api/call/answer/:callId
// @desc    Answer a call
// @access  Private
router.put('/answer/:callId', auth, async (req: any, res: any) => {
  try {
    const { callId } = req.params;

    const call = await Call.findOneAndUpdate(
      {
        _id: callId,
        recipient: req.userId,
        status: 'ringing'
      },
      {
        status: 'connected',
        startTime: new Date()
      },
      { new: true }
    ).populate('caller', 'name profilePicture')
     .populate('recipient', 'name profilePicture');

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or cannot be answered' });
    }

    const populatedCall = call as unknown as PopulatedCall;

    res.status(200).json({
      success: true,
      call: {
        id: populatedCall._id,
        caller: {
          id: populatedCall.caller._id,
          name: populatedCall.caller.name,
          profilePicture: populatedCall.caller.profilePicture
        },
        recipient: {
          id: populatedCall.recipient._id,
          name: populatedCall.recipient.name,
          profilePicture: populatedCall.recipient.profilePicture
        },
        callType: populatedCall.callType,
        status: populatedCall.status,
        startTime: populatedCall.startTime,
        createdAt: populatedCall.createdAt
      }
    });
  } catch (error) {
    console.error('Call answer error:', error);
    res.status(500).json({ success: false, error: 'Failed to answer call' });
  }
});

// @route   PUT /api/call/decline/:callId
// @desc    Decline a call
// @access  Private
router.put('/decline/:callId', auth, async (req: any, res: any) => {
  try {
    const { callId } = req.params;

    const call = await Call.findOneAndUpdate(
      {
        _id: callId,
        recipient: req.userId,
        status: { $in: ['initiated', 'ringing'] }
      },
      {
        status: 'declined',
        endTime: new Date()
      },
      { new: true }
    ).populate('caller', 'name profilePicture')
     .populate('recipient', 'name profilePicture');

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or cannot be declined' });
    }

    const populatedCall = call as unknown as PopulatedCall;

    res.status(200).json({
      success: true,
      call: {
        id: populatedCall._id,
        caller: {
          id: populatedCall.caller._id,
          name: populatedCall.caller.name,
          profilePicture: populatedCall.caller.profilePicture
        },
        recipient: {
          id: populatedCall.recipient._id,
          name: populatedCall.recipient.name,
          profilePicture: populatedCall.recipient.profilePicture
        },
        callType: populatedCall.callType,
        status: populatedCall.status,
        endTime: populatedCall.endTime,
        createdAt: populatedCall.createdAt
      }
    });
  } catch (error) {
    console.error('Call decline error:', error);
    res.status(500).json({ success: false, error: 'Failed to decline call' });
  }
});

// @route   PUT /api/call/end/:callId
// @desc    End a call
// @access  Private
router.put('/end/:callId', auth, async (req: any, res: any) => {
  try {
    const { callId } = req.params;

    const call = await Call.findOneAndUpdate(
      {
        _id: callId,
        $or: [
          { caller: req.userId },
          { recipient: req.userId }
        ],
        status: 'connected'
      },
      {
        status: 'ended',
        endTime: new Date()
      },
      { new: true }
    ).populate('caller', 'name profilePicture')
     .populate('recipient', 'name profilePicture');

    if (!call) {
      return res.status(404).json({ success: false, error: 'Call not found or cannot be ended' });
    }

    // Calculate duration
    const duration = call.startTime ? 
      Math.floor((call.endTime!.getTime() - call.startTime.getTime()) / 1000) : 0;

    const updatedCall = await Call.findByIdAndUpdate(
      callId,
      { duration },
      { new: true }
    ).populate('caller', 'name profilePicture')
     .populate('recipient', 'name profilePicture');

    const populatedUpdatedCall = updatedCall as unknown as PopulatedCall;

    res.status(200).json({
      success: true,
      call: {
        id: populatedUpdatedCall!._id,
        caller: {
          id: populatedUpdatedCall!.caller._id,
          name: populatedUpdatedCall!.caller.name,
          profilePicture: populatedUpdatedCall!.caller.profilePicture
        },
        recipient: {
          id: populatedUpdatedCall!.recipient._id,
          name: populatedUpdatedCall!.recipient.name,
          profilePicture: populatedUpdatedCall!.recipient.profilePicture
        },
        callType: populatedUpdatedCall!.callType,
        status: populatedUpdatedCall!.status,
        startTime: populatedUpdatedCall!.startTime,
        endTime: populatedUpdatedCall!.endTime,
        duration: populatedUpdatedCall!.duration,
        createdAt: populatedUpdatedCall!.createdAt
      }
    });
  } catch (error) {
    console.error('Call end error:', error);
    res.status(500).json({ success: false, error: 'Failed to end call' });
  }
});

// @route   GET /api/call/history
// @desc    Get call history
// @access  Private
router.get('/history', auth, async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const calls = await Call.find({
      $or: [
        { caller: req.userId },
        { recipient: req.userId }
      ]
    })
    .populate('caller', 'name profilePicture')
    .populate('recipient', 'name profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    res.status(200).json({
      success: true,
      calls: calls.map(call => {
        const populatedCall = call as unknown as PopulatedCall;
        return {
          id: populatedCall._id,
          caller: {
            id: populatedCall.caller._id,
            name: populatedCall.caller.name,
            profilePicture: populatedCall.caller.profilePicture
          },
          recipient: {
            id: populatedCall.recipient._id,
            name: populatedCall.recipient.name,
            profilePicture: populatedCall.recipient.profilePicture
          },
          callType: populatedCall.callType,
          status: populatedCall.status,
          startTime: populatedCall.startTime,
          endTime: populatedCall.endTime,
          duration: populatedCall.duration,
          createdAt: populatedCall.createdAt
        };
      }),
      pagination: {
        page,
        limit,
        hasMore: calls.length === limit
      }
    });
  } catch (error) {
    console.error('Call history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch call history' });
  }
});

// @route   GET /api/call/active
// @desc    Get active calls for user
// @access  Private
router.get('/active', auth, async (req: any, res: any) => {
  try {
    const activeCalls = await Call.find({
      $or: [
        { caller: req.userId },
        { recipient: req.userId }
      ],
      status: { $in: ['initiated', 'ringing', 'connected'] }
    })
    .populate('caller', 'name profilePicture')
    .populate('recipient', 'name profilePicture')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      calls: activeCalls.map(call => {
        const populatedCall = call as unknown as PopulatedCall;
        return {
          id: populatedCall._id,
          caller: {
            id: populatedCall.caller._id,
            name: populatedCall.caller.name,
            profilePicture: populatedCall.caller.profilePicture
          },
          recipient: {
            id: populatedCall.recipient._id,
            name: populatedCall.recipient.name,
            profilePicture: populatedCall.recipient.profilePicture
          },
          callType: populatedCall.callType,
          status: populatedCall.status,
          startTime: populatedCall.startTime,
          createdAt: populatedCall.createdAt
        };
      })
    });
  } catch (error) {
    console.error('Active calls error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active calls' });
  }
});

export default router;
