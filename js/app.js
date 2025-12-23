// Main Application Controller
import { APP_CONFIG } from './config.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase-client.js';
import authService from './auth-service.js';
import { ErrorHandler } from './error-handler.js';
import cacheService from './cache-service.js';
import performanceMonitor from './performance-monitor.js';

/**
 * Application State Manager
 */
class StateManager {
    constructor() {
        this.state = {
            auth: {
                user: null,
                session: null,
                isAuthenticated: false
            },
            navigation: {
                currentView: APP_CONFIG.defaultView,
                currentDate: new Date(),
                selectedYear: new Date().getFullYear(),
                selectedMonth: new Date().getMonth() + 1,
                selectedWeek: 1
            },
            data: {
                annualGoals: [],
                readingList: [],
                monthlyData: {},
                weeklyGoals: [],
                timeBlocks: [],
                dailyEntries: {},
                dailyHabits: [],
                dailyHabitCompletions: {},
                weeklyHabits: [],
                weeklyHabitCompletions: {},
                moodTracker: {},
                sleepTracker: {},
                waterTracker: {},
                actionPlans: []
            },
            ui: {
                loading: false,
                error: null,
                modals: {},
                selectedItem: null
            },
            pomodoro: {
                isRunning: false,
                isPaused: false,
                mode: 'focus',
                timeRemaining: APP_CONFIG.pomodoro.focusDuration,
                sessionCount: 0,
                completedToday: []
            },
            sync: {
                isOnline: navigator.onLine,
                lastSync: null,
                pendingOperations: []
            }
        };
        
        this.listeners = new Map();
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }
    
    /**
     * Update state and notify listeners
     */
    setState(key, value) {
        this.state[key] = value;
        this.notify(key);
    }
    
    /**
     * Notify all listeners for a key
     */
    notify(key) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(callback => callback(this.state[key]));
    }
    
    /**
     * Get current state
     */
    getState(key) {
        return key ? this.state[key] : this.state;
    }
}

/**
 * Router for view switching
 */
