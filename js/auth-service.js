// Authentication Service
import { getSupabaseClient } from './supabase-client.js';
import { APP_CONFIG } from './config.js';

/**
 * AuthService handles all authentication operations
 */
class AuthService {
    constructor() {
        this.supabase = getSupabaseClient();
        this.authStateChangeCallbacks = [];
    }
    
    /**
     * Validate invitation code
     * @param {string} code - Invitation code to validate
     * @returns {boolean} True if code is valid
     */
    validateInvitationCode(code) {
        if (!code) return false;
        
        const normalizedCode = code.trim().toUpperCase();
        const validCodes = APP_CONFIG.invitationCodes.map(c => c.toUpperCase());
        
        return validCodes.includes(normalizedCode);
    }
    
    /**
     * Sign up a new user with email and password
     * @param {string} invitationCode - Invitation code
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<Object>} User data and session
     */
    async signUp(invitationCode, email, password) {
        // Validate invitation code first
        if (!this.validateInvitationCode(invitationCode)) {
            throw new Error('Invalid invitation code. Please contact the administrator for a valid code.');
        }
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            
            if (error) {
                throw error;
            }
            
            // Create user profile
            if (data.user) {
                await this.createUserProfile(data.user.id, email);
            }
            
            return data;
        } catch (error) {
            console.error('Sign up error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Sign in an existing user with email and password
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<Object>} User data and session
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                throw error;
            }
            
            // Store session in localStorage for persistence
            if (data.session) {
                this.persistSession(data.session);
            }
            
            return data;
        } catch (error) {
            console.error('Sign in error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Sign out the current user
     * @returns {Promise<void>}
     */
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }
            
            // Clear session from localStorage
            this.clearSession();
            
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Get the current session
     * @returns {Promise<Object|null>} Current session or null
     */
    async getSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                throw error;
            }
            
            return session;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    }
    
    /**
     * Get the current user
     * @returns {Promise<Object|null>} Current user or null
     */
    async getUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error) {
                throw error;
            }
            
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }
    
    /**
     * Refresh the current session
     * @returns {Promise<Object>} Refreshed session
     */
    async refreshSession() {
        try {
            const { data, error } = await this.supabase.auth.refreshSession();
            
            if (error) {
                throw error;
            }
            
            if (data.session) {
                this.persistSession(data.session);
            }
            
            return data;
        } catch (error) {
            console.error('Refresh session error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Send password reset email
     * @param {string} email - User's email address
     * @returns {Promise<Object>} Result of password reset request
     */
    async resetPassword(email) {
        try {
            const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Password reset error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Update user password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Updated user data
     */
    async updatePassword(newPassword) {
        try {
            const { data, error } = await this.supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Update password error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    /**
     * Listen to authentication state changes
     * @param {Function} callback - Callback function to execute on auth state change
     * @returns {Object} Subscription object with unsubscribe method
     */
    onAuthStateChange(callback) {
        this.authStateChangeCallbacks.push(callback);
        
        const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            
            // Handle session persistence
            if (event === 'SIGNED_IN' && session) {
                this.persistSession(session);
            } else if (event === 'SIGNED_OUT') {
                this.clearSession();
            } else if (event === 'TOKEN_REFRESHED' && session) {
                this.persistSession(session);
            }
            
            // Call all registered callbacks
            this.authStateChangeCallbacks.forEach(cb => cb(event, session));
        });
        
        return subscription;
    }
    
    /**
     * Create user profile in the profiles table
     * @param {string} userId - User ID
     * @param {string} email - User email
     * @returns {Promise<Object>} Created profile
     */
    async createUserProfile(userId, email) {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .insert([
                    {
                        id: userId,
                        display_name: email.split('@')[0],
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                ])
                .select();
            
            if (error) {
                console.error('Error creating user profile:', error);
                // Don't throw error here as auth was successful
            }
            
            return data;
        } catch (error) {
            console.error('Create profile error:', error);
        }
    }
    
    /**
     * Persist session to localStorage
     * @param {Object} session - Session object
     */
    persistSession(session) {
        try {
            localStorage.setItem('supabase.auth.token', JSON.stringify(session));
            localStorage.setItem('lastAuthCheck', new Date().toISOString());
        } catch (error) {
            console.error('Error persisting session:', error);
        }
    }
    
    /**
     * Clear session from localStorage
     */
    clearSession() {
        try {
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('lastAuthCheck');
            localStorage.removeItem('user');
            localStorage.removeItem('cache');
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }
    
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} True if authenticated, false otherwise
     */
    async isAuthenticated() {
        const session = await this.getSession();
        return session !== null;
    }
    
    /**
     * Handle authentication errors and return user-friendly messages
     * @param {Error} error - Error object from Supabase
     * @returns {Error} Error with user-friendly message
     */
    handleAuthError(error) {
        const errorMessages = {
            'Invalid login credentials': 'Invalid email or password. Please try again.',
            'Email not confirmed': 'Please confirm your email address before signing in.',
            'User already registered': 'An account with this email already exists.',
            'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
            'Unable to validate email address': 'Please enter a valid email address.',
            'Email rate limit exceeded': 'Too many attempts. Please try again later.',
            'Invalid email or password': 'Invalid email or password. Please try again.'
        };
        
        const message = errorMessages[error.message] || error.message || 'An unexpected error occurred. Please try again.';
        
        const friendlyError = new Error(message);
        friendlyError.originalError = error;
        
        return friendlyError;
    }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
export { AuthService };
