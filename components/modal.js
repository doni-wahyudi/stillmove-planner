/**
 * Modal Dialog System
 * Provides a reusable modal dialog component for the application
 */

class Modal {
  constructor() {
    this.modalElement = null;
    this.isOpen = false;
    this.onCloseCallback = null;
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

    // Add to DOM and show
    document.body.appendChild(this.modalElement);
    this.isOpen = true;

    // Trigger animation
    setTimeout(() => {
      this.modalElement.classList.add('modal-open');
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

    this.modalElement.classList.remove('modal-open');
    
    setTimeout(() => {
      if (this.modalElement && this.modalElement.parentNode) {
        this.modalElement.parentNode.removeChild(this.modalElement);
      }
      this.modalElement = null;
      this.isOpen = false;
      
      // Restore body scroll
      document.body.style.overflow = '';

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
}

// Export singleton instance
const modal = new Modal();

// Make available globally
if (typeof window !== 'undefined') {
  window.Modal = modal;
}
