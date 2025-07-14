const { Equipment, initDatabase } = require('./models/database');

const addMissingEquipment = async () => {
  try {
    await initDatabase();
    
    const missingEquipment = [
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

    for (const equipment of missingEquipment) {
      await Equipment.findOrCreate({
        where: { code: equipment.code },
        defaults: equipment
      });
      console.log(`✅ Added/Updated: ${equipment.code} - ${equipment.name}`);
    }

    const totalCount = await Equipment.count();
    console.log(`🎉 Total equipment items in database: ${totalCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding equipment:', error);
    process.exit(1);
  }
};

addMissingEquipment();