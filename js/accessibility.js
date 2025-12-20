/**
 * Accessibility Enhancement Module
 * Handles keyboard navigation, ARIA updates, and accessibility features
 */

class AccessibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupARIALiveRegions();
        this.setupSkipLinks();
    }

    /**
     * Setup keyboard navigation for the application
     */
    setupKeyboardNavigation() {
        // Handle Escape key to close modals and dropdowns
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeAllDropdowns();
            }
        });

        // Handle Tab key for focus trapping in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal:not([style*="display: none"])');
                if (modal) {
                    this.trapFocus(e, modal);
                }
            }
        });

        // Arrow key navigation for menus
        this.setupMenuNavigation();
        
        // Arrow key navigation for grids (calendar, habits)
        this.setupGridNavigation();
    }

    /**
     * Setup menu navigation with arrow keys
     */
    setupMenuNavigation() {
        const menus = document.querySelectorAll('[role="menubar"], [role="menu"]');
        
        menus.forEach(menu => {
            menu.addEventListener('keydown', (e) => {
                const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
                const currentIndex = items.indexOf(document.activeElement);
                
                let nextIndex;
                
                switch(e.key) {
                    case 'ArrowRight':
                    case 'ArrowDown':
                        e.preventDefault();
                        nextIndex = (currentIndex + 1) % items.length;
                        items[nextIndex].focus();
                        break;
                        
                    case 'ArrowLeft':
                    case 'ArrowUp':
                        e.preventDefault();
                        nextIndex = currentIndex - 1;
                        if (nextIndex < 0) nextIndex = items.length - 1;
                        items[nextIndex].focus();
                        break;
                        
                    case 'Home':
                        e.preventDefault();
                        items[0].focus();
                        break;
                        
                    case 'End':
                        e.preventDefault();
                        items[items.length - 1].focus();
                        break;
                }
            });
        });
    }

    /**
     * Setup grid navigation with arrow keys
     */
    setupGridNavigation() {
        const grids = document.querySelectorAll('[role="grid"]');
        
        grids.forEach(grid => {
            grid.addEventListener('keydown', (e) => {
                if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    return;
                }
                
                e.preventDefault();
                
                const cells = Array.from(grid.querySelectorAll('[role="gridcell"]'));
                const currentCell = document.activeElement;
                const currentIndex = cells.indexOf(currentCell);
                
                if (currentIndex === -1) return;
                
                // Calculate grid dimensions
                const row = currentCell.closest('[role="row"]');
                const rowCells = Array.from(row.querySelectorAll('[role="gridcell"]'));
                const colCount = rowCells.length;
                const rowIndex = Math.floor(currentIndex / colCount);
                const colIndex = currentIndex % colCount;
                
                let nextIndex;
                
                switch(e.key) {
                    case 'ArrowRight':
                        nextIndex = currentIndex + 1;
                        if (nextIndex < cells.length) cells[nextIndex].focus();
                        break;
                        
                    case 'ArrowLeft':
                        nextIndex = currentIndex - 1;
                        if (nextIndex >= 0) cells[nextIndex].focus();
                        break;
                        
                    case 'ArrowDown':
                        nextIndex = currentIndex + colCount;
                        if (nextIndex < cells.length) cells[nextIndex].focus();
                        break;
                        
                    case 'ArrowUp':
                        nextIndex = currentIndex - colCount;
                        if (nextIndex >= 0) cells[nextIndex].focus();
                        break;
                }
            });
        });
    }

    /**
     * Trap focus within a modal
     */
    trapFocus(e, modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Store last focused element before modal opens
        this.lastFocusedElement = null;
        
        // Restore focus when modal closes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    const modal = mutation.target;
                    if (modal.classList.contains('modal')) {
                        const isHidden = modal.style.display === 'none';
                        if (isHidden && this.lastFocusedElement) {
                            this.lastFocusedElement.focus();
                            this.lastFocusedElement = null;
                        } else if (!isHidden) {
                            this.lastFocusedElement = document.activeElement;
                            // Focus first focusable element in modal
                            const firstFocusable = modal.querySelector(
                                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                            );
                            if (firstFocusable) {
                                setTimeout(() => firstFocusable.focus(), 100);
                            }
                        }
                    }
                }
            });
        });
        
        // Observe all modals
        document.querySelectorAll('.modal').forEach(modal => {
            observer.observe(modal, { attributes: true });
        });
    }

    /**
     * Setup ARIA live regions for dynamic content
     */
    setupARIALiveRegions() {
        // Announce route changes
        const viewContainer = document.getElementById('view-container');
        if (viewContainer) {
            const observer = new MutationObserver(() => {
                const heading = viewContainer.querySelector('h2, h1');
                if (heading) {
                    this.announce(`Navigated to ${heading.textContent}`);
                }
            });
            
            observer.observe(viewContainer, { childList: true, subtree: true });
        }
    }

    /**
     * Setup skip links
     */
    setupSkipLinks() {
        const skipLink = document.querySelector('.skip-to-main');
        if (skipLink) {
            skipLink.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(skipLink.getAttribute('href'));
                if (target) {
                    target.setAttribute('tabindex', '-1');
                    target.focus();
                    target.addEventListener('blur', () => {
                        target.removeAttribute('tabindex');
                    }, { once: true });
                }
            });
        }
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display !== 'none') {
                const closeBtn = modal.querySelector('.modal-close');
                if (closeBtn) closeBtn.click();
            }
        });
    }

    /**
     * Close all open dropdowns
     */
    closeAllDropdowns() {
        document.querySelectorAll('.user-dropdown:not(.hidden)').forEach(dropdown => {
            dropdown.classList.add('hidden');
            const button = dropdown.previousElementSibling;
            if (button) {
                button.setAttribute('aria-expanded', 'false');
            }
        });
    }

    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        const announcer = document.createElement('div');
        announcer.setAttribute('role', 'status');
        announcer.setAttribute('aria-live', priority);
        announcer.className = 'sr-only';
        announcer.textContent = message;
        
        document.body.appendChild(announcer);
        
        setTimeout(() => {
            document.body.removeChild(announcer);
        }, 1000);
    }

    /**
     * Update ARIA attributes for tabs
     */
    updateTabARIA(tabButton, tabPanel) {
        // Update all tabs in the group
        const tabList = tabButton.closest('[role="tablist"]');
        if (tabList) {
            tabList.querySelectorAll('[role="tab"]').forEach(tab => {
                const isSelected = tab === tabButton;
                tab.setAttribute('aria-selected', isSelected);
                tab.setAttribute('tabindex', isSelected ? '0' : '-1');
            });
        }
        
        // Update all panels in the group
        const container = tabPanel.parentElement;
        container.querySelectorAll('[role="tabpanel"]').forEach(panel => {
            const isActive = panel === tabPanel;
            panel.hidden = !isActive;
            panel.setAttribute('aria-hidden', !isActive);
        });
    }

    /**
     * Update progress bar ARIA attributes
     */
    updateProgressARIA(progressBar, value, label = null) {
        progressBar.setAttribute('aria-valuenow', value);
        if (label) {
            progressBar.setAttribute('aria-label', label);
        }
    }

    /**
     * Make element keyboard accessible
     */
    makeKeyboardAccessible(element, callback) {
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                callback(e);
            }
        });
    }

    /**
     * Add keyboard support to drag handles
     */
    addKeyboardDragSupport(handle, moveCallback) {
        handle.setAttribute('tabindex', '0');
        handle.setAttribute('role', 'button');
        handle.setAttribute('aria-label', 'Press Enter to start dragging, use arrow keys to move, Enter to drop');
        
        let isDragging = false;
        
        handle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                isDragging = !isDragging;
                
                if (isDragging) {
                    handle.setAttribute('aria-label', 'Dragging. Use arrow keys to move, Enter to drop');
                    this.announce('Started dragging. Use arrow keys to move.');
                } else {
                    handle.setAttribute('aria-label', 'Press Enter to start dragging');
                    this.announce('Dropped item.');
                }
            } else if (isDragging && ['ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                const direction = e.key === 'ArrowUp' ? -1 : 1;
                moveCallback(direction);
                this.announce('Item moved');
            }
        });
    }
}

