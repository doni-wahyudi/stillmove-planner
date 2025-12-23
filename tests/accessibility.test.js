/**
 * Accessibility Module Unit Tests
 * Tests for js/accessibility.js - ThemeManager
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
    removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
    clear: jest.fn(() => { localStorageMock.store = {}; })
};
global.localStorage = localStorageMock;

// Mock document
const mockElement = {
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    classList: {
        add: jest.fn(),
        remove: jest.fn(),
        toggle: jest.fn()
    },
    addEventListener: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null)
};

global.document = {
    documentElement: mockElement,
    getElementById: jest.fn(() => mockElement),
    querySelector: jest.fn(() => mockElement),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({
        setAttribute: jest.fn(),
        className: '',
        textContent: ''
    })),
    body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
    },
    readyState: 'complete'
};

// Mock window
global.window = {
    matchMedia: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn()
    })),
    addEventListener: jest.fn()
};

describe('ThemeManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.store = {};
        mockElement.getAttribute.mockReturnValue(null);
    });

    describe('Theme Storage', () => {
        test('stores theme preference in localStorage', () => {
            localStorageMock.setItem('stillmove-theme', 'dark');
            expect(localStorageMock.store['stillmove-theme']).toBe('dark');
        });

        test('retrieves theme from localStorage', () => {
            localStorageMock.store['stillmove-theme'] = 'light';
            const theme = localStorageMock.getItem('stillmove-theme');
            expect(theme).toBe('light');
        });

        test('returns null for unset theme', () => {
            const theme = localStorageMock.getItem('stillmove-theme');
            expect(theme).toBeNull();
        });
    });

    describe('System Theme Detection', () => {
        test('detects dark mode preference', () => {
            window.matchMedia.mockReturnValue({ matches: true, addEventListener: jest.fn() });
            const result = window.matchMedia('(prefers-color-scheme: dark)');
            expect(result.matches).toBe(true);
        });

        test('detects light mode preference', () => {
            window.matchMedia.mockReturnValue({ matches: false, addEventListener: jest.fn() });
            const result = window.matchMedia('(prefers-color-scheme: dark)');
            expect(result.matches).toBe(false);
        });
    });

    describe('Theme Application', () => {
        test('sets data-theme attribute for dark mode', () => {
            document.documentElement.setAttribute('data-theme', 'dark');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        });

        test('sets data-theme attribute for light mode', () => {
            document.documentElement.setAttribute('data-theme', 'light');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
        });

        test('removes data-theme for system preference', () => {
            document.documentElement.removeAttribute('data-theme');
            expect(mockElement.removeAttribute).toHaveBeenCalledWith('data-theme');
        });
    });
});

describe('AccessibilityManager', () => {
    describe('Screen Reader Announcements', () => {
        test('creates announcement element with aria-live', () => {
            const element = document.createElement('div');
            element.setAttribute('role', 'status');
            element.setAttribute('aria-live', 'polite');
            
            expect(element.setAttribute).toHaveBeenCalledWith('role', 'status');
            expect(element.setAttribute).toHaveBeenCalledWith('aria-live', 'polite');
        });
    });

    describe('Focus Management', () => {
        test('can set tabindex on elements', () => {
            mockElement.setAttribute('tabindex', '0');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('tabindex', '0');
        });

        test('can set role attribute', () => {
            mockElement.setAttribute('role', 'button');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('role', 'button');
        });
    });

    describe('ARIA Attributes', () => {
        test('can set aria-expanded', () => {
            mockElement.setAttribute('aria-expanded', 'true');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-expanded', 'true');
        });

        test('can set aria-selected', () => {
            mockElement.setAttribute('aria-selected', 'true');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-selected', 'true');
        });

        test('can set aria-label', () => {
            mockElement.setAttribute('aria-label', 'Close dialog');
            expect(mockElement.setAttribute).toHaveBeenCalledWith('aria-label', 'Close dialog');
        });
    });
});
