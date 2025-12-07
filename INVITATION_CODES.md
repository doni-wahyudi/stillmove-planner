# Invitation Code System

## Overview
This app uses an invitation code system to control who can sign up. This prevents unauthorized access when the app is published publicly on GitHub.

## How It Works
1. New users must enter a valid invitation code during sign-up
2. The codes are stored in `js/config.js`
3. Validation happens client-side before account creation
4. Invalid codes prevent sign-up immediately

## Managing Invitation Codes

### Current Codes
The invitation codes are defined in `js/config.js`:

```javascript
invitationCodes: [
    'PLANNER2025',
    'WELCOME2025',
    'DAILYPLAN'
]
```

### Adding New Codes
1. Open `js/config.js`
2. Add new codes to the `invitationCodes` array
3. Codes are case-insensitive (automatically converted to uppercase)
4. Save and commit the changes

### Removing/Rotating Codes
1. Open `js/config.js`
2. Remove old codes from the array
3. Add new replacement codes
4. Save and commit

### Best Practices
- **Change codes regularly** for security (monthly or quarterly)
- **Use unique codes** that are hard to guess
- **Share codes privately** via email, DM, or secure channels
- **Track who you gave codes to** (keep a separate private list)
- **Remove codes** if they become compromised

## Sharing Codes with Users

### Example Message Template
```
Hi [Name],

Thanks for your interest in Daily Planner! Here's your invitation code:

CODE: PLANNER2025

To get started:
1. Visit [your-app-url]/auth.html
2. Click "Sign Up"
3. Enter the invitation code above
4. Complete the registration form

Welcome aboard!
```

## Security Notes
- Codes are visible in the client-side code (anyone can inspect `config.js`)
- This is a basic access control, not enterprise-level security
- For higher security, consider implementing server-side validation with a database
- The main goal is to prevent casual/automated sign-ups, not determined attackers

## Alternative: Email Verification System
If you need stronger access control, consider implementing email verification where:
1. Users request access via a form
2. You receive an email notification
3. You manually approve/reject requests
4. Approved users receive a sign-up link

This requires a backend service (e.g., Netlify Functions, Vercel Functions, or a simple Node.js server).

## Current Implementation Benefits
✅ No backend required
✅ Works entirely with Supabase
✅ Easy to manage and update
✅ Instant access for approved users
✅ Simple to implement and maintain
