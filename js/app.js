// Main Application Controller
import { APP_CONFIG } from './config.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase-client.js';
import authService from './auth-service.js';
import { ErrorHandler } from './error-handler.js';

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
        
        // Load view content
        this.renderView(view);
    }
    
    renderView(view) {
        // Show loading state
        this.viewContainer.innerHTML = '<div class="loading-view">Loading...</div>';
        
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
                this.viewContainer.innerHTML = '<div class="error-view">View not found</div>';
        }
    }
    
    async renderAnnualView() {
        // Dynamically import and initialize the annual view
        try {
            const { default: AnnualView } = await import('../views/annual-view.js');
            const annualView = new AnnualView(this.stateManager);
            await annualView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Annual View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Annual View</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
    
    async renderMonthlyView() {
        // Dynamically import and initialize the monthly view
        try {
            const { default: MonthlyView } = await import('../views/monthly-view.js');
            const monthlyView = new MonthlyView(this.stateManager);
            await monthlyView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Monthly View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Monthly View</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
    
    async renderWeeklyView() {
        // Dynamically import and initialize the weekly view
        try {
            const { default: WeeklyView } = await import('../views/weekly-view.js');
            const weeklyView = new WeeklyView(this.stateManager);
            await weeklyView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Weekly View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Weekly View</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
    
    async renderHabitsView() {
        // Dynamically import and initialize the habits view
        try {
            const { default: HabitsView } = await import('../views/habits-view.js');
            const habitsView = new HabitsView(this.stateManager);
            await habitsView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Habits View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Habits View</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
    
    async renderActionPlanView() {
        // Dynamically import and initialize the action plan view
        try {
            const { default: ActionPlanView } = await import('../views/action-plan-view.js');
            const actionPlanView = new ActionPlanView(this.stateManager);
            await actionPlanView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Action Plan View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Action Plan View</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
    
    async renderPomodoroView() {
        // Dynamically import and initialize the pomodoro view
        try {
            const { default: PomodoroView } = await import('../views/pomodoro-view.js');
            const pomodoroView = new PomodoroView(this.stateManager);
            await pomodoroView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Pomodoro View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Pomodoro Timer</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
    
    async renderSettingsView() {
        // Dynamically import and initialize the settings view
        try {
            const { default: settingsView } = await import('../views/settings-view.js');
            await settingsView.init(this.viewContainer);
        } catch (error) {
            ErrorHandler.handle(error, 'Settings View Loading');
            this.viewContainer.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Settings</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
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
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

// Export for testing
export { App, StateManager, Router };
