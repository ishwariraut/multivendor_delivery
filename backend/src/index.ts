import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import orderRoutes from './routes/orders';
import { setupOrderHandlers } from './socket/orderHandlers';

// Routes
import authRoutes from './routes/auth';
import locationRoutes from './routes/location';
import userRoutes from './routes/users';

// Middleware
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Create a single instance of PrismaClient
const prisma = new PrismaClient();

// Middleware

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.0.104:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add JSON parsing middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/location', authenticateToken, locationRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Socket.IO setup
setupOrderHandlers(io);

// Make io accessible to routes
app.set('io', io);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Get port from environment variable or use default
const PORT = process.env.PORT || 3001;
console.log('Attempting to start server on port:', PORT);

const startServer = async () => {
  try {
    // First try to close any existing server
    if (httpServer.listening) {
      httpServer.close();
    }

    httpServer.listen(PORT, () => {
      console.log(`Server successfully started on port ${PORT}`);
    });

    // Handle server errors
    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();

// Export prisma instance
export { prisma };
