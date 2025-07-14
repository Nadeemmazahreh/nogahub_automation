const { Sequelize, DataTypes } = require('sequelize');

// Database connection - Use PostgreSQL for production, SQLite for development
let sequelize;

if (process.env.DATABASE_URL) {
  // Production: Use PostgreSQL
  console.log('🐘 Using PostgreSQL database');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else if (process.env.DB_NAME) {
  // Custom MySQL/MariaDB
  console.log('🐬 Using MySQL database');
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else if (process.env.NODE_ENV === 'production') {
  // Production without DATABASE_URL - this is an error
  console.error('❌ No database configuration found in production!');
  console.error('Please add a PostgreSQL database to Railway and ensure DATABASE_URL is set.');
  process.exit(1);
} else {
  // Development: Use SQLite
  console.log('🗃️ Using SQLite database for development');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './nogahub.db',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  });
}

// User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Equipment model
const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dealerUSD: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  clientUSD: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Project model
const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  equipment: {
    type: DataTypes.JSON,
    allowNull: false
  },
  globalDiscount: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  services: {
    type: DataTypes.JSON,
    allowNull: false
  },
  customServices: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  customEquipment: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  roles: {
    type: DataTypes.JSON,
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  isCalculated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  calculationResults: {
    type: DataTypes.JSON,
    defaultValue: null
  }
});

// Associations
User.hasMany(Project, { foreignKey: 'userId' });
Project.belongsTo(User, { foreignKey: 'userId' });

