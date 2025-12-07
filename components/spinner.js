/**
 * Loading Spinner Component
 * Provides loading indicators for async operations
 */

class Spinner {
  /**
   * Create a loading spinner
   * @param {Object} options - Spinner configuration
   * @param {string} options.size - Size: 'small', 'medium', 'large' (default: 'medium')
   * @param {string} options.color - Spinner color
   * @param {string} options.text - Loading text to display
   * @param {boolean} options.overlay - Show as full-page overlay (default: false)
   * @returns {HTMLElement} Spinner element
   */
  static create(options = {}) {
    const {
      size = 'medium',
      color = '',
      text = '',
      overlay = false
    } = options;

    const container = document.createElement('div');
    container.className = `spinner-container spinner-${size} ${overlay ? 'spinner-overlay' : ''}`;

    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    if (color) {
      spinner.style.borderTopColor = color;
    }

    container.appendChild(spinner);

    if (text) {
      const label = document.createElement('div');
      label.className = 'spinner-text';
      label.textContent = text;
      container.appendChild(label);
    }

    return container;
  }

  /**
   * Show a loading spinner
   * @param {Object} options - Spinner configuration
   * @returns {HTMLElement} Spinner element
   */
  static show(options = {}) {
    const spinner = this.create({ ...options, overlay: true });
    document.body.appendChild(spinner);
    
    // Prevent body scroll when overlay is shown
    document.body.style.overflow = 'hidden';
    
    return spinner;
  }

  /**
   * Hide and remove a spinner
   * @param {HTMLElement} spinner - Spinner element to remove
   */
  static hide(spinner) {
    if (!spinner || !spinner.parentNode) return;

    spinner.classList.add('spinner-fade-out');
    
    setTimeout(() => {
      if (spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
      }
      
      // Restore body scroll if no other overlays
      const overlays = document.querySelectorAll('.spinner-overlay');
      if (overlays.length === 0) {
        document.body.style.overflow = '';
      }
    }, 300);
  }

  /**
   * Create a dots spinner (alternative style)
   * @param {Object} options - Spinner configuration
   * @returns {HTMLElement} Dots spinner element
   */
  static createDots(options = {}) {
    const {
      size = 'medium',
      color = '',
      text = ''
    } = options;

    const container = document.createElement('div');
    container.className = `spinner-container spinner-${size}`;

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'spinner-dots';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'spinner-dot';
      if (color) {
        dot.style.backgroundColor = color;
      }
      dotsContainer.appendChild(dot);
    }

    container.appendChild(dotsContainer);

    if (text) {
      const label = document.createElement('div');
      label.className = 'spinner-text';
      label.textContent = text;
      container.appendChild(label);
    }

    return container;
  }

  /**
   * Create an inline spinner (for buttons, etc.)
   * @param {string} size - Size: 'small', 'medium'
   * @returns {HTMLElement} Inline spinner element
   */
  static createInline(size = 'small') {
    const spinner = document.createElement('span');
    spinner.className = `spinner-inline spinner-${size}`;
    return spinner;
  }

  /**
   * Show loading state on an element
   * @param {HTMLElement} element - Element to show loading on
   * @param {string} text - Optional loading text
   * @returns {Object} Object with restore function
   */
  static showOnElement(element, text = 'Loading...') {
    if (!element) return;

    const originalContent = element.innerHTML;
    const originalDisabled = element.disabled;

    element.disabled = true;
    element.classList.add('loading');

    const spinner = this.createInline('small');
    element.innerHTML = '';
    element.appendChild(spinner);

    if (text) {
      const textSpan = document.createElement('span');
      textSpan.textContent = ` ${text}`;
      element.appendChild(textSpan);
    }

    return {
      restore: () => {
        element.innerHTML = originalContent;
        element.disabled = originalDisabled;
        element.classList.remove('loading');
      }
    };
  }

  /**
   * Create a skeleton loader (for content placeholders)
   * @param {Object} options - Skeleton configuration
   * @param {number} options.lines - Number of lines (default: 3)
   * @param {string} options.height - Height of each line (default: '1em')
   * @returns {HTMLElement} Skeleton loader element
   */
  static createSkeleton(options = {}) {
    const {
      lines = 3,
      height = '1em'
    } = options;

    const container = document.createElement('div');
    container.className = 'skeleton-loader';

    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton-line';
      line.style.height = height;
      
      // Make last line shorter for more natural look
      if (i === lines - 1) {
        line.style.width = '70%';
      }
      
      container.appendChild(line);
    }

    return container;
  }

  /**
   * Create a progress spinner (shows percentage)
   * @param {number} percentage - Progress percentage (0-100)
   * @param {Object} options - Configuration options
   * @returns {HTMLElement} Progress spinner element
   */
  static createProgress(percentage, options = {}) {
    const {
      size = 'medium',
      color = '#4CAF50'
    } = options;

    const container = document.createElement('div');
    container.className = `spinner-progress spinner-${size}`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '45');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', '#e0e0e0');
    circle.setAttribute('stroke-width', '8');

    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.setAttribute('cx', '50');
    progressCircle.setAttribute('cy', '50');
    progressCircle.setAttribute('r', '45');
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke', color);
    progressCircle.setAttribute('stroke-width', '8');
    progressCircle.setAttribute('stroke-linecap', 'round');
    
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    progressCircle.setAttribute('stroke-dasharray', circumference);
    progressCircle.setAttribute('stroke-dashoffset', offset);
    progressCircle.style.transform = 'rotate(-90deg)';
    progressCircle.style.transformOrigin = '50% 50%';

    svg.appendChild(circle);
    svg.appendChild(progressCircle);
    container.appendChild(svg);

    const label = document.createElement('div');
    label.className = 'spinner-progress-label';
    label.textContent = `${Math.round(percentage)}%`;
    container.appendChild(label);

    // Store reference for updates
    container._progressCircle = progressCircle;
    container._label = label;
    container._circumference = circumference;

    return container;
  }

  /**
   * Update progress spinner
   * @param {HTMLElement} spinner - Progress spinner element
   * @param {number} percentage - New percentage (0-100)
   */
  static updateProgress(spinner, percentage) {
    if (!spinner || !spinner._progressCircle) return;

    const offset = spinner._circumference - (percentage / 100) * spinner._circumference;
    spinner._progressCircle.setAttribute('stroke-dashoffset', offset);
    
    if (spinner._label) {
      spinner._label.textContent = `${Math.round(percentage)}%`;
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.Spinner = Spinner;
}
