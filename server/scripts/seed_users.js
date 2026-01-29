/*
  BULK USER SEEDER SCRIPT (RESET & SEED)
  
  Usage: 
  1. cd server
  2. node scripts/seed_users.js
  
  This script will:
  1. DELETE ALL existing users in Supabase Auth (Clean Slate).
  2. Create new users with correct ROLE ARRAYS.
  3. Assign roles in public.users (Primary Role at Index 0).
*/

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Helper config
const SUPABASE_URL = process.env.DATABASE_URL?.includes('@')
    ? `https://${process.env.DATABASE_URL.split('@')[1].split(':')[0].split('.')[1]}.supabase.co`
    : process.env.VITE_SUPABASE_URL || 'https://honvtakaaloovmammwva.supabase.co'; // Fallback to what we saw earlier

// CRITICAL: We need the SERVICE_ROLE_KEY to create users. 
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_KEY is missing in server/.env');
    console.error('Get it from: Supabase Dashboard -> Project Settings -> API -> service_role key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Roles are Arrays now. Index 0 is Primary Role.
const USERS_TO_CREATE = [
    { email: 'student1@example.com', password: 'password123', name: 'John Student', roles: ['STUDENT'] },
    { email: 'student2@example.com', password: 'password123', name: 'Jane Student', roles: ['STUDENT'] },
    { email: 'staff1@example.com', password: 'password123', name: 'Prof. Smith', roles: ['STAFF'] },
    // HOD is also a Staff, but HOD is primary (Index 0)
    { email: 'hod1@example.com', password: 'password123', name: 'Dr. HOD', roles: ['HOD', 'STAFF'] },
    // Principal
    { email: 'principal@example.com', password: 'password123', name: 'Dr. Principal', roles: ['PRINCIPAL', 'STAFF'] },
    // Super Admin
    { email: 'admin@example.com', password: 'password123', name: 'System Admin', roles: ['SUPER_ADMIN'] },
];

async function deleteAllUsers() {
    console.log('Cleaning up existing users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    for (const user of users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) console.error(`Failed to delete ${user.email}:`, deleteError.message);
        else console.log(`Deleted ${user.email}`);
    }
}

async function seed() {
    await deleteAllUsers();

    console.log(`\nStarting seed for ${USERS_TO_CREATE.length} users...`);

    for (const user of USERS_TO_CREATE) {
        try {
            console.log(`Creating ${user.email}...`);

            // 1. Create Auth User with Roles in App Metadata (Secure & Fast)
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: { full_name: user.name },
                app_metadata: { roles: user.roles } // <--- CRITICAL: Stores roles in the token
            });

            if (authError) {
                console.error(`  Error creating auth user: ${authError.message}`);
                continue;
            }

            const userId = authData.user.id;
            console.log(`  Created. ID: ${userId}`);

            // 2. Assign Roles Array in public.users
            // We explicitly set the array. Trigger handles creation, we just update roles.

            const { error: dbError } = await supabase
                .from('users')
                .update({ roles: user.roles }) // Passing the array ['HOD', 'STAFF']
                .eq('id', userId);

            if (dbError) console.error(`  Error assigning roles: ${dbError.message}`);
            else console.log(`  Assigned roles: [${user.roles.join(', ')}]`);

        } catch (err) {
            console.error('Unexpected error:', err);
        }
    }

    console.log('Done! Login with these credentials.');
}

seed();
