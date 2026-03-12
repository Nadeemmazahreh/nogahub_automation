const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const projectRoutes = require('./routes/projects');
const { initDatabase } = require('./models/database');
const { importEquipmentData } = require('./import-equipment-data');
const { cleanupDuplicates } = require('./cleanup-duplicates');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (required for Railway and other cloud platforms)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration with support for Vercel preview deployments
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins and patterns
    const allowedOrigins = [
      'http://localhost:3000',
      'https://nogahub-automation.vercel.app'
    ];

    // Check if origin matches allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check if origin matches Vercel preview deployment pattern
    // Pattern: https://nogahub-automation-*.vercel.app
    const vercelPreviewPattern = /^https:\/\/nogahub-automation-[a-z0-9]+-[a-z0-9-]+\.vercel\.app$/;
    if (vercelPreviewPattern.test(origin)) {
      return callback(null, true);
    }

    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

// Rate limiting - temporarily disabled for debugging
// const limiter = rateLimit({
//   windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
//   max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/projects', projectRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initDatabase();
    
    // Import equipment data if database is empty or missing data
    console.log('🔄 Checking equipment database...');
    const importResult = await importEquipmentData();
    if (importResult.skipped) {
      console.log(`✅ Equipment database is complete with ${importResult.existingCount} items`);
    } else {
      console.log(`✅ Equipment import completed: ${importResult.added} added, ${importResult.updated} updated`);
    }
    
    // Clean up any duplicates
    console.log('🧹 Cleaning up duplicate equipment entries...');
    try {
      const cleanupResult = await cleanupDuplicates(true);
      if (cleanupResult.cleaned > 0) {
        console.log(`✅ Cleaned up ${cleanupResult.cleaned} duplicate entries, kept ${cleanupResult.kept}`);
      } else {
        console.log('✅ No duplicates needed cleanup');
      }
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error.message);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔒 CORS enabled for: production + preview deployments`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();