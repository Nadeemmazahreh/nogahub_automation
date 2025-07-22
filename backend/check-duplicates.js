const { Equipment, initDatabase } = require('./models/database');

const checkDuplicates = async () => {
  try {
    await initDatabase();
    
    console.log('🔍 Checking for duplicate equipment entries...');
    
    // Find Bias Q2+ entries
    const biasQ2Entries = await Equipment.findAll({
      where: {
        name: {
          [require('sequelize').Op.like]: '%Bias Q2%'
        },
        isActive: true
      },
      attributes: ['id', 'code', 'name', 'msrpUSD', 'dealerUSD', 'clientUSD', 'weight'],
      order: [['name', 'ASC']]
    });
    
    console.log(`\n📋 Found ${biasQ2Entries.length} Bias Q2 related items:`);
    biasQ2Entries.forEach(item => {
      console.log(`  ID: ${item.id} | Code: ${item.code} | Name: ${item.name}`);
      console.log(`    MSRP: $${item.msrpUSD} | Client: $${item.clientUSD} | Weight: ${item.weight}kg\n`);
    });
    
    // Check for duplicate names across all equipment
    console.log('🔍 Checking for other duplicate names...');
    const duplicateNames = await Equipment.findAll({
      attributes: ['name'],
      where: { isActive: true },
      group: ['name'],
      having: require('sequelize').fn('COUNT', require('sequelize').col('name')).gt(1)
    });
    
    if (duplicateNames.length > 0) {
      console.log(`\n⚠️  Found ${duplicateNames.length} duplicate names:`);
      for (const duplicate of duplicateNames) {
        const items = await Equipment.findAll({
          where: { name: duplicate.name, isActive: true },
          attributes: ['id', 'code', 'name', 'clientUSD', 'weight']
        });
        
        console.log(`\n"${duplicate.name}" appears ${items.length} times:`);
        items.forEach(item => {
          console.log(`  ID: ${item.id} | Code: ${item.code} | Price: $${item.clientUSD} | Weight: ${item.weight}kg`);
        });
      }
    } else {
      console.log('✅ No other duplicate names found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
    process.exit(1);
  }
};

checkDuplicates();