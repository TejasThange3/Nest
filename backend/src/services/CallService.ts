import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: RTCSessionDescription;
  candidate?: RTCIceCandidate;
  partnerId: string;
}

export class CallService {
  private io: Server;

  constructor(server: ReturnType<typeof createServer>) {
    this.io = new Server(server);
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      // Handle incoming call offers
      socket.on('offer', (data: CallSignal) => {
        socket.to(data.partnerId).emit('offer', {
          sdp: data.sdp,
          fromId: socket.id,
        });
      });

      // Handle call answers
      socket.on('answer', (data: CallSignal) => {
        socket.to(data.partnerId).emit('answer', {
          sdp: data.sdp,
          fromId: socket.id,
        });
      });

      // Handle ICE candidates
      socket.on('ice-candidate', (data: CallSignal) => {
        socket.to(data.partnerId).emit('ice-candidate', {
          candidate: data.candidate,
          fromId: socket.id,
        });
      });

      // Handle call end
      socket.on('end-call', (partnerId: string) => {
        socket.to(partnerId).emit('call-ended', {
          fromId: socket.id,
        });
      });

      // Handle call rejection
      socket.on('reject-call', (partnerId: string) => {
        socket.to(partnerId).emit('call-rejected', {
          fromId: socket.id,
        });
      });

      // Handle call requests
      socket.on('call-request', (data: { 
        partnerId: string;
        callType: 'audio' | 'video';
      }) => {
        socket.to(data.partnerId).emit('incoming-call', {
          fromId: socket.id,
          callType: data.callType,
        });
      });
    });
  }
}
