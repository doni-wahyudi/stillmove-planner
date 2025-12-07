# Contributing to Daily Planner Application

Thank you for your interest in contributing to the Daily Planner Application! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what's best for the project and community

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Text editor or IDE (VS Code recommended)
- Git for version control
- Basic knowledge of HTML, CSS, and JavaScript
- Supabase account (free tier is sufficient)

### First-Time Setup

1. **Fork the Repository**
   ```bash
   # Click the "Fork" button on GitHub
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/daily-planner-app.git
   cd daily-planner-app
   ```

3. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/daily-planner-app.git
   ```

4. **Set Up Supabase**
   - Follow instructions in `database/README.md`
   - Create `js/config.local.js` with your credentials
   - Run `database/schema.sql` in Supabase SQL Editor

5. **Test Locally**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx http-server
   ```
   
   Open `http://localhost:8000` in your browser

## Development Setup

### Recommended Tools

- **VS Code Extensions**:
  - ESLint
  - Prettier
  - Live Server
  - JavaScript (ES6) code snippets

- **Browser Extensions**:
  - React Developer Tools (for debugging)
  - Lighthouse (for performance testing)
  - axe DevTools (for accessibility testing)

### Configuration Files

Create a local configuration file that won't be committed:

```javascript
// js/config.local.js
export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key';
export const APP_CONFIG = {
    environment: 'development',
    debug: true
};
```

## Project Structure

```
daily-planner-app/
├── index.html              # Main entry point
├── auth.html               # Authentication page
├── css/
│   └── main.css           # Main stylesheet
├── js/
│   ├── app.js             # Application controller
│   ├── auth-service.js    # Authentication logic
│   ├── data-service.js    # Data access layer
│   ├── sync-manager.js    # Real-time sync
│   ├── offline-manager.js # Offline support
│   └── utils.js           # Utility functions
├── views/                 # View components
├── components/            # Reusable UI components
├── database/              # Database schema and docs
└── tests/                 # Test files
```

## Coding Standards

### JavaScript Style Guide

We follow modern JavaScript best practices:

#### General Rules

- Use ES6+ features (const/let, arrow functions, template literals)
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Add JSDoc comments for public functions
- Use async/await instead of promise chains
- Handle errors appropriately

#### Example:

```javascript
/**
 * Calculate habit progress for a given period
 * @param {Array<Object>} completions - Array of completion records
 * @param {number} days - Number of days in period
 * @returns {number} Progress percentage (0-100)
 */
export function calculateHabitProgress(completions, days) {
    if (!completions || !Array.isArray(completions) || days === 0) {
        return 0;
    }
    
    const completedCount = completions.filter(c => c.completed).length;
    return Math.round((completedCount / days) * 100 * 100) / 100;
}
```

#### Naming Conventions