class Router {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.viewContainer = document.getElementById('view-container');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Handle navigation clicks
        document.querySelectorAll('[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.getAttribute('data-view');
                this.navigate(view);
            });
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this.loadView(e.state.view);
            }
        });
    }
    
    navigate(view) {
        this.loadView(view);
        history.pushState({ view }, '', `#${view}`);
    }
    
    loadView(view) {
        // Update navigation state
        this.stateManager.setState('navigation', {
            ...this.stateManager.getState('navigation'),
            currentView: view
        });
        
        // Update active nav item
        document.querySelectorAll('[data-view]').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-view') === view);
        });
        
        // Update breadcrumb
        this.updateBreadcrumb(view);
        
        // Load view content
        this.renderView(view);
    }
    
    /**
     * Update breadcrumb navigation
     */
    updateBreadcrumb(view) {
        const viewEl = document.getElementById('breadcrumb-view');
        const contextEl = document.getElementById('breadcrumb-context');
        
        if (!viewEl || !contextEl) return;
        
        // View name mapping
        const viewNames = {
            'weekly': 'Weekly',
            'monthly': 'Monthly',
            'annual': 'Annual',
            'habits': 'Habits',
            'action-plan': 'Action Plan',
            'pomodoro': 'Pomodoro',
            'settings': 'Settings'
        };
        
        viewEl.textContent = viewNames[view] || view;
        
        // Set context based on current date/state
        const nav = this.stateManager.getState('navigation');
        const now = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
        
        let context = '';
        switch(view) {
            case 'weekly':
                // Will be updated by weekly view
                context = this.getWeekContext(now);
                break;
            case 'monthly':
            case 'habits':
                context = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
                break;
            case 'annual':
                context = `${now.getFullYear()}`;
                break;
            case 'pomodoro':
                context = 'Focus Timer';
                break;
            case 'action-plan':
                context = 'Goals & Tasks';
                break;
            case 'settings':
                context = 'Preferences';
                break;
            default:
                context = '';
        }
        
        contextEl.textContent = context;
    }
    
    /**
     * Get week context string
     */
    getWeekContext(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        
        const weekEnd = new Date(d);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const startMonth = monthNames[d.getMonth()];
        const endMonth = monthNames[weekEnd.getMonth()];
        const startDay = d.getDate();
        const endDay = weekEnd.getDate();
        const year = d.getFullYear();
        
        if (startMonth === endMonth) {
            return `${startMonth} ${startDay}-${endDay}, ${year}`;
        }
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
    
    renderView(view) {
        // Start performance tracking
        performanceMonitor.startViewLoad(view);
        
        // Show skeleton loading state
        this.viewContainer.innerHTML = `
            <div class="loading-skeleton" aria-busy="true" aria-label="Loading ${view} view">
                <div class="skeleton skeleton-header"></div>
                <div class="skeleton-grid">
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                    <div class="skeleton skeleton-card"></div>
                </div>
                <div class="skeleton skeleton-text long"></div>
                <div class="skeleton skeleton-text medium"></div>
                <div class="skeleton skeleton-text short"></div>
            </div>
        `;
        
        // Render view based on type
        switch(view) {
            case 'annual':
                this.renderAnnualView();
                break;
            case 'monthly':
                this.renderMonthlyView();
                break;
            case 'weekly':
                this.renderWeeklyView();
                break;
            case 'habits':
                this.renderHabitsView();
                break;
            case 'action-plan':
                this.renderActionPlanView();
                break;
            case 'pomodoro':
                this.renderPomodoroView();
                break;
            case 'settings':
                this.renderSettingsView();
                break;
            default:
                performanceMonitor.endViewLoad(view);
                this.viewContainer.innerHTML = this.getErrorViewHTML('View Not Found', 'The requested view does not exist.', 'Check the URL or navigate using the menu.');
        }
    }
    
    /**
     * Generate error view HTML with retry button and hints
     */
    getErrorViewHTML(title, message, hint) {
        return `
            <div class="error-view" role="alert">
                <h2>${title}</h2>
                <p>${message}</p>
                ${hint ? `<div class="error-hint">💡 ${hint}</div>` : ''}
                <button class="btn-retry" onclick="location.reload()">
                    ↻ Retry
                </button>
            </div>
        `;
    }
    
    async renderAnnualView() {
        // Dynamically import and initialize the annual view
        try {
            const { default: AnnualView } = await import('../views/annual-view.js');
            const annualView = new AnnualView(this.stateManager);
            await annualView.init(this.viewContainer);
            performanceMonitor.endViewLoad('annual');
        } catch (error) {
            performanceMonitor.endViewLoad('annual');
            ErrorHandler.handle(error, 'Annual View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Annual View',
                'There was a problem loading your annual goals.',
                'Check your internet connection and try again.'
            );
        }
    }
    
    async renderMonthlyView() {
        // Dynamically import and initialize the monthly view
        try {
            const { default: MonthlyView } = await import('../views/monthly-view.js');
            const monthlyView = new MonthlyView(this.stateManager);
            await monthlyView.init(this.viewContainer);
            performanceMonitor.endViewLoad('monthly');
        } catch (error) {
            performanceMonitor.endViewLoad('monthly');
            ErrorHandler.handle(error, 'Monthly View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Monthly View',
                'There was a problem loading your monthly calendar.',
                'Check your internet connection and try again.'
            );
        }
    }
    
    async renderWeeklyView() {
        // Dynamically import and initialize the weekly view
        try {
            const { default: WeeklyView } = await import('../views/weekly-view.js');
            const weeklyView = new WeeklyView(this.stateManager);
            await weeklyView.init(this.viewContainer);
            performanceMonitor.endViewLoad('weekly');
        } catch (error) {
            performanceMonitor.endViewLoad('weekly');
            ErrorHandler.handle(error, 'Weekly View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Weekly View',
                'There was a problem loading your weekly schedule.',
                'Check your internet connection and try again.'
            );
        }
    }
    
    async renderHabitsView() {
        // Dynamically import and initialize the habits view
        try {
            const { default: HabitsView } = await import('../views/habits-view.js');
            const habitsView = new HabitsView(this.stateManager);
            await habitsView.init(this.viewContainer);
            performanceMonitor.endViewLoad('habits');
        } catch (error) {
            performanceMonitor.endViewLoad('habits');
            ErrorHandler.handle(error, 'Habits View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Habits View',
                'There was a problem loading your habit tracker.',
                'Check your internet connection and try again.'
            );
        }
    }
    
    async renderActionPlanView() {
        // Dynamically import and initialize the action plan view
        try {
            const { default: ActionPlanView } = await import('../views/action-plan-view.js');
            const actionPlanView = new ActionPlanView(this.stateManager);
            await actionPlanView.init(this.viewContainer);
            performanceMonitor.endViewLoad('action-plan');
        } catch (error) {
            performanceMonitor.endViewLoad('action-plan');
            ErrorHandler.handle(error, 'Action Plan View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Action Plan',
                'There was a problem loading your action plans.',
                'Check your internet connection and try again.'
            );
        }
    }
    
    async renderPomodoroView() {
        // Dynamically import and initialize the pomodoro view
        try {
            const { default: PomodoroView } = await import('../views/pomodoro-view.js');
            const pomodoroView = new PomodoroView(this.stateManager);
            await pomodoroView.init(this.viewContainer);
            performanceMonitor.endViewLoad('pomodoro');
        } catch (error) {
            performanceMonitor.endViewLoad('pomodoro');
            ErrorHandler.handle(error, 'Pomodoro View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Pomodoro Timer',
                'There was a problem loading the focus timer.',
                'Check your internet connection and try again.'
            );
        }
    }
    
    async renderSettingsView() {
        // Dynamically import and initialize the settings view
        try {
            const { default: settingsView } = await import('../views/settings-view.js');
            await settingsView.init(this.viewContainer);
            performanceMonitor.endViewLoad('settings');
        } catch (error) {
            performanceMonitor.endViewLoad('settings');
            ErrorHandler.handle(error, 'Settings View Loading');
            this.viewContainer.innerHTML = this.getErrorViewHTML(
                'Failed to load Settings',
                'There was a problem loading your settings.',
                'Check your internet connection and try again.'
            );
        }
    }
}

