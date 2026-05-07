const { test, expect } = require('@playwright/test');
const {
  setupApp,
  getStats,
  getGradeStats,
  isStudentChecked,
  toggleStudent,
  getLocalStorageData,
  getCurrentWeek
} = require('./helpers');

test.describe('Check/Uncheck Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should check a student', async ({ page }) => {
    const studentNum = 1;
    const initialStats = await getStats(page);

    // Initially unchecked
    expect(await isStudentChecked(page, studentNum)).toBe(false);

    // Click checkbox
    await toggleStudent(page, studentNum);

    // Should now be checked
    expect(await isStudentChecked(page, studentNum)).toBe(true);

    // Stats should update
    const newStats = await getStats(page);
    expect(newStats.completed).toBe(initialStats.completed + 1);
    expect(newStats.remaining).toBe(initialStats.remaining - 1);
  });

  test('should uncheck a student', async ({ page }) => {
    const studentNum = 1;

    // Check first
    await toggleStudent(page, studentNum);
    expect(await isStudentChecked(page, studentNum)).toBe(true);

    const initialStats = await getStats(page);

    // Uncheck
    await toggleStudent(page, studentNum);
    expect(await isStudentChecked(page, studentNum)).toBe(false);

    // Stats should update
    const newStats = await getStats(page);
    expect(newStats.completed).toBe(initialStats.completed - 1);
    expect(newStats.remaining).toBe(initialStats.remaining + 1);
  });

  test('should apply completed-row class when checked', async ({ page }) => {
    const studentNum = 1;
    const checkbox = page.locator(`#student-${studentNum}`);
    const row = checkbox.locator('../..');

    // Initially no completed-row class
    await expect(row).not.toHaveClass(/completed-row/);

    // Check student
    await toggleStudent(page, studentNum);

    // Should have completed-row class
    await expect(row).toHaveClass(/completed-row/);

    // Uncheck
    await toggleStudent(page, studentNum);

    // Should not have completed-row class
    await expect(row).not.toHaveClass(/completed-row/);
  });

  test('should update completion rate correctly', async ({ page }) => {
    const totalStudents = 28;

    // Check first student
    await toggleStudent(page, 1);

    let stats = await getStats(page);
    expect(stats.rate).toBe('4%'); // 1/28 = 3.57% rounds to 4%

    // Check second student
    await toggleStudent(page, 5);

    stats = await getStats(page);
    expect(stats.rate).toBe('7%'); // 2/28 = 7.14% rounds to 7%
  });

  test('should update grade-specific statistics', async ({ page }) => {
    // Get a grade 1 student (student num 1 is grade 1)
    const grade1Stats = await getGradeStats(page, 1);
    expect(grade1Stats.completed).toBe(0);

    // Check grade 1 student
    await toggleStudent(page, 1);

    const newGrade1Stats = await getGradeStats(page, 1);
    expect(newGrade1Stats.completed).toBe(1);

    // Grade 2 stats should be unchanged
    const grade2Stats = await getGradeStats(page, 2);
    expect(grade2Stats.completed).toBe(0);
  });

  test('should persist check state to localStorage', async ({ page }) => {
    const studentNum = 1;
    const currentWeek = await getCurrentWeek(page);

    // Check student
    await toggleStudent(page, studentNum);

    // Verify in localStorage
    const checklistData = await getLocalStorageData(page, 'studentChecklist');
    expect(checklistData).toBeTruthy();
    expect(checklistData[currentWeek]).toBeTruthy();
    expect(checklistData[currentWeek][studentNum]).toBe(true);
  });

  test('should maintain check state after page reload', async ({ page }) => {
    const studentNum = 1;

    // Check student
    await toggleStudent(page, studentNum);
    expect(await isStudentChecked(page, studentNum)).toBe(true);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Check state should be maintained
    expect(await isStudentChecked(page, studentNum)).toBe(true);
  });

  test('should handle multiple students checked', async ({ page }) => {
    const studentNums = [1, 5, 3, 7, 18];

    // Check multiple students
    for (const num of studentNums) {
      await toggleStudent(page, num);
    }

    // Verify all are checked
    for (const num of studentNums) {
      expect(await isStudentChecked(page, num)).toBe(true);
    }

    // Stats should reflect all checks
    const stats = await getStats(page);
    expect(stats.completed).toBe(studentNums.length);
  });

  test('should show save indicator when checking', async ({ page }) => {
    const studentNum = 1;
    const saveIndicator = page.locator('#saveIndicator');

    // Initially hidden
    await expect(saveIndicator).not.toBeVisible();

    // Check student
    await page.locator(`#student-${studentNum}`).click();

    // Save indicator should appear
    await expect(saveIndicator).toBeVisible({ timeout: 2000 });

    // And then disappear after animation
    await expect(saveIndicator).not.toBeVisible({ timeout: 3000 });
  });

  test('should handle rapid checking/unchecking', async ({ page }) => {
    const studentNum = 1;

    // Rapid toggle 5 times
    for (let i = 0; i < 5; i++) {
      await page.locator(`#student-${studentNum}`).click();
      await page.waitForTimeout(100);
    }

    // Final state should be checked (odd number of clicks)
    expect(await isStudentChecked(page, studentNum)).toBe(true);

    // Stats should be consistent
    const stats = await getStats(page);
    expect(stats.completed).toBe(1);
  });
});
