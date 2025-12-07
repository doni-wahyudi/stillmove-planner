# Deployment Guide

This guide provides detailed instructions for deploying the Daily Planner Application to various hosting platforms.

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Set up your Supabase project
- [ ] Configured `js/config.js` with your Supabase credentials
- [ ] Created all database tables using `database/schema.sql`
- [ ] Tested the application locally
- [ ] Verified authentication works
- [ ] Tested data synchronization
- [ ] Reviewed and tested offline functionality

## Important Security Notes

⚠️ **Never commit your actual Supabase credentials to a public repository!**

### Option 1: Environment-Specific Configuration (Recommended)

Create separate configuration files for different environments:

```javascript
// js/config.js (committed to repo - template only)
export const SUPABASE_URL = 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// js/config.local.js (not committed - for local development)
export const SUPABASE_URL = 'https://your-actual-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-actual-anon-key';
```

Update `.gitignore` to exclude local config:
```
js/config.local.js
```

### Option 2: Environment Variables (For Build Systems)

If using a build system, use environment variables:

```javascript
export const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
```

## Deployment Options

### 1. GitHub Pages

GitHub Pages is ideal for static sites and is completely free.

#### Steps:

1. **Prepare Your Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/daily-planner.git
   git push -u origin main
   ```

2. **Configure Supabase Credentials**
   - Update `js/config.js` with your actual Supabase credentials
   - Commit this change (or use a deployment branch)

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** > **Pages**
   - Under "Source", select your branch (usually `main`)
   - Select the root folder (`/`)
   - Click **Save**

4. **Access Your Site**
   - Your site will be available at: `https://yourusername.github.io/repository-name/`
   - It may take a few minutes for the first deployment

#### Custom Domain (Optional):

1. Add a `CNAME` file to your repository root with your domain:
   ```
   planner.yourdomain.com
   ```

2. Configure DNS with your domain provider:
   - Add a CNAME record pointing to `yourusername.github.io`

3. In GitHub Pages settings, add your custom domain

### 2. Netlify

Netlify offers continuous deployment, custom domains, and HTTPS out of the box.

#### Steps:

1. **Push to Git Repository**
   - Push your code to GitHub, GitLab, or Bitbucket

