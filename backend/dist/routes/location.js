"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const updateLocationSchema = zod_1.z.object({
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    orderId: zod_1.z.string().uuid()
});
router.post('/update', async (req, res) => {
    try {
        const { user } = req;
        if (!user || user.role !== 'DELIVERY_PARTNER') {
            res.status(403).json({ message: 'Only delivery partners can update location' });
            return;
        }
        const { latitude, longitude, orderId } = updateLocationSchema.parse(req.body);
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                deliveryPartnerId: user.id,
                status: { in: ['ASSIGNED', 'IN_TRANSIT'] }
            }
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found or not in active delivery' });
            return;
        }
        const location = await prisma.location.create({
            data: {
                latitude,
                longitude,
                orderId,
                userId: user.id
            }
        });
        res.json(location);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        res.status(500).json({ message: 'Something went wrong' });
    }
});
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { user } = req;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                OR: [
                    { customerId: user.id },
                    { vendorId: user.id },
                    { deliveryPartnerId: user.id }
                ]
            }
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const location = await prisma.location.findFirst({
            where: { orderId },
            orderBy: { timestamp: 'desc' }
        });
        if (!location) {
            res.status(404).json({ message: 'No location data available' });
            return;
        }
        res.json(location);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
router.get('/:orderId/history', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { user } = req;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                OR: [
                    { customerId: user.id },
                    { vendorId: user.id },
                    { deliveryPartnerId: user.id }
                ]
            }
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const locations = await prisma.location.findMany({
            where: { orderId },
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(locations);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.default = router;
//# sourceMappingURL=location.js.map