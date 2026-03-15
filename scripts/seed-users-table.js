#!/usr/bin/env node
/**
 * Seed Users Table Script
 *
 * Creates user records in public.users table matching REACT_APP_USERS
 * for environment-based authentication
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse users from REACT_APP_USERS
const usersEnv = process.env.REACT_APP_USERS;
if (!usersEnv) {
  console.error('❌ REACT_APP_USERS not configured');
  process.exit(1);
}

const users = usersEnv.split(',').map(userStr => {
  const [email, password, role] = userStr.split(':');
  const username = email.split('@')[0];

  return {
    id: uuidv4(), // Generate UUID for user
    email: email.trim(),
    username: username.charAt(0).toUpperCase() + username.slice(1),
    role: role.trim() || 'user',
    is_active: true
  };
});

async function seedUsers() {
  console.log('🌱 Seeding users table...\n');

  for (const user of users) {
    console.log(`📝 Creating user: ${user.email} (${user.role})`);

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (existing) {
      console.log(`   ⚠️  User already exists, skipping`);
      continue;
    }

    // Insert user
    const { error } = await supabase
      .from('users')
      .insert([user]);

    if (error) {
      console.error(`   ❌ Error creating user: ${error.message}`);
    } else {
      console.log(`   ✅ Created successfully`);
    }
  }

  console.log('\n✅ User seeding complete!');
}

seedUsers();
