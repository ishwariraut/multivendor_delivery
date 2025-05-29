import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation schema
const locationUpdateSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  orderId: z.string().uuid()
});

// Update delivery partner location
router.post('/update', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'DELIVERY_PARTNER') {
      return res.status(403).json({ message: 'Only delivery partners can update location' });
    }

    const { latitude, longitude, orderId } = locationUpdateSchema.parse(req.body);

    // Verify order exists and is assigned to this delivery partner
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        deliveryPartnerId: req.user.id,
        status: {
          in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Save location update
    const location = await prisma.location.upsert({
      where: { userId: req.user.id },
      update: { latitude, longitude, orderId, timestamp: new Date() },
      create: { latitude, longitude, userId: req.user.id, orderId }
    });

    // Update or create delivery partner's current location
    await prisma.deliveryPartner.upsert({
      where: { userId: req.user.id },
      update: {
        currentLocation: { latitude, longitude },
        isActive: true, // Ensure they're marked as active when updating location
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        currentLocation: { latitude, longitude },
        isActive: true,
        // Add other required fields based on your schema
        // vehicleType: 'BIKE', // example - adjust based on your needs
        // licenseNumber: '', // you might need to handle this differently
      }
    });

    // Emit location update through socket
    req.app.get('io').to(`order-${orderId}`).emit('location-update', {
      orderId,
      deliveryPartnerId: req.user.id,
      location: {
        latitude,
        longitude,
        timestamp: location.timestamp
      }
    });

    return res.json(location);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    console.error('Error updating location:', error);
    return res.status(500).json({ message: 'Failed to update location' });
  }
});

// Get delivery partner's current location
router.get('/current', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'DELIVERY_PARTNER') {
      return res.status(403).json({ message: 'Only delivery partners can access this endpoint' });
    }

    const deliveryPartner = await prisma.deliveryPartner.findUnique({
      where: { userId: req.user.id },
      select: {
        currentLocation: true,
        isActive: true
      }
    });

    if (!deliveryPartner) {
      return res.status(404).json({ message: 'Delivery partner not found' });
    }

    return res.json(deliveryPartner);
  } catch (error) {
    console.error('Error getting current location:', error);
    return res.status(500).json({ message: 'Failed to get current location' });
  }
});

// Get location history for an order
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order exists and user has permission to view it
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { customerId: req.user?.id },
          { vendorId: req.user?.id },
          { deliveryPartnerId: req.user?.id }
        ]
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not authorized' });
    }

    const locations = await prisma.location.findMany({
      where: { orderId },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    return res.json(locations);
  } catch (error) {
    console.error('Error getting location history:', error);
    return res.status(500).json({ message: 'Failed to get location history' });
  }
});

export default router;