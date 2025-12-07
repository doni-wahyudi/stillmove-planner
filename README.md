# Daily Planner Application

A comprehensive web-based planning and productivity tool built with HTML, CSS, and JavaScript, powered by Supabase for backend services.

## Features

- **Annual Overview**: Set yearly goals, track reading lists, and maintain a vision board
- **Monthly Planning**: Calendar view with color-coded categories and action plans
- **Weekly Scheduling**: Detailed time blocks and weekly goal tracking
- **Habit Tracking**: Monitor daily and weekly habits with progress indicators
- **Wellness Tracking**: Track mood, sleep, and water intake
- **Action Plans**: Create and manage action plans with progress tracking
- **Pomodoro Timer**: Built-in focus timer with break management
- **Real-time Sync**: Automatic synchronization across devices
- **Offline Support**: Work offline with automatic sync when reconnected

## Quick Start

**New to the project?** Check out `QUICK_START.md` for a 10-minute setup guide!

## Setup Instructions

### 1. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to finish setting up (this may take a few minutes)
4. Go to **Project Settings** > **API**
5. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

### 2. Configure the Application

1. Open `js/config.js` in your code editor
2. Replace the placeholder values:
   ```javascript
   export const SUPABASE_URL = 'https://your-project.supabase.co';
   export const SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```

### 3. Set Up Database Schema

1. Navigate to your Supabase project dashboard
2. Go to the **SQL Editor** (left sidebar)
3. Click "New Query"
4. Copy the entire contents of `database/schema.sql`
5. Paste it into the SQL editor and click "Run"
6. Verify all tables were created in the **Table Editor**

For detailed instructions, see `database/README.md`

The database includes:
- User profiles
- Annual goals and reading lists
- Monthly and weekly planning data
- Habit tracking tables (daily and weekly)
- Wellness tracking (mood, sleep, water)
- Action plans
- Row Level Security (RLS) policies for data isolation

### 4. Run the Application

Simply open `index.html` in a modern web browser, or use a local development server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

## Project Structure

```
daily-planner-app/
├── index.html                    # Main application entry point
├── auth.html                     # Authentication page
├── test-runner.html              # Test suite runner
├── test-components.html          # Component testing page
├── test-performance.html         # Performance testing page
├── test-responsive.html          # Responsive design testing
├── css/
│   └── main.css                  # Main stylesheet with responsive design
├── js/
│   ├── config.js                 # Configuration (Supabase credentials)
│   ├── supabase-client.js        # Supabase client initialization
│   ├── app.js                    # Main application controller
│   ├── auth-service.js           # Authentication service
│   ├── auth-ui.js                # Authentication UI controller
│   ├── data-service.js           # Data access layer
│   ├── cached-data-service.js    # Cached data service for performance
│   ├── sync-manager.js           # Real-time synchronization
│   ├── offline-manager.js        # Offline support and queue management
│   ├── error-handler.js          # Error handling and user feedback
│   ├── accessibility.js          # Accessibility enhancements
│   ├── performance.js            # Performance monitoring and optimization
│   ├── input-handlers.js         # Debounced input handlers
│   ├── utils.js                  # Utility functions
│   └── utils.test.js             # Unit and property-based tests
├── views/
│   ├── annual-view.html          # Annual overview template
│   ├── annual-view.js            # Annual view controller
│   ├── monthly-view.html         # Monthly planning template
│   ├── monthly-view.js           # Monthly view controller
│   ├── weekly-view.html          # Weekly scheduling template
│   ├── weekly-view.js            # Weekly view controller
│   ├── habits-view.html          # Habit tracking template
│   ├── habits-view.js            # Habits view controller
│   ├── action-plan-view.html     # Action plan template
│   ├── action-plan-view.js       # Action plan controller
│   ├── pomodoro-view.html        # Pomodoro timer template
│   ├── pomodoro-view.js          # Pomodoro timer controller
│   ├── settings-view.html        # Settings template
│   └── settings-view.js          # Settings controller
├── components/
│   ├── calendar.js               # Reusable calendar component
│   ├── modal.js                  # Modal dialog component
│   ├── toast.js                  # Toast notification component
│   ├── progress-bar.js           # Progress bar component
│   ├── spinner.js                # Loading spinner component
│   └── README.md                 # Component documentation
├── database/
│   ├── schema.sql                # Complete database schema with RLS
│   ├── test-rls.sql              # RLS policy testing script
│   ├── README.md                 # Database setup guide
│   ├── QUICK_REFERENCE.md        # Developer quick reference
│   ├── INDEX.md                  # Database documentation index
│   ├── MIGRATION_GUIDE.md        # Migration instructions
│   ├── SCHEMA_DIAGRAM.md         # Visual schema documentation
│   ├── SETUP_SUMMARY.md          # Quick setup summary
│   └── VERIFICATION_CHECKLIST.md # Setup verification checklist
├── .kiro/specs/daily-planner-app/
│   ├── requirements.md           # Feature requirements
│   ├── design.md                 # Design document
│   └── tasks.md                  # Implementation tasks
├── AUTHENTICATION.md             # Authentication documentation
├── EXPORT_IMPORT_GUIDE.md        # Data export/import guide
├── ACCESSIBILITY.md              # Accessibility documentation
├── PERFORMANCE_OPTIMIZATION.md   # Performance guide
├── TEST_INSTRUCTIONS.md          # Testing documentation
├── .gitignore                    # Git ignore rules
├── package.json                  # Node.js package configuration
├── run-tests.js                  # Test runner script
└── README.md                     # This file
```

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **No Build Process**: Pure HTML/CSS/JS for simplicity

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