// Initialize accessibility manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.accessibilityManager = new AccessibilityManager();
    });
} else {
    window.accessibilityManager = new AccessibilityManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
}


/**
 * Theme Manager - Handles dark/light mode toggle
 */
class ThemeManager {
    constructor() {
        this.storageKey = 'stillmove-theme';
        this.init();
    }

    init() {
        // Apply saved theme on load
        this.applySavedTheme();
        
        // Setup toggle button
        this.setupToggleButton();
        
        // Listen for system theme changes
        this.listenForSystemChanges();
    }

    /**
     * Get current theme preference
     */
    getTheme() {
        // Check localStorage first
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            return saved;
        }
        
        // Fall back to system preference
        return 'system';
    }

    /**
     * Apply saved theme
     */
    applySavedTheme() {
        const theme = this.getTheme();
        
        if (theme === 'dark' || theme === 'light') {
            document.documentElement.setAttribute('data-theme', theme);
        } else {
            // Remove manual override, let system decide
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * Set theme
     */
    setTheme(theme) {
        // Add transition class for smooth animation
        document.documentElement.classList.add('theme-transitioning');
        
        if (theme === 'system') {
            localStorage.removeItem(this.storageKey);
            document.documentElement.removeAttribute('data-theme');
        } else {
            localStorage.setItem(this.storageKey, theme);
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // Remove transition class after animation
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 300);
        
        // Announce change to screen readers
        if (window.accessibilityManager) {
            window.accessibilityManager.announce(`Theme changed to ${theme} mode`);
        }
    }

    /**
     * Toggle between light and dark
     */
    toggle() {
        const current = this.getCurrentEffectiveTheme();
        const newTheme = current === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    /**
     * Get current effective theme (what's actually displayed)
     */
    getCurrentEffectiveTheme() {
        const manualTheme = document.documentElement.getAttribute('data-theme');
        if (manualTheme) {
            return manualTheme;
        }
        
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * Setup toggle button
     */
    setupToggleButton() {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            this.toggle();
        });
        
        // Update button state
        this.updateButtonState();
    }

    /**
     * Update button aria state
     */
    updateButtonState() {
        const btn = document.getElementById('theme-toggle-btn');
        if (!btn) return;
        
        const theme = this.getCurrentEffectiveTheme();
        btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
        btn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }

    /**
     * Listen for system theme changes
     */
    listenForSystemChanges() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Only react if no manual override is set
            if (!localStorage.getItem(this.storageKey)) {
                this.updateButtonState();
            }
        });
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}
