const { Equipment, initDatabase } = require('./models/database');
const { Op } = require('sequelize');

const cleanupDuplicates = async (autoMode = false) => {
  try {
    await initDatabase();
    
    console.log('🧹 Starting duplicate cleanup...');
    
    // Find all Bias Q2+ entries
    const biasEntries = await Equipment.findAll({
      where: {
        name: 'Bias Q2+',
        isActive: true
      },
      order: [['id', 'ASC']] // Keep the first one (original seeding)
    });
    
    console.log(`Found ${biasEntries.length} "Bias Q2+" entries:`);
    biasEntries.forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id} | Code: ${item.code} | Price: $${item.clientUSD} | Weight: ${item.weight}kg`);
    });
    
    if (biasEntries.length > 1) {
      // Keep the one from the import (IT4383) and remove the old seeding one (IT1018)
      const correctEntry = biasEntries.find(item => item.code === 'IT4383');
      const duplicateEntries = biasEntries.filter(item => item.code !== 'IT4383');
      
      if (correctEntry && duplicateEntries.length > 0) {
        console.log(`\n🎯 Keeping correct entry: ${correctEntry.code} - $${correctEntry.clientUSD}, ${correctEntry.weight}kg`);
        console.log(`🗑️ Removing ${duplicateEntries.length} duplicate(s):`);
        
        for (const duplicate of duplicateEntries) {
          console.log(`  Removing ID: ${duplicate.id} | Code: ${duplicate.code} | Price: $${duplicate.clientUSD}`);
          await duplicate.update({ isActive: false });
        }
        
        console.log('✅ Duplicate cleanup completed successfully');
        return { cleaned: duplicateEntries.length, kept: correctEntry.code };
      } else {
        console.log('⚠️ Could not identify correct entry to keep');
        return { error: 'Could not identify correct entry' };
      }
    } else {
      console.log('✅ No Bias Q2+ duplicates found');
      return { cleaned: 0, message: 'No duplicates found' };
    }
    
    // Check for other potential duplicates
    console.log('\n🔍 Checking for other duplicates...');
    const allDuplicates = await Equipment.findAll({
      attributes: ['name', [require('sequelize').fn('COUNT', require('sequelize').col('name')), 'count']],
      where: { isActive: true },
      group: ['name'],
      having: require('sequelize').fn('COUNT', require('sequelize').col('name')).gt(1)
    });
    
    if (allDuplicates.length > 0) {
      console.log(`⚠️ Found ${allDuplicates.length} other items with duplicate names:`);
      allDuplicates.forEach(item => {
        console.log(`  "${item.name}" appears ${item.dataValues.count} times`);
      });
    } else {
      console.log('✅ No other duplicates found');
    }
    
    if (!autoMode) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    if (!autoMode) {
      process.exit(1);
    }
    throw error;
  }
};

// Only run directly if called as script
if (require.main === module) {
  cleanupDuplicates(false);
}

module.exports = { cleanupDuplicates };