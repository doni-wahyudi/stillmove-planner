// Authentication UI Controller
import authService from './auth-service.js';

/**
 * AuthUI handles all authentication UI interactions
 */
class AuthUI {
    constructor() {
        this.currentTab = 'signin';
        this.init();
    }
    
    init() {
        this.setupTabSwitching();
        this.setupFormHandlers();
        this.checkExistingSession();
    }
    
    /**
     * Setup tab switching between sign in and sign up
     */
    setupTabSwitching() {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active form
                forms.forEach(f => f.classList.remove('active'));
                document.getElementById(`${tabName}-form`).classList.add('active');
                
                // Clear any alerts
                this.hideAlert();
                
                this.currentTab = tabName;
            });
        });
    }
    
    /**
     * Setup form submission handlers
     */
    setupFormHandlers() {
        // Sign In Form
        const signinForm = document.getElementById('signin-form');
        signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        
        // Sign Up Form
        const signupForm = document.getElementById('signup-form');
        signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        
        // Forgot Password Link
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        forgotPasswordLink.addEventListener('click', (e) => this.handleForgotPassword(e));
        
        // Real-time validation
        this.setupRealtimeValidation();
    }
    
    /**
     * Setup real-time form validation
     */
    setupRealtimeValidation() {
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input);
            });
        });
        
        // Password confirmation validation
        const confirmPassword = document.getElementById('signup-password-confirm');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }
    
    /**
     * Handle sign in form submission
     */
    async handleSignIn(e) {
        e.preventDefault();
        
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;
        
        // Validate inputs
        if (!this.validateSignInForm(email, password)) {
            return;
        }
        
        // Show loading state
        this.setButtonLoading('signin-button', true);
        this.hideAlert();
        
        try {
            const { user, session } = await authService.signIn(email, password);
            
            if (user && session) {
                this.showAlert('success', 'Sign in successful! Redirecting...');
                
                // Redirect to main app after short delay
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            this.showAlert('error', error.message);
            this.setButtonLoading('signin-button', false);
        }
    }
    
    /**
     * Handle sign up form submission
     */
    async handleSignUp(e) {
        e.preventDefault();
        
        const invitationCode = document.getElementById('signup-invitation-code').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        
        // Validate inputs
        if (!this.validateSignUpForm(invitationCode, email, password, confirmPassword)) {
            return;
        }
        
        // Show loading state
        this.setButtonLoading('signup-button', true);
        this.hideAlert();
        
        try {
            const { user, session } = await authService.signUp(invitationCode, email, password);
            
            if (user) {
                // Check if email confirmation is required
                if (session) {
                    this.showAlert('success', 'Account created successfully! Redirecting...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    this.showAlert('info', 'Account created! Please check your email to confirm your account before signing in.');
                    this.setButtonLoading('signup-button', false);
                    
                    // Switch to sign in tab after delay
                    setTimeout(() => {
                        document.querySelector('[data-tab="signin"]').click();
                    }, 3000);
                }
            }
        } catch (error) {
            this.showAlert('error', error.message);
            this.setButtonLoading('signup-button', false);
        }
    }
    
    /**
     * Handle forgot password link click
     */
    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('signin-email').value.trim();
        
        if (!email) {
            this.showAlert('error', 'Please enter your email address first.');
            document.getElementById('signin-email').focus();
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showAlert('error', 'Please enter a valid email address.');
            return;
        }
        
        try {
            await authService.resetPassword(email);
            this.showAlert('success', 'Password reset email sent! Please check your inbox.');
        } catch (error) {
            this.showAlert('error', error.message);
        }
    }
    
    /**
     * Validate sign in form
     */
    validateSignInForm(email, password) {
        let isValid = true;
        
        // Validate email
        if (!email) {
            this.showFieldError('signin-email', 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldError('signin-email', 'Please enter a valid email address');
            isValid = false;
        } else {
            this.hideFieldError('signin-email');
        }
        
        // Validate password
        if (!password) {
            this.showFieldError('signin-password', 'Password is required');
            isValid = false;
        } else {
            this.hideFieldError('signin-password');
        }
        
        return isValid;
    }
    
    /**
     * Validate sign up form
     */
    validateSignUpForm(invitationCode, email, password, confirmPassword) {
        let isValid = true;
        
        // Validate invitation code
        if (!invitationCode) {
            this.showFieldError('signup-invitation-code', 'Invitation code is required');
            isValid = false;
        } else {
            this.hideFieldError('signup-invitation-code');
        }
        
        // Validate email
        if (!email) {
            this.showFieldError('signup-email', 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(email)) {
            this.showFieldError('signup-email', 'Please enter a valid email address');
            isValid = false;
        } else {
            this.hideFieldError('signup-email');
        }
        
        // Validate password
        if (!password) {
            this.showFieldError('signup-password', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            this.showFieldError('signup-password', 'Password must be at least 6 characters');
            isValid = false;
        } else {
            this.hideFieldError('signup-password');
        }
        
        // Validate password confirmation
        if (!confirmPassword) {
            this.showFieldError('signup-password-confirm', 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            this.showFieldError('signup-password-confirm', 'Passwords do not match');
            isValid = false;
        } else {
            this.hideFieldError('signup-password-confirm');
        }
        
        return isValid;
    }
    
    /**
     * Validate email format
     */
    validateEmail(input) {
        const email = input.value.trim();
        const fieldId = input.id;
        
        if (email && !this.isValidEmail(email)) {
            this.showFieldError(fieldId, 'Please enter a valid email address');
            return false;
        } else {
            this.hideFieldError(fieldId);
            return true;
        }
    }
    
    /**
     * Validate password match
     */
    validatePasswordMatch() {
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.showFieldError('signup-password-confirm', 'Passwords do not match');
            return false;
        } else {
            this.hideFieldError('signup-password-confirm');
            return true;
        }
    }
    
    /**
     * Check if email is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Show field error message
     */
    showFieldError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}-error`);
        
        if (input && errorEl) {
            input.classList.add('error');
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
    }
    
    /**
     * Hide field error message
     */
    hideFieldError(fieldId) {
        const input = document.getElementById(fieldId);
        const errorEl = document.getElementById(`${fieldId}-error`);
        
        if (input && errorEl) {
            input.classList.remove('error');
            errorEl.classList.remove('show');
        }
    }
    
    /**
     * Show alert message
     */
    showAlert(type, message) {
        const alertEl = document.getElementById('auth-alert');
        
        if (alertEl) {
            alertEl.className = `alert alert-${type} show`;
            alertEl.textContent = message;
        }
    }
    
    /**
     * Hide alert message
     */
    hideAlert() {
        const alertEl = document.getElementById('auth-alert');
        
        if (alertEl) {
            alertEl.className = 'alert';
            alertEl.textContent = '';
        }
    }
    
    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        
        if (button) {
            if (isLoading) {
                button.disabled = true;
                const originalText = button.textContent;
                button.setAttribute('data-original-text', originalText);
                button.innerHTML = '<span class="loading-spinner"></span>Loading...';
            } else {
                button.disabled = false;
                const originalText = button.getAttribute('data-original-text');
                button.textContent = originalText || 'Submit';
            }
        }
    }
    
    /**
     * Check if user already has a session
     */
    async checkExistingSession() {
        try {
            const session = await authService.getSession();
            
            if (session) {
                // User is already signed in, redirect to main app
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }
}

// Initialize AuthUI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AuthUI();
});

export default AuthUI;
