const { sequelize, Project } = require('./models/database');

const addTaxAndTermsColumns = async () => {
  try {
    console.log('🔍 Checking database type and Project table columns...');

    const dialect = sequelize.getDialect();
    console.log(`📊 Database dialect: ${dialect}`);

    let includeTaxExists = false;
    let termsExists = false;

    if (dialect === 'postgres') {
      // PostgreSQL check for includeTax
      const [includeTaxResults] = await sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Projects'
          AND column_name = 'includeTax'
          AND table_schema = 'public'
      `);
      includeTaxExists = includeTaxResults.length > 0;

      // PostgreSQL check for terms
      const [termsResults] = await sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'Projects'
          AND column_name = 'terms'
          AND table_schema = 'public'
      `);
      termsExists = termsResults.length > 0;

    } else if (dialect === 'sqlite') {
      // SQLite check
      try {
        const [results] = await sequelize.query(`PRAGMA table_info(Projects)`);
        includeTaxExists = results.some(col => col.name === 'includeTax');
        termsExists = results.some(col => col.name === 'terms');
      } catch (error) {
        console.log('⚠️ Could not check SQLite columns, assuming columns do not exist');
        includeTaxExists = false;
        termsExists = false;
      }
    }

    // Add includeTax column if it doesn't exist
    if (!includeTaxExists) {
      console.log('🔧 Adding includeTax column to Projects table...');

      if (dialect === 'postgres') {
        await sequelize.query(`
          ALTER TABLE "Projects"
          ADD COLUMN "includeTax" BOOLEAN DEFAULT TRUE
        `);
      } else {
        await sequelize.query(`
          ALTER TABLE Projects
          ADD COLUMN includeTax BOOLEAN DEFAULT 1
        `);
      }

      console.log('✅ includeTax column added successfully');
    } else {
      console.log('✅ includeTax column already exists');
    }

    // Add terms column if it doesn't exist
    if (!termsExists) {
      console.log('🔧 Adding terms column to Projects table...');

      if (dialect === 'postgres') {
        await sequelize.query(`
          ALTER TABLE "Projects"
          ADD COLUMN "terms" TEXT DEFAULT ''
        `);
      } else {
        await sequelize.query(`
          ALTER TABLE Projects
          ADD COLUMN terms TEXT DEFAULT ''
        `);
      }

      console.log('✅ terms column added successfully');
    } else {
      console.log('✅ terms column already exists');
    }

    // Set default values for existing records
    if (!includeTaxExists || !termsExists) {
      console.log('🔄 Setting default values for existing projects...');

      const defaultTerms = `All prices are in Jordanian Dinars (JOD)
Equipment prices include door-to-door delivery
VAT is calculated at 16% as per Jordanian tax regulations
Subject to ±10% change after technical study
Payment terms: 90% down payment, 10% after project completion
This quotation is valid for 30 days from the date of issue`;

      if (dialect === 'postgres') {
        if (!includeTaxExists) {
          await sequelize.query(`
            UPDATE "Projects"
            SET "includeTax" = TRUE
            WHERE "includeTax" IS NULL
          `);
        }
        if (!termsExists) {
          await sequelize.query(`
            UPDATE "Projects"
            SET "terms" = :defaultTerms
            WHERE "terms" IS NULL OR "terms" = ''
          `, {
            replacements: { defaultTerms }
          });
        }
      } else {
        if (!includeTaxExists) {
          await sequelize.query(`
            UPDATE Projects
            SET includeTax = 1
            WHERE includeTax IS NULL
          `);
        }
        if (!termsExists) {
          await sequelize.query(`
            UPDATE Projects
            SET terms = ?
            WHERE terms IS NULL OR terms = ''
          `, {
            replacements: [defaultTerms]
          });
        }
      }

      console.log('✅ Default values set for existing projects');
    }

    console.log('✅ Database migration completed successfully');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  addTaxAndTermsColumns()
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

module.exports = { addTaxAndTermsColumns };
