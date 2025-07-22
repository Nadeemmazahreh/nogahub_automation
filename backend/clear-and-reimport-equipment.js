const { Equipment, initDatabase } = require('./models/database');
const fs = require('fs');

const clearAndReimportEquipment = async () => {
  try {
    await initDatabase();
    
    console.log('🗑️  Clearing existing equipment database...');
    
    // Delete all existing equipment
    const deletedCount = await Equipment.destroy({
      where: {},
      truncate: true
    });
    
    console.log(`✅ Cleared ${deletedCount} existing equipment items`);
    
    // Now re-extract equipment from Excel with correct MSRP pricing
    console.log('📊 Re-extracting equipment data from Excel...');
    
    // We'll need to re-run the Python extraction but store MSRP this time
    console.log('⚠️  Please re-run the Excel extraction script to get fresh data with MSRP pricing');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing equipment:', error);
    process.exit(1);
  }
};

clearAndReimportEquipment();