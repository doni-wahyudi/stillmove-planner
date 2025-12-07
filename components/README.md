# Shared UI Components

This directory contains reusable UI components for the Daily Planner Application.

## Components

### 1. Modal (`modal.js`)

A flexible modal dialog system for displaying content in an overlay.

**Usage:**
```javascript
// Show a custom modal
Modal.show({
    title: 'Modal Title',
    content: '<p>Modal content here</p>',
    buttons: [
        {
            text: 'Cancel',
            className: 'btn-secondary',
            onClick: () => console.log('Cancel')
        },
        {
            text: 'OK',
            className: 'btn-primary',
            primary: true,
            onClick: () => console.log('OK')
        }
    ]
});

// Show a confirmation dialog
Modal.confirm(
    'Are you sure?',
    () => console.log('Confirmed'),
    () => console.log('Cancelled')
);

// Show an alert
Modal.alert('Alert message', () => console.log('Closed'));

// Close modal
Modal.close();
```

### 2. Toast (`toast.js`)

Temporary notification messages for user feedback.

**Usage:**
```javascript
// Show different types of toasts
Toast.success('Operation successful!');
Toast.error('An error occurred!');
Toast.warning('Warning message');
Toast.info('Information message');

// Custom toast
Toast.show({
    message: 'Custom message',
    type: 'info',
    duration: 3000,
    dismissible: true
});

// Clear all toasts
Toast.clearAll();
```

### 3. Progress Bar (`progress-bar.js`)

Visual progress indicators for tracking completion.

**Usage:**
```javascript
// Create a linear progress bar
const progressBar = ProgressBar.create({
    value: 50,
    max: 100,
    showLabel: true,
    animated: true,
    size: 'medium'
});
document.body.appendChild(progressBar);

// Update progress
ProgressBar.update(progressBar, 75);

// Create a circular progress indicator
const circularProgress = ProgressBar.createCircular({
    value: 65,
    size: 100,
    color: '#4CAF50',
    showLabel: true
});
document.body.appendChild(circularProgress);

// Update circular progress
ProgressBar.updateCircular(circularProgress, 80);

// Create indeterminate progress (for unknown duration)
const indeterminate = ProgressBar.createIndeterminate('medium');
document.body.appendChild(indeterminate);
```

### 4. Calendar (`calendar.js`)

Reusable calendar grid for displaying months.

**Usage:**
```javascript
// Create a calendar
const calendar = Calendar.create({
    year: 2025,
    month: 1,
    selectedDate: new Date(),
    onDateClick: (date, cell) => {
        console.log('Date clicked:', date);
    },
    onDateRender: (cell, date) => {
        // Custom rendering for each date cell
        if (date.getDay() === 0) {
            cell.style.backgroundColor = '#f0f0f0';
        }
    },
    showWeekNumbers: false,
    firstDayOfWeek: 0 // 0 = Sunday, 1 = Monday
});
document.body.appendChild(calendar);

// Create a mini calendar
const miniCalendar = Calendar.createMini({
    year: 2025,
    month: 1
});

// Utility methods
const daysInMonth = Calendar.getDaysInMonth(2025, 1);
const monthName = Calendar.getMonthName(1); // 'January'
const weekNumber = Calendar.getWeekNumber(new Date());
```

### 5. Spinner (`spinner.js`)

Loading indicators for async operations.

**Usage:**
```javascript
// Show a full-page loading spinner
const spinner = Spinner.show({ text: 'Loading...' });
// Hide it later
Spinner.hide(spinner);

// Create a spinner element
const spinnerElement = Spinner.create({
    size: 'medium',
    color: '#4A90E2',
    text: 'Loading...'
});
document.body.appendChild(spinnerElement);

// Create a dots spinner
const dotsSpinner = Spinner.createDots({
    size: 'medium',
    text: 'Processing...'
});

// Create an inline spinner (for buttons)
const inlineSpinner = Spinner.createInline('small');
button.appendChild(inlineSpinner);

// Show loading on an element
const loadingState = Spinner.showOnElement(button, 'Saving...');
// Restore later
loadingState.restore();

// Create a skeleton loader
const skeleton = Spinner.createSkeleton({
    lines: 3,
    height: '1em'
});

// Create a progress spinner
const progressSpinner = Spinner.createProgress(45, {
    size: 'medium',
    color: '#4CAF50'
});
// Update progress
Spinner.updateProgress(progressSpinner, 75);
```

## Styling

All components come with pre-defined CSS styles in `css/main.css`. The styles use CSS variables for theming and are fully responsive.

## Global Access

All components are available globally through the `window` object:
- `window.Modal`
- `window.Toast`
- `window.ProgressBar`
- `window.Calendar`
- `window.Spinner`

## Testing

A test page is available at `test-components.html` to see all components in action.

## Requirements

These components satisfy **Requirement 11.1** from the design document:
- Modal dialog system for user interactions
- Toast notifications for feedback
- Progress bars for visual progress tracking
- Calendar grid for date selection
- Loading spinners for async operations