// Database initialization
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ force: false }); // force: false means don't drop existing tables
    console.log('✅ Database models synchronized.');
    
    // Seed initial data if needed
    await seedInitialData();
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Seed initial data
const seedInitialData = async () => {
  try {
    // Check if equipment data exists
    const equipmentCount = await Equipment.count();
    
    if (equipmentCount === 0) {
      console.log('🌱 Seeding initial equipment data...');
      
      const equipmentData = [
        { code: "IT1000", name: "Cyclone 4", dealerUSD: 181.91, clientUSD: 330.75, weight: 1.3, category: "void" },
        { code: "IT1001", name: "Cirrus 6.1", dealerUSD: 129.94, clientUSD: 236.25, weight: 3.5, category: "void" },
        { code: "IT1002", name: "Indigo 6s", dealerUSD: 511.85, clientUSD: 930.15, weight: 5.2, category: "void" },
        { code: "IT1003", name: "Indigo Sub", dealerUSD: 1013.51, clientUSD: 1842.75, weight: 21, category: "void" },
        { code: "IT1004", name: "Air Vantage", dealerUSD: 3441.49, clientUSD: 6257.25, weight: 23.5, category: "void" },
        { code: "IT1005", name: "Airten V3", dealerUSD: 2189.63, clientUSD: 3981.15, weight: 20, category: "void" },
        { code: "IT1006", name: "Air 8", dealerUSD: 816.01, clientUSD: 1483.65, weight: 6.2, category: "void" },
        { code: "IT1007", name: "Venu 112", dealerUSD: 593.26, clientUSD: 1078.65, weight: 27, category: "void" },
        { code: "IT1008", name: "Venu 12", dealerUSD: 575.44, clientUSD: 1046.25, weight: 22, category: "void" },
        { code: "IT1009", name: "Venu 208", dealerUSD: 504, clientUSD: 916.65, weight: 20, category: "void" },
        { code: "IT1010", name: "Venu 212", dealerUSD: 927.38, clientUSD: 1686.15, weight: 47.5, category: "void" },
        { code: "IT1011", name: "Cyclone 8", dealerUSD: 667.51, clientUSD: 1213.65, weight: 14, category: "void" },
        { code: "IT1012", name: "Cyclone 55", dealerUSD: 412.09, clientUSD: 749.25, weight: 3.2, category: "void" },
        { code: "IT1013", name: "Cyclone 10", dealerUSD: 835.31, clientUSD: 1518.75, weight: 14.5, category: "void" },
        { code: "IT1014", name: "Cyclone Bass", dealerUSD: 1216.96, clientUSD: 2212.65, weight: 33.5, category: "void" },
        { code: "IT1015", name: "Bias Q1.5+", dealerUSD: 1951.78, clientUSD: 3049.65, weight: 7, category: "void" },
        { code: "IT1016", name: "Inca 500", dealerUSD: 910.72, clientUSD: 1423, weight: 2.8, category: "void" },
        { code: "IT1017", name: "Bias Q1+", dealerUSD: 1614.82, clientUSD: 2523.15, weight: 7, category: "void" },
        { code: "IT1018", name: "Bias Q2+", dealerUSD: 2573.86, clientUSD: 4021.65, weight: 7, category: "void" },
        { code: "IT1019", name: "Bias Q3+", dealerUSD: 3481.06, clientUSD: 5439.15, weight: 11.5, category: "void" },
        { code: "IT1020", name: "Bias D1", dealerUSD: 1467.94, clientUSD: 2293.65, weight: 7, category: "void" },
        { code: "IT1021", name: "Van Damm Cables 2 x 4mm", dealerUSD: 7.05, clientUSD: 12.83, weight: 0.25, category: "void" },
        { code: "IT1022", name: "Van Damm Cables 2 x 2.5mm", dealerUSD: 4.08, clientUSD: 7.43, weight: 0.25, category: "void" },
        { code: "IT1023", name: "Van Damm Cables 4 x 4mm", dealerUSD: 9.28, clientUSD: 16.88, weight: 0.25, category: "void" },
        { code: "IT1024", name: "Van Damm Cables 4 x 2.5mm", dealerUSD: 5.57, clientUSD: 10.13, weight: 0.25, category: "void" },
        { code: "IT1025", name: "WM Touch Screen", dealerUSD: 316.22, clientUSD: 494.1, weight: 1, category: "void" },
        { code: "AC1006", name: "CAT 6 Cables", dealerUSD: 0.7, clientUSD: 1, weight: 0.1, category: "accessory" },
        { code: "AC1007", name: "NetGear Switch", dealerUSD: 550, clientUSD: 650, weight: 0.1, category: "accessory" },
        { code: "AC1008", name: "Italy Power Cables 2x 4mm", dealerUSD: 2.8, clientUSD: 4.5, weight: 0.25, category: "accessory" },
        { code: "AC1009", name: "Italy Power Cables 2x 2.5mm", dealerUSD: 1.6, clientUSD: 2.8, weight: 0.25, category: "accessory" },
        { code: "AC1010", name: "AHM 16", dealerUSD: 1500, clientUSD: 1500, weight: 3.8, category: "accessory" },
        { code: "AC1011", name: "Scarlet 2i2", dealerUSD: 300, clientUSD: 375, weight: 0.5, category: "accessory" }
      ];
      
      await Equipment.bulkCreate(equipmentData);
      console.log('✅ Equipment data seeded successfully.');
    }

    // Check if users exist and create default users
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('🧑‍💼 Creating default users...');
      
      const bcrypt = require('bcryptjs');
      const defaultUsers = [
        { username: 'admin', email: 'admin@nogahub.com', password: 'admin123', role: 'admin' },
        { username: 'Nadeem', email: 'nadeem@nogahub.com', password: 'Nadeem123', role: 'admin' },
        { username: 'Issa', email: 'issa@nogahub.com', password: 'Issa123', role: 'admin' },
        { username: 'Kareem', email: 'kareem@nogahub.com', password: 'Kareem123', role: 'user' },
        { username: 'Ammar', email: 'ammar@nogahub.com', password: 'Ammar123', role: 'user' }
      ];

      for (const userData of defaultUsers) {
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        await User.create({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        });
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Equipment,
  Project,
  initDatabase
};