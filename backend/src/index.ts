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

// Define allowed origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://192.168.0.104:3000',
  'https://multivendor-delivery-1.onrender.com', // Your frontend URL
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []) // Only add if defined
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Create a single instance of PrismaClient
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Add JSON parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/location', authenticateToken, locationRoutes);
app.use('/api/users', authenticateToken, userRoutes);

// Socket.IO setup
setupOrderHandlers(io);

// Make io accessible to routes
app.set('io', io);

// 404 handler for API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error occurred:', err.stack);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    ...(isDevelopment && { error: err.message, stack: err.stack })
  });
});

// Get port from environment variable or use default
const PORT = process.env.PORT || 3001;
console.log('Environment:', process.env.NODE_ENV);
console.log('Allowed origins:', allowedOrigins);
console.log('Attempting to start server on port:', PORT);

const startServer = async () => {
  try {
    // First try to close any existing server
    if (httpServer.listening) {
      httpServer.close();
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server successfully started on port ${PORT}`);
      console.log(`📡 Socket.IO server ready`);
      console.log(`✅ CORS configured for origins: ${allowedOrigins.join(', ')}`);
    });

    // Handle server errors
    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please try a different port.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      httpServer.close(() => {
        console.log('Server closed');
        prisma.$disconnect();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
};

startServer();

// Export prisma instance
export { prisma };