This application uses vanilla JavaScript with ES6 modules. No build process or bundler is required.

### Key Components

- **StateManager**: Centralized state management with observer pattern
- **Router**: Client-side routing for view switching
- **Supabase Client**: Database and authentication integration

## Implementation Status

All core features have been implemented:

1. ✅ Project Setup and Configuration
2. ✅ Database Schema and Security
3. ✅ Authentication System
4. ✅ Core Application Shell
5. ✅ Data Service Layer
6. ✅ View Components (Annual, Monthly, Weekly, Habits, Action Plan, Pomodoro)
7. ✅ Real-time Synchronization
8. ✅ Offline Support
9. ✅ Shared UI Components
10. ✅ Data Export and Import
11. ✅ Styling and Responsive Design
12. ✅ Error Handling and User Feedback
13. ✅ Accessibility Enhancements
14. ✅ Performance Optimization

## Database Documentation

- **Setup Guide**: `database/README.md` - Complete setup instructions
- **Schema**: `database/schema.sql` - All tables and RLS policies
- **Testing**: `database/test-rls.sql` - Verify RLS policies
- **Quick Reference**: `database/QUICK_REFERENCE.md` - Common queries and patterns

## Additional Documentation

### User Guides
- **Export/Import**: `EXPORT_IMPORT_GUIDE.md` - Data backup and restore
- **Accessibility**: `ACCESSIBILITY.md` - Accessibility features and compliance

### Developer Documentation
- **Authentication**: `AUTHENTICATION.md` - Authentication system details
- **Performance**: `PERFORMANCE_OPTIMIZATION.md` - Performance best practices
- **Components**: `components/README.md` - Reusable UI components guide
- **Testing**: `TEST_INSTRUCTIONS.md` - Testing guide and property-based tests
- **Deployment**: `DEPLOYMENT.md` - Comprehensive deployment guide
- **Contributing**: `CONTRIBUTING.md` - Guidelines for contributors

## Deployment

### GitHub Pages

1. Push your code to a GitHub repository
2. Go to **Settings** > **Pages**
3. Select the branch to deploy (usually `main`)
4. Select the root folder (`/`)
5. Click **Save**
6. Your site will be available at `https://yourusername.github.io/repository-name/`

**Important**: Make sure your `js/config.js` contains your actual Supabase credentials before deploying.

