import { Server, Socket } from 'socket.io';
import { prisma } from '../index';
import { OrderStatus } from '@prisma/client';

export const setupOrderHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Join order room
    socket.on('join-order-room', async (orderId: string) => {
      try {
        // Verify order exists
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            vendor: true,
            customer: true,
            deliveryPartner: true
          }
        });

        if (!order) {
          socket.emit('error', { message: 'Order not found' });
          return;
        }

        // Join the room
        socket.join(`order-${orderId}`);
        console.log(`Client ${socket.id} joined room order-${orderId}`);

        // Send initial order data
        socket.emit('order-data', order);
      } catch (error) {
        console.error('Error joining order room:', error);
        socket.emit('error', { message: 'Failed to join order room' });
      }
    });

    // Leave order room
    socket.on('leave-order-room', (orderId: string) => {
      socket.leave(`order-${orderId}`);
      console.log(`Client ${socket.id} left room order-${orderId}`);
    });

    // Update delivery partner location
    socket.on('update-location', async (data: {
      orderId: string;
      deliveryPartnerId: string;
      latitude: number;
      longitude: number;
    }) => {
      try {
        const { orderId, deliveryPartnerId, latitude, longitude } = data;

        // Verify order and delivery partner
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            deliveryPartnerId,
            status: {
              in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]
            }
          }
        });

        if (!order) {
          socket.emit('error', { message: 'Order not found or not in active delivery' });
          return;
        }

        // Save location update using upsert
        const location = await prisma.location.upsert({
          where: {
            userId: deliveryPartnerId
          },
          update: {
            latitude,
            longitude,
            timestamp: new Date()
          },
          create: {
            userId: deliveryPartnerId,
            orderId,
            latitude,
            longitude,
            timestamp: new Date()
          }
        });

        // Update delivery partner's current location
        await prisma.deliveryPartner.update({
          where: { userId: deliveryPartnerId },
          data: {
            currentLocation: { latitude, longitude }
          }
        });

        // Broadcast location update to all clients in the order room
        io.to(`order-${orderId}`).emit('location-update', {
          orderId,
          deliveryPartnerId,
          location: {
            latitude,
            longitude,
            timestamp: location.timestamp
          }
        });
      } catch (error) {
        console.error('Error updating location:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Update order status
    socket.on('update-order-status', async (data: {
      orderId: string;
      deliveryPartnerId: string;
      status: OrderStatus;
    }) => {
      try {
        const { orderId, deliveryPartnerId, status } = data;

        // Verify order and delivery partner
        const order = await prisma.order.findFirst({
          where: {
            id: orderId,
            deliveryPartnerId,
            status: {
              in: [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]
            }
          }
        });

        if (!order) {
          socket.emit('error', { message: 'Order not found or not in active delivery' });
          return;
        }

        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status },
          include: {
            vendor: true,
            customer: true,
            deliveryPartner: true
          }
        });

        // If order is delivered, update delivery partner status
        if (status === OrderStatus.DELIVERED) {
          await prisma.deliveryPartner.update({
            where: { userId: deliveryPartnerId },
            data: { isActive: true }
          });
        }

        // Broadcast order update to all clients in the order room
        io.to(`order-${orderId}`).emit('order-update', updatedOrder);
      } catch (error) {
        console.error('Error updating order status:', error);
        socket.emit('error', { message: 'Failed to update order status' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

// Update location handler
export const handleLocationUpdate = async (
  socket: Socket,
  data: { latitude: number; longitude: number }
) => {
  try {
    const userId = socket.data.user?.id
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Update or create location record
    const location = await prisma.location.upsert({
      where: {
        userId: userId
      },
      update: {
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date()
      },
      create: {
        userId: userId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date()
      }
    })

    // Emit location update to all connected clients
    socket.broadcast.emit('location-update', {
      userId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: location.timestamp
    })

  } catch (error) {
    console.error('Error updating location:', error)
    socket.emit('error', { message: 'Failed to update location' })
  }
} 