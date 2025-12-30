# 🚀 Deploy to Vercel (Free)

This guide will help you deploy your Pickleball Queue System to Vercel for free.

## Prerequisites

1. **GitHub Account** (free)
2. **Vercel Account** (free)
3. **Your project code** (ready to deploy)

## Step-by-Step Deployment

### 1. Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** button in the top right → **"New repository"**
3. Name it: `pickleball-queue-system`
4. Make it **Public** (required for free Vercel hosting)
5. Click **"Create repository"**

### 2. Upload Your Code to GitHub

**Option A: Using GitHub Web Interface (Easiest)**
1. In your new repository, click **"uploading an existing file"**
2. Drag and drop ALL files from your `pickleball-queue` folder
3. Write commit message: "Initial commit - Pickleball Queue System"
4. Click **"Commit changes"**

**Option B: Using Git Commands (if you have Git installed)**
```bash
cd pickleball-queue
git init
git add .
git commit -m "Initial commit - Pickleball Queue System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pickleball-queue-system.git
git push -u origin main
```

### 3. Deploy to Vercel

1. Go to [Vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click **"New Project"**
3. Import your `pickleball-queue-system` repository
4. Configure project:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
5. Click **"Deploy"**

### 4. Your App is Live! 🎉

After deployment (takes 2-3 minutes), you'll get:
- **Live URL**: `https://your-project-name.vercel.app`
- **Admin Panel**: `https://your-project-name.vercel.app/admin`
- **TV Display**: `https://your-project-name.vercel.app/display`

## Important Notes

### ⚠️ Data Persistence
- **Current Setup**: Uses browser localStorage (data resets when browser cache is cleared)
- **For Production**: Consider upgrading to a database (see upgrade options below)

### 🔄 Automatic Updates
- Every time you push changes to GitHub, Vercel automatically redeploys
- Changes go live in 2-3 minutes

### 📱 Mobile Friendly
- Works on phones, tablets, and computers
- TV display optimized for large screens

## Free Tier Limits

Vercel's free tier includes:
- ✅ **Unlimited** personal projects
- ✅ **100GB** bandwidth per month
- ✅ **Custom domains** (optional)
- ✅ **Automatic HTTPS**
- ✅ **Global CDN**

This is more than enough for a pickleball facility!

## Upgrade Options (Optional)

For production use, consider:

1. **Database Integration** (for persistent data):
   - Supabase (free tier available)
   - PlanetScale (free tier available)
   - Firebase (free tier available)

2. **Custom Domain**:
   - Buy domain from any registrar
   - Add to Vercel project settings
   - Example: `queue.yourpickleballclub.com`

## Troubleshooting

**Build Fails?**
- Check that all files are uploaded to GitHub
- Ensure `package.json` is in the root directory

**App Not Loading?**
- Wait 2-3 minutes after deployment
- Check Vercel dashboard for deployment status

**Data Not Syncing?**
- localStorage only works within the same browser
- For multi-device sync, upgrade to database solution

## Support

Need help? The system is ready to deploy as-is and should work perfectly on Vercel's free tier!