/**
 * Application Class
 */
class App {
    constructor() {
        this.stateManager = new StateManager();
        this.router = null;
        this.supabase = null;
    }
    
    async init() {
        console.log('Initializing Daily Planner Application...');
        
        try {
            // Initialize performance monitoring
            performanceMonitor.init();
            
            // Initialize cache service for offline support
            try {
                await cacheService.init();
                console.log('[PWA] Cache service initialized');
            } catch (cacheError) {
                console.warn('[PWA] Cache service failed to initialize:', cacheError);
                // Continue without cache - app will work online only
            }
            
            // Check if Supabase is configured
            if (!isSupabaseConfigured()) {
                this.showConfigurationMessage();
                return;
            }
            
            // Initialize Supabase client
            this.supabase = getSupabaseClient();
            
            // Initialize router
            this.router = new Router(this.stateManager);
            
            // Check authentication status
            await this.checkAuth();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial view
            const hash = window.location.hash.slice(1) || APP_CONFIG.defaultView;
            this.router.navigate(hash);
            
            // Check if user should be reminded to export data
            this.checkExportReminder();
            
            console.log('Application initialized successfully');
        } catch (error) {
            ErrorHandler.handle(error, 'Application Initialization');
            this.showError('Failed to initialize application. Please check your configuration.');
        }
    }
    
    async checkAuth() {
        try {
            const session = await authService.getSession();
            
            if (session) {
                this.stateManager.setState('auth', {
                    user: session.user,
                    session: session,
                    isAuthenticated: true
                });
                
                // Update UI with user email
                const userEmailEl = document.getElementById('user-email');
                if (userEmailEl) {
                    userEmailEl.textContent = session.user.email;
                }
                
                // Setup auth state change listener
                this.setupAuthStateListener();
            } else {
                // Redirect to auth page
                console.log('User not authenticated, redirecting to auth page');
                window.location.href = 'auth.html';
            }
        } catch (error) {
            ErrorHandler.handleAuthError(error, 'Authentication Check');
            window.location.href = 'auth.html';
        }
    }
    
    setupAuthStateListener() {
        authService.onAuthStateChange((event, session) => {
            console.log('Auth state changed in app:', event);
            
            if (event === 'SIGNED_OUT') {
                // Clear state and redirect to auth page
                this.stateManager.setState('auth', {
                    user: null,
                    session: null,
                    isAuthenticated: false
                });
                window.location.href = 'auth.html';
            } else if (event === 'TOKEN_REFRESHED' && session) {
                // Update session in state
                this.stateManager.setState('auth', {
                    user: session.user,
                    session: session,
                    isAuthenticated: true
                });
            } else if (event === 'SIGNED_IN' && session) {
                // Update state with new session
                this.stateManager.setState('auth', {
                    user: session.user,
                    session: session,
                    isAuthenticated: true
                });
                
                // Update UI
                const userEmailEl = document.getElementById('user-email');
                if (userEmailEl) {
                    userEmailEl.textContent = session.user.email;
                }
            }
        });
    }
    
    setupEventListeners() {
        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Quick Add FAB
        this.setupQuickAddFAB();
        
        // Global Search
        this.setupSearch();
        
        // Keyboard help button
        const keyboardHelpBtn = document.getElementById('keyboard-help-btn');
        if (keyboardHelpBtn) {
            keyboardHelpBtn.addEventListener('click', () => this.showKeyboardShortcutsHelp());
        }
        
        // Swipe gestures for mobile navigation
        this.setupSwipeGestures();
        
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (mobileMenuToggle && navMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                mobileMenuToggle.classList.toggle('active');
            });
            
