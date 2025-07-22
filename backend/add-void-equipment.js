const { Equipment, initDatabase } = require('./models/database');
const fs = require('fs');
const path = require('path');

const addVoidEquipment = async () => {
  try {
    await initDatabase();
    
    // Read the extracted equipment data
    const equipmentData = JSON.parse(fs.readFileSync('/tmp/void_equipment.json', 'utf8'));
    
    console.log(`📦 Found ${equipmentData.length} Void equipment items to add`);
    
    let added = 0;
    let updated = 0;
    
    for (const equipment of equipmentData) {
      // Round prices to 2 decimal places
      const equipmentRecord = {
        code: equipment.code,
        name: equipment.name,
        dealerUSD: Math.round(equipment.dealerUSD * 100) / 100,
        clientUSD: Math.round(equipment.clientUSD * 100) / 100,
        weight: equipment.weight,
        category: equipment.category,
        isActive: equipment.isActive
      };
      
      const [item, created] = await Equipment.findOrCreate({
        where: { code: equipment.code },
        defaults: equipmentRecord
      });
      
      if (created) {
        added++;
        console.log(`✅ Added: ${equipment.code} - ${equipment.name} - $${equipmentRecord.clientUSD}`);
      } else {
        // Update existing record with new pricing
        await item.update(equipmentRecord);
        updated++;
        console.log(`🔄 Updated: ${equipment.code} - ${equipment.name} - $${equipmentRecord.clientUSD}`);
      }
    }

    const totalCount = await Equipment.count();
    const voidCount = await Equipment.count({ where: { category: 'void' } });
    
    console.log(`\n🎉 Summary:`);
    console.log(`   Added: ${added} new equipment items`);
    console.log(`   Updated: ${updated} existing equipment items`);
    console.log(`   Total Void equipment: ${voidCount}`);
    console.log(`   Total equipment in database: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Void equipment:', error);
    process.exit(1);
  }
};

addVoidEquipment();