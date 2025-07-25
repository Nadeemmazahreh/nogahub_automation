const jwt = require('jsonwebtoken');
const Joi = require('joi');

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    console.log('🔍 Validating request body:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      console.error('❌ Validation failed:', error.details.map(detail => ({
        path: detail.path,
        message: detail.message,
        value: detail.context?.value
      })));
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details.map(detail => detail.message),
        validationErrors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      });
    }
    
    console.log('✅ Validation passed');
    next();
  };
};

// API Key validation middleware (for additional security)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Valid API key required' });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeRole,
  validateInput,
  validateApiKey
};