const { Equipment, initDatabase } = require('./models/database');
const { Op } = require('sequelize');

const cleanupDuplicates = async (autoMode = false) => {
  try {
    await initDatabase();
    
    console.log('🧹 Starting comprehensive duplicate cleanup...');
    
    // First, remove ALL original seeded equipment (IT1000-IT1025, AC1006-AC1011)
    console.log('🗑️ Removing original seeded equipment...');
    const originalSeedCodes = [
      'IT1000', 'IT1001', 'IT1002', 'IT1003', 'IT1004', 'IT1005', 'IT1006', 'IT1007', 'IT1008', 'IT1009',
      'IT1010', 'IT1011', 'IT1012', 'IT1013', 'IT1014', 'IT1015', 'IT1016', 'IT1017', 'IT1018', 'IT1019',
      'IT1020', 'IT1021', 'IT1022', 'IT1023', 'IT1024', 'IT1025', 'AC1006', 'AC1007', 'AC1008', 'AC1009',
      'AC1010', 'AC1011'
    ];
    
    const removedSeeds = await Equipment.update(
      { isActive: false },
      { 
        where: { 
          code: { [Op.in]: originalSeedCodes },
          isActive: true 
        } 
      }
    );
    
    console.log(`✅ Removed ${removedSeeds[0]} original seeded equipment items`);
    
    // Now find and clean up any remaining duplicates by name
    console.log('🔍 Finding duplicate equipment names...');
    const duplicateNames = await Equipment.findAll({
      attributes: ['name', [require('sequelize').fn('COUNT', require('sequelize').col('name')), 'count']],
      where: { isActive: true },
      group: ['name'],
      having: require('sequelize').fn('COUNT', require('sequelize').col('name')).gt(1)
    });
    
    let totalCleaned = removedSeeds[0];
    
    if (duplicateNames.length > 0) {
      console.log(`⚠️ Found ${duplicateNames.length} equipment names with duplicates:`);
      
      for (const duplicate of duplicateNames) {
        const items = await Equipment.findAll({
          where: { name: duplicate.name, isActive: true },
          order: [['id', 'ASC']] // Keep the first one
        });
        
        console.log(`\n"${duplicate.name}" appears ${items.length} times:`);
        items.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id} | Code: ${item.code} | Price: $${item.clientUSD}`);
        });
        
        // Keep the first item, deactivate the rest
        const duplicatesToRemove = items.slice(1); // Remove all except first
        for (const dup of duplicatesToRemove) {
          console.log(`  🗑️ Removing duplicate: ${dup.code} - ${dup.name}`);
          await dup.update({ isActive: false });
          totalCleaned++;
        }
      }
    }
    
    console.log(`✅ Total cleanup completed: ${totalCleaned} duplicates removed`);
    return { cleaned: totalCleaned, message: 'Comprehensive cleanup completed' };
    
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