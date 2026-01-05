# 🚀 Quick Start Guide

## Get Running in 5 Minutes

### 1. Install & Setup (2 minutes)

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

### 2. Get Supabase Credentials (2 minutes)

**Option A: Cloud (Recommended)**
1. Go to https://supabase.com
2. Create new project
3. Copy Project URL and Anon Key from Settings → API
4. Paste into `.env.local`

**Option B: Local**
```bash
npm install -g supabase
supabase start
# Copy local credentials to .env.local
```

### 3. Apply Database Schema (1 minute)

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### 4. Run Development Server

```bash
npm run dev
```

**Done!** Visit http://localhost:3000

---

## 🎯 First Time Setup Checklist

- [ ] Create Supabase project
- [ ] Copy credentials to `.env.local`
- [ ] Run `supabase db push`
- [ ] Register first player at `/register`
- [ ] Create staff account in Supabase Dashboard
- [ ] Add staff role to `staff_roles` table
- [ ] Test check-in at `/cashier`
- [ ] Test dashboard at `/admin`
- [ ] View TV display at `/display`

---

## 📱 Routes Overview

| URL | Purpose | Auth |
|-----|---------|------|
| `/register` | Register players & generate QR | No |
| `/cashier` | Check-in & start sessions | Yes |
| `/admin` | 12-court dashboard | Yes |
| `/display` | TV queue display | No |
| `/stats/[id]` | Player statistics | No |

---

## 🔑 Create Staff Account

```sql
-- 1. Create user in Supabase Dashboard → Authentication

-- 2. Add role (replace USER_ID with actual UUID)
INSERT INTO staff_roles (user_id, role) VALUES
  ('USER_ID_HERE', 'court_officer');  -- or 'cashier'
```

---

## 🧪 Test the System

### Register a Player
1. Go to `/register`
2. Enter: Name, Skill Level, Gender
3. Click "Register & Generate QR Code"
4. QR code appears (copy the UUID for testing)

### Check-In Player
1. Go to `/cashier`
2. Paste QR UUID
3. Click "Scan"
4. Set preferences
5. Click "Start 5-Hour Session"

### Call Player to Court
1. Go to `/admin`
2. Click "Call Next" on available court
3. Review match suggestion
4. Click "Confirm & Call"

### Watch TV Display
1. Go to `/display`
2. See queue in real-time
3. Watch connection status

---

## 🐛 Common Issues

**Can't connect to Supabase**
→ Check `.env.local` has correct URL and keys

**Database migrations fail**
→ Run `supabase link` first, then `supabase db push`

**Type errors in IDE**
→ Restart TypeScript server in VSCode

**SSE not working**
→ Check Supabase real-time is enabled in dashboard

---

## 📚 Full Documentation

- **SETUP.md** - Complete setup guide
- **IMPLEMENTATION_SUMMARY.md** - Full feature list
- **README.md** - Project overview

---

**Ready to build!** 🎾