- **Variables**: camelCase (`userName`, `isActive`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_URL`)
- **Functions**: camelCase (`getUserData`, `calculateProgress`)
- **Classes**: PascalCase (`StateManager`, `DataService`)
- **Files**: kebab-case (`data-service.js`, `sync-manager.js`)

#### Code Organization

- Group related functions together
- Export functions explicitly
- Import dependencies at the top
- Keep files focused on a single concern

### CSS Style Guide

#### General Rules

- Use CSS custom properties for theming
- Follow BEM naming convention for classes
- Mobile-first responsive design
- Use semantic class names

#### Example:

```css
/* Component: habit-tracker */
.habit-tracker {
    display: grid;
    gap: var(--spacing-md);
}

.habit-tracker__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.habit-tracker__item {
    padding: var(--spacing-sm);
    border-radius: var(--border-radius);
}

.habit-tracker__item--completed {
    background-color: var(--color-success-light);
}
```

### HTML Guidelines

- Use semantic HTML5 elements
- Include ARIA labels for accessibility
- Keep markup clean and readable
- Use data attributes for JavaScript hooks

## Testing Guidelines

### Running Tests

```bash
# Open test runner in browser
open test-runner.html

# Or use Node.js test runner
node run-tests.js
```

### Writing Tests

#### Unit Tests

Test individual functions in isolation:

```javascript
// Example unit test
describe('calculateGoalProgress', () => {
    test('returns 50% for half completed sub-goals', () => {
        const subGoals = [
            { text: 'Goal 1', completed: true },
            { text: 'Goal 2', completed: false }
        ];
        
        const progress = calculateGoalProgress(subGoals);
        expect(progress).toBe(50);
    });
    
    test('returns 0 for empty array', () => {
        expect(calculateGoalProgress([])).toBe(0);
    });
});
```

#### Property-Based Tests

Test universal properties across random inputs:

```javascript
// Example property-based test
describe('Property: Goal progress is always between 0 and 100', () => {
    test('progress is in valid range for any sub-goals', () => {
        fc.assert(
            fc.property(
                fc.array(fc.record({
                    text: fc.string(),
                    completed: fc.boolean()
                })),
                (subGoals) => {
                    const progress = calculateGoalProgress(subGoals);
                    return progress >= 0 && progress <= 100;
                }
            )
        );
    });
});
```

### Test Coverage Requirements

- All utility functions must have unit tests
- All correctness properties must have property-based tests
- Critical user flows should have integration tests
- Aim for >80% code coverage

## Submitting Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-dark-mode`
- `fix/habit-progress-calculation`
- `docs/update-readme`
- `refactor/simplify-sync-manager`

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Longer description if needed

Fixes #123
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(habits): add weekly habit tracking
fix(sync): resolve race condition in sync manager
docs(readme): add deployment instructions
test(utils): add property tests for date functions
```

### Pull Request Process

1. **Update Your Fork**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code following style guidelines
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Thoroughly**
   ```bash
   # Run all tests
   open test-runner.html
   
   # Test manually in browser
   # Check console for errors
   # Test on mobile devices
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create Pull Request**
   - Go to GitHub and create a pull request
   - Fill out the PR template
   - Link related issues
   - Request review from maintainers

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Tested on multiple browsers
- [ ] Tested on mobile devices
- [ ] Accessibility verified
- [ ] Performance impact considered

## Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported
2. Try to reproduce the bug consistently
3. Test on the latest version
4. Check browser console for errors

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Device: [e.g., Desktop, iPhone 12]

**Additional context**
Any other relevant information.

**Console errors**
```
Paste any console errors here
```
```

## Requesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Additional context**
Any other context, mockups, or examples.

**Would you like to implement this feature?**
Yes/No - If yes, we can guide you through the process.
```

## Development Workflow

### Typical Development Cycle

1. **Pick an Issue**
   - Look for issues labeled `good first issue` or `help wanted`
   - Comment on the issue to claim it

2. **Discuss Approach**
   - Discuss your implementation approach
   - Get feedback before starting

3. **Implement**
   - Create feature branch
   - Write code and tests
   - Test thoroughly

4. **Submit PR**
   - Create pull request
   - Address review feedback
   - Merge when approved

### Getting Help

- **Questions**: Open a discussion on GitHub
- **Stuck**: Comment on your issue or PR
- **Chat**: Join our community chat (if available)

## Code Review Process

### What We Look For

- **Correctness**: Does it work as intended?
- **Tests**: Are there adequate tests?
- **Style**: Does it follow our guidelines?
- **Performance**: Is it efficient?
- **Accessibility**: Is it accessible?
- **Documentation**: Is it well-documented?

### Review Timeline

- Initial review within 3-5 days
- Follow-up reviews within 1-2 days
- Merge when approved by maintainer

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

## Questions?

If you have questions not covered here:
- Open a GitHub discussion
- Comment on relevant issues
- Reach out to maintainers

Thank you for contributing to the Daily Planner Application! 🎉
