const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Equipment } = require('../models/database');
const { authenticateToken, authorizeRole, validateInput } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const equipmentSchema = Joi.object({
  code: Joi.string().required(),
  name: Joi.string().required(),
  msrpUSD: Joi.number().precision(2).positive().allow(null),
  dealerUSD: Joi.number().precision(2).positive().required(),
  clientUSD: Joi.number().precision(2).positive().required(),
  weight: Joi.number().precision(2).positive().required(),
  category: Joi.string().required(),
  isActive: Joi.boolean().default(true)
});

// Get all equipment (role-based pricing)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    const { category, search, page = 1, limit = 1000 } = req.query;
    
    console.log(`Equipment query: limit=${limit}, page=${page}, category=${category}, search=${search}`);

    // Build query conditions
    const whereConditions = { isActive: true };
    
    if (category) {
      whereConditions.category = category;
    }
    
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    // Define what fields to return based on user role
    let attributes = ['id', 'code', 'name', 'weight', 'category', 'msrpUSD'];
    
    if (role === 'admin') {
      // Admin can see both dealer and client prices
      attributes.push('dealerUSD', 'clientUSD');
    } else {
      // Regular users only see client prices
      attributes.push('clientUSD');
    }

    // Get equipment with pagination
    const offset = (page - 1) * limit;
    const equipment = await Equipment.findAndCountAll({
      where: whereConditions,
      attributes,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    console.log(`Equipment response: ${equipment.rows.length} items returned, total: ${equipment.count}`);
    
    res.json({
      equipment: equipment.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: equipment.count,
        pages: Math.ceil(equipment.count / limit)
      }
    });

  } catch (error) {
    console.error('Equipment fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single equipment item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    const { id } = req.params;

    // Define attributes based on role
    let attributes = ['id', 'code', 'name', 'weight', 'category', 'msrpUSD'];
    
    if (role === 'admin') {
      attributes.push('dealerUSD', 'clientUSD');
    } else {
      attributes.push('clientUSD');
    }

    const equipment = await Equipment.findOne({
      where: { id, isActive: true },
      attributes
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    res.json({ equipment });

  } catch (error) {
    console.error('Equipment fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new equipment (admin only)
router.post('/', 
  authenticateToken, 
  authorizeRole(['admin']), 
  validateInput(equipmentSchema), 
  async (req, res) => {
    try {
      const equipment = await Equipment.create(req.body);
      res.status(201).json({ 
        message: 'Equipment created successfully',
        equipment 
      });

    } catch (error) {
      console.error('Equipment creation error:', error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Equipment code already exists' });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update equipment (admin only)
router.put('/:id', 
  authenticateToken, 
  authorizeRole(['admin']), 
  validateInput(equipmentSchema), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const [updatedRows] = await Equipment.update(req.body, {
        where: { id }
      });

      if (updatedRows === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      const updatedEquipment = await Equipment.findByPk(id);
      res.json({ 
        message: 'Equipment updated successfully',
        equipment: updatedEquipment 
      });

    } catch (error) {
      console.error('Equipment update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete equipment (admin only - soft delete)
router.delete('/:id', 
  authenticateToken, 
  authorizeRole(['admin']), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const [updatedRows] = await Equipment.update(
        { isActive: false },
        { where: { id } }
      );

      if (updatedRows === 0) {
        return res.status(404).json({ error: 'Equipment not found' });
      }

      res.json({ message: 'Equipment deleted successfully' });

    } catch (error) {
      console.error('Equipment deletion error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get equipment categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const categories = await Equipment.findAll({
      attributes: ['category'],
      where: { isActive: true },
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(item => item.category);
    res.json({ categories: categoryList });

  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;