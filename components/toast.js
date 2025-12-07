/**
 * Toast Notification System
 * Provides temporary notification messages to users
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    if (typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast configuration
   * @param {string} options.message - Toast message
   * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {number} options.duration - Duration in milliseconds (default: 3000)
   * @param {boolean} options.dismissible - Show close button (default: true)
   */
  show(options = {}) {
    const {
      message = '',
      type = 'info',
      duration = 3000,
      dismissible = true
    } = options;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
      </div>
      ${dismissible ? '<button class="toast-close" aria-label="Close">&times;</button>' : ''}
    `;

    // Add close button handler
    if (dismissible) {
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.remove(toast));
    }

    // Add to container
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 10);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Remove a toast
   * @param {HTMLElement} toast - Toast element to remove
   */
  remove(toast) {
    if (!toast || !toast.parentNode) return;

    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300); // Match CSS transition duration
  }

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} Icon HTML
   */
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }

  /**
   * Show success toast
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds
   */
  success(message, duration = 3000) {
    return this.show({ message, type: 'success', duration });
  }

  /**
   * Show error toast
   * @param {string} message - Error message
   * @param {number} duration - Duration in milliseconds
   */
  error(message, duration = 4000) {
    return this.show({ message, type: 'error', duration });
  }

  /**
   * Show warning toast
   * @param {string} message - Warning message
   * @param {number} duration - Duration in milliseconds
   */
  warning(message, duration = 3500) {
    return this.show({ message, type: 'warning', duration });
  }

  /**
   * Show info toast
   * @param {string} message - Info message
   * @param {number} duration - Duration in milliseconds
   */
  info(message, duration = 3000) {
    return this.show({ message, type: 'info', duration });
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach(toast => this.remove(toast));
  }
}

// Export singleton instance
const toast = new ToastManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.Toast = toast;
}
