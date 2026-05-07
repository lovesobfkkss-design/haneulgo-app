# Automated Testing Guide

This document provides comprehensive instructions for running automated tests for the student material distribution checklist application.

## Overview

The test suite is built using [Playwright](https://playwright.dev/), a modern end-to-end testing framework. Tests are organized by feature area and cover all major functionality of the application.

## Test Coverage

The test suite includes the following test files:

### 1. Student Management (`tests/student-management.spec.js`)
- Adding new students with full details
- Adding students without optional fields (phone)
- Auto-generation of student numbers
- Deleting students in edit mode
- Confirmation dialogs for deletion
- localStorage persistence for student data

**Tests:** 11 test cases

### 2. Check/Uncheck Functionality (`tests/check-functionality.spec.js`)
- Checking and unchecking individual students
- Visual feedback (completed-row class)
- Statistics updates (total, completed, remaining, rate)
- Grade-specific statistics
- localStorage persistence
- Data retention after page reload
- Multiple students handling
- Rapid toggle operations

**Tests:** 10 test cases

### 3. Subject Editing (`tests/subject-editing.spec.js`)
- Toggling edit mode
- Adding subjects to students
- Removing subjects from students
- Preventing duplicate subjects
- Visual indicators in edit mode
- localStorage persistence
- Data retention after reload
- Edit mode restrictions

**Tests:** 10 test cases

### 4. Search and Filter (`tests/search-filter.spec.js`)
- Search by student name (full and partial)
- Search by class
- Search by subject
- Grade filtering (1학년, 2학년, 전체)
- Class filtering
- Combined search and filters
- Real-time search updates
- Dynamic class filter options

**Tests:** 15 test cases

### 5. Week Selection and Persistence (`tests/week-persistence.spec.js`)
- Current week auto-selection
- Loading data for specific weeks
- Maintaining separate check states per week
- Multi-week localStorage management
- Statistics updates per week
- Week calculation correctness
- Historical and future week handling

**Tests:** 10 test cases

### 6. Bulk Operations (`tests/bulk-operations.spec.js`)
- Check all students
- Uncheck all students
- Reset week data with confirmation
- Cancel reset operation
- Grade statistics updates after bulk ops
- localStorage persistence
- Operations with active filters
- Rapid bulk operations

**Tests:** 12 test cases

**Total Test Cases: 68**

## Prerequisites

Before running tests, you need to have Node.js installed on your system.

- Node.js 16+ (Download from [nodejs.org](https://nodejs.org/))

## Installation

1. Open a terminal in the project directory
2. Install dependencies:

```bash
npm install
```

This will install Playwright and all required dependencies.

3. Install Playwright browsers (first time only):

```bash
npx playwright install
```

## Running Tests

### Run All Tests

```bash
npm test
```

This runs all tests in headless mode (no browser window visible).

### Run Tests with Browser Visible (Headed Mode)

```bash
npm run test:headed
```

Useful for watching tests execute in real-time.

### Run Tests in Debug Mode

```bash
npm run test:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Run Tests in UI Mode (Recommended for Development)

```bash
npm run test:ui
```

Opens Playwright's interactive UI where you can:
- See all tests in a tree view
- Run individual tests or test files
- Watch tests execute in real-time
- Time-travel through test execution
- Inspect elements and network requests

### Run a Specific Test File

```bash
npx playwright test tests/student-management.spec.js
```

Replace `student-management.spec.js` with any test file name.

### Run a Single Test by Name

```bash
npx playwright test --grep "should add a new student"
```

This runs only tests matching the pattern "should add a new student".

### View Test Report

After running tests, view the HTML report:

```bash
npm run test:report
```

This opens a detailed report showing:
- Pass/fail status for each test
- Screenshots of failures
- Videos of test execution (for failures)
- Test timing information

## Test Configuration

Test configuration is in `playwright.config.js`. Key settings:

- **baseURL**: Points to `file://` URL of `index.html`
- **workers**: Set to 1 to prevent localStorage conflicts
- **fullyParallel**: Set to false for sequential execution
- **retries**: 0 for local, 2 for CI
- **screenshot**: Only on failure
- **video**: Retained on failure only

### Browser Configuration

By default, tests run in Chromium. To test on other browsers, uncomment the relevant sections in `playwright.config.js`:

```javascript
// Uncomment to test on Firefox
{
  name: 'firefox',
  use: { ...devices['Desktop Firefox'] },
},

// Uncomment to test on WebKit (Safari)
{
  name: 'webkit',
  use: { ...devices['Desktop Safari'] },
},

// Uncomment to test on Mobile Chrome
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
},
```

Then run: `npx playwright test --project=firefox`

## Helper Functions

The `tests/helpers.js` file contains reusable functions for common operations:

- `setupApp(page)` - Navigate to app and clear localStorage
- `toggleStudent(page, num)` - Check/uncheck a student
- `addStudent(page, data)` - Add a new student via modal
- `enableEditMode(page)` - Enter edit mode
- `search(page, term)` - Search for students
- `filterByGrade(page, grade)` - Filter by grade
- `checkAll(page)` - Check all students
- `getStats(page)` - Get current statistics
- And more...

Use these helpers in your own tests for consistency.

## Writing New Tests

To add new tests:

1. Create a new file in `tests/` directory: `tests/my-feature.spec.js`

2. Use this template:

```javascript
const { test, expect } = require('@playwright/test');
const { setupApp, /* other helpers */ } = require('./helpers');

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should do something', async ({ page }) => {
    // Your test code here
    await page.locator('button').click();
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

3. Run your new test:

```bash
npx playwright test tests/my-feature.spec.js
```

## Common Testing Patterns

### Checking Element Visibility

```javascript
await expect(page.locator('.modal')).toBeVisible();
await expect(page.locator('.modal')).not.toBeVisible();
```

### Verifying Text Content

```javascript
await expect(page.locator('h1')).toHaveText('Expected Text');
await expect(page.locator('.stat')).toContainText('3');
```

### Clicking Elements

```javascript
await page.locator('button:has-text("클릭")').click();
await page.locator('#myButton').click();
```

### Filling Forms

```javascript
await page.locator('#inputField').fill('value');
await page.locator('#selectField').selectOption('option1');
```

### Handling Dialogs

```javascript
page.once('dialog', dialog => dialog.accept());
await page.locator('button:has-text("삭제")').click();
```

### Waiting for State Changes

```javascript
await page.waitForTimeout(500); // Wait 500ms
await page.waitForSelector('.element');
await page.waitForLoadState('domcontentloaded');
```

## Troubleshooting

### Tests Failing Due to Timing Issues

If tests fail intermittently, increase wait times:

```javascript
await page.waitForTimeout(1000); // Increase from 500 to 1000
```

### localStorage Conflicts

Ensure tests run sequentially (workers: 1) in `playwright.config.js`.

### Browser Not Found

Re-install Playwright browsers:

```bash
npx playwright install --force
```

### Tests Can't Find index.html

Ensure `index.html` exists in the project root. The test configuration uses:

```javascript
baseURL: 'file://' + __dirname + '/index.html'
```

### Clear Test Cache

```bash
rm -rf test-results playwright-report
npm test
```

## Continuous Integration (CI)

To run tests in CI environments (GitHub Actions, GitLab CI, etc.):

1. Install dependencies: `npm ci`
2. Install browsers: `npx playwright install --with-deps`
3. Run tests: `npm test`

Example GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Clean State**: Each test starts with a clean localStorage (handled by `setupApp()`)
2. **Descriptive Names**: Test names should clearly describe what they test
3. **One Assertion Per Test**: When possible, focus each test on a single behavior
4. **Use Helpers**: Reuse helper functions for consistency
5. **Wait Appropriately**: Use explicit waits for dynamic content
6. **Readable Assertions**: Use Playwright's expressive assertion library
7. **Test Independence**: Tests should not depend on each other

## Performance

The full test suite (68 tests) typically runs in:
- **Headless mode**: ~2-3 minutes
- **Headed mode**: ~3-4 minutes
- **UI mode**: Interactive, runs on demand

## Getting Help

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Playwright Discord](https://discord.gg/playwright-807756831384403968)

## Next Steps

After running tests successfully:

1. Review the HTML test report for insights
2. Add tests for any new features you develop
3. Run tests before committing code
4. Consider setting up CI to run tests automatically
5. Use `--ui` mode during development for faster feedback

Happy testing!
