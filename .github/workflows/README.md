# GitHub Actions CI/CD Setup

## Overview

This project uses GitHub Actions for automated testing, building, and deployment.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

Runs on every push to `main` and `develop` branches, and on pull requests.

**Jobs:**
- **Lint**: Runs ESLint to check code quality
- **TypeScript Check**: Validates TypeScript types
- **Test**: Runs Vitest unit tests with coverage
- **Build**: Builds the Next.js application
- **Deploy Staging**: Deploys to Vercel staging (on `develop` branch)
- **Deploy Production**: Deploys to Vercel production (on `main` branch)

### 2. Pull Request Checks (`pr-checks.yml`)

Runs on pull requests to ensure quality standards.

**Jobs:**
- **PR Title Check**: Validates conventional commit format
- **Bundle Size Check**: Ensures JS payload stays under 500KB
- **Security Scan**: Runs npm audit and Snyk security checks

## Required GitHub Secrets

To enable deployment, add these secrets in GitHub repository settings:

### Vercel Secrets
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

**How to get these values:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel login`
3. Run `vercel link` in your project
4. Get token from: https://vercel.com/account/tokens
5. Get org/project IDs from `.vercel/project.json` (created after `vercel link`)

### Supabase Secrets (for build)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional: Snyk Security Scanning
```
SNYK_TOKEN=your-snyk-token
```

Get from: https://snyk.io/account

## Local Testing

### Run Tests
```bash
npm test
```

### Run Linting
```bash
npm run lint
```

### Type Check
```bash
npx tsc --noEmit
```

### Build
```bash
npm run build
```

## Deployment Workflow

### Staging Deployment
1. Create a feature branch
2. Make changes and commit
3. Push to `develop` branch
4. GitHub Actions automatically deploys to staging
5. Review at staging URL

### Production Deployment
1. Create PR from `develop` to `main`
2. Wait for all checks to pass
3. Get PR approval
4. Merge to `main`
5. GitHub Actions automatically deploys to production

## Branch Protection

Recommended branch protection rules for `main`:

- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass:
  - Lint Code
  - TypeScript Type Check
  - Run Tests
  - Build Application
- ✅ Require branches to be up to date
- ✅ Require conversation resolution
- ❌ Do not allow force pushes
- ❌ Do not allow deletions

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Ensure Supabase secrets are valid
- Review build logs in GitHub Actions

### Tests Fail
- Run tests locally first: `npm test`
- Check for environment-specific issues
- Review test coverage reports

### Deployment Fails
- Verify Vercel token is valid
- Check project is linked correctly
- Review Vercel deployment logs

## Monitoring

After deployment, monitor:
- Vercel deployment status
- Error rates in Vercel Analytics
- Build times in GitHub Actions

## Contact

For CI/CD issues, check:
1. GitHub Actions logs
2. Vercel deployment logs
3. Project documentation
