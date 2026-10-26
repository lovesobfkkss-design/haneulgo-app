const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('Grade Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should allow changing a student to grade 3', async ({ page }) => {
    const firstGrade = page.locator('.editable-grade').first();
    const firstName = await page.locator('#grade1Body tr td:nth-child(3)').first().textContent();

    await firstGrade.click();

    const picker = page.locator('.grade-select-inline').first();
    await expect(picker).toBeVisible();
    await expect(picker.locator('button')).toHaveCount(3);
    await expect(picker.locator('button').nth(2)).toHaveText('3학년');

    await picker.locator('button:has-text("3학년")').click();
    await page.waitForTimeout(300);

    await expect(page.locator(`#grade3Body tr:has-text("${firstName.trim()}")`)).toBeVisible();

    const savedData = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(k => k.startsWith('studentsData:'));
      return JSON.parse(localStorage.getItem(key) || '[]');
    });
    const updatedStudent = savedData.find(student => student.name === firstName.trim());
    expect(updatedStudent.grade).toBe(3);
  });
});
