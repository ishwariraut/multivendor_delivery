"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const createOrderSchema = zod_1.z.object({
    customerId: zod_1.z.string().uuid()
});
const assignDeliveryPartnerSchema = zod_1.z.object({
    deliveryPartnerId: zod_1.z.string().uuid()
});
router.get('/', async (req, res) => {
    try {
        const { user } = req;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        let orders;
        switch (user.role) {
            case 'VENDOR':
                orders = await prisma.order.findMany({
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
                orders = await prisma.order.findMany({
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
                orders = await prisma.order.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { user } = req;
        if (!user || user.role !== 'VENDOR') {
            res.status(403).json({ message: 'Only vendors can create orders' });
            return;
        }
        const { customerId } = createOrderSchema.parse(req.body);
        const order = await prisma.order.create({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        res.status(500).json({ message: 'Something went wrong' });
    }
});
router.put('/:orderId/assign', async (req, res) => {
    try {
        const { user } = req;
        const { orderId } = req.params;
        if (!user || user.role !== 'VENDOR') {
            res.status(403).json({ message: 'Only vendors can assign delivery partners' });
            return;
        }
        const { deliveryPartnerId } = assignDeliveryPartnerSchema.parse(req.body);
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                vendorId: user.id
            }
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                deliveryPartnerId,
                status: 'ASSIGNED'
            },
            include: {
                deliveryPartner: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
        res.json(updatedOrder);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        res.status(500).json({ message: 'Something went wrong' });
    }
});
router.put('/:orderId/status', async (req, res) => {
    try {
        const { user } = req;
        const { orderId } = req.params;
        const { status } = req.body;
        if (!user || user.role !== 'DELIVERY_PARTNER') {
            res.status(403).json({ message: 'Only delivery partners can update order status' });
            return;
        }
        if (!['IN_TRANSIT', 'DELIVERED'].includes(status)) {
            res.status(400).json({ message: 'Invalid status' });
            return;
        }
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                deliveryPartnerId: user.id
            }
        });
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status }
        });
        res.json(updatedOrder);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map