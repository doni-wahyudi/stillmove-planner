/**
 * Error Handler
 * Centralized error handling with user-friendly messages and categorization
 * Version: 1.1
 */

/**
 * Error categories
 */
const ErrorCategory = {
    AUTH: 'auth',
    NETWORK: 'network',
    DATABASE: 'database',
    VALIDATION: 'validation',
    GENERIC: 'generic'
};

/**
 * ErrorHandler class for managing application errors
 */
class ErrorHandler {
    /**
     * Handle an error with appropriate user feedback
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     * @returns {Object} Error information with category and user message
     */
    static handle(error, context = 'Unknown') {
        // Log error for debugging
        console.error(`Error in ${context}:`, error);
        
        // Categorize error
        const category = this.categorizeError(error);
        const userMessage = this.getUserMessage(error, category);
        
        // Show toast notification
        if (typeof window !== 'undefined' && window.Toast) {
            this.showErrorToast(userMessage, category);
        }
        
        return {
            category,
            userMessage,
            originalError: error,
            context
        };
    }
    
    /**
     * Categorize an error based on its properties
     * @param {Error} error - The error object
     * @returns {string} Error category
     */
    static categorizeError(error) {
        if (!error) return ErrorCategory.GENERIC;
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toLowerCase() || '';
        
        // Authentication errors (check first as they're most specific)
        if (
            errorMessage.includes('auth') ||
            errorMessage.includes('authentication') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('credential') ||
            errorMessage.includes('session') ||
            errorMessage.includes('token') ||
            errorMessage.includes('email not confirmed') ||
            errorMessage.includes('user already registered') ||
            errorCode.includes('auth')
        ) {
            return ErrorCategory.AUTH;
        }
        
        // Database errors (check before network as database errors may mention connection)
        if (
            errorMessage.includes('database') ||
            errorMessage.includes('supabase') ||
            errorMessage.includes('query') ||
            errorMessage.includes('permission') ||
            errorMessage.includes('policy') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('foreign key') ||
            errorMessage.includes('constraint') ||
            errorMessage.includes('insert') ||
            errorMessage.includes('update') ||
            errorMessage.includes('delete') ||
            errorMessage.includes('select') ||
            errorMessage.includes('record not found') ||
            errorCode.includes('pgrst') ||
            errorCode.includes('23')
        ) {
            return ErrorCategory.DATABASE;
        }
        
        // Network errors
        if (
            errorMessage.includes('network') ||
            errorMessage.includes('fetch') ||
            (errorMessage.includes('connection') && !errorMessage.includes('database')) ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('offline') ||
            error.name === 'NetworkError' ||
            (typeof navigator !== 'undefined' && navigator.onLine === false)
        ) {
            return ErrorCategory.NETWORK;
        }
        
        // Validation errors
        if (
            errorMessage.includes('validation') ||
            (errorMessage.includes('invalid') && !errorMessage.includes('credential') && !errorMessage.includes('token')) ||
            errorMessage.includes('required') ||
            errorMessage.includes('must be')
        ) {
            return ErrorCategory.VALIDATION;
        }
        
        return ErrorCategory.GENERIC;
    }
    
