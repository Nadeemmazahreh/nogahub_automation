const { Equipment, initDatabase } = require('./models/database');
const fs = require('fs');

const importEquipmentData = async () => {
  try {
    await initDatabase();
    
    // Read the equipment data
    const filename = 'equipment-export.json';
    if (!fs.existsSync(filename)) {
      console.error(`❌ File ${filename} not found. Please run export-equipment-data.js first.`);
      process.exit(1);
    }
    
    const equipmentData = JSON.parse(fs.readFileSync(filename, 'utf8'));
    
    console.log(`📦 Importing ${equipmentData.length} equipment items to production database`);
    
    // Clear existing equipment first (optional)
    const existingCount = await Equipment.count();
    console.log(`🗑️ Found ${existingCount} existing equipment items`);
    
    if (existingCount > 0) {
      console.log('🔄 This will add new equipment or update existing ones by code...');
    }
    
    let added = 0;
    let updated = 0;
    let errors = 0;
    
    for (const equipment of equipmentData) {
      try {
        const [item, created] = await Equipment.findOrCreate({
          where: { code: equipment.code },
          defaults: equipment
        });
        
        if (created) {
          added++;
          if (added % 50 === 0) {
            console.log(`✅ Added ${added} items so far...`);
          }
        } else {
          // Update existing record with new data
          await item.update(equipment);
          updated++;
          if (updated % 50 === 0) {
            console.log(`🔄 Updated ${updated} items so far...`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error with ${equipment.code}: ${error.message}`);
      }
    }

    const totalCount = await Equipment.count({ where: { isActive: true } });
    const voidCount = await Equipment.count({ where: { category: 'void', isActive: true } });
    const accessoryCount = await Equipment.count({ where: { category: 'accessory', isActive: true } });
    
    console.log(`\n🎉 Import Summary:`);
    console.log(`   Added: ${added} new equipment items`);
    console.log(`   Updated: ${updated} existing equipment items`);
    console.log(`   Errors: ${errors} items with errors`);
    console.log(`   Total active Void equipment: ${voidCount}`);
    console.log(`   Total active accessories: ${accessoryCount}`);
    console.log(`   Total active equipment in database: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing equipment:', error);
    process.exit(1);
  }
};

importEquipmentData();