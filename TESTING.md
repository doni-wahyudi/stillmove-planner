# Testing Guide for Daily Planner Application

## Property-Based Testing

This project uses property-based testing to verify correctness properties defined in the design document.

### Running Tests

#### Browser-Based Test Runner

1. Open `test-runner.html` in your web browser
2. Tests will run automatically on page load
3. You can also click the "Run Tests" button to re-run tests

The test runner uses:
- **fast-check** - Property-based testing library loaded from CDN
- Custom test assertions and runners
- Visual test results display

#### Test Coverage

Currently implemented:
- **Property 15: Goal Progress Calculation** - Validates that progress percentage equals (completed sub-goals / total sub-goals) × 100

### Test Structure

Each property-based test:
1. Generates random test data using fast-check
2. Runs the function under test
3. Verifies the property holds for all generated inputs
4. Runs 100 iterations by default (as specified in design document)

### Adding New Tests

To add a new property-based test:

1. Add the test function to `test-runner.html`
2. Use fast-check generators to create random test data
3. Verify the property holds for all inputs
4. Add the test to the test suite array

Example:
```javascript
function testNewProperty() {
    return new Promise((resolve, reject) => {
        try {
            fc.assert(
                fc.property(
                    fc.array(fc.integer()),
                    (data) => {
                        // Test your property here
                        const result = yourFunction(data);
                        expect(result).toBe(expectedValue);
                    }
                ),
                { numRuns: 100 }
            );
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}
```

### Test Annotations

All property-based tests include annotations:
- **Feature**: The feature name (e.g., "daily-planner-app")
- **Property Number**: The property number from the design document
- **Validates**: The requirement number being validated

Example:
```javascript
/**
 * Feature: daily-planner-app, Property 15: Goal progress calculation
 * Validates: Requirements 2.3
 */
```

## Unit Tests

Unit tests complement property-based tests by testing specific examples and edge cases.

### Edge Cases Tested

For goal progress calculation:
- Empty sub-goals array returns 0%
- Null or undefined input returns 0%
- All completed sub-goals returns 100%
- No completed sub-goals returns 0%
- Half completed sub-goals returns 50%

## Future Testing Setup

For a more robust testing setup with npm:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Watch mode:
   ```bash
   npm run test:watch
   ```

Note: Currently npm is not available in this environment, so we use the browser-based test runner.
