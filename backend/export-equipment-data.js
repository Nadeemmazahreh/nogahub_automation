const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');

// Connect to local SQLite database
const sqliteSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './nogahub.db',
  logging: false
});

// Define Equipment model for SQLite
const Equipment = sqliteSequelize.define('Equipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  msrpUSD: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  dealerUSD: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  clientUSD: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  weight: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const exportEquipmentData = async () => {
  try {
    console.log('🔍 Connecting to local SQLite database...');
    await sqliteSequelize.authenticate();
    
    console.log('📦 Exporting equipment data...');
    const equipment = await Equipment.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']]
    });
    
    console.log(`✅ Found ${equipment.length} active equipment items`);
    
    // Convert to plain objects and clean the data
    const equipmentData = equipment.map(item => {
      const data = item.toJSON();
      delete data.id; // Remove ID to avoid conflicts
      delete data.createdAt;
      delete data.updatedAt;
      
      // Ensure proper numeric values
      if (data.msrpUSD) data.msrpUSD = parseFloat(data.msrpUSD);
      if (data.dealerUSD) data.dealerUSD = parseFloat(data.dealerUSD);
      if (data.clientUSD) data.clientUSD = parseFloat(data.clientUSD);
      if (data.weight) data.weight = parseFloat(data.weight);
      
      return data;
    });
    
    // Save to JSON file
    const filename = 'equipment-export.json';
    fs.writeFileSync(filename, JSON.stringify(equipmentData, null, 2));
    
    console.log(`💾 Exported ${equipmentData.length} equipment items to ${filename}`);
    console.log('📊 Sample data:');
    console.log(JSON.stringify(equipmentData.slice(0, 3), null, 2));
    
    await sqliteSequelize.close();
    
  } catch (error) {
    console.error('❌ Error exporting equipment data:', error);
    process.exit(1);
  }
};

exportEquipmentData();