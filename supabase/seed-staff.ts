#!/usr/bin/env tsx

/**
 * Seed script for creating staff accounts
 *
 * This script uses Supabase Admin API to create staff users reliably.
 * Works with both local and cloud Supabase instances.
 *
 * Usage:
 *   npm run seed:staff
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local file
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');

  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  });
} catch (error) {
  console.warn('⚠️  Could not load .env.local file');
}

// Supabase Admin client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  console.error('   Check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Staff accounts to create
const staffAccounts = [
  {
    email: 'officer@picklepoint.com',
    password: 'officer123',
    role: 'court_officer',
    name: 'Court Officer',
  },
  {
    email: 'cashier@picklepoint.com',
    password: 'cashier123',
    role: 'cashier',
    name: 'Cashier',
  },
] as const;

async function seedStaff() {
  console.log('🌱 Seeding staff accounts...\n');

  for (const account of staffAccounts) {
    console.log(`📝 Creating ${account.name} (${account.email})...`);

    try {
      // Create user using Admin API
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: account.name,
        },
      });

      if (userError) {
        // Check if user already exists
        if (userError.message.includes('already been registered') || userError.code === 'email_exists') {
          console.log(`   ⚠️  User already exists, skipping user creation`);

          // Get existing user
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const user = existingUser?.users.find(u => u.email === account.email);

          if (user) {
            // Try to assign role
            const { error: roleError } = await supabase
              .from('staff_roles')
              .upsert(
                { user_id: user.id, role: account.role },
                { onConflict: 'user_id' }
              );

            if (roleError) {
              console.log(`   ❌ Failed to assign role: ${roleError.message}`);
            } else {
              console.log(`   ✅ Role assigned successfully`);
            }
          }
          continue;
        }
        throw userError;
      }

      if (!userData.user) {
        throw new Error('User creation returned no user data');
      }

      console.log(`   ✅ User created (ID: ${userData.user.id})`);

      // Assign staff role
      const { error: roleError } = await supabase
        .from('staff_roles')
        .insert({ user_id: userData.user.id, role: account.role });

      if (roleError) {
        console.log(`   ❌ Failed to assign role: ${roleError.message}`);
      } else {
        console.log(`   ✅ Role assigned: ${account.role}`);
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ Error creating ${account.name}:`, error);
      console.log('');
    }
  }

  console.log('✨ Staff seeding complete!\n');
  console.log('📋 Created accounts:');
  staffAccounts.forEach(account => {
    console.log(`   • ${account.email} / ${account.password} (${account.role})`);
  });
}

// Run the seed function
seedStaff()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
