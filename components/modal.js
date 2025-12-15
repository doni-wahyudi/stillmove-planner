/**
 * Modal Dialog System
 * Provides a reusable modal dialog component for the application
 */

class Modal {
  constructor() {
    this.modalElement = null;
    this.isOpen = false;
    this.onCloseCallback = null;
    this.previouslyFocusedElement = null;
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * Create and show a modal dialog
   * @param {Object} options - Modal configuration
   * @param {string} options.title - Modal title
   * @param {string} options.content - Modal content (HTML string)
   * @param {Array} options.buttons - Array of button configurations
   * @param {Function} options.onClose - Callback when modal closes
   * @param {boolean} options.closeOnOverlay - Close modal when clicking overlay (default: true)
   */
  show(options = {}) {
    const {
      title = '',
      content = '',
      buttons = [],
      onClose = null,
      closeOnOverlay = true
    } = options;

    this.onCloseCallback = onClose;

    // Create modal structure
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'modal-overlay';
    this.modalElement.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close-btn" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${buttons.length > 0 ? `
          <div class="modal-footer">
            ${buttons.map((btn, index) => `
              <button 
                class="modal-btn ${btn.className || ''}" 
                data-action="${btn.action || index}"
                ${btn.primary ? 'data-primary="true"' : ''}
              >
                ${btn.text}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    // Add event listeners
    const closeBtn = this.modalElement.querySelector('.modal-close-btn');
    closeBtn.addEventListener('click', () => this.close());

    if (closeOnOverlay) {
      this.modalElement.addEventListener('click', (e) => {
        if (e.target === this.modalElement) {
          this.close();
        }
      });
    }

    // Button click handlers
    const modalButtons = this.modalElement.querySelectorAll('.modal-btn');
    modalButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const button = buttons.find(b => (b.action || buttons.indexOf(b).toString()) === action);
        if (button && button.onClick) {
          button.onClick();
        }
        if (!button || button.closeOnClick !== false) {
          this.close();
        }
      });
    });

    // Store currently focused element to restore later
    this.previouslyFocusedElement = document.activeElement;

    // Add to DOM and show
    document.body.appendChild(this.modalElement);
    this.isOpen = true;

    // Set up ARIA attributes for accessibility
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    if (title) {
      const titleElement = this.modalElement.querySelector('.modal-title');
      const titleId = 'modal-title-' + Date.now();
      titleElement.id = titleId;
      this.modalElement.querySelector('.modal-container').setAttribute('aria-labelledby', titleId);
    }

    // Add keyboard event listener for Escape and Tab trapping
    document.addEventListener('keydown', this.boundHandleKeydown);

    // Trigger animation
    setTimeout(() => {
      this.modalElement.classList.add('modal-open');
      // Focus the first focusable element after animation starts
      this.focusFirstElement();
    }, 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return this;
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.isOpen || !this.modalElement) return;

    // Remove keyboard event listener
    document.removeEventListener('keydown', this.boundHandleKeydown);

    this.modalElement.classList.remove('modal-open');
    
    setTimeout(() => {
      if (this.modalElement && this.modalElement.parentNode) {
        this.modalElement.parentNode.removeChild(this.modalElement);
      }
      this.modalElement = null;
      this.isOpen = false;
      
      // Restore body scroll
      document.body.style.overflow = '';

      // Restore focus to previously focused element
      if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
        this.previouslyFocusedElement.focus();
        this.previouslyFocusedElement = null;
      }

      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }, 300); // Match CSS transition duration
  }

  /**
   * Show a confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when confirmed
   * @param {Function} onCancel - Callback when cancelled
   */
  confirm(message, onConfirm, onCancel) {
    return this.show({
      title: 'Confirm',
      content: `<p>${message}</p>`,
      buttons: [
        {
          text: 'Cancel',
          className: 'btn-secondary',
          action: 'cancel',
          onClick: onCancel
        },
        {
          text: 'Confirm',
          className: 'btn-primary',
          action: 'confirm',
          primary: true,
          onClick: onConfirm
        }
      ]
    });
  }

  /**
   * Show an alert dialog
   * @param {string} message - Alert message
   * @param {Function} onClose - Callback when closed
   */
  alert(message, onClose) {
    return this.show({
      title: 'Alert',
      content: `<p>${message}</p>`,
      buttons: [
        {
          text: 'OK',
          className: 'btn-primary',
          primary: true,
          onClick: onClose
        }
      ]
    });
  }

  /**
   * Handle keyboard events for accessibility
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeydown(e) {
    if (!this.isOpen || !this.modalElement) return;

    // Close on Escape key
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }

    // Trap focus within modal on Tab key
    if (e.key === 'Tab') {
      this.trapFocus(e);
    }
  }

  /**
   * Get all focusable elements within the modal
   * @returns {Array} Array of focusable elements
   */
  getFocusableElements() {
    if (!this.modalElement) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const elements = this.modalElement.querySelectorAll(focusableSelectors);
    return Array.from(elements).filter(el => {
      // Filter out hidden elements
      return el.offsetParent !== null && !el.hasAttribute('hidden');
    });
  }

  /**
   * Focus the first focusable element in the modal
   */
  focusFirstElement() {
    const focusableElements = this.getFocusableElements();
    
    // Try to focus the primary button first, then first focusable element
    const primaryButton = this.modalElement.querySelector('[data-primary="true"]');
    if (primaryButton) {
      primaryButton.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      // If no focusable elements, focus the modal container itself
      const container = this.modalElement.querySelector('.modal-container');
      if (container) {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    }
  }

  /**
   * Trap focus within the modal (prevent tabbing outside)
   * @param {KeyboardEvent} e - Keyboard event
   */
  trapFocus(e) {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    // Shift+Tab on first element -> go to last element
    if (e.shiftKey && activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    }
    // Tab on last element -> go to first element
    else if (!e.shiftKey && activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
}

// Export singleton instance
const modal = new Modal();

// Make available globally
if (typeof window !== 'undefined') {
  window.Modal = modal;
}
