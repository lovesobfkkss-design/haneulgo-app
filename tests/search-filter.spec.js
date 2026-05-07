const { test, expect } = require('@playwright/test');
const {
  setupApp,
  search,
  filterByGrade,
  filterByClass,
  countVisibleStudents
} = require('./helpers');

test.describe('Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should search by student name', async ({ page }) => {
    // Search for "정수빈"
    await search(page, '정수빈');

    // Only rows containing "정수빈" should be visible
    await expect(page.locator('tr:has-text("정수빈")')).toBeVisible();

    // Count visible students
    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBe(1);
  });

  test('should search by partial name', async ({ page }) => {
    // Search for "이" - should match multiple students with 이 in their name
    await search(page, '이');

    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBeGreaterThan(1);

    // All visible rows should contain "이"
    const visibleRows = page.locator('tbody tr').filter({ hasNot: page.locator('[style*="display: none"]') });
    const count = await visibleRows.count();

    for (let i = 0; i < count; i++) {
      const text = await visibleRows.nth(i).textContent();
      expect(text).toContain('이');
    }
  });

  test('should search by class', async ({ page }) => {
    // Search for "1반"
    await search(page, '1반');

    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBeGreaterThan(0);

    // All visible rows should contain "1반"
    const visibleRows = page.locator('tbody tr').filter({ hasNot: page.locator('[style*="display: none"]') });
    const count = await visibleRows.count();

    for (let i = 0; i < count; i++) {
      const text = await visibleRows.nth(i).textContent();
      expect(text).toContain('1반');
    }
  });

  test('should search by subject', async ({ page }) => {
    // Search for "수학"
    await search(page, '수학');

    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBeGreaterThan(0);

    // All visible rows should contain "수학"
    const visibleRows = page.locator('tbody tr').filter({ hasNot: page.locator('[style*="display: none"]') });
    const count = await visibleRows.count();

    for (let i = 0; i < count; i++) {
      const text = await visibleRows.nth(i).textContent();
      expect(text).toContain('수학');
    }
  });

  test('should show no results for non-matching search', async ({ page }) => {
    // Search for something that doesn't exist
    await search(page, '존재하지않는이름xyz');

    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBe(0);
  });

  test('should clear search and show all students', async ({ page }) => {
    // Search first
    await search(page, '정수빈');
    let visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBe(1);

    // Clear search
    await search(page, '');

    // All students should be visible again
    visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBe(28); // Total initial students
  });

  test('should be case-insensitive for search', async ({ page }) => {
    // Search with lowercase (though Korean doesn't have case)
    // But test with mixed content
    await search(page, '영어');

    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBeGreaterThan(0);
  });

  test('should filter by grade 1', async ({ page }) => {
    await filterByGrade(page, 1);

    // Grade 1 section should be visible
    await expect(page.locator('#grade1Section')).toBeVisible();

    // Grade 2 section should be hidden
    const grade2Section = page.locator('#grade2Section');
    const display = await grade2Section.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('should filter by grade 2', async ({ page }) => {
    await filterByGrade(page, 2);

    // Grade 2 section should be visible
    await expect(page.locator('#grade2Section')).toBeVisible();

    // Grade 1 section should be hidden
    const grade1Section = page.locator('#grade1Section');
    const display = await grade1Section.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('should show all grades with "전체" filter', async ({ page }) => {
    // First filter to grade 1
    await filterByGrade(page, 1);

    // Then show all
    await filterByGrade(page, 'all');

    // Both sections should be visible
    await expect(page.locator('#grade1Section')).toBeVisible();
    await expect(page.locator('#grade2Section')).toBeVisible();
  });

  test('should filter by specific class', async ({ page }) => {
    // Filter by "1반"
    await filterByClass(page, '1반');

    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBeGreaterThan(0);

    // All visible students should be from "1반"
    const visibleRows = page.locator('tbody tr').filter({ hasNot: page.locator('[style*="display: none"]') });
    const count = await visibleRows.count();

    for (let i = 0; i < count; i++) {
      const classCell = await visibleRows.nth(i).locator('td').nth(2).textContent();
      expect(classCell.trim()).toBe('1반');
    }
  });

  test('should reset class filter to show all classes', async ({ page }) => {
    // Filter by specific class first
    await filterByClass(page, '1반');
    let visibleCount = await countVisibleStudents(page);
    const filteredCount = visibleCount;

    // Reset to all classes
    await filterByClass(page, 'all');
    visibleCount = await countVisibleStudents(page);

    expect(visibleCount).toBeGreaterThan(filteredCount);
    expect(visibleCount).toBe(28);
  });

  test('should combine search and grade filter', async ({ page }) => {
    // Filter by grade 1
    await filterByGrade(page, 1);

    // Then search for a specific subject
    await search(page, '영어');

    // Should only show grade 1 students with "영어"
    const visibleRows = page.locator('#grade1Body tr').filter({ hasNot: page.locator('[style*="display: none"]') });
    const count = await visibleRows.count();

    for (let i = 0; i < count; i++) {
      const text = await visibleRows.nth(i).textContent();
      expect(text).toContain('영어');
    }

    // Grade 2 section should still be hidden
    const grade2Section = page.locator('#grade2Section');
    const display = await grade2Section.evaluate(el => window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('should combine search and class filter', async ({ page }) => {
    // Filter by class
    await filterByClass(page, '4반');

    // Then search for name
    await search(page, '김');

    // Should only show students from "4반" with "김" in name
    const visibleCount = await countVisibleStudents(page);
    expect(visibleCount).toBeGreaterThan(0);

    const visibleRows = page.locator('tbody tr').filter({ hasNot: page.locator('[style*="display: none"]') });
    const count = await visibleRows.count();

    for (let i = 0; i < count; i++) {
      const text = await visibleRows.nth(i).textContent();
      expect(text).toContain('김');
      expect(text).toContain('4반');
    }
  });

  test('should update class filter options dynamically', async ({ page }) => {
    const classFilter = page.locator('#classFilter');

    // Should have "모든 반" option
    await expect(classFilter.locator('option[value="all"]')).toBeVisible();

    // Should have multiple class options
    const options = await classFilter.locator('option').count();
    expect(options).toBeGreaterThan(1); // At least "모든 반" + some classes
  });

  test('should reset class filter when changing grade filter', async ({ page }) => {
    // Select a specific class
    await filterByClass(page, '1반');

    // Change grade filter
    await filterByGrade(page, 2);

    // Class filter should be reset to "all"
    const classFilter = page.locator('#classFilter');
    const value = await classFilter.inputValue();
    expect(value).toBe('all');
  });

  test('should handle real-time search updates', async ({ page }) => {
    const searchInput = page.locator('#searchInput');

    // Type character by character
    await searchInput.fill('정');
    await page.waitForTimeout(300);
    let visibleCount = await countVisibleStudents(page);
    const afterFirstChar = visibleCount;

    await searchInput.fill('정수');
    await page.waitForTimeout(300);
    visibleCount = await countVisibleStudents(page);
    const afterSecondChar = visibleCount;

    await searchInput.fill('정수빈');
    await page.waitForTimeout(300);
    visibleCount = await countVisibleStudents(page);

    // Results should narrow down
    expect(visibleCount).toBeLessThanOrEqual(afterSecondChar);
    expect(afterSecondChar).toBeLessThanOrEqual(afterFirstChar);
  });
});