    /**
     * Get user-friendly error message based on error and category
     * @param {Error} error - The error object
     * @param {string} category - Error category
     * @returns {string} User-friendly error message
     */
    static getUserMessage(error, category) {
        const errorMessage = error?.message || '';
        
        switch (category) {
            case ErrorCategory.AUTH:
                return this.getAuthErrorMessage(error);
            
            case ErrorCategory.NETWORK:
                return this.getNetworkErrorMessage(error);
            
            case ErrorCategory.DATABASE:
                return this.getDatabaseErrorMessage(error);
            
            case ErrorCategory.VALIDATION:
                return this.getValidationErrorMessage(error);
            
            case ErrorCategory.GENERIC:
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }
    
    /**
     * Get authentication error message
     * @param {Error} error - The error object
     * @returns {string} User-friendly auth error message
     */
    static getAuthErrorMessage(error) {
        const message = error?.message?.toLowerCase() || '';
        
        if (message.includes('invalid credentials') || message.includes('invalid login')) {
            return 'Invalid email or password. Please check your credentials.';
        }
        
        if (message.includes('email not confirmed')) {
            return 'Please confirm your email address before signing in.';
        }
        
        if (message.includes('user already registered')) {
            return 'An account with this email already exists.';
        }
        
        if (message.includes('session') || message.includes('token')) {
            return 'Your session has expired. Please sign in again.';
        }
        
        if (message.includes('unauthorized')) {
            return 'You are not authorized to perform this action.';
        }
        
        return 'Authentication failed. Please sign in again.';
    }
    
    /**
     * Get network error message
     * @param {Error} error - The error object
     * @returns {string} User-friendly network error message
     */
    static getNetworkErrorMessage(error) {
        if (!navigator.onLine) {
            return "You're offline. Changes will sync when you're back online.";
        }
        
        const message = error?.message?.toLowerCase() || '';
        
        if (message.includes('timeout')) {
            return 'Request timed out. Please check your connection and try again.';
        }
        
        if (message.includes('fetch') || message.includes('network')) {
            return 'Network connection lost. Please check your internet connection.';
        }
        
        return 'Connection error. Please check your internet connection.';
    }
    
    /**
     * Get database error message
     * @param {Error} error - The error object
     * @returns {string} User-friendly database error message
     */
    static getDatabaseErrorMessage(error) {
        const message = error?.message?.toLowerCase() || '';
        const code = error?.code || '';
        
        // PostgreSQL error codes
        if (code.startsWith('23')) {
            if (code === '23505') {
                return 'This item already exists. Please use a different value.';
            }
            if (code === '23503') {
                return 'Cannot complete operation due to related data.';
            }
            return 'Database constraint violation. Please check your input.';
        }
        
        if (message.includes('permission') || message.includes('policy')) {
            return 'You do not have permission to access this data.';
        }
        
        if (message.includes('not found')) {
            return 'The requested data was not found.';
        }
        
        return 'Failed to save data. Please try again.';
    }
    
    /**
     * Get validation error message
     * @param {Error} error - The error object
     * @returns {string} User-friendly validation error message
     */
    static getValidationErrorMessage(error) {
        const message = error?.message || '';
        
        // Return the validation message as-is if it's already user-friendly
        if (message && !message.toLowerCase().includes('error')) {
            return message;
        }
        
        return 'Please fill in all required fields correctly.';
    }
    
    /**
     * Show error toast notification
     * @param {string} message - Error message
     * @param {string} category - Error category
     */
    static showErrorToast(message, category) {
        if (!window.Toast) return;
        
        // Use warning for network errors (less severe)
        if (category === ErrorCategory.NETWORK) {
            window.Toast.warning(message, 4000);
        } else {
            window.Toast.error(message, 4000);
        }
    }
    
    /**
     * Handle authentication errors specifically
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     */
    static handleAuthError(error, context = 'Authentication') {
        const result = this.handle(error, context);
        
        // Redirect to login if session expired
        if (error?.message?.toLowerCase().includes('session') ||
            error?.message?.toLowerCase().includes('token')) {
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 2000);
        }
        
        return result;
    }
    
    /**
     * Handle network errors specifically
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     */
    static handleNetworkError(error, context = 'Network') {
        return this.handle(error, context);
    }
    
    /**
     * Handle database errors specifically
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     */
    static handleDatabaseError(error, context = 'Database') {
        return this.handle(error, context);
    }
    
    /**
     * Handle validation errors specifically
     * @param {Error} error - The error object
     * @param {string} context - Context where the error occurred
     */
    static handleValidationError(error, context = 'Validation') {
        return this.handle(error, context);
    }
    
    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    static showLoading(message = 'Loading...') {
        if (window.Toast) {
            return window.Toast.info(message, 0); // 0 duration = persistent
        }
    }
    
    /**
     * Hide loading state
     * @param {HTMLElement} loadingToast - The loading toast element
     */
    static hideLoading(loadingToast) {
        if (loadingToast && window.Toast) {
            window.Toast.remove(loadingToast);
        }
    }
}

// Export for use in other modules
export { ErrorHandler, ErrorCategory };

// Make available globally
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
    window.ErrorCategory = ErrorCategory;
}
