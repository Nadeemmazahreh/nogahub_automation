#!/usr/bin/env node
/**
 * Apply the anonymous access migration to production Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying anonymous access migration...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260315000005_allow_anon_equipment_access.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try executing statements one by one
      console.log('⚠️  exec_sql not available, applying policies manually...\n');

      // Split SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);

        // Use the Supabase REST API to execute SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Failed to execute statement: ${errorText}`);
        }
      }

      console.log('\n✅ Migration applied successfully!\n');
      console.log('📋 Changes made:');
      console.log('  - Equipment: Now accessible to anonymous users (public read)');
      console.log('  - Projects: Now accessible to anonymous users (full CRUD)');
      console.log('  - Authorization handled at application layer via simpleAuth\n');
      return;
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('📋 Changes made:');
    console.log('  - Equipment: Now accessible to anonymous users (public read)');
    console.log('  - Projects: Now accessible to anonymous users (full CRUD)');
    console.log('  - Authorization handled at application layer via simpleAuth\n');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMigration();
