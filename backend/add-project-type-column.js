const { sequelize, Project } = require('./models/database');

const addProjectTypeColumn = async () => {
  try {
    console.log('🔍 Checking database type and projectType column...');

    const dialect = sequelize.getDialect();
    console.log(`📊 Database dialect: ${dialect}`);

    let columnExists = false;

    if (dialect === 'postgres') {
      // PostgreSQL check
      const [results] = await sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Projects'
          AND column_name = 'projectType'
          AND table_schema = 'public'
      `);
      columnExists = results.length > 0;
    } else if (dialect === 'sqlite') {
      // SQLite check
      try {
        const [results] = await sequelize.query(`PRAGMA table_info(Projects)`);
        columnExists = results.some(col => col.name === 'projectType');
      } catch (error) {
        console.log('⚠️ Could not check SQLite columns, assuming column does not exist');
        columnExists = false;
      }
    }

    if (columnExists) {
      console.log('✅ projectType column already exists');
      return;
    }

    console.log('🔧 Adding projectType column to Projects table...');

    // Add the column (works for both PostgreSQL and SQLite)
    if (dialect === 'postgres') {
      await sequelize.query(`
        ALTER TABLE "Projects"
        ADD COLUMN "projectType" VARCHAR(255) NULL
      `);
    } else {
      await sequelize.query(`
        ALTER TABLE Projects
        ADD COLUMN projectType VARCHAR(255) NULL
      `);
    }

    console.log('✅ projectType column added successfully');
    console.log('✅ Database migration completed successfully');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addProjectTypeColumn()
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

module.exports = { addProjectTypeColumn };
