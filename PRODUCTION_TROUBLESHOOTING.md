# Production Troubleshooting Guide

## "Failed to start session" Error

### Most Common Causes

#### 1. Missing Environment Variables in Vercel ⚠️ **MOST LIKELY**

The API route requires `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies.

**Fix:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables (if missing):
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (⚠️ **CRITICAL**)

4. **Redeploy** after adding variables (Vercel → Deployments → Redeploy)

**How to find your Supabase keys:**
- Go to Supabase Dashboard → Your Project → Settings → API
- Copy the values from there

#### 2. Database Migrations Not Run

The `display_photo` column might not exist in your production database.

**Fix:**
1. Connect to your production Supabase project
2. Run the migration manually or via Supabase CLI:
   ```bash
   supabase db push
   ```
3. Or run the SQL directly in Supabase SQL Editor:
   ```sql
   ALTER TABLE sessions
   ADD COLUMN IF NOT EXISTS display_photo BOOLEAN DEFAULT true;
   ```

#### 3. Database Connection Issues

**Check:**
1. Verify your Supabase project is active (not paused)
2. Check Supabase dashboard for any service alerts
3. Verify the `NEXT_PUBLIC_SUPABASE_URL` matches your production project

#### 4. RLS Policies Blocking Access

The service role key should bypass RLS, but if it's not set correctly, RLS policies might block inserts.

**Fix:**
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- The service role key should start with `eyJ...` (JWT format)

### How to Debug

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for errors when the API route is called
   - Check for "Missing Supabase" errors

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try check-in again
   - Click on the `/api/sessions/start` request
   - Check the Response tab for error details

3. **Test API Directly:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/sessions/start \
     -H "Content-Type: application/json" \
     -d '{"player_id":"your-player-uuid","display_photo":true}'
   ```

### Quick Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- [ ] Database migrations have been run in production
- [ ] Supabase project is active (not paused)
- [ ] Vercel deployment was redeployed after adding env vars

### Still Not Working?

1. Check Vercel function logs for the exact error message
2. Verify the error message in browser console
3. Test with a simple API call to confirm Supabase connection
4. Check if other API routes work (e.g., `/api/players/validate-qr`)
