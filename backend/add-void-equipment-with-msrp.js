const { Equipment, initDatabase } = require('./models/database');
const fs = require('fs');

const addVoidEquipmentWithMSRP = async () => {
  try {
    await initDatabase();
    
    // Read the equipment data with MSRP
    const equipmentData = JSON.parse(fs.readFileSync('/tmp/void_equipment_with_msrp.json', 'utf8'));
    
    console.log(`📦 Adding ${equipmentData.length} Void equipment items with MSRP pricing`);
    
    let added = 0;
    let updated = 0;
    
    for (const equipment of equipmentData) {
      // Round prices to 2 decimal places
      const equipmentRecord = {
        code: equipment.code,
        name: equipment.name,
        msrpUSD: Math.round(equipment.msrpUSD * 100) / 100,    // MSRP (list price)
        dealerUSD: Math.round(equipment.dealerUSD * 100) / 100, // Dealer cost 
        clientUSD: Math.round(equipment.clientUSD * 100) / 100, // Client price
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
        console.log(`✅ Added: ${equipment.code} - ${equipment.name} - MSRP: $${equipmentRecord.msrpUSD}`);
      } else {
        // Update existing record
        await item.update(equipmentRecord);
        updated++;
        console.log(`🔄 Updated: ${equipment.code} - ${equipment.name} - MSRP: $${equipmentRecord.msrpUSD}`);
      }
    }

    // Also add a few essential accessories
    const accessories = [
      { code: "AC1006", name: "CAT 6 Cables", msrpUSD: 1.50, dealerUSD: 0.70, clientUSD: 1.00, weight: 0.1, category: "accessory" },
      { code: "AC1007", name: "NetGear Switch", msrpUSD: 850, dealerUSD: 550, clientUSD: 650, weight: 0.1, category: "accessory" },
      { code: "AC1008", name: "Italy Power Cables 2x 4mm", msrpUSD: 5.50, dealerUSD: 2.80, clientUSD: 4.50, weight: 0.25, category: "accessory" },
      { code: "AC1009", name: "Italy Power Cables 2x 2.5mm", msrpUSD: 3.50, dealerUSD: 1.60, clientUSD: 2.80, weight: 0.25, category: "accessory" },
      { code: "AC1010", name: "AHM 16", msrpUSD: 1850, dealerUSD: 1500, clientUSD: 1500, weight: 3.8, category: "accessory" },
      { code: "AC1011", name: "Scarlet 2i2", msrpUSD: 450, dealerUSD: 300, clientUSD: 375, weight: 0.5, category: "accessory" }
    ];

    for (const accessory of accessories) {
      const [item, created] = await Equipment.findOrCreate({
        where: { code: accessory.code },
        defaults: accessory
      });
      
      if (created) {
        added++;
        console.log(`✅ Added accessory: ${accessory.code} - ${accessory.name} - MSRP: $${accessory.msrpUSD}`);
      }
    }

    const totalCount = await Equipment.count();
    const voidCount = await Equipment.count({ where: { category: 'void' } });
    const accessoryCount = await Equipment.count({ where: { category: 'accessory' } });
    
    console.log(`\n🎉 Summary:`);
    console.log(`   Added: ${added} new equipment items`);
    console.log(`   Updated: ${updated} existing equipment items`);
    console.log(`   Total Void equipment: ${voidCount}`);
    console.log(`   Total accessories: ${accessoryCount}`);
    console.log(`   Total equipment in database: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding Void equipment:', error);
    process.exit(1);
  }
};

addVoidEquipmentWithMSRP();