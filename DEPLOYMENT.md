# Vercel Deployment Guide

## Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with this project
- Supabase project with credentials

## Step 1: Prepare Supabase
1. Go to your Supabase project
2. Navigate to **Settings > API**
3. Copy:
   - **Project URL** (VITE_SUPABASE_URL)
   - **Anon Key** (VITE_SUPABASE_ANON_KEY)
4. Keep these handy for Vercel setup

## Step 2: Deploy to Vercel

### Option A: Using Vercel Dashboard (Recommended)
1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. In "Configure Project":
   - Framework: **Vite**
   - Build Command: `npm run build` (should auto-detect)
   - Output Directory: `dist` (should auto-detect)
5. Click **Environment Variables**
6. Add the following:
   ```
   VITE_SUPABASE_URL = your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key-here
   VITE_APP_TITLE = VATClear
   ```
7. Click **Deploy**

### Option B: Using Vercel CLI
```bash
npm install -g vercel
vercel
```
Then follow the prompts and add environment variables when asked.

## Step 3: Verify Deployment
1. Once deployment completes, you'll get a deployment URL
2. Visit the URL and verify:
   - App loads correctly
   - Login works
   - Supabase connection is successful (check browser console for errors)
   - Logo upload works
   - Invoices/Expenses load

## Step 4: Set Custom Domain (Optional)
1. In Vercel project settings
2. Go to **Domains**
3. Add your custom domain
4. Update DNS records as instructed

## Troubleshooting

### Supabase Connection Fails
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- Check that your Supabase project is active
- Ensure RLS policies allow your app to connect

### Blank Page or 404
- Check browser DevTools Console for errors
- Verify build was successful (check Vercel build logs)
- Ensure dist folder was created

### Logo Upload Doesn't Work
- Verify `logos` bucket exists in Supabase Storage
- Check storage policies allow uploads from your domain
- Base64 storage doesn't require special permissions

## Environment Variables Reference

| Variable | Value | Required |
|----------|-------|----------|
| VITE_SUPABASE_URL | Your Supabase project URL | ✅ Yes |
| VITE_SUPABASE_ANON_KEY | Your Supabase anon key | ✅ Yes |
| VITE_APP_TITLE | VATClear | ❌ No (default) |

## Production Considerations

1. **Security**
   - Never commit `.env` files
   - Use `.env.example` as template
   - Rotate keys periodically

2. **Database**
   - Ensure RLS policies are properly configured
   - Test user_profiles, invoices, expenses table access
   - Backup your Supabase database

3. **Storage**
   - Verify storage bucket is public for logo display
   - Monitor storage usage

4. **Monitoring**
   - Set up error tracking (optional)
   - Monitor Supabase logs
   - Check Vercel analytics

## Rollback
If something goes wrong:
1. Go to Vercel project > Deployments
2. Find previous working deployment
3. Click **Rollback** if available
4. Or manually redeploy from that git commit

## Support
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Project Issues: Check GitHub issues
