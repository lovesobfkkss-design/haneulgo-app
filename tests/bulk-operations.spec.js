const { test, expect } = require('@playwright/test');
const {
  setupApp,
  checkAll,
  uncheckAll,
  resetWeek,
  getStats,
  isStudentChecked,
  toggleStudent,
  getLocalStorageData,
  getCurrentWeek
} = require('./helpers');

test.describe('Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should check all students', async ({ page }) => {
    // Initially all unchecked
    let stats = await getStats(page);
    expect(stats.completed).toBe(0);

    // Click "전체 체크"
    await checkAll(page);

    // All should be checked
    stats = await getStats(page);
    expect(stats.completed).toBe(stats.total);
    expect(stats.rate).toBe('100%');

    // Verify a few individual students
    expect(await isStudentChecked(page, 1)).toBe(true);
    expect(await isStudentChecked(page, 5)).toBe(true);
    expect(await isStudentChecked(page, 27)).toBe(true);
  });

  test('should uncheck all students', async ({ page }) => {
    // First check all
    await checkAll(page);
    let stats = await getStats(page);
    expect(stats.completed).toBe(stats.total);

    // Click "전체 해제"
    await uncheckAll(page);

    // All should be unchecked
    stats = await getStats(page);
    expect(stats.completed).toBe(0);
    expect(stats.rate).toBe('0%');

    // Verify individual students
    expect(await isStudentChecked(page, 1)).toBe(false);
    expect(await isStudentChecked(page, 5)).toBe(false);
    expect(await isStudentChecked(page, 27)).toBe(false);
  });

  test('should uncheck all when some students are already checked', async ({ page }) => {
    // Check some students manually
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);
    await toggleStudent(page, 10);

    let stats = await getStats(page);
    expect(stats.completed).toBe(3);

    // Click "전체 해제"
    await uncheckAll(page);

    // All should be unchecked
    stats = await getStats(page);
    expect(stats.completed).toBe(0);
  });

  test('should show reset confirmation dialog', async ({ page }) => {
    // Click "초기화"
    await page.locator('button:has-text("초기화")').click();

    // Warning should appear
    const warning = page.locator('#resetWarning');
    await expect(warning).toBeVisible();

    // Should have confirmation message
    await expect(warning).toContainText('정말로 이번 주차의 모든 체크를 초기화하시겠습니까?');

    // Should have 확인 and 취소 buttons
    await expect(warning.locator('button:has-text("확인")')).toBeVisible();
    await expect(warning.locator('button:has-text("취소")')).toBeVisible();
  });

  test('should cancel reset operation', async ({ page }) => {
    // Check some students
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);

    let stats = await getStats(page);
    expect(stats.completed).toBe(2);

    // Click "초기화"
    await page.locator('button:has-text("초기화")').click();
    await expect(page.locator('#resetWarning')).toBeVisible();

    // Click "취소"
    await page.locator('#resetWarning button:has-text("취소")').click();

    // Warning should be hidden
    await expect(page.locator('#resetWarning')).not.toBeVisible();

    // Students should still be checked
    stats = await getStats(page);
    expect(stats.completed).toBe(2);
    expect(await isStudentChecked(page, 1)).toBe(true);
    expect(await isStudentChecked(page, 5)).toBe(true);
  });

  test('should confirm and reset week data', async ({ page }) => {
    // Check some students
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);
    await toggleStudent(page, 10);

    let stats = await getStats(page);
    expect(stats.completed).toBe(3);

    // Reset week
    await resetWeek(page);

    // All should be unchecked
    stats = await getStats(page);
    expect(stats.completed).toBe(0);
    expect(await isStudentChecked(page, 1)).toBe(false);
    expect(await isStudentChecked(page, 5)).toBe(false);
    expect(await isStudentChecked(page, 10)).toBe(false);

    // Warning should be hidden after reset
    await expect(page.locator('#resetWarning')).not.toBeVisible();
  });

  test('should persist bulk check to localStorage', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);

    // Check all
    await checkAll(page);

    // Verify in localStorage
    const checklistData = await getLocalStorageData(page, 'studentChecklist');
    const weekData = checklistData[currentWeek];

    // All students should be checked
    expect(Object.values(weekData).every(v => v === true)).toBe(true);
  });

  test('should persist bulk uncheck to localStorage', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);

    // Check all then uncheck all
    await checkAll(page);
    await uncheckAll(page);

    // Verify in localStorage
    const checklistData = await getLocalStorageData(page, 'studentChecklist');
    const weekData = checklistData[currentWeek];

    // All students should be unchecked
    expect(Object.values(weekData).every(v => v === false)).toBe(true);
  });

  test('should persist reset to localStorage', async ({ page }) => {
    const currentWeek = await getCurrentWeek(page);

    // Check some students
    await toggleStudent(page, 1);
    await toggleStudent(page, 5);

    // Reset
    await resetWeek(page);

    // Verify in localStorage - week data should be empty object
    const checklistData = await getLocalStorageData(page, 'studentChecklist');
    const weekData = checklistData[currentWeek];

    expect(weekData).toEqual({});
  });

  test('should handle check all with grade filter active', async ({ page }) => {
    // Filter to grade 1 only
    await page.locator('button:has-text("1학년")').click();

    // Check all
    await checkAll(page);

    // All students (not just filtered ones) should be checked
    const stats = await getStats(page);
    expect(stats.completed).toBe(stats.total); // All 28 students

    // Show all grades and verify
    await page.locator('button:has-text("전체")').first().click();
    await page.waitForTimeout(300);

    // Grade 2 students should also be checked
    expect(await isStudentChecked(page, 27)).toBe(true); // Grade 2 student
    expect(await isStudentChecked(page, 28)).toBe(true); // Grade 2 student
  });

  test('should update grade statistics after bulk operations', async ({ page }) => {
    // Check all
    await checkAll(page);

    // Grade 1 stats
    const grade1Stats = await page.locator('#grade1Stats').textContent();
    expect(grade1Stats).toContain('26/26'); // All grade 1 students

    // Grade 2 stats
    const grade2Stats = await page.locator('#grade2Stats').textContent();
    expect(grade2Stats).toContain('2/2'); // All grade 2 students

    // Uncheck all
    await uncheckAll(page);

    // Both should show 0 completed
    expect(await page.locator('#grade1Stats').textContent()).toContain('0/26');
    expect(await page.locator('#grade2Stats').textContent()).toContain('0/2');
  });

  test('should show save indicator after bulk operations', async ({ page }) => {
    const saveIndicator = page.locator('#saveIndicator');

    // Check all
    await page.locator('button:has-text("전체 체크")').click();

    // Save indicator should appear
    await expect(saveIndicator).toBeVisible({ timeout: 2000 });
  });

  test('should maintain bulk operation results after reload', async ({ page }) => {
    // Check all
    await checkAll(page);

    let stats = await getStats(page);
    expect(stats.completed).toBe(stats.total);

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // All should still be checked
    stats = await getStats(page);
    expect(stats.completed).toBe(stats.total);
  });

  test('should handle rapid bulk operations', async ({ page }) => {
    // Rapid operations
    await checkAll(page);
    await page.waitForTimeout(100);
    await uncheckAll(page);
    await page.waitForTimeout(100);
    await checkAll(page);
    await page.waitForTimeout(500);

    // Final state should be all checked
    const stats = await getStats(page);
    expect(stats.completed).toBe(stats.total);
  });
});
