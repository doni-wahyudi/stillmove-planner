/**
 * Error Handler Unit Tests
 * Tests for js/error-handler.js
 */

// Mock window.Toast
global.window = {
    Toast: {
        error: jest.fn(),
        warning: jest.fn(),
        success: jest.fn(),
        info: jest.fn(),
        remove: jest.fn()
    }
};

// Mock navigator
global.navigator = { onLine: true };

import { ErrorHandler, ErrorCategory } from '../js/error-handler.js';

describe('ErrorHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.navigator.onLine = true;
    });

    describe('categorizeError', () => {
        test('categorizes auth errors correctly', () => {
            const authErrors = [
                new Error('Invalid credentials'),
                new Error('Authentication failed'),
                new Error('Unauthorized access'),
                new Error('Session expired'),
                new Error('Token invalid'),
                new Error('Email not confirmed')
            ];

            authErrors.forEach(error => {
                expect(ErrorHandler.categorizeError(error)).toBe(ErrorCategory.AUTH);
            });
        });

        test('categorizes network errors correctly', () => {
            const networkErrors = [
                new Error('Network error'),
                new Error('Failed to fetch'),
                new Error('Connection timeout'),
                new Error('Request timed out')
            ];

            networkErrors.forEach(error => {
                expect(ErrorHandler.categorizeError(error)).toBe(ErrorCategory.NETWORK);
            });
        });

        test('categorizes database errors correctly', () => {
            const dbErrors = [
                new Error('Database error'),
                new Error('Query failed'),
                new Error('Permission denied'),
                new Error('Policy violation'),
                new Error('Duplicate key'),
                new Error('Foreign key constraint')
            ];

            dbErrors.forEach(error => {
                expect(ErrorHandler.categorizeError(error)).toBe(ErrorCategory.DATABASE);
            });
        });

        test('categorizes validation errors correctly', () => {
            const validationErrors = [
                new Error('Validation failed'),
                new Error('Field is required'),
                new Error('Value must be a number')
            ];

            validationErrors.forEach(error => {
                expect(ErrorHandler.categorizeError(error)).toBe(ErrorCategory.VALIDATION);
            });
        });

        test('returns GENERIC for unknown errors', () => {
            const error = new Error('Something went wrong');
            expect(ErrorHandler.categorizeError(error)).toBe(ErrorCategory.GENERIC);
        });

        test('returns GENERIC for null error', () => {
            expect(ErrorHandler.categorizeError(null)).toBe(ErrorCategory.GENERIC);
        });
    });

    describe('getUserMessage', () => {
        test('returns user-friendly auth message', () => {
            const error = new Error('Invalid credentials');
            const message = ErrorHandler.getUserMessage(error, ErrorCategory.AUTH);
            
            expect(message).toContain('email or password');
        });

        test('returns offline message when offline', () => {
            global.navigator.onLine = false;
            const error = new Error('Network error');
            const message = ErrorHandler.getUserMessage(error, ErrorCategory.NETWORK);
            
            expect(message).toContain('offline');
        });

        test('returns timeout message for timeout errors', () => {
            const error = new Error('Request timed out');
            const message = ErrorHandler.getUserMessage(error, ErrorCategory.NETWORK);
            
            expect(message).toContain('timed out');
        });

        test('returns permission message for policy errors', () => {
            const error = new Error('Policy violation');
            const message = ErrorHandler.getUserMessage(error, ErrorCategory.DATABASE);
            
            expect(message).toContain('permission');
        });

        test('returns generic message for unknown errors', () => {
            const error = new Error('Unknown error');
            const message = ErrorHandler.getUserMessage(error, ErrorCategory.GENERIC);
            
            expect(message).toContain('unexpected error');
        });
    });

    describe('handle', () => {
        test('returns error info object', () => {
            const error = new Error('Test error');
            const result = ErrorHandler.handle(error, 'Test Context');
            
            expect(result).toHaveProperty('category');
            expect(result).toHaveProperty('userMessage');
            expect(result).toHaveProperty('originalError');
            expect(result).toHaveProperty('context');
            expect(result.context).toBe('Test Context');
        });

        test('shows error toast for non-network errors', () => {
            const error = new Error('Database error');
            ErrorHandler.handle(error, 'Test');
            
            expect(window.Toast.error).toHaveBeenCalled();
        });

        test('shows warning toast for network errors', () => {
            const error = new Error('Network error');
            ErrorHandler.handle(error, 'Test');
            
            expect(window.Toast.warning).toHaveBeenCalled();
        });
    });

    describe('handleAuthError', () => {
        test('handles auth errors and returns result', () => {
            const error = new Error('Session expired');
            const result = ErrorHandler.handleAuthError(error, 'Login');
            
            expect(result.category).toBe(ErrorCategory.AUTH);
        });
    });

    describe('handleNetworkError', () => {
        test('handles network errors', () => {
            const error = new Error('Connection failed');
            const result = ErrorHandler.handleNetworkError(error, 'API Call');
            
            expect(result).toHaveProperty('category');
            expect(result).toHaveProperty('userMessage');
        });
    });

    describe('handleDatabaseError', () => {
        test('handles database errors', () => {
            const error = new Error('Query failed');
            const result = ErrorHandler.handleDatabaseError(error, 'Save');
            
            expect(result).toHaveProperty('category');
        });
    });

    describe('handleValidationError', () => {
        test('handles validation errors', () => {
            const error = new Error('Field required');
            const result = ErrorHandler.handleValidationError(error, 'Form');
            
            expect(result).toHaveProperty('category');
        });
    });

    describe('showLoading', () => {
        test('shows info toast with message', () => {
            ErrorHandler.showLoading('Loading data...');
            
            expect(window.Toast.info).toHaveBeenCalledWith('Loading data...', 0);
        });

        test('uses default message if none provided', () => {
            ErrorHandler.showLoading();
            
            expect(window.Toast.info).toHaveBeenCalledWith('Loading...', 0);
        });
    });
});

describe('ErrorCategory', () => {
    test('has all required categories', () => {
        expect(ErrorCategory.AUTH).toBe('auth');
        expect(ErrorCategory.NETWORK).toBe('network');
        expect(ErrorCategory.DATABASE).toBe('database');
        expect(ErrorCategory.VALIDATION).toBe('validation');
        expect(ErrorCategory.GENERIC).toBe('generic');
    });
});
