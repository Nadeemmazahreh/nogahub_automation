#!/usr/bin/env node
/**
 * Apply created_by fields migration to production
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying created_by fields migration...\n');

  const migrationSQL = `
    ALTER TABLE public.projects
    ADD COLUMN IF NOT EXISTS created_by_username TEXT,
    ADD COLUMN IF NOT EXISTS created_by_email TEXT,
    ADD COLUMN IF NOT EXISTS created_by_role TEXT;

    CREATE INDEX IF NOT EXISTS idx_projects_created_by_email ON public.projects(created_by_email);
  `;

  try {
    // Execute via raw SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error && error.code !== 'PGRST202') {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('📋 Added columns:');
    console.log('  - created_by_username (username from simpleAuth)');
    console.log('  - created_by_email (email from simpleAuth)');
    console.log('  - created_by_role (role from simpleAuth)\n');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMigration();
