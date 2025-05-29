"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
const orders_1 = __importDefault(require("./routes/orders"));
const location_1 = __importDefault(require("./routes/location"));
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});
exports.prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join-order-tracking', (orderId) => {
        socket.join(`order-${orderId}`);
    });
    socket.on('location-update', async (data) => {
        try {
            const { orderId, latitude, longitude } = data;
            await exports.prisma.location.create({
                data: {
                    latitude,
                    longitude,
                    orderId
                }
            });
            io.to(`order-${orderId}`).emit('location-updated', {
                orderId,
                latitude,
                longitude,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error('Error updating location:', error);
        }
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/orders', auth_2.authenticateToken, orders_1.default);
app.use('/api/location', auth_2.authenticateToken, location_1.default);
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map