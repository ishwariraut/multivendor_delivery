import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all vendors
router.get('/vendors', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Only allow customers to view vendors
    if (req.user?.role !== 'CUSTOMER') {
      res.status(403).json({ message: 'Only customers can view vendors' });
      return;
    }

    const vendors = await prisma.user.findMany({
      where: {
        role: 'VENDOR',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
});

// Get all delivery partners
router.get('/delivery-partners', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // Only allow vendors to view delivery partners
    if (req.user?.role !== 'VENDOR') {
      res.status(403).json({ message: 'Only vendors can view delivery partners' });
      return;
    }

    const deliveryPartners = await prisma.user.findMany({
      where: {
        role: 'DELIVERY_PARTNER',
        status: {
          in: ['ACTIVE', 'AVAILABLE', 'BUSY']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        deliveryPartner: {
          select: {
            currentLocation: true,
            isActive: true
          }
        }
      }
    });

    // Transform the response to match the frontend interface
    const transformedPartners = deliveryPartners.map(partner => ({
      id: partner.id,
      name: partner.name,
      email: partner.email,
      status: partner.status,
      currentLocation: partner.deliveryPartner?.currentLocation,
      isActive: partner.deliveryPartner?.isActive
    }));

    res.json(transformedPartners);
  } catch (error) {
    console.error('Error fetching delivery partners:', error);
    res.status(500).json({ message: 'Error fetching delivery partners' });
  }
});

export default router; 