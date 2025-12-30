# 🚀 Quick Deploy Setup

## Files to Upload to GitHub

Make sure to upload ALL these files to your GitHub repository:

### Core Application Files
- `app/` (entire folder)
  - `page.tsx`
  - `layout.tsx` 
  - `globals.css`
  - `admin/page.tsx`
  - `display/page.tsx`
- `public/` (entire folder)
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `next-env.d.ts`
- `README.md`
- `DEPLOYMENT.md`
- `vercel.json`
- `.gitignore`

### What NOT to Upload
- `node_modules/` (automatically ignored)
- `.next/` (build folder, automatically ignored)

## Vercel Settings

When deploying to Vercel, use these settings:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x (default)

## After Deployment

Your app will be available at:
- **Main**: `https://your-project-name.vercel.app`
- **Admin**: `https://your-project-name.vercel.app/admin`
- **Display**: `https://your-project-name.vercel.app/display`

## Custom Domain (Optional)

To use your own domain:
1. Buy domain from any registrar (GoDaddy, Namecheap, etc.)
2. In Vercel dashboard → Project Settings → Domains
3. Add your domain and follow DNS instructions
4. Example: `queue.yourclub.com`