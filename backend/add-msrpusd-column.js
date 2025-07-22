const { sequelize, Equipment } = require('./models/database');

const addMSRPColumn = async () => {
  try {
    console.log('🔍 Checking database type and msrpUSD column...');
    
    const dialect = sequelize.getDialect();
    console.log(`📊 Database dialect: ${dialect}`);
    
    let columnExists = false;
    
    if (dialect === 'postgres') {
      // PostgreSQL check
      const [results] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Equipment' 
          AND column_name = 'msrpUSD'
          AND table_schema = 'public'
      `);
      columnExists = results.length > 0;
    } else if (dialect === 'sqlite') {
      // SQLite check
      try {
        const [results] = await sequelize.query(`PRAGMA table_info(Equipment)`);
        columnExists = results.some(col => col.name === 'msrpUSD');
      } catch (error) {
        console.log('⚠️ Could not check SQLite columns, assuming column does not exist');
        columnExists = false;
      }
    }
    
    if (columnExists) {
      console.log('✅ msrpUSD column already exists');
      return;
    }
    
    console.log('🔧 Adding msrpUSD column to Equipment table...');
    
    // Add the column (works for both PostgreSQL and SQLite)
    if (dialect === 'postgres') {
      await sequelize.query(`
        ALTER TABLE "Equipment" 
        ADD COLUMN "msrpUSD" DECIMAL(10,2) NULL
      `);
    } else {
      await sequelize.query(`
        ALTER TABLE Equipment 
        ADD COLUMN msrpUSD DECIMAL(10,2) NULL
      `);
    }
    
    console.log('✅ msrpUSD column added successfully');
    
    // Optional: Update existing records with sample MSRP data
    console.log('🔄 Updating existing records with calculated MSRP...');
    if (dialect === 'postgres') {
      await sequelize.query(`
        UPDATE "Equipment" 
        SET "msrpUSD" = "clientUSD" * 1.3 
        WHERE "msrpUSD" IS NULL
      `);
    } else {
      await sequelize.query(`
        UPDATE Equipment 
        SET msrpUSD = clientUSD * 1.3 
        WHERE msrpUSD IS NULL
      `);
    }
    
    console.log('✅ Database migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addMSRPColumn()
    .then(() => {
      console.log('Migration completed, closing connection...');
      sequelize.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      sequelize.close();
      process.exit(1);
    });
}

module.exports = { addMSRPColumn };