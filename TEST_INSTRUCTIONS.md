# How to Run Property-Based Tests

## Important Note
Since Node.js and npm are not available in this environment, the property-based tests are designed to run in a web browser.

## Running Tests in Browser

1. **Start a local web server** (required for ES6 modules to work):
   - If you have Python installed:
     ```bash
     python -m http.server 8000
     ```
   - Or use any other local web server (Live Server extension in VS Code, etc.)

2. **Open the test runner**:
   - Navigate to `http://localhost:8000/test-runner.html` in your browser

3. **View results**:
   - Tests will run automatically on page load
   - You'll see a visual display of all test results
   - Green = passed, Red = failed
   - Click "Run Tests" button to re-run

## What's Being Tested

### Property 15: Goal Progress Calculation
**Feature**: daily-planner-app  
**Validates**: Requirements 2.3

**Property**: For any annual goal with sub-goals, the progress percentage should equal (completed sub-goals / total sub-goals) × 100

**Test Details**:
- Runs 100 iterations with randomly generated sub-goals
- Each iteration generates 1-20 sub-goals with random completion status
- Verifies the calculated progress matches the expected formula
- Ensures progress is always between 0 and 100

### Edge Cases Tested
1. Empty sub-goals array returns 0%
2. Null or undefined input returns 0%
3. All completed sub-goals returns 100%
4. No completed sub-goals returns 0%
5. Half completed sub-goals returns 50%

## Test Implementation

The test uses:
- **fast-check** library (loaded from CDN) for property-based testing
- Custom test runner with visual results
- The `calculateGoalProgress()` function from `js/utils.js`

## Expected Results

All tests should pass, demonstrating that:
1. The progress calculation is mathematically correct
2. Edge cases are handled properly
3. The function works for any valid input (property holds universally)

## Alternative: Manual Testing

If you cannot run a local server, you can:
1. Open the browser's developer console
2. Copy and paste the test code from `test-runner.html`
3. Run it directly in the console

## Verification

To verify the implementation is correct:
1. Check that `js/utils.js` contains the `calculateGoalProgress()` function
2. Check that the function implements the formula: `(completed / total) × 100`
3. Check that it handles edge cases (empty, null, undefined)
4. Run the tests in the browser to see all tests pass
