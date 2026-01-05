# Supabase Setup Guide

## Option 1: Local Development (Requires Docker Desktop)

### Prerequisites
1. Install [Docker Desktop](https://docs.docker.com/desktop/)
2. Start Docker Desktop
3. Ensure Supabase CLI is installed: `npm install -g supabase`

### Steps
```bash
# Start Supabase local instance
supabase start

# Migrations will run automatically
# Copy the anon key and service role key from the output
# Update .env.local with the local values
```

## Option 2: Cloud Supabase (Recommended for Quick Start)

### Steps
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new account (free tier available)
3. Click "New Project"
4. Fill in:
   - **Project name**: `pickleball-queue`
   - **Database password**: (create a strong password - save it!)
   - **Region**: Choose closest to your location
5. Wait for project to initialize (~2 minutes)

### Get Your Credentials
Once your project is ready:
1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep secret!**

### Update .env.local
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Run Migrations
```bash
# Link to your cloud project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Create Initial Staff Accounts

### Recommended: Automated Seed Script

The easiest way to create staff accounts is using the automated seed script:

```bash
# Make sure your .env.local is configured with Supabase credentials
npm run seed:staff
```

This will create:
- **Court Officer**: `officer@picklepoint.com` / `officer123`
- **Cashier**: `cashier@picklepoint.com` / `cashier123`

The script automatically:
- Creates the users in Supabase Auth
- Assigns the appropriate staff roles
- Handles duplicates gracefully (idempotent)
- Works with both local and cloud Supabase

### Alternative: Manual Creation via Supabase Dashboard

If you prefer to create accounts manually:

1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Create accounts:
   - Email: `officer@picklepoint.com`, Password: (your choice)
   - Email: `cashier@picklepoint.com`, Password: (your choice)
4. Go to **SQL Editor** and run:
   ```sql
   -- Assign roles to the manually created users
   INSERT INTO staff_roles (user_id, role)
   SELECT id, 'court_officer' FROM auth.users WHERE email = 'officer@picklepoint.com'
   ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

   INSERT INTO staff_roles (user_id, role)
   SELECT id, 'cashier' FROM auth.users WHERE email = 'cashier@picklepoint.com'
   ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
   ```

Or use `supabase/seed_staff.sql` to assign roles to existing users.

## Verify Setup
```bash
npm run dev
```

Visit http://localhost:3000/login and log in with your staff credentials!
