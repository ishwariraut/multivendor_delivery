import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prismaClient = new PrismaClient();

// Validation schemas
const createOrderSchema = z.object({
  customerId: z.string().uuid()
});

const assignDeliveryPartnerSchema = z.object({
  deliveryPartnerId: z.string().uuid()
});

// Get all orders (filtered by role)
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req;
    
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let orders;
    switch (user.role) {
      case 'VENDOR':
        orders = await prismaClient.order.findMany({
          where: { vendorId: user.id },
          include: {
            customer: {
              select: { id: true, name: true, email: true }
            },
            deliveryPartner: {
              select: { id: true, name: true, email: true }
            },
            locations: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        });
        break;

      case 'DELIVERY_PARTNER':
        orders = await prismaClient.order.findMany({
          where: { deliveryPartnerId: user.id },
          include: {
            vendor: {
              select: { id: true, name: true, email: true }
            },
            customer: {
              select: { id: true, name: true, email: true }
            },
            locations: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        });
        break;

      case 'CUSTOMER':
        orders = await prismaClient.order.findMany({
          where: { customerId: user.id },
          include: {
            vendor: {
              select: { id: true, name: true, email: true }
            },
            deliveryPartner: {
              select: { id: true, name: true, email: true }
            },
            locations: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        });
        break;

      default:
        res.status(403).json({ message: 'Invalid role' });
        return;
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Create new order
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = req;
    
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { vendorId } = req.body;

    // If user is a customer, create order with their ID as customerId
    if (user.role === 'CUSTOMER') {
      const order = await prismaClient.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          vendorId,
          customerId: user.id,
          status: 'PENDING'
        },
        include: {
          vendor: {
            select: { id: true, name: true, email: true }
          },
          customer: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      res.status(201).json(order);
      return;
    }

    // If user is a vendor, create order with provided customerId
    if (user.role === 'VENDOR') {
      const { customerId } = createOrderSchema.parse(req.body);

      const order = await prismaClient.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          vendorId: user.id,
          customerId
        },
        include: {
          customer: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      res.status(201).json(order);
      return;
    }

    res.status(403).json({ message: 'Invalid role for order creation' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// Get all orders for a vendor
router.get('/vendor', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'VENDOR') {
      return res.status(403).json({ message: 'Only vendors can access this endpoint' });
    }

    const orders = await prismaClient.order.findMany({
      where: { vendorId: req.user.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        deliveryPartner: {
          include: {
            deliveryPartner: {
              select: {
                currentLocation: true,
                isActive: true
              }
            }
          }
        },
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(orders);
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

// Assign delivery partner to order
router.post('/:orderId/assign', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { deliveryPartnerId } = assignDeliveryPartnerSchema.parse(req.body);

    // Check if user is a vendor
    if (req.user?.role !== 'VENDOR') {
      res.status(403).json({ message: 'Only vendors can assign delivery partners' });
      return;
    }

    // Check if order exists and belongs to the vendor
    const order = await prismaClient.order.findFirst({
      where: {
        id: orderId,
        vendorId: req.user.id,
        status: 'PENDING'
      }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found or not available for assignment' });
      return;
    }

    // Check if delivery partner exists and is available
    const deliveryPartner = await prismaClient.user.findFirst({
      where: {
        id: deliveryPartnerId,
        role: 'DELIVERY_PARTNER',
        status: {
          in: ['ACTIVE', 'AVAILABLE', 'BUSY']
        }
      }
    });

    if (!deliveryPartner) {
      res.status(404).json({ message: 'Delivery partner not found or not available' });
      return;
    }

    // Update order with delivery partner
    const updatedOrder = await prismaClient.order.update({
      where: { id: orderId },
      data: {
        deliveryPartnerId,
        status: 'ASSIGNED'
      },
      include: {
        vendor: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        },
        deliveryPartner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Update delivery partner status to BUSY
    await prismaClient.user.update({
      where: { id: deliveryPartnerId },
      data: { status: 'BUSY' }
    });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('order-updated', updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error assigning delivery partner:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
      return;
    }
    res.status(500).json({ message: 'Error assigning delivery partner' });
  }
});

// Update delivery partner location
router.post('/delivery/location', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'DELIVERY_PARTNER') {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    const { latitude, longitude } = req.body;

    const deliveryPartner = await prismaClient.deliveryPartner.update({
      where: { userId: req.user.id },
      data: {
        currentLocation: { latitude, longitude },
      },
    });

    // Emit location update through WebSocket
    req.app.get('io').emit(`location:${deliveryPartner.id}`, {
      latitude,
      longitude,
    });

    res.json(deliveryPartner);
  } catch (error) {
    res.status(500).json({ message: 'Error updating location' });
  }
});

// Get order tracking details
router.get('/:orderId/track', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order exists and user has permission to view it
    const order = await prismaClient.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { customerId: req.user?.id },
          { vendorId: req.user?.id },
          { deliveryPartnerId: req.user?.id }
        ]
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            location: true
          }
        },
        deliveryPartner: {
          select: {
            id: true,
            name: true,
            email: true,
            deliveryPartner: {
              select: {
                currentLocation: true,
                isActive: true
              }
            }
          }
        },
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not authorized' });
    }

    // Transform the response to include delivery partner location in a more accessible format
    const transformedOrder = {
      ...order,
      deliveryPartner: order.deliveryPartner ? {
        ...order.deliveryPartner,
        location: order.deliveryPartner.deliveryPartner?.currentLocation
      } : null
    };

    return res.json(transformedOrder);
  } catch (error) {
    console.error('Error getting order tracking details:', error);
    return res.status(500).json({ message: 'Failed to get order tracking details' });
  }
});

// Update order status
router.put('/:orderId/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ message: 'Invalid order status' });
      return;
    }

    // Check if order exists and user has permission
    const order = await prismaClient.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { vendorId: req.user?.id },
          { deliveryPartnerId: req.user?.id }
        ]
      }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found or unauthorized' });
      return;
    }

    // Update order status
    const updatedOrder = await prismaClient.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        vendor: {
          select: { id: true, name: true, email: true }
        },
        customer: {
          select: { id: true, name: true, email: true }
        },
        deliveryPartner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // If order is delivered, update delivery partner status back to AVAILABLE
    if (status === 'DELIVERED' && order.deliveryPartnerId) {
      await prismaClient.user.update({
        where: { id: order.deliveryPartnerId },
        data: { status: 'AVAILABLE' }
      });
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('order-updated', updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

export default router;