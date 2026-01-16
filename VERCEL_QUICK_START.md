# Quick Vercel Deployment Guide

## 🚀 Deploy in 5 Steps

### Step 1: Prepare GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Get Supabase Credentials
1. Visit your Supabase project
2. Go to Settings > API
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Key** → `VITE_SUPABASE_ANON_KEY`

### Step 3: Deploy to Vercel
1. Go to https://vercel.com/new
2. Select your GitHub repository
3. Framework Auto-Detect: **Vite** ✓
4. Click **Environment Variables** and add:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```
5. Click **Deploy**

### Step 4: Wait for Build
- Build time: ~8-10 seconds
- Watch the logs for any errors

### Step 5: Test Your App
- Click the deployment URL
- Test signup/login
- Create an invoice
- Upload a logo
- Download PDF

## ✅ What's Already Done

- ✅ Build config set up for Vercel
- ✅ Environment variables configured
- ✅ Debug logs removed
- ✅ Supabase client ready
- ✅ Base64 logo storage (no RLS issues)
- ✅ Production build verified

## 📋 Environment Variables Needed

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase key |

## 🔍 Verify After Deployment

- [ ] App homepage loads
- [ ] Can login/signup
- [ ] Dashboard shows data
- [ ] Can create invoices
- [ ] Logo upload works
- [ ] Mobile view works

## 📚 Full Documentation

See `DEPLOYMENT.md` for complete deployment guide with troubleshooting.

## ❓ Common Issues

**App doesn't load?**
- Check DevTools Console
- Verify Supabase credentials in Vercel settings
- Check Vercel build logs

**Logo upload fails?**
- Ensure `logos` bucket exists in Supabase Storage
- Bucket must be set to public

**Database errors?**
- Verify user_profiles table exists
- Check RLS policies are enabled

---

**Total Deployment Time**: ~5-10 minutes
**No credit card required** for first 100 deployments/month
