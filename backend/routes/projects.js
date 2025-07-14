const express = require('express');
const Joi = require('joi');
const { Op, sequelize } = require('sequelize');
const { Project, User } = require('../models/database');
const { authenticateToken, validateInput } = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const projectSchema = Joi.object({
  projectName: Joi.string().required(),
  clientName: Joi.string().required(),
  equipment: Joi.array().items(
    Joi.object({
      code: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).required(),
  globalDiscount: Joi.number().min(0).max(100).default(0),
  services: Joi.object({
    commissioning: Joi.boolean().default(false),
    noiseControl: Joi.boolean().default(false),
    soundDesign: Joi.boolean().default(false)
  }).required(),
  customServices: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required()
    })
  ).default([]),
  customEquipment: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      price: Joi.number().min(0).required(),
      weight: Joi.number().min(0).required()
    })
  ).default([]),
  roles: Joi.object({
    producer: Joi.string().allow(''),
    projectManager: Joi.string().allow('')
  }).required(),
  total: Joi.number().min(0).default(0),
  isCalculated: Joi.boolean().default(false),
  calculationResults: Joi.object().allow(null).default(null)
});

// Get all projects for authenticated user (or all projects for admins)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build query conditions - admins can see all projects, users only their own
    const whereConditions = userRole === 'admin' ? {} : { userId };
    
    if (search) {
      whereConditions[Op.or] = [
        { projectName: { [Op.like]: `%${search}%` } },
        { clientName: { [Op.like]: `%${search}%` } }
      ];
    }

    // Get projects with pagination
    const offset = (page - 1) * limit;
    const projects = await Project.findAndCountAll({
      where: whereConditions,
      include: userRole === 'admin' ? [{
        model: User,
        attributes: ['username', 'email']
      }] : [],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      projects: projects.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: projects.count,
        pages: Math.ceil(projects.count / limit)
      }
    });

  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await Project.findOne({
      where: { id, userId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });

  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new project or update existing one based on name match
router.post('/save', 
  authenticateToken, 
  validateInput(projectSchema), 
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { projectName, clientName } = req.body;
      
      // Check for existing project with same client and project name
      const existingProject = await Project.findOne({
        where: {
          userId,
          projectName: { [Op.like]: projectName },
          clientName: { [Op.like]: clientName }
        }
      });

      let project;
      let message;

      if (existingProject) {
        // Update existing project
        await Project.update(req.body, {
          where: { id: existingProject.id, userId }
        });
        
        project = await Project.findOne({
          where: { id: existingProject.id, userId }
        });
        message = 'Project updated successfully';
      } else {
        // Create new project
        project = await Project.create({
          ...req.body,
          userId
        });
        message = 'Project created successfully';
      }

      res.status(201).json({ 
        message,
        project 
      });

    } catch (error) {
      console.error('Project save error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create new project
router.post('/', 
  authenticateToken, 
  validateInput(projectSchema), 
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      const project = await Project.create({
        ...req.body,
        userId
      });

      res.status(201).json({ 
        message: 'Project created successfully',
        project 
      });

    } catch (error) {
      console.error('Project creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update project
router.put('/:id', 
  authenticateToken, 
  validateInput(projectSchema), 
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const [updatedRows] = await Project.update(req.body, {
        where: { id, userId }
      });

      if (updatedRows === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const updatedProject = await Project.findOne({
        where: { id, userId }
      });

      res.json({ 
        message: 'Project updated successfully',
        project: updatedProject 
      });

    } catch (error) {
      console.error('Project update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const deletedRows = await Project.destroy({
      where: { id, userId }
    });

    if (deletedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });

  } catch (error) {
    console.error('Project deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Project.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalProjects'],
        [sequelize.fn('SUM', sequelize.col('total')), 'totalValue'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN isCalculated = true THEN 1 END')), 'calculatedProjects']
      ],
      raw: true
    });

    res.json({ stats: stats[0] });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;