const { Equipment, initDatabase } = require('./models/database');

const removeOldEquipment = async () => {
  try {
    await initDatabase();
    
    console.log('🗑️ Removing old equipment items (those without MSRP values)...');
    
    // Find all equipment with null MSRP values (old seeded data)
    const oldEquipment = await Equipment.findAll({
      where: {
        msrpUSD: null
      }
    });
    
    console.log(`Found ${oldEquipment.length} old equipment items to remove:`);
    
    for (const item of oldEquipment) {
      console.log(`   - ${item.code}: ${item.name}`);
    }
    
    // Delete all equipment with null MSRP values
    const deletedCount = await Equipment.destroy({
      where: {
        msrpUSD: null
      }
    });
    
    console.log(`\n✅ Successfully removed ${deletedCount} old equipment items`);
    
    // Show remaining counts
    const totalCount = await Equipment.count();
    const voidCount = await Equipment.count({ where: { category: 'void' } });
    const accessoryCount = await Equipment.count({ where: { category: 'accessory' } });
    
    console.log(`\n📊 Remaining equipment in database:`);
    console.log(`   Total: ${totalCount}`);
    console.log(`   Void equipment: ${voidCount}`);
    console.log(`   Accessories: ${accessoryCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing old equipment:', error);
    process.exit(1);
  }
};

removeOldEquipment();