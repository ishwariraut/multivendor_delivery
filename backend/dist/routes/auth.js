"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(2),
    role: zod_1.z.enum(['VENDOR', 'DELIVERY_PARTNER', 'CUSTOMER'])
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
router.get('/', (_req, res) => {
    res.json({ message: 'Auth routes are working!' });
});
router.post('/register', async (req, res) => {
    try {
        console.log('Registration attempt:', req.body);
        const { email, password, name, role } = registerSchema.parse(req.body);
        const existingUser = await index_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await index_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role
            }
        });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        res.status(500).json({
            message: 'Something went wrong',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        console.log('Login attempt:', req.body.email);
        const { email, password } = loginSchema.parse(req.body);
        const user = await index_1.prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
        res.json({
            message: 'Logged in successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error instanceof zod_1.z.ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map