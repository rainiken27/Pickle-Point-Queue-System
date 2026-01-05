# Starting Supabase Locally

## Quick Start

### 1. Start Docker Desktop
- Open Docker Desktop from Windows Start menu
- Wait for green "running" indicator (30-60 seconds)

### 2. Start Supabase
```bash
cd C:\Users\PC\OneDrive\Desktop\pickleball\pickleball-queue
supabase start
```

**This will:**
- Download Supabase Docker images (first time only, ~2-3 minutes)
- Start all Supabase services (database, API, auth, storage, etc.)
- Run all 7 migrations automatically
- Display access credentials

### 3. Expected Output
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** Your `.env.local` is already configured with the default local keys!

### 4. Access Supabase Studio
Open in browser: http://localhost:54323

**Supabase Studio** is the admin dashboard where you can:
- View database tables
- Create staff users
- Run SQL queries
- Monitor real-time connections

---

## Create Staff User Accounts

### Option 1: Via Supabase Studio UI (Easiest)

1. **Open Studio**: http://localhost:54323
2. Click **"Authentication"** in left sidebar
3. Click **"Users"** tab
4. Click **"Add user"** button
5. Create first user:
   - Email: `court-officer@picklepoint.com`
   - Password: `password123` (change in production!)
   - Click "Create user"
6. **Copy the User ID** (looks like: `a1b2c3d4-...`)
7. Repeat for second user:
   - Email: `cashier@picklepoint.com`
   - Password: `password123`
8. **Copy this User ID** too

### Option 2: Via SQL Editor

1. **Open Studio**: http://localhost:54323
2. Click **"SQL Editor"** in left sidebar
3. Click **"New query"**
4. First, create the auth users manually via UI (step above)
5. Then run this SQL to assign roles:

```sql
-- Replace 'USER_ID_1' and 'USER_ID_2' with actual IDs from step 1
INSERT INTO staff_roles (user_id, role) VALUES
  ('USER_ID_1', 'court_officer'),
  ('USER_ID_2', 'cashier');
```

---

## Verify Everything Works

### 1. Check Database Tables
In Supabase Studio:
- Click **"Table Editor"** → Should see:
  - `players`
  - `sessions`
  - `player_preferences`
  - `queue`
  - `courts` (should have 12 pre-seeded courts!)
  - `match_history`
  - `staff_roles`

### 2. Start Your App
```bash
npm run dev
```

### 3. Test Login
1. Go to: http://localhost:3000/login
2. Login with:
   - Email: `court-officer@picklepoint.com`
   - Password: `password123`
3. Should redirect to: http://localhost:3000/admin
4. Click **"View Analytics"** to see your new dashboard!

---

## Common Commands

```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# Reset database (WARNING: deletes all data!)
supabase db reset

# View status
supabase status

# View logs
supabase logs
```

---

## Troubleshooting

### "Docker Desktop is not running"
- Start Docker Desktop application
- Wait for green indicator
- Try `docker ps` to verify

### "Port already in use"
- Another service is using ports 54321-54324
- Stop the service or change ports in `supabase/config.toml`

### Migrations don't run
```bash
# Manually push migrations
supabase db reset
```

### Can't access Studio
- Make sure Supabase started successfully
- Check: http://127.0.0.1:54323 (try 127.0.0.1 instead of localhost)

---

## Next Steps After Setup

1. ✅ Create 2 staff users (court officer + cashier)
2. ✅ Test login at `/login`
3. ✅ Visit analytics dashboard at `/admin/analytics`
4. ✅ Run tests: `npm test`
5. ✅ Start building features!

---

**Ready to develop!** 🚀