2. **Connect to Netlify**
   - Log in to [Netlify](https://netlify.com)
   - Click **Add new site** > **Import an existing project**
   - Connect your Git provider
   - Select your repository

3. **Configure Build Settings**
   - **Build command**: Leave empty (no build needed)
   - **Publish directory**: `/` (root directory)
   - Click **Deploy site**

4. **Configure Environment Variables (Optional)**
   - Go to **Site settings** > **Environment variables**
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - Update your config.js to use these variables

5. **Custom Domain (Optional)**
   - Go to **Site settings** > **Domain management**
   - Click **Add custom domain**
   - Follow the DNS configuration instructions

#### Netlify Configuration File (Optional):

Create `netlify.toml` in your project root:

```toml
[build]
  publish = "."
  
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. Vercel

Vercel provides fast global CDN and automatic HTTPS.

#### Steps:

1. **Push to Git Repository**
   - Push your code to GitHub, GitLab, or Bitbucket

2. **Import to Vercel**
   - Log in to [Vercel](https://vercel.com)
   - Click **Add New** > **Project**
   - Import your repository

3. **Configure Project**
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: Leave empty

4. **Environment Variables (Optional)**
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in project settings

5. **Deploy**
   - Click **Deploy**
   - Your site will be available at a Vercel subdomain

6. **Custom Domain (Optional)**
   - Go to **Settings** > **Domains**
   - Add your custom domain
   - Configure DNS as instructed

### 4. Firebase Hosting

Firebase Hosting provides fast, secure hosting with a global CDN.

#### Steps:

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase**
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project (or create a new one)
   - Set public directory to `.` (current directory)
   - Configure as single-page app: **No**
   - Don't overwrite existing files

4. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

5. **Access Your Site**
   - Your site will be available at: `https://your-project.firebaseapp.com`

### 5. Custom Server (VPS/Dedicated)

For deployment on your own server (Apache, Nginx, etc.).

#### Apache Configuration:

1. **Upload Files**
   ```bash
   scp -r * user@yourserver.com:/var/www/html/planner/
   ```

2. **Configure Apache**
   Create or edit `.htaccess`:
   ```apache
   # Enable rewrite engine
   RewriteEngine On
   
   # Force HTTPS
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   
   # Set default document
   DirectoryIndex index.html
   
   # Enable CORS if needed
   Header set Access-Control-Allow-Origin "*"
   ```

3. **Set Permissions**
   ```bash
   chmod -R 755 /var/www/html/planner/
   ```

#### Nginx Configuration:

1. **Upload Files**
   ```bash
   scp -r * user@yourserver.com:/var/www/planner/
   ```

2. **Configure Nginx**
   Create `/etc/nginx/sites-available/planner`:
   ```nginx
   server {
       listen 80;
       server_name planner.yourdomain.com;
       
       # Redirect to HTTPS
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl http2;
       server_name planner.yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       root /var/www/planner;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Enable CORS if needed
       add_header Access-Control-Allow-Origin *;
   }
   ```

3. **Enable Site**
   ```bash
   ln -s /etc/nginx/sites-available/planner /etc/nginx/sites-enabled/
   nginx -t
   systemctl reload nginx
   ```

## Post-Deployment Verification

After deploying, verify the following:

### 1. Basic Functionality
- [ ] Site loads without errors
- [ ] All CSS and JavaScript files load correctly
- [ ] Navigation works between views

### 2. Authentication
- [ ] Sign up creates new user
- [ ] Sign in works with correct credentials
- [ ] Sign out clears session
- [ ] Session persists on page reload

### 3. Data Operations
- [ ] Can create new data (goals, habits, etc.)
- [ ] Data persists after page reload
- [ ] Can update existing data
- [ ] Can delete data

### 4. Real-Time Sync
- [ ] Changes sync across browser tabs
- [ ] Real-time updates work correctly

### 5. Offline Support
- [ ] App works when offline
- [ ] Changes queue when offline
- [ ] Queued changes sync when back online

### 6. Performance
- [ ] Page loads quickly (< 3 seconds)
- [ ] No console errors
- [ ] Smooth interactions

### 7. Mobile Responsiveness
- [ ] Layout adapts to mobile screens
- [ ] Touch interactions work
- [ ] All features accessible on mobile

## Troubleshooting

### Issue: CORS Errors

**Solution**: Configure CORS in Supabase:
1. Go to Supabase Dashboard > Settings > API
2. Add your deployment domain to allowed origins

### Issue: Authentication Not Working

**Solution**: Check Supabase configuration:
1. Verify credentials in `js/config.js`
2. Check Supabase project is active
3. Verify RLS policies are set up correctly

### Issue: Real-Time Not Working

**Solution**: 
1. Check Supabase Realtime is enabled
2. Verify WebSocket connections aren't blocked
3. Check browser console for errors

### Issue: Offline Mode Not Working

**Solution**:
1. Verify localStorage is enabled in browser
2. Check browser console for storage errors
3. Ensure HTTPS is enabled (required for some features)

### Issue: Slow Performance

**Solution**:
1. Enable caching headers on your server
2. Use CDN for static assets
3. Optimize images
4. Check network tab for slow requests

## Monitoring and Maintenance

### Supabase Monitoring

1. **Database Usage**
   - Monitor database size in Supabase Dashboard
   - Check query performance
   - Review slow queries

2. **Authentication**
   - Monitor user sign-ups
   - Check for failed authentication attempts
   - Review security logs

3. **API Usage**
   - Monitor API request counts
   - Check for rate limiting
   - Review error rates

### Application Monitoring

1. **Error Tracking**
   - Set up error logging (e.g., Sentry)
   - Monitor browser console errors
   - Track failed API requests

2. **Performance Monitoring**
   - Use browser DevTools Performance tab
   - Monitor page load times
   - Check for memory leaks

3. **User Feedback**
   - Collect user feedback
   - Monitor support requests
   - Track feature usage

## Backup and Recovery

### Database Backups

Supabase provides automatic backups, but you can also:

1. **Manual Backup**
   - Use the export feature in the app
   - Download data as JSON
   - Store securely

2. **Automated Backups**
   - Set up scheduled exports
   - Store in cloud storage (S3, Google Drive, etc.)

### Disaster Recovery

1. **Database Restore**
   - Use Supabase backup restore feature
   - Or import from JSON export

2. **Code Restore**
   - Use Git to restore previous versions
   - Redeploy from repository

## Scaling Considerations

### When to Scale

Consider scaling when:
- User count exceeds 1,000 active users
- Database size exceeds 500MB
- API requests exceed 100,000/day
- Page load times exceed 3 seconds

### Scaling Options

1. **Supabase Scaling**
   - Upgrade to Pro plan for more resources
   - Enable connection pooling
   - Optimize database queries

2. **CDN Integration**
   - Use Cloudflare or similar CDN
   - Cache static assets
   - Reduce server load

3. **Code Optimization**
   - Implement lazy loading
   - Optimize bundle size
   - Use service workers for caching

## Security Best Practices

1. **Keep Credentials Secret**
   - Never commit credentials to public repos
   - Use environment variables
   - Rotate keys regularly

2. **Enable HTTPS**
   - Always use HTTPS in production
   - Redirect HTTP to HTTPS
   - Use valid SSL certificates

3. **Regular Updates**
   - Keep Supabase client updated
   - Monitor security advisories
   - Update dependencies regularly

4. **Access Control**
   - Review RLS policies regularly
   - Implement proper authentication
   - Use strong password requirements

5. **Monitoring**
   - Set up security monitoring
   - Track failed login attempts
   - Monitor for suspicious activity

## Support and Resources

- **Supabase Documentation**: https://supabase.com/docs
- **GitHub Issues**: Report bugs and request features
- **Community**: Join discussions and get help

## Conclusion

Your Daily Planner Application is now deployed and ready for use! Remember to:
- Monitor performance and errors
- Keep backups of your data
- Update regularly for security
- Collect user feedback for improvements

For questions or issues, refer to the troubleshooting section or consult the documentation.
