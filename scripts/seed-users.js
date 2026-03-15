/**
 * Seed Users Script for Supabase
 *
 * This script creates the 5 default users in Supabase Auth and sets their roles.
 *
 * Prerequisites:
 * 1. Supabase project created
 * 2. Environment variables set:
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (NOT the anon key - service role key for admin operations)
 *
 * Usage:
 *   node scripts/seed-users.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Default users to seed
const defaultUsers = [
  {
    username: 'admin',
    email: 'admin@nogahub.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'Nadeem',
    email: 'nadeem@nogahub.com',
    password: 'Nadeem123',
    role: 'admin'
  },
  {
    username: 'Issa',
    email: 'issa@nogahub.com',
    password: 'Issa123',
    role: 'admin'
  },
  {
    username: 'Kareem',
    email: 'kareem@nogahub.com',
    password: 'Kareem123',
    role: 'user'
  },
  {
    username: 'Ammar',
    email: 'ammar@nogahub.com',
    password: 'Ammar123',
    role: 'user'
  }
];

async function seedUsers() {
  console.log('🌱 Starting user seeding process...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const userData of defaultUsers) {
    try {
      console.log(`Creating user: ${userData.email} (${userData.role})...`);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          username: userData.username,
          role: userData.role
        }
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already registered')) {
          console.log(`  ⚠️  User ${userData.email} already exists. Updating profile...`);

          // Get existing user
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email === userData.email);

          if (existingUser) {
            // Update the users table with correct role and username
            const { error: updateError } = await supabase
              .from('users')
              .update({
                username: userData.username,
                role: userData.role,
                is_active: true
              })
              .eq('id', existingUser.id);

            if (updateError) {
              console.log(`  ❌ Error updating user profile: ${updateError.message}`);
              errorCount++;
            } else {
              console.log(`  ✅ Updated existing user: ${userData.email} (${userData.role})`);
              successCount++;
            }
          }
        } else {
          throw authError;
        }
      } else {
        // User created successfully
        console.log(`  ✅ Created user in Auth: ${userData.email}`);

        // The trigger should auto-create the user profile, but let's verify and update role
        // Wait a bit for the trigger to execute
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update the users table with correct role and username
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: userData.username,
            role: userData.role
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.log(`  ⚠️  Warning: Could not update user profile: ${updateError.message}`);
          console.log(`  Note: The trigger should have created the profile automatically`);
        } else {
          console.log(`  ✅ Updated user profile with role: ${userData.role}`);
        }

        successCount++;
      }

    } catch (error) {
      console.log(`  ❌ Error creating ${userData.email}: ${error.message}`);
      errorCount++;
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('='.repeat(50));
  console.log('User Seeding Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📊 Total: ${defaultUsers.length}`);
  console.log('='.repeat(50));

  // Verify by querying the users table
  console.log('\n🔍 Verifying users in database...');
  const { data: users, error: queryError } = await supabase
    .from('users')
    .select('username, email, role, is_active')
    .order('email');

  if (queryError) {
    console.error('❌ Error querying users:', queryError.message);
  } else {
    console.log('\n📋 Current users in database:');
    console.table(users);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run the seeding
seedUsers().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
