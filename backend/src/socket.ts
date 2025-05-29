import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './index';

export const initializeSocket = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret'
      ) as { userId: string; role: string };
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room for specific delivery partner updates
    socket.on('join-delivery-room', (deliveryPartnerId: string) => {
      socket.join(`location:${deliveryPartnerId}`);
    });

    // Join room for specific order updates
    socket.on('join-order-room', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    // Handle location updates
    socket.on('location-update', async (data: { orderId: string; latitude: number; longitude: number }) => {
      try {
        const { orderId, latitude, longitude } = data;

        // Save location update to database
        await prisma.location.create({
          data: {
            latitude,
            longitude,
            orderId
          }
        });

        // Broadcast to all clients tracking this order
        io.to(`order:${orderId}`).emit('location-updated', {
          orderId,
          latitude,
          longitude,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}; 