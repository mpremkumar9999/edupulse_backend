import { Server } from 'socket.io';
import Message from '../models/Message.js';
import User from '../models/User.js';

const setupSocketHandlers = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // Handle user online status
    socket.on('userOnline', async (userId) => {
      try {
        console.log('🟢 User online:', userId);
        
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          socketId: socket.id,
          lastSeen: new Date()
        });

        // Get all online users
        const onlineUsers = await User.find(
          { isOnline: true },
          'name username role profilePic isOnline lastSeen'
        );
        
        console.log('📊 Online users count:', onlineUsers.length);
        io.emit('onlineUsers', onlineUsers);
      } catch (error) {
        console.error('❌ Error updating online status:', error);
      }
    });

    // Handle sending messages
    socket.on('sendMessage', async (data) => {
      try {
        console.log('📨 Send message received:', data);
        const { senderId, receiverId, message } = data;

        // Validate required fields
        if (!senderId || !receiverId || !message) {
          console.error('❌ Missing required fields');
          return;
        }

        // Save message to database
        const newMessage = new Message({
          sender: senderId,
          receiver: receiverId,
          message: message
        });

        await newMessage.save();
        console.log('💾 Message saved to database:', newMessage._id);

        // Populate sender info for the message
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'name username profilePic role')
          .populate('receiver', 'name username profilePic role');

        // Send to receiver if online
        const receiver = await User.findById(receiverId);
        if (receiver && receiver.socketId) {
          console.log('📤 Sending message to receiver:', receiver.name);
          io.to(receiver.socketId).emit('newMessage', populatedMessage);
        } else {
          console.log('📴 Receiver offline:', receiverId);
        }

        // Also send back to sender for immediate update
        console.log('📤 Sending message back to sender:', senderId);
        socket.emit('newMessage', populatedMessage);

      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    });

    // Handle request for message history
    socket.on('getMessageHistory', async (data) => {
      try {
        console.log('📚 Get message history:', data);
        const { userId, otherUserId } = data;

        if (!userId || !otherUserId) {
          console.error('❌ Missing user IDs for message history');
          return;
        }

        const messages = await Message.find({
          $or: [
            { sender: userId, receiver: otherUserId },
            { sender: otherUserId, receiver: userId }
          ]
        })
        .populate('sender', 'name username profilePic role')
        .populate('receiver', 'name username profilePic role')
        .sort({ createdAt: -1 })
        .limit(50);

        console.log('📖 Found messages:', messages.length);
        socket.emit('messageHistory', messages.reverse());

      } catch (error) {
        console.error('❌ Error fetching message history:', error);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      try {
        console.log('🔴 User disconnected:', socket.id);
        
        const user = await User.findOne({ socketId: socket.id });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            isOnline: false,
            socketId: null,
            lastSeen: new Date()
          });

          console.log('👤 User marked offline:', user.name);

          const onlineUsers = await User.find(
            { isOnline: true },
            'name username role profilePic isOnline lastSeen'
          );
          
          console.log('📊 Remaining online users:', onlineUsers.length);
          io.emit('onlineUsers', onlineUsers);
        }
      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      }
    });
  });

  console.log('✅ Socket.IO handlers configured');
  return io;
};

export default setupSocketHandlers;