            // Close mobile menu when a link is clicked
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                });
            });
        }
        
        // User menu toggle
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('hidden');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.add('hidden');
                }
            });
        }
        
        // Sign out button
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.signOut());
        }
        
        // Online/offline detection
        window.addEventListener('online', () => {
            this.stateManager.setState('sync', {
                ...this.stateManager.getState('sync'),
                isOnline: true
            });
            console.log('Application is online');
        });
        
        window.addEventListener('offline', () => {
            this.stateManager.setState('sync', {
                ...this.stateManager.getState('sync'),
                isOnline: false
            });
            console.log('Application is offline');
        });
    }
    
    async signOut() {
        try {
            await authService.signOut();
            // Auth state listener will handle redirect
        } catch (error) {
            ErrorHandler.handleAuthError(error, 'Sign Out');
        }
    }
    
    /**
     * Setup swipe gestures for mobile navigation
     */
    setupSwipeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        const minSwipeDistance = 80;
        const maxVerticalDistance = 100;
        
        const viewContainer = document.getElementById('view-container');
        if (!viewContainer) return;
        
        viewContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        viewContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY, minSwipeDistance, maxVerticalDistance);
        }, { passive: true });
    }
    
    /**
     * Handle swipe gesture
     */
    handleSwipe(startX, startY, endX, endY, minDistance, maxVertical) {
        const deltaX = endX - startX;
        const deltaY = Math.abs(endY - startY);
        
        // Only handle horizontal swipes (not too much vertical movement)
        if (deltaY > maxVertical) return;
        
        // Check if swipe distance is sufficient
        if (Math.abs(deltaX) < minDistance) return;
        
        // Find navigation buttons in current view
        const prevBtn = document.querySelector('#prev-week-btn, #prev-month-btn, #habits-prev-month-btn, #prev-year-btn');
        const nextBtn = document.querySelector('#next-week-btn, #next-month-btn, #habits-next-month-btn, #next-year-btn');
        
        if (deltaX > 0 && prevBtn) {
            // Swipe right = go to previous
            prevBtn.click();
            this.showSwipeIndicator('←');
        } else if (deltaX < 0 && nextBtn) {
            // Swipe left = go to next
            nextBtn.click();
            this.showSwipeIndicator('→');
        }
    }
    
    /**
     * Show visual indicator for swipe
     */
    showSwipeIndicator(direction) {
        // Create indicator element
        const indicator = document.createElement('div');
        indicator.className = 'swipe-indicator';
        indicator.textContent = direction;
        document.body.appendChild(indicator);
        
        // Remove after animation
        setTimeout(() => {
            indicator.classList.add('fade-out');
            setTimeout(() => indicator.remove(), 300);
        }, 200);
    }
    
    /**
     * Setup keyboard shortcuts for navigation and actions
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            // Navigation shortcuts (no modifier keys)
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 't':
                        // Go to Today - trigger the Today button if it exists
                        e.preventDefault();
                        this.triggerTodayButton();
                        break;
                    case 'w':
                        // Go to Weekly view
                        e.preventDefault();
                        this.router.navigate('weekly');
                        break;
                    case 'm':
                        // Go to Monthly view
                        e.preventDefault();
                        this.router.navigate('monthly');
                        break;
                    case 'h':
                        // Go to Habits view
                        e.preventDefault();
                        this.router.navigate('habits');
                        break;
                    case 'a':
                        // Go to Annual view
                        e.preventDefault();
                        this.router.navigate('annual');
                        break;
                    case 'p':
                        // Go to Pomodoro view
                        e.preventDefault();
                        this.router.navigate('pomodoro');
                        break;
                    case '?':
                        // Show keyboard shortcuts help
                        e.preventDefault();
                        this.showKeyboardShortcutsHelp();
                        break;
                    case '/':
                        // Open global search
                        e.preventDefault();
                        this.toggleSearch(true);
                        break;
                    case 'n':
                        // Toggle Quick Add menu
                        e.preventDefault();
                        this.toggleQuickAddMenu();
                        break;
                    case 'f':
                        // Toggle Focus Mode
                        e.preventDefault();
                        this.toggleFocusMode();
                        break;
                    case 'g':
                        // Go to specific date
                        e.preventDefault();
                        this.showDateJumpPicker();
                        break;
                    case 'escape':
                        // Close Quick Add menu if open
                        this.closeQuickAddMenu();
                        // Close search if open
                        this.toggleSearch(false);
                        // Exit focus mode if active
                        if (document.body.classList.contains('focus-mode')) {
                            this.toggleFocusMode(false);
                        }
                        break;
                }
            }
            
            // Arrow key navigation for date navigation
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const prevBtn = document.querySelector('#prev-week-btn, #prev-month-btn, #habits-prev-month-btn, #prev-year-btn');
                const nextBtn = document.querySelector('#next-week-btn, #next-month-btn, #habits-next-month-btn, #next-year-btn');
                
                if (e.key === 'ArrowLeft' && prevBtn) {
                    e.preventDefault();
                    prevBtn.click();
                } else if (e.key === 'ArrowRight' && nextBtn) {
                    e.preventDefault();
                    nextBtn.click();
                }
            }
        });
    }
    
    /**
     * Trigger the Today button in the current view
     */
    triggerTodayButton() {
        const todayBtn = document.querySelector('#today-week-btn, #today-month-btn, #habits-today-btn');
        if (todayBtn) {
            todayBtn.click();
        }
    }
    
    /**
     * Show keyboard shortcuts help modal
     */
    showKeyboardShortcutsHelp() {
        // Check if modal already exists
        let modal = document.getElementById('keyboard-shortcuts-modal');
        if (modal) {
            modal.style.display = 'flex';
            return;
        }
        
        // Create modal
        modal = document.createElement('div');
        modal.id = 'keyboard-shortcuts-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Keyboard Shortcuts</h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-list">
                        <div class="shortcut-group">
                            <h4 style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.85rem; text-transform: uppercase;">Navigation</h4>
                            <div class="shortcut-item"><span class="kbd">W</span> Weekly View</div>
                            <div class="shortcut-item"><span class="kbd">M</span> Monthly View</div>
                            <div class="shortcut-item"><span class="kbd">H</span> Habits View</div>
                            <div class="shortcut-item"><span class="kbd">A</span> Annual View</div>
                            <div class="shortcut-item"><span class="kbd">P</span> Pomodoro Timer</div>
                        </div>
                        <div class="shortcut-group" style="margin-top: 1rem;">
                            <h4 style="color: var(--text-secondary); margin-bottom: 0.75rem; font-size: 0.85rem; text-transform: uppercase;">Actions</h4>
                            <div class="shortcut-item"><span class="kbd">T</span> Go to Today</div>
                            <div class="shortcut-item"><span class="kbd">N</span> Quick Add Menu</div>
                            <div class="shortcut-item"><span class="kbd">/</span> Search</div>
                            <div class="shortcut-item"><span class="kbd">←</span> Previous Period</div>
                            <div class="shortcut-item"><span class="kbd">→</span> Next Period</div>
                            <div class="shortcut-item"><span class="kbd">F</span> Focus Mode</div>
                            <div class="shortcut-item"><span class="kbd">G</span> Go to Date</div>
                            <div class="shortcut-item"><span class="kbd">?</span> Show Shortcuts</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary modal-close">Got it!</button>
                </div>
            </div>
        `;
        
        // Add styles for shortcut items
        const style = document.createElement('style');
        style.textContent = `
            .shortcut-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 0;
                color: var(--text-primary);
                font-size: 0.9rem;
            }
            .shortcut-item .kbd {
                min-width: 28px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(modal);
        
        // Close handlers
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
    
    /**
     * Toggle Focus Mode - hides navigation for distraction-free work
     */
    toggleFocusMode(forceState = null) {
        const body = document.body;
        const isActive = body.classList.contains('focus-mode');
        const shouldActivate = forceState !== null ? forceState : !isActive;
        
        if (shouldActivate) {
            body.classList.add('focus-mode');
            this.showFocusModeIndicator();
            if (window.showToast) {
                window.showToast('Focus Mode enabled. Press Esc or F to exit.', 'info');
            }
        } else {
            body.classList.remove('focus-mode');
            this.hideFocusModeIndicator();
        }
        
        // Save preference
        localStorage.setItem('stillmove_focus_mode', shouldActivate ? 'true' : 'false');
    }
    
    /**
     * Show focus mode indicator
     */
    showFocusModeIndicator() {
        let indicator = document.getElementById('focus-mode-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'focus-mode-indicator';
            indicator.className = 'focus-mode-indicator';
            indicator.innerHTML = `
                <span class="focus-icon">🎯</span>
                <span class="focus-text">Focus Mode</span>
                <button class="focus-exit-btn" title="Exit Focus Mode (Esc)">×</button>
            `;
            document.body.appendChild(indicator);
            
            // Exit button handler
            indicator.querySelector('.focus-exit-btn').addEventListener('click', () => {
                this.toggleFocusMode(false);
            });
        }
        indicator.classList.add('visible');
    }
    
    /**
     * Hide focus mode indicator
     */
    hideFocusModeIndicator() {
        const indicator = document.getElementById('focus-mode-indicator');
        if (indicator) {
            indicator.classList.remove('visible');
        }
    }
    
    /**
     * Show date jump picker modal
     */
    showDateJumpPicker() {
        // Check if modal already exists
        let modal = document.getElementById('date-jump-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.querySelector('input[type="date"]').focus();
            return;
        }
        
        // Create modal
        modal = document.createElement('div');
        modal.id = 'date-jump-modal';
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        const today = new Date().toISOString().split('T')[0];
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 320px;">
                <div class="modal-header">
                    <h3>📅 Go to Date</h3>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9rem;">
                        Jump to a specific date in the current view.
                    </p>
                    <input type="date" id="date-jump-input" value="${today}" 
                           style="width: 100%; padding: 0.75rem; font-size: 1rem; border-radius: var(--radius-md);">
                    <div class="date-quick-jumps" style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button class="btn-small date-quick-btn" data-offset="-7">Last Week</button>
                        <button class="btn-small date-quick-btn" data-offset="0">Today</button>
                        <button class="btn-small date-quick-btn" data-offset="7">Next Week</button>
                        <button class="btn-small date-quick-btn" data-offset="30">Next Month</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close">Cancel</button>
                    <button class="btn-primary" id="date-jump-go-btn">Go</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus the date input
        modal.querySelector('input[type="date"]').focus();
        
        // Close handlers
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Quick jump buttons
        modal.querySelectorAll('.date-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const offset = parseInt(btn.dataset.offset);
                const date = new Date();
                date.setDate(date.getDate() + offset);
                modal.querySelector('#date-jump-input').value = date.toISOString().split('T')[0];
            });
        });
        
        // Go button
        modal.querySelector('#date-jump-go-btn').addEventListener('click', () => {
            const dateInput = modal.querySelector('#date-jump-input');
            const selectedDate = new Date(dateInput.value);
            this.jumpToDate(selectedDate);
            modal.style.display = 'none';
        });
        
        // Enter key to submit
        modal.querySelector('#date-jump-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const selectedDate = new Date(e.target.value);
                this.jumpToDate(selectedDate);
                modal.style.display = 'none';
            }
        });
    }
    
    /**
     * Jump to a specific date in the current view
     */
    jumpToDate(date) {
        const currentView = this.stateManager.state.navigation.currentView;
        
        // Dispatch custom event that views can listen to
        const event = new CustomEvent('dateJump', { detail: { date, view: currentView } });
        document.dispatchEvent(event);
        
        // Also try to directly update the view if possible
        if (currentView === 'weekly' && window.weeklyView) {
            window.weeklyView.goToDate(date);
        } else if (currentView === 'monthly' && window.monthlyView) {
            window.monthlyView.goToDate(date);
        } else if (currentView === 'habits' && window.habitsView) {
            window.habitsView.goToDate(date);
        } else if (currentView === 'annual' && window.annualView) {
            window.annualView.goToYear(date.getFullYear());
        }
        
        if (window.showToast) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            window.showToast(`Jumped to ${date.toLocaleDateString(undefined, options)}`, 'info');
        }
    }
    
    /**
     * Setup Quick Add Floating Action Button
     */
    setupQuickAddFAB() {
        const fabButton = document.getElementById('fab-button');
        const fabMenu = document.getElementById('fab-menu');
        
        if (!fabButton || !fabMenu) return;
        
        // Toggle menu on FAB click
        fabButton.addEventListener('click', () => {
            this.toggleQuickAddMenu();
        });
        
        // Handle menu item clicks
        fabMenu.querySelectorAll('.fab-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleQuickAddAction(action);
                this.closeQuickAddMenu();
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const fabContainer = document.getElementById('fab-container');
            if (fabContainer && !fabContainer.contains(e.target)) {
                this.closeQuickAddMenu();
            }
        });
    }
    
    /**
     * Toggle Quick Add menu
     */
    toggleQuickAddMenu() {
        const fabButton = document.getElementById('fab-button');
        const fabMenu = document.getElementById('fab-menu');
        
        if (!fabButton || !fabMenu) return;
        
        const isOpen = fabMenu.classList.contains('open');
        
        if (isOpen) {
            this.closeQuickAddMenu();
        } else {
            fabButton.classList.add('open');
            fabButton.setAttribute('aria-expanded', 'true');
            fabMenu.classList.add('open');
        }
    }
    
    /**
     * Close Quick Add menu
     */
    closeQuickAddMenu() {
        const fabButton = document.getElementById('fab-button');
        const fabMenu = document.getElementById('fab-menu');
        
        if (fabButton) {
            fabButton.classList.remove('open');
            fabButton.setAttribute('aria-expanded', 'false');
        }
        if (fabMenu) {
            fabMenu.classList.remove('open');
        }
    }
    
    /**
     * Handle Quick Add action
     */
    handleQuickAddAction(action) {
        const currentView = this.stateManager.getState('navigation').currentView;
        
        switch(action) {
            case 'add-habit':
                // Navigate to habits view and trigger add
                if (currentView !== 'habits') {
                    this.router.navigate('habits');
                }
                // Wait for view to load then click add button
                setTimeout(() => {
                    const addBtn = document.getElementById('add-daily-habit-btn');
                    if (addBtn) addBtn.click();
                }, 100);
                break;
                
            case 'add-goal':
                // Navigate to weekly view and trigger add goal
                if (currentView !== 'weekly') {
                    this.router.navigate('weekly');
                }
                setTimeout(() => {
                    const addBtn = document.getElementById('add-weekly-goal-btn');
                    if (addBtn) addBtn.click();
                }, 100);
                break;
                
            case 'add-timeblock':
                // Navigate to weekly view - user can click on time slot
                if (currentView !== 'weekly') {
                    this.router.navigate('weekly');
                }
                // Show a toast hint
                this.showToast('Click on a time slot to add a time block');
                break;
        }
    }
    
    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {Object} options - Optional settings
     * @param {string} options.type - 'info', 'success', 'error', 'warning'
     * @param {number} options.duration - Duration in ms (default 3000)
     * @param {Function} options.action - Action callback for undo button
     * @param {string} options.actionLabel - Label for action button (default 'Undo')
     */
    showToast(message, options = {}) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const { type = 'info', duration = 3000, action, actionLabel = 'Undo' } = options;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let html = `<span class="toast-message">${message}</span>`;
        if (action) {
            html += `<button class="toast-action">${actionLabel}</button>`;
        }
        toast.innerHTML = html;
        container.appendChild(toast);
        
        // Handle action button click
        if (action) {
            const actionBtn = toast.querySelector('.toast-action');
            actionBtn?.addEventListener('click', () => {
                action();
                toast.remove();
            });
        }
        
        // Auto-remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        return toast;
    }
    
    /**
     * Setup Global Search functionality
     */
    setupSearch() {
        const searchToggle = document.getElementById('search-toggle-btn');
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('global-search');
        
        if (!searchToggle || !searchContainer || !searchInput) return;
        
        // Toggle search on button click
        searchToggle.addEventListener('click', () => {
            this.toggleSearch();
        });
        
        // Search on input with debounce
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
        
        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target) && !searchToggle.contains(e.target)) {
                this.toggleSearch(false);
            }
        });
        
        // Handle Escape in search input
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.toggleSearch(false);
            }
        });
    }
    
    /**
     * Toggle search visibility
     */
    toggleSearch(forceOpen = null) {
        const searchContainer = document.getElementById('search-container');
        const searchInput = document.getElementById('global-search');
        const searchToggle = document.getElementById('search-toggle-btn');
        
        if (!searchContainer || !searchInput) return;
        
        const isHidden = searchContainer.classList.contains('hidden');
        const shouldOpen = forceOpen !== null ? forceOpen : isHidden;
        
        if (shouldOpen) {
            searchContainer.classList.remove('hidden');
            searchToggle?.classList.add('active');
            searchInput.focus();
        } else {
            searchContainer.classList.add('hidden');
            searchToggle?.classList.remove('active');
            searchInput.value = '';
            this.clearSearchResults();
        }
    }
    
    /**
     * Perform search across all data
     */
    async performSearch(query) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        if (!query || query.trim().length < 2) {
            this.clearSearchResults();
            return;
        }
        
        const searchTerm = query.toLowerCase().trim();
        const results = [];
        const data = this.stateManager.getState('data');
        
        // Search weekly goals
        if (data.weeklyGoals && data.weeklyGoals.length > 0) {
            data.weeklyGoals.forEach(goal => {
                if (goal.text && goal.text.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'goal',
                        icon: '🎯',
                        title: goal.text,
                        subtitle: 'Weekly Goal',
                        view: 'weekly'
                    });
                }
            });
        }
        
        // Search annual goals and sub-goals
        if (data.annualGoals && data.annualGoals.length > 0) {
            data.annualGoals.forEach(goal => {
                if (goal.title && goal.title.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'annual-goal',
                        icon: '🏆',
                        title: goal.title,
                        subtitle: `Annual Goal - ${goal.category || 'Uncategorized'}`,
                        view: 'annual'
                    });
                }
                // Search sub-goals
                if (goal.sub_goals && goal.sub_goals.length > 0) {
                    goal.sub_goals.forEach(subGoal => {
                        const subGoalText = typeof subGoal === 'string' ? subGoal : subGoal.text;
                        if (subGoalText && subGoalText.toLowerCase().includes(searchTerm)) {
                            results.push({
                                type: 'sub-goal',
                                icon: '📌',
                                title: subGoalText,
                                subtitle: `Sub-goal of: ${goal.title || 'Unnamed Goal'}`,
                                view: 'annual'
                            });
                        }
                    });
                }
            });
        }
        
        // Search daily habits
        if (data.dailyHabits && data.dailyHabits.length > 0) {
            data.dailyHabits.forEach(habit => {
                if (habit.name && habit.name.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'habit',
                        icon: '✨',
                        title: habit.name,
                        subtitle: 'Daily Habit',
                        view: 'habits'
                    });
                }
            });
        }
        
        // Search weekly habits
        if (data.weeklyHabits && data.weeklyHabits.length > 0) {
            data.weeklyHabits.forEach(habit => {
                if (habit.name && habit.name.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'habit',
                        icon: '📅',
                        title: habit.name,
                        subtitle: 'Weekly Habit',
                        view: 'habits'
                    });
                }
            });
        }
        
        // Search time blocks
        if (data.timeBlocks && data.timeBlocks.length > 0) {
            data.timeBlocks.forEach(block => {
                if (block.activity && block.activity.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'timeblock',
                        icon: '📅',
                        title: block.activity,
                        subtitle: `Time Block - ${block.day_of_week || ''}`,
                        view: 'weekly'
                    });
                }
            });
        }
        
        // Search action plans
        if (data.actionPlans && data.actionPlans.length > 0) {
            data.actionPlans.forEach(plan => {
                if ((plan.goal && plan.goal.toLowerCase().includes(searchTerm)) ||
                    (plan.evaluation && plan.evaluation.toLowerCase().includes(searchTerm))) {
                    results.push({
                        type: 'action-plan',
                        icon: '📋',
                        title: plan.goal || 'Action Plan',
                        subtitle: plan.evaluation ? `Evaluation: ${plan.evaluation.substring(0, 50)}...` : 'Action Plan',
                        view: 'action-plan'
                    });
                }
            });
        }
        
        // Search reading list
        if (data.readingList && data.readingList.length > 0) {
            data.readingList.forEach(book => {
                if ((book.title && book.title.toLowerCase().includes(searchTerm)) ||
                    (book.author && book.author.toLowerCase().includes(searchTerm))) {
                    results.push({
                        type: 'book',
                        icon: '📚',
                        title: book.title || 'Untitled Book',
                        subtitle: book.author ? `by ${book.author}` : 'Reading List',
                        view: 'annual'
                    });
                }
            });
        }
        
        // Search monthly notes
        if (data.monthlyData && data.monthlyData.notes) {
            if (data.monthlyData.notes.toLowerCase().includes(searchTerm)) {
                const preview = data.monthlyData.notes.substring(0, 60);
                results.push({
                    type: 'note',
                    icon: '📝',
                    title: 'Monthly Notes',
                    subtitle: preview + (data.monthlyData.notes.length > 60 ? '...' : ''),
                    view: 'monthly'
                });
            }
        }
        
        // Search monthly checklist
        if (data.monthlyData && data.monthlyData.checklist && data.monthlyData.checklist.length > 0) {
            data.monthlyData.checklist.forEach(item => {
                if (item.text && item.text.toLowerCase().includes(searchTerm)) {
                    results.push({
                        type: 'checklist',
                        icon: item.completed ? '✅' : '☐',
                        title: item.text,
                        subtitle: `Monthly Checklist - ${item.completed ? 'Completed' : 'Pending'}`,
                        view: 'monthly'
                    });
                }
            });
        }
        
        this.displaySearchResults(results, searchTerm);
    }
    
    /**
     * Display search results
     */
    displaySearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <span class="search-no-results-icon">🔍</span>
                    <p>No results found for "${searchTerm}"</p>
                </div>
            `;
            return;
        }
        
        const html = results.slice(0, 10).map(result => `
            <div class="search-result-item" data-view="${result.view}">
                <span class="search-result-icon">${result.icon}</span>
                <div class="search-result-content">
                    <div class="search-result-title">${this.highlightMatch(result.title, searchTerm)}</div>
                    <div class="search-result-subtitle">${result.subtitle}</div>
                </div>
                <span class="search-result-arrow">→</span>
            </div>
        `).join('');
        
        resultsContainer.innerHTML = html;
        
        // Add click handlers to results
        resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                this.router.navigate(view);
                this.toggleSearch(false);
            });
        });
    }
    
    /**
     * Highlight matching text in search results
     */
    highlightMatch(text, searchTerm) {
        if (!text) return '';
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    /**
     * Clear search results
     */
    clearSearchResults() {
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }
    
    showConfigurationMessage() {
        const viewContainer = document.getElementById('view-container');
        viewContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h2>Welcome to Daily Planner!</h2>
                <p>To get started, please configure your Supabase credentials:</p>
                <ol style="text-align: left; max-width: 600px; margin: 2rem auto;">
                    <li>Create a Supabase project at <a href="https://supabase.com" target="_blank">supabase.com</a></li>
                    <li>Copy your project URL and anon key from the API settings</li>
                    <li>Update the values in <code>js/config.js</code></li>
                    <li>Reload this page</li>
                </ol>
            </div>
        `;
    }
    
    showError(message) {
        const viewContainer = document.getElementById('view-container');
        viewContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: red;">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        `;
    }
    
    /**
     * Check if user should be reminded to export their data
     * Reminds every 7 days if they haven't exported
     */
    checkExportReminder() {
        const EXPORT_REMINDER_KEY = 'lastExportReminder';
        const EXPORT_REMINDER_DAYS = 7;
        
        try {
            const lastReminder = localStorage.getItem(EXPORT_REMINDER_KEY);
            const now = Date.now();
            const reminderInterval = EXPORT_REMINDER_DAYS * 24 * 60 * 60 * 1000;
            
            // Check if we should show reminder
            if (!lastReminder || (now - parseInt(lastReminder)) > reminderInterval) {
                // Delay the reminder so it doesn't interrupt initial load
                setTimeout(() => {
                    this.showExportReminder();
                    localStorage.setItem(EXPORT_REMINDER_KEY, now.toString());
                }, 5000);
            }
        } catch (e) {
            // localStorage might not be available
            console.warn('Could not check export reminder:', e);
        }
    }
    
    /**
     * Show export reminder toast
     */
    showExportReminder() {
        if (window.Toast) {
            window.Toast.info(
                '💾 Remember to backup your data! Go to Settings → Export to save a copy.',
                8000
            );
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

// Export for testing
export { App, StateManager, Router };
