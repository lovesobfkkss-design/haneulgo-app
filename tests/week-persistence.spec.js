const { test, expect } = require('@playwright/test');
const {
  setupApp,
  getCurrentWeek,
  setWeek,
  toggleStudent,
  isStudentChecked,
  getLocalStorageData,
  getStats
} = require('./helpers');

test.describe('Week Selection and Data Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should display current week by default', async ({ page }) => {
    const weekInput = page.locator('#weekSelect');
    const value = await weekInput.inputValue();

    // Should be in format YYYY-WXX (e.g., "2025-W44")
    expect(value).toMatch(/^\d{4}-W\d{2}$/);
  });

  test('should load data for selected week', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);

    // Check a student
    await toggleStudent(page, 1);
    expect(await isStudentChecked(page, 1)).toBe(true);

    // Change to different week
    const [year, week] = currentWeek.split('-W');
    const nextWeek = `${year}-W${String(parseInt(week) + 1).padStart(2, '0')}`;
    await setWeek(page, nextWeek);

    // Student should not be checked in new week
    expect(await isStudentChecked(page, 1)).toBe(false);

    // Go back to original week
    await setWeek(page, currentWeek);

    // Student should be checked again
    expect(await isStudentChecked(page, 1)).toBe(true);
  });

  test('should maintain separate check states per week', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);
    const [year, week] = currentWeek.split('-W');
    const week1 = currentWeek;
    const week2 = `${year}-W${String(parseInt(week) + 1).padStart(2, '0')}`;

    // Week 1: Check student 1
    await setWeek(page, week1);
    await toggleStudent(page, 1);
    expect(await isStudentChecked(page, 1)).toBe(true);

    // Week 2: Check student 5
    await setWeek(page, week2);
    await toggleStudent(page, 5);
    expect(await isStudentChecked(page, 5)).toBe(true);
    expect(await isStudentChecked(page, 1)).toBe(false);

    // Back to Week 1: Student 1 should be checked, student 5 should not
    await setWeek(page, week1);
    expect(await isStudentChecked(page, 1)).toBe(true);
    expect(await isStudentChecked(page, 5)).toBe(false);
  });

  test('should save week data to localStorage', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);

    // Check some students
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);
    await toggleStudent(page, 3);

    // Verify in localStorage
    const checklistData = await getLocalStorageData(page, 'studentChecklist');
    expect(checklistData).toBeTruthy();
    expect(checklistData[currentWeek]).toBeTruthy();
    expect(checklistData[currentWeek][1]).toBe(true);
    expect(checklistData[currentWeek][5]).toBe(true);
    expect(checklistData[currentWeek][3]).toBe(true);
  });

  test('should handle multiple weeks in localStorage', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);
    const [year, week] = currentWeek.split('-W');
    const week1 = currentWeek;
    const week2 = `${year}-W${String(parseInt(week) + 1).padStart(2, '0')}`;
    const week3 = `${year}-W${String(parseInt(week) + 2).padStart(2, '0')}`;

    // Add data for multiple weeks
    await setWeek(page, week1);
    await toggleStudent(page, 1);

    await setWeek(page, week2);
    await toggleStudent(page, 5);

    await setWeek(page, week3);
    await toggleStudent(page, 10);

    // Check localStorage has all weeks
    const checklistData = await getLocalStorageData(page, 'studentChecklist');
    expect(Object.keys(checklistData)).toContain(week1);
    expect(Object.keys(checklistData)).toContain(week2);
    expect(Object.keys(checklistData)).toContain(week3);
  });

  test('should persist week data after page reload', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);

    // Check students
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should load back to current week with data intact
    expect(await isStudentChecked(page, 1)).toBe(true);
    expect(await isStudentChecked(page, 5)).toBe(true);
  });

  test('should update statistics when switching weeks', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);
    const [year, week] = currentWeek.split('-W');
    const week1 = currentWeek;
    const week2 = `${year}-W${String(parseInt(week) + 1).padStart(2, '0')}`;

    // Week 1: Check 3 students
    await setWeek(page, week1);
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);
    await toggleStudent(page, 3);

    let stats = await getStats(page);
    expect(stats.completed).toBe(3);

    // Week 2: Check 5 students
    await setWeek(page, week2);
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);
    await toggleStudent(page, 3);
    await toggleStudent(page, 7);
    await toggleStudent(page, 18);

    stats = await getStats(page);
    expect(stats.completed).toBe(5);

    // Back to Week 1: Should show 3 completed
    await setWeek(page, week1);
    stats = await getStats(page);
    expect(stats.completed).toBe(3);
  });

  test('should handle week selection without clicking 불러오기', async ({ page }) => {
    const weekInput = page.locator('#weekSelect');
    const currentValue = await weekInput.inputValue();

    // Just change the week input without clicking load button
    const [year, week] = currentValue.split('-W');
    const newWeek = `${year}-W${String(parseInt(week) + 1).padStart(2, '0')}`;
    await weekInput.fill(newWeek);

    // The current week in memory should still be the old one until "불러오기" is clicked
    // Check a student
    await toggleStudent(page, 1);

    // Click load button
    await page.locator('button:has-text("불러오기")').click();
    await page.waitForTimeout(500);

    // Now we should be in the new week with no checks
    expect(await isStudentChecked(page, 1)).toBe(false);
  });

  test('should calculate week number correctly', async ({ page }) => {
    const weekInput = page.locator('#weekSelect');
    const value = await weekInput.inputValue();

    // Verify format
    expect(value).toMatch(/^\d{4}-W\d{2}$/);

    // Extract parts
    const [year, weekPart] = value.split('-W');
    const weekNum = parseInt(weekPart);

    // Week number should be between 1 and 53
    expect(weekNum).toBeGreaterThanOrEqual(1);
    expect(weekNum).toBeLessThanOrEqual(53);

    // Year should be current or recent
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year);
    expect(yearNum).toBeGreaterThanOrEqual(currentYear - 1);
    expect(yearNum).toBeLessThanOrEqual(currentYear + 1);
  });

  test('should handle past and future weeks', async ({ page }) => {
    // Test past week
    await setWeek(page, '2024-W01');
    await toggleStudent(page, 1);
    expect(await isStudentChecked(page, 1)).toBe(true);

    // Test future week
    await setWeek(page, '2026-W52');
    expect(await isStudentChecked(page, 1)).toBe(false);
    await toggleStudent(page, 5);
    expect(await isStudentChecked(page, 5)).toBe(true);

    // Go back to past week - data should persist
    await setWeek(page, '2024-W01');
    expect(await isStudentChecked(page, 1)).toBe(true);
    expect(await isStudentChecked(page, 5)).toBe(false);
  });
});
