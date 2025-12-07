# Authentication System Documentation

## Overview

The Daily Planner Application uses Supabase Authentication for secure user management. This document describes the authentication system implementation.

## Components

### 1. auth.html
The authentication page with sign-in and sign-up forms.

**Features:**
- Tab-based interface for switching between sign-in and sign-up
- Real-time form validation
- Password confirmation for sign-up
- Forgot password functionality
- Responsive design with gradient background
- Loading states and error messages

### 2. AuthService (js/auth-service.js)
Core authentication service that handles all auth operations.

**Methods:**
- `signUp(email, password)` - Register new user
- `signIn(email, password)` - Sign in existing user
- `signOut()` - Sign out current user
- `getSession()` - Get current session
- `getUser()` - Get current user
- `refreshSession()` - Refresh authentication token
- `resetPassword(email)` - Send password reset email
- `updatePassword(newPassword)` - Update user password
- `onAuthStateChange(callback)` - Listen to auth state changes
- `isAuthenticated()` - Check if user is authenticated

**Session Management:**
- Automatic session persistence to localStorage
- Session refresh on token expiration
- Session clearing on sign-out

### 3. AuthUI (js/auth-ui.js)
UI controller for the authentication page.

**Features:**
- Form validation (email format, password length, password match)
- Tab switching between sign-in and sign-up
- Loading states during authentication
- Alert messages for success/error
- Automatic redirect after successful authentication
- Check for existing session on page load

### 4. App Integration (js/app.js)
Main application integration with authentication.

**Features:**
- Check authentication status on app load
- Redirect to auth page if not authenticated
- Listen to auth state changes
- Update UI with user information
- Handle sign-out from main app

## Authentication Flow

### Sign Up Flow
1. User fills out sign-up form (email, password, confirm password)
2. Form validation checks:
   - Valid email format
   - Password at least 6 characters
   - Passwords match
3. AuthService.signUp() called
4. Supabase creates user account
5. User profile created in profiles table
6. Session stored in localStorage
7. Redirect to main app (or show email confirmation message)

### Sign In Flow
1. User fills out sign-in form (email, password)
2. Form validation checks:
   - Valid email format
   - Password not empty
3. AuthService.signIn() called
4. Supabase authenticates user
5. Session stored in localStorage
6. Redirect to main app

### Sign Out Flow
1. User clicks sign-out button
2. AuthService.signOut() called
3. Supabase clears session
4. localStorage cleared
5. Redirect to auth page

### Session Persistence
- Sessions are automatically stored in localStorage
- On app load, session is checked
- If valid session exists, user is authenticated
- If no session or expired, redirect to auth page
- Sessions are automatically refreshed before expiration

## Security Features

### Client-Side Security
- Password minimum length validation (6 characters)
- Email format validation
- Session tokens stored securely in localStorage
- Automatic session clearing on sign-out

### Server-Side Security (Supabase)
- Secure password hashing
- JWT-based session tokens
- Automatic token expiration and refresh
- Row Level Security (RLS) policies on all tables
- Users can only access their own data

### Error Handling
- User-friendly error messages
- No sensitive information exposed in errors
- Graceful handling of network failures
- Clear feedback for authentication failures

## Usage

### For Users

1. **First Time Users:**
   - Navigate to auth.html
   - Click "Sign Up" tab
   - Enter email and password
   - Confirm password
   - Click "Create Account"
   - Check email for confirmation (if required)
   - Sign in with credentials

2. **Returning Users:**
   - Navigate to auth.html (or will be redirected automatically)
   - Enter email and password
   - Click "Sign In"
   - Automatically redirected to main app

3. **Forgot Password:**
   - Enter email in sign-in form
   - Click "Forgot password?" link
   - Check email for reset link
   - Follow link to reset password

### For Developers

**Initialize AuthService:**
```javascript
import authService from './js/auth-service.js';

// Check if user is authenticated
const isAuth = await authService.isAuthenticated();

// Get current session
const session = await authService.getSession();

// Get current user
const user = await authService.getUser();
```

**Listen to Auth State Changes:**
```javascript
authService.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
  
  if (event === 'SIGNED_IN') {
    // Handle sign in
  } else if (event === 'SIGNED_OUT') {
    // Handle sign out
  }
});
```

**Sign In User:**
```javascript
try {
  const { user, session } = await authService.signIn(email, password);
  console.log('Signed in:', user);
} catch (error) {
  console.error('Sign in failed:', error.message);
}
```

**Sign Out User:**
```javascript
try {
  await authService.signOut();
  console.log('Signed out successfully');
} catch (error) {
  console.error('Sign out failed:', error.message);
}
```

## Testing

### Manual Testing Checklist

- [ ] Sign up with new email
- [ ] Sign up with existing email (should show error)
- [ ] Sign up with invalid email format (should show error)
- [ ] Sign up with password < 6 characters (should show error)
- [ ] Sign up with non-matching passwords (should show error)
- [ ] Sign in with valid credentials
- [ ] Sign in with invalid credentials (should show error)
- [ ] Sign in with non-existent email (should show error)
- [ ] Forgot password with valid email
- [ ] Forgot password with invalid email (should show error)
- [ ] Sign out from main app
- [ ] Session persistence (refresh page, should stay signed in)
- [ ] Automatic redirect when not authenticated
- [ ] Automatic redirect when already authenticated (on auth page)

### Error Scenarios

1. **Network Failure:**
   - Disconnect internet
   - Try to sign in
   - Should show network error message

2. **Invalid Credentials:**
   - Enter wrong password
   - Should show "Invalid email or password" message

3. **Email Not Confirmed:**
   - Sign up and try to sign in before confirming email
   - Should show appropriate message

## Configuration

### Supabase Setup

1. Create Supabase project at https://supabase.com
2. Get project URL and anon key from API settings
3. Update `js/config.js`:
   ```javascript
   export const SUPABASE_URL = 'your-project-url';
   export const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

### Email Templates (Optional)

Configure email templates in Supabase dashboard:
- Authentication → Email Templates
- Customize confirmation email
- Customize password reset email
- Customize magic link email

### Email Confirmation (Optional)

Enable/disable email confirmation:
- Authentication → Settings
- Toggle "Enable email confirmations"

## Troubleshooting

### Common Issues

**Issue: "Supabase not configured" error**
- Solution: Update SUPABASE_URL and SUPABASE_ANON_KEY in config.js

**Issue: Sign up succeeds but can't sign in**
- Solution: Check if email confirmation is required in Supabase settings

**Issue: Session not persisting**
- Solution: Check browser localStorage is enabled

**Issue: Redirect loop**
- Solution: Clear localStorage and try again

**Issue: CORS errors**
- Solution: Check Supabase project URL is correct

## Future Enhancements

- [ ] Social authentication (Google, GitHub, etc.)
- [ ] Two-factor authentication (2FA)
- [ ] Magic link authentication
- [ ] Remember me functionality
- [ ] Account deletion
- [ ] Email change functionality
- [ ] Profile picture upload
- [ ] Account settings page
