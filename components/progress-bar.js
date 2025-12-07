/**
 * Progress Bar Component
 * Provides visual progress indicators
 */

class ProgressBar {
  /**
   * Create a progress bar element
   * @param {Object} options - Progress bar configuration
   * @param {number} options.value - Current progress value (0-100)
   * @param {number} options.max - Maximum value (default: 100)
   * @param {string} options.className - Additional CSS classes
   * @param {boolean} options.showLabel - Show percentage label (default: true)
   * @param {string} options.color - Progress bar color
   * @param {boolean} options.animated - Animate progress bar (default: true)
   * @param {string} options.size - Size: 'small', 'medium', 'large' (default: 'medium')
   * @returns {HTMLElement} Progress bar element
   */
  static create(options = {}) {
    const {
      value = 0,
      max = 100,
      className = '',
      showLabel = true,
      color = '',
      animated = true,
      size = 'medium'
    } = options;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const container = document.createElement('div');
    container.className = `progress-bar-container progress-bar-${size} ${className}`;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = `progress-bar-fill ${animated ? 'progress-bar-animated' : ''}`;
    progressFill.style.width = `${percentage}%`;
    
    if (color) {
      progressFill.style.backgroundColor = color;
    }

    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);

    if (showLabel) {
      const label = document.createElement('span');
      label.className = 'progress-bar-label';
      label.textContent = `${Math.round(percentage)}%`;
      container.appendChild(label);
    }

    // Store reference for updates
    container._progressFill = progressFill;
    container._progressLabel = showLabel ? container.querySelector('.progress-bar-label') : null;

    return container;
  }

  /**
   * Update progress bar value
   * @param {HTMLElement} progressBar - Progress bar container element
   * @param {number} value - New progress value
   * @param {number} max - Maximum value (default: 100)
   */
  static update(progressBar, value, max = 100) {
    if (!progressBar || !progressBar._progressFill) return;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    progressBar._progressFill.style.width = `${percentage}%`;
    
    if (progressBar._progressLabel) {
      progressBar._progressLabel.textContent = `${Math.round(percentage)}%`;
    }
  }

  /**
   * Create a circular progress indicator
   * @param {Object} options - Circular progress configuration
   * @param {number} options.value - Current progress value (0-100)
   * @param {number} options.max - Maximum value (default: 100)
   * @param {number} options.size - Circle size in pixels (default: 100)
   * @param {string} options.color - Progress color
   * @param {boolean} options.showLabel - Show percentage label (default: true)
   * @returns {HTMLElement} Circular progress element
   */
  static createCircular(options = {}) {
    const {
      value = 0,
      max = 100,
      size = 100,
      color = '#4CAF50',
      showLabel = true
    } = options;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const container = document.createElement('div');
    container.className = 'progress-circular';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;

    container.innerHTML = `
      <svg width="${size}" height="${size}" class="progress-circular-svg">
        <circle
          class="progress-circular-bg"
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="#e0e0e0"
          stroke-width="8"
        />
        <circle
          class="progress-circular-fill"
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${color}"
          stroke-width="8"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"
        />
      </svg>
      ${showLabel ? `<div class="progress-circular-label">${Math.round(percentage)}%</div>` : ''}
    `;

    // Store references for updates
    container._circle = container.querySelector('.progress-circular-fill');
    container._label = showLabel ? container.querySelector('.progress-circular-label') : null;
    container._circumference = circumference;

    return container;
  }

  /**
   * Update circular progress value
   * @param {HTMLElement} progressCircular - Circular progress element
   * @param {number} value - New progress value
   * @param {number} max - Maximum value (default: 100)
   */
  static updateCircular(progressCircular, value, max = 100) {
    if (!progressCircular || !progressCircular._circle) return;

    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const offset = progressCircular._circumference - (percentage / 100) * progressCircular._circumference;
    
    progressCircular._circle.style.strokeDashoffset = offset;
    
    if (progressCircular._label) {
      progressCircular._label.textContent = `${Math.round(percentage)}%`;
    }
  }

  /**
   * Create a simple progress indicator (for indeterminate progress)
   * @param {string} size - Size: 'small', 'medium', 'large'
   * @returns {HTMLElement} Progress indicator element
   */
  static createIndeterminate(size = 'medium') {
    const container = document.createElement('div');
    container.className = `progress-bar-container progress-bar-${size}`;

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-bar-fill progress-bar-indeterminate';

    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);

    return container;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ProgressBar = ProgressBar;
}
