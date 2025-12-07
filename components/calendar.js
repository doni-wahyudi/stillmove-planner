/**
 * Calendar Component
 * Provides a reusable calendar grid for displaying months
 */

class Calendar {
  /**
   * Create a calendar grid for a specific month
   * @param {Object} options - Calendar configuration
   * @param {number} options.year - Year to display
   * @param {number} options.month - Month to display (1-12)
   * @param {Date} options.selectedDate - Currently selected date
   * @param {Function} options.onDateClick - Callback when date is clicked
   * @param {Function} options.onDateRender - Callback to customize date cell rendering
   * @param {boolean} options.showWeekNumbers - Show week numbers (default: false)
   * @param {number} options.firstDayOfWeek - First day of week (0=Sunday, 1=Monday, default: 0)
   * @returns {HTMLElement} Calendar element
   */
  static create(options = {}) {
    const {
      year,
      month,
      selectedDate = null,
      onDateClick = null,
      onDateRender = null,
      showWeekNumbers = false,
      firstDayOfWeek = 0
    } = options;

    if (!year || !month) {
      throw new Error('Year and month are required');
    }

    const container = document.createElement('div');
    container.className = 'calendar-grid';

    // Create header with day names
    const header = this.createHeader(firstDayOfWeek, showWeekNumbers);
    container.appendChild(header);

    // Create calendar body with dates
    const body = this.createBody({
      year,
      month,
      selectedDate,
      onDateClick,
      onDateRender,
      showWeekNumbers,
      firstDayOfWeek
    });
    container.appendChild(body);

    return container;
  }

  /**
   * Create calendar header with day names
   * @param {number} firstDayOfWeek - First day of week (0=Sunday, 1=Monday)
   * @param {boolean} showWeekNumbers - Show week numbers column
   * @returns {HTMLElement} Calendar header
   */
  static createHeader(firstDayOfWeek = 0, showWeekNumbers = false) {
    const header = document.createElement('div');
    header.className = 'calendar-header';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderedDays = [
      ...dayNames.slice(firstDayOfWeek),
      ...dayNames.slice(0, firstDayOfWeek)
    ];

    if (showWeekNumbers) {
      const weekCell = document.createElement('div');
      weekCell.className = 'calendar-header-cell calendar-week-header';
      weekCell.textContent = 'Wk';
      header.appendChild(weekCell);
    }

    orderedDays.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'calendar-header-cell';
      cell.textContent = day;
      header.appendChild(cell);
    });

    return header;
  }

  /**
   * Create calendar body with date cells
   * @param {Object} options - Body configuration
   * @returns {HTMLElement} Calendar body
   */
  static createBody(options) {
    const {
      year,
      month,
      selectedDate,
      onDateClick,
      onDateRender,
      showWeekNumbers,
      firstDayOfWeek
    } = options;

    const body = document.createElement('div');
    body.className = 'calendar-body';

    // Get first and last day of month
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    // Calculate starting position (0 = Sunday, 1 = Monday, etc.)
    let startingDayOfWeek = firstDay.getDay() - firstDayOfWeek;
    if (startingDayOfWeek < 0) startingDayOfWeek += 7;

    // Get days from previous month to fill first week
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    const prevMonthDays = startingDayOfWeek;

    // Calculate total cells needed
    const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

    let currentWeek = document.createElement('div');
    currentWeek.className = 'calendar-week';

    let cellCount = 0;

    // Add week number if enabled
    if (showWeekNumbers && cellCount % 7 === 0) {
      const weekNum = this.getWeekNumber(new Date(year, month - 1, 1));
      const weekCell = document.createElement('div');
      weekCell.className = 'calendar-week-number';
      weekCell.textContent = weekNum;
      currentWeek.appendChild(weekCell);
    }

    // Fill in dates
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';

      let date, isCurrentMonth;

      if (i < prevMonthDays) {
        // Previous month
        date = new Date(year, month - 2, prevMonthLastDay - prevMonthDays + i + 1);
        cell.classList.add('calendar-cell-other-month');
        isCurrentMonth = false;
      } else if (i < prevMonthDays + daysInMonth) {
        // Current month
        const day = i - prevMonthDays + 1;
        date = new Date(year, month - 1, day);
        cell.classList.add('calendar-cell-current-month');
        isCurrentMonth = true;
      } else {
        // Next month
        const day = i - prevMonthDays - daysInMonth + 1;
        date = new Date(year, month, day);
        cell.classList.add('calendar-cell-other-month');
        isCurrentMonth = false;
      }

      // Check if this is today
      const today = new Date();
      if (this.isSameDay(date, today)) {
        cell.classList.add('calendar-cell-today');
      }

      // Check if this is the selected date
      if (selectedDate && this.isSameDay(date, selectedDate)) {
        cell.classList.add('calendar-cell-selected');
      }

      // Set cell content
      cell.textContent = date.getDate();
      cell.dataset.date = date.toISOString().split('T')[0];

      // Custom rendering
      if (onDateRender && isCurrentMonth) {
        onDateRender(cell, date);
      }

      // Click handler
      if (onDateClick && isCurrentMonth) {
        cell.addEventListener('click', () => onDateClick(date, cell));
        cell.style.cursor = 'pointer';
      }

      currentWeek.appendChild(cell);
      cellCount++;

      // Start new week row
      if (cellCount % 7 === 0) {
        body.appendChild(currentWeek);
        currentWeek = document.createElement('div');
        currentWeek.className = 'calendar-week';

        // Add week number for next week
        if (showWeekNumbers && i < totalCells - 1) {
          const nextDate = new Date(year, month - 1, i - prevMonthDays + 2);
          const weekNum = this.getWeekNumber(nextDate);
          const weekCell = document.createElement('div');
          weekCell.className = 'calendar-week-number';
          weekCell.textContent = weekNum;
          currentWeek.appendChild(weekCell);
        }
      }
    }

    return body;
  }

  /**
   * Check if two dates are the same day
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} True if same day
   */
  static isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Get ISO week number for a date
   * @param {Date} date - Date to get week number for
   * @returns {number} Week number
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  /**
   * Create a mini calendar (compact version)
   * @param {Object} options - Calendar configuration
   * @returns {HTMLElement} Mini calendar element
   */
  static createMini(options = {}) {
    const calendar = this.create(options);
    calendar.classList.add('calendar-mini');
    return calendar;
  }

  /**
   * Get number of days in a month
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {number} Number of days
   */
  static getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Get month name
   * @param {number} month - Month (1-12)
   * @param {boolean} short - Use short name (default: false)
   * @returns {string} Month name
   */
  static getMonthName(month, short = false) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const shortMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return short ? shortMonths[month - 1] : months[month - 1];
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.Calendar = Calendar;
}