### Netlify

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to [Netlify](https://netlify.com)
3. Click **Add new site** > **Import an existing project**
4. Connect your Git provider and select your repository
5. Configure build settings:
   - **Build command**: Leave empty (no build needed)
   - **Publish directory**: `/` (root)
6. Click **Deploy site**
7. Your site will be available at a Netlify subdomain (e.g., `random-name.netlify.app`)
8. Optionally, configure a custom domain in **Site settings** > **Domain management**

**Important**: Ensure your Supabase URL is accessible from your deployment domain. You may need to update CORS settings in Supabase if needed.

### Vercel

1. Push your code to a Git repository
2. Log in to [Vercel](https://vercel.com)
3. Click **Add New** > **Project**
4. Import your repository
5. Configure project:
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
6. Click **Deploy**
7. Your site will be available at a Vercel subdomain

### Custom Server

To deploy on your own server:

1. Upload all files to your web server via FTP/SFTP
2. Ensure your web server is configured to serve static files
3. Make sure `index.html` is set as the default document
4. Configure HTTPS (recommended for security)
5. Test the deployment by accessing your domain

**Server Requirements**:
- Any web server capable of serving static files (Apache, Nginx, etc.)
- HTTPS recommended (required for some browser features)
- No server-side processing needed

## Testing

The application includes comprehensive testing:

### Running Tests

Open `test-runner.html` in your browser to run all unit and property-based tests.

### Production Readiness Check

Before deploying, run the production readiness check:

```bash
node check-production.js
```

This script verifies:
- All required files are present
- Configuration is set up
- Documentation is complete
- Directory structure is correct

### Test Coverage

- **Unit Tests**: Core utility functions and calculations
- **Property-Based Tests**: Universal properties validated across random inputs
- **Integration Tests**: Component interactions and data flow
- **Accessibility Tests**: WCAG 2.1 compliance verification

See `TEST_INSTRUCTIONS.md` for detailed testing documentation.

## Troubleshooting

### Authentication Issues

- Verify Supabase credentials in `js/config.js`
- Check browser console for error messages
- Ensure RLS policies are properly set up in Supabase

### Data Not Syncing

- Check internet connection
- Verify Supabase project is active
- Check browser console for API errors
- Try signing out and back in

### Offline Mode Not Working

- Ensure browser supports localStorage
- Check browser console for storage errors
- Clear browser cache and try again

### Performance Issues

- Clear browser cache
- Check network tab for slow requests
- Ensure you're using a modern browser
- See `PERFORMANCE_OPTIMIZATION.md` for optimization tips

## Production Readiness

This application is production-ready and includes:

✅ **Complete Feature Set**
- All planned features implemented and tested
- Comprehensive user interface for all views
- Full CRUD operations for all data types

✅ **Security**
- Row Level Security (RLS) policies on all tables
- Secure authentication via Supabase
- Data isolation between users
- HTTPS recommended for production

✅ **Performance**
- Optimized data caching
- Debounced input handlers
- Lazy loading for views
- Performance monitoring built-in

✅ **Reliability**
- Comprehensive error handling
- Offline support with sync queue
- Real-time data synchronization
- Automatic retry mechanisms

✅ **Accessibility**
- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support

✅ **Testing**
- Unit tests for core functions
- Property-based tests for correctness
- Integration tests for data flow
- Manual testing completed

✅ **Documentation**
- Complete setup instructions
- API documentation
- Deployment guides
- Troubleshooting resources

## Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` for detailed guidelines.

Quick start:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See `CONTRIBUTING.md` for detailed instructions on:
- Development setup
- Coding standards
- Testing requirements
- Pull request process

## Security

- Never commit your actual Supabase credentials to version control
- Use environment-specific configuration files
- Keep your Supabase project updated
- Review RLS policies regularly
- Enable 2FA on your Supabase account

## Version History

See `CHANGELOG.md` for detailed version history and release notes.

**Current Version**: 1.0.0 (Production Ready)

## License

MIT License - See `LICENSE` file for details.

Feel free to use this project for personal or commercial purposes.
