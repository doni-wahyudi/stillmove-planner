/**
 * Production Readiness Check Script
 * Run this script to verify the application is ready for deployment
 * 
 * Usage: node check-production.js
 */

import fs from 'fs';
import path from 'path';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Check results
let passed = 0;
let failed = 0;
let warnings = 0;

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        log(`✓ ${description}`, 'green');
        passed++;
        return true;
    } else {
        log(`✗ ${description} - Missing: ${filePath}`, 'red');
        failed++;
        return false;
    }
}

function checkFileContent(filePath, searchString, description) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(searchString)) {
            log(`✓ ${description}`, 'green');
            passed++;
            return true;
        } else {
            log(`⚠ ${description} - Not found in ${filePath}`, 'yellow');
            warnings++;
            return false;
        }
    } else {
        log(`✗ ${description} - File missing: ${filePath}`, 'red');
        failed++;
        return false;
    }
}

function checkDirectory(dirPath, description) {
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        log(`✓ ${description}`, 'green');
        passed++;
        return true;
    } else {
        log(`✗ ${description} - Missing: ${dirPath}`, 'red');
        failed++;
        return false;
    }
}

log('\n=== Daily Planner Application - Production Readiness Check ===\n', 'cyan');

// 1. Core Files
log('1. Checking Core Files...', 'blue');
checkFile('index.html', 'Main HTML file exists');
checkFile('auth.html', 'Authentication page exists');
checkFile('css/main.css', 'Main stylesheet exists');
checkFile('js/app.js', 'Main application controller exists');
checkFile('js/config.js', 'Configuration file exists');
checkFile('js/supabase-client.js', 'Supabase client exists');

// 2. View Files
log('\n2. Checking View Files...', 'blue');
checkFile('views/annual-view.html', 'Annual view template exists');
checkFile('views/annual-view.js', 'Annual view controller exists');
checkFile('views/monthly-view.html', 'Monthly view template exists');
checkFile('views/monthly-view.js', 'Monthly view controller exists');
checkFile('views/weekly-view.html', 'Weekly view template exists');
checkFile('views/weekly-view.js', 'Weekly view controller exists');
checkFile('views/habits-view.html', 'Habits view template exists');
checkFile('views/habits-view.js', 'Habits view controller exists');
checkFile('views/action-plan-view.html', 'Action plan view template exists');
checkFile('views/action-plan-view.js', 'Action plan view controller exists');
checkFile('views/pomodoro-view.html', 'Pomodoro view template exists');
checkFile('views/pomodoro-view.js', 'Pomodoro view controller exists');
checkFile('views/settings-view.html', 'Settings view template exists');
checkFile('views/settings-view.js', 'Settings view controller exists');

// 3. Service Files
log('\n3. Checking Service Files...', 'blue');
checkFile('js/auth-service.js', 'Authentication service exists');
checkFile('js/auth-ui.js', 'Authentication UI exists');
checkFile('js/data-service.js', 'Data service exists');
checkFile('js/sync-manager.js', 'Sync manager exists');
checkFile('js/offline-manager.js', 'Offline manager exists');
checkFile('js/error-handler.js', 'Error handler exists');

// 4. Component Files
log('\n4. Checking Component Files...', 'blue');
checkFile('components/calendar.js', 'Calendar component exists');
checkFile('components/modal.js', 'Modal component exists');
checkFile('components/toast.js', 'Toast component exists');
checkFile('components/progress-bar.js', 'Progress bar component exists');
checkFile('components/spinner.js', 'Spinner component exists');

// 5. Utility Files
log('\n5. Checking Utility Files...', 'blue');
checkFile('js/utils.js', 'Utility functions exist');
checkFile('js/accessibility.js', 'Accessibility module exists');
checkFile('js/performance.js', 'Performance module exists');
checkFile('js/input-handlers.js', 'Input handlers exist');
checkFile('js/cached-data-service.js', 'Cached data service exists');

// 6. Database Files
log('\n6. Checking Database Files...', 'blue');
checkFile('database/schema.sql', 'Database schema exists');
checkFile('database/test-rls.sql', 'RLS test script exists');
checkFile('database/README.md', 'Database documentation exists');

// 7. Documentation Files
log('\n7. Checking Documentation Files...', 'blue');
checkFile('README.md', 'Main README exists');
checkFile('QUICK_START.md', 'Quick start guide exists');
checkFile('DEPLOYMENT.md', 'Deployment guide exists');
checkFile('CONTRIBUTING.md', 'Contributing guidelines exist');
checkFile('CHANGELOG.md', 'Changelog exists');
checkFile('LICENSE', 'License file exists');
checkFile('.gitignore', 'Git ignore file exists');

// 8. Test Files
log('\n8. Checking Test Files...', 'blue');
checkFile('test-runner.html', 'Test runner exists');
checkFile('js/utils.test.js', 'Unit tests exist');
checkFile('run-tests.js', 'Test runner script exists');

// 9. Configuration Checks
log('\n9. Checking Configuration...', 'blue');
if (fs.existsSync('js/config.js')) {
    const config = fs.readFileSync('js/config.js', 'utf8');
    if (config.includes('YOUR_SUPABASE_URL') || config.includes('YOUR_SUPABASE_ANON_KEY')) {
        log('⚠ Supabase credentials need to be configured', 'yellow');
        warnings++;
    } else {
        log('✓ Supabase credentials appear to be configured', 'green');
        passed++;
    }
}

// 10. Content Checks
log('\n10. Checking Content...', 'blue');
checkFileContent('README.md', 'Setup Instructions', 'README has setup instructions');
checkFileContent('README.md', 'Deployment', 'README has deployment info');
checkFileContent('database/schema.sql', 'CREATE TABLE', 'Database schema has table definitions');
checkFileContent('database/schema.sql', 'ROW LEVEL SECURITY', 'Database schema has RLS policies');

// 11. Directory Structure
log('\n11. Checking Directory Structure...', 'blue');
checkDirectory('css', 'CSS directory exists');
checkDirectory('js', 'JavaScript directory exists');
checkDirectory('views', 'Views directory exists');
checkDirectory('components', 'Components directory exists');
checkDirectory('database', 'Database directory exists');

// Summary
log('\n=== Summary ===', 'cyan');
log(`Passed: ${passed}`, 'green');
if (warnings > 0) {
    log(`Warnings: ${warnings}`, 'yellow');
}
if (failed > 0) {
    log(`Failed: ${failed}`, 'red');
}

const total = passed + failed + warnings;
const percentage = Math.round((passed / total) * 100);
log(`\nCompletion: ${percentage}%`, percentage >= 90 ? 'green' : percentage >= 70 ? 'yellow' : 'red');

if (failed === 0 && warnings === 0) {
    log('\n✓ Application is ready for production deployment!', 'green');
    process.exit(0);
} else if (failed === 0) {
    log('\n⚠ Application is mostly ready, but has some warnings. Review them before deploying.', 'yellow');
    process.exit(0);
} else {
    log('\n✗ Application has critical issues. Fix them before deploying.', 'red');
    process.exit(1);
}
