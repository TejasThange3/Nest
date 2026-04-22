import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Message, IMessage } from '../models/Message';
import { Call, ICall } from '../models/Call';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface PopulatedMessage extends Omit<IMessage, 'sender' | 'recipient'> {
  sender: IUser;
  recipient: IUser;
}

interface PopulatedCall extends Omit<ICall, 'caller' | 'recipient'> {
  caller: IUser;
  recipient: IUser;
}

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      (socket as AuthenticatedSocket).userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(`User ${authSocket.userId} connected`);

    // Update user online status
    await User.findByIdAndUpdate(authSocket.userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Join user to their personal room
    authSocket.join(authSocket.userId!);

    // Handle user status updates
    authSocket.on('update-status', async (data: { isOnline: boolean }) => {
      try {
        await User.findByIdAndUpdate(authSocket.userId, {
          isOnline: data.isOnline,
          lastSeen: new Date()
        });

        // Broadcast status to contacts
        const user = await User.findById(authSocket.userId).populate('contacts');
        if (user) {
          user.contacts.forEach((contact: any) => {
            authSocket.to(contact._id.toString()).emit('contact-status-update', {
              userId: authSocket.userId,
              isOnline: data.isOnline,
              lastSeen: new Date()
            });
          });
        }
      } catch (error) {
        console.error('Status update error:', error);
      }
    });

    // Handle sending messages
    authSocket.on('send-message', async (data: {
      recipient: string;
      content: string;
      messageType: 'text' | 'image' | 'video' | 'audio';
    }) => {
      try {
        const message = new Message({
          sender: authSocket.userId,
          recipient: data.recipient,
          content: data.content,
          messageType: data.messageType || 'text'
        });

        await message.save();
        await message.populate('sender', 'name profilePicture');
        await message.populate('recipient', 'name profilePicture');

        const populatedMessage = message as unknown as PopulatedMessage;

        const messageData = {
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

        // Send to recipient
        authSocket.to(data.recipient).emit('new-message', messageData);
        
        // Send confirmation to sender
        authSocket.emit('message-sent', messageData);
      } catch (error) {
        console.error('Send message error:', error);
        authSocket.emit('message-error', { error: 'Failed to send message' });
      }
    });

    // Handle message read status
    authSocket.on('mark-message-read', async (data: { messageId: string }) => {
      try {
        const message = await Message.findOneAndUpdate(
          {
            _id: data.messageId,
            recipient: authSocket.userId
          },
          { isRead: true },
          { new: true }
        );

        if (message) {
          // Notify sender that message was read
          authSocket.to(message.sender.toString()).emit('message-read', {
            messageId: data.messageId,
            readBy: authSocket.userId
          });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Handle typing indicators
    authSocket.on('typing', (data: { recipient: string; isTyping: boolean }) => {
      authSocket.to(data.recipient).emit('user-typing', {
        userId: authSocket.userId,
        isTyping: data.isTyping
      });
    });

    // WebRTC Signaling for calls
    authSocket.on('call-initiate', async (data: {
      recipient: string;
      callType: 'voice' | 'video';
    }) => {
      try {
        // Check if recipient is online
        const recipientUser = await User.findById(data.recipient);
        if (!recipientUser || !recipientUser.isOnline) {
          authSocket.emit('call-error', { error: 'Recipient is not available' });
          return;
        }

        const call = new Call({
          caller: authSocket.userId,
          recipient: data.recipient,
          callType: data.callType,
          status: 'initiated'
        });

        await call.save();
        await call.populate('caller', 'name profilePicture');

        const populatedCall = call as unknown as PopulatedCall;

        // Notify recipient of incoming call
        authSocket.to(data.recipient).emit('incoming-call', {
          callId: populatedCall._id,
          caller: {
            id: populatedCall.caller._id,
            name: populatedCall.caller.name,
            profilePicture: populatedCall.caller.profilePicture
          },
          callType: populatedCall.callType
        });

        // Update call status to ringing
        await Call.findByIdAndUpdate(populatedCall._id, { status: 'ringing' });

        authSocket.emit('call-initiated', { callId: populatedCall._id });
      } catch (error) {
        console.error('Call initiate error:', error);
        authSocket.emit('call-error', { error: 'Failed to initiate call' });
      }
    });

    authSocket.on('call-answer', async (data: { callId: string }) => {
      try {
        const call = await Call.findOneAndUpdate(
          {
            _id: data.callId,
            recipient: authSocket.userId,
            status: 'ringing'
          },
          {
            status: 'connected',
            startTime: new Date()
          },
          { new: true }
        );

        if (call) {
          // Notify caller that call was answered
          authSocket.to(call.caller.toString()).emit('call-answered', {
            callId: data.callId
          });

          // Join both users to call room
          authSocket.join(`call-${data.callId}`);
          authSocket.to(call.caller.toString()).emit('join-call-room', {
            room: `call-${data.callId}`
          });
        }
      } catch (error) {
        console.error('Call answer error:', error);
        authSocket.emit('call-error', { error: 'Failed to answer call' });
      }
    });

    authSocket.on('call-decline', async (data: { callId: string }) => {
      try {
        const call = await Call.findOneAndUpdate(
          {
            _id: data.callId,
            recipient: authSocket.userId
          },
          {
            status: 'declined',
            endTime: new Date()
          }
        );

        if (call) {
          // Notify caller that call was declined
          authSocket.to(call.caller.toString()).emit('call-declined', {
            callId: data.callId
          });
        }
      } catch (error) {
        console.error('Call decline error:', error);
      }
    });

    authSocket.on('call-end', async (data: { callId: string }) => {
      try {
        const call = await Call.findOneAndUpdate(
          {
            _id: data.callId,
            $or: [
              { caller: authSocket.userId },
              { recipient: authSocket.userId }
            ]
          },
          {
            status: 'ended',
            endTime: new Date()
          }
        );

        if (call) {
          // Calculate duration if call was connected
          if (call.startTime) {
            const duration = Math.floor((new Date().getTime() - call.startTime.getTime()) / 1000);
            await Call.findByIdAndUpdate(data.callId, { duration });
          }

          // Notify other participant
          const otherUserId = call.caller.toString() === authSocket.userId ? 
            call.recipient.toString() : call.caller.toString();
          
          authSocket.to(otherUserId).emit('call-ended', {
            callId: data.callId
          });

          // Leave call room
          authSocket.leave(`call-${data.callId}`);
          authSocket.to(otherUserId).emit('leave-call-room', {
            room: `call-${data.callId}`
          });
        }
      } catch (error) {
        console.error('Call end error:', error);
      }
    });

    // WebRTC signaling events
    authSocket.on('webrtc-offer', (data: { callId: string; offer: any }) => {
      authSocket.to(`call-${data.callId}`).emit('webrtc-offer', {
        offer: data.offer,
        from: authSocket.userId
      });
    });

    authSocket.on('webrtc-answer', (data: { callId: string; answer: any }) => {
      authSocket.to(`call-${data.callId}`).emit('webrtc-answer', {
        answer: data.answer,
        from: authSocket.userId
      });
    });

    authSocket.on('webrtc-ice-candidate', (data: { callId: string; candidate: any }) => {
      authSocket.to(`call-${data.callId}`).emit('webrtc-ice-candidate', {
        candidate: data.candidate,
        from: authSocket.userId
      });
    });

    // Handle disconnection
    authSocket.on('disconnect', async () => {
      console.log(`User ${authSocket.userId} disconnected`);
      
      // Update user offline status
      await User.findByIdAndUpdate(authSocket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      // Broadcast status to contacts
      try {
        const user = await User.findById(authSocket.userId).populate('contacts');
        if (user) {
          user.contacts.forEach((contact: any) => {
            authSocket.to(contact._id.toString()).emit('contact-status-update', {
              userId: authSocket.userId,
              isOnline: false,
              lastSeen: new Date()
            });
          });
        }
      } catch (error) {
        console.error('Disconnect status update error:', error);
      }

      // End any active calls
      try {
        const activeCalls = await Call.find({
          $or: [
            { caller: authSocket.userId },
            { recipient: authSocket.userId }
          ],
          status: { $in: ['initiated', 'ringing', 'connected'] }
        });

        for (const call of activeCalls) {
          await Call.findByIdAndUpdate(call._id, {
            status: 'ended',
            endTime: new Date()
          });

          const otherUserId = call.caller.toString() === authSocket.userId ? 
            call.recipient.toString() : call.caller.toString();
          
          authSocket.to(otherUserId).emit('call-ended', {
            callId: call._id,
            reason: 'participant-disconnected'
          });
        }
      } catch (error) {
        console.error('Call cleanup error:', error);
      }
    });
  });
};
