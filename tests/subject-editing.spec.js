const { test, expect } = require('@playwright/test');
const {
  setupApp,
  enableEditMode,
  disableEditMode,
  getStudentSubjects,
  addStudent,
  getLocalStorageData
} = require('./helpers');

test.describe('Subject Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should toggle edit mode on button click', async ({ page }) => {
    const editButton = page.locator('button:has-text("과목 편집")');

    // Initially shows "과목 편집"
    await expect(editButton).toHaveText('과목 편집');
    await expect(editButton).toHaveClass(/btn-primary/);

    // Click to enable edit mode
    await enableEditMode(page);

    // Button text and class should change
    const completeButton = page.locator('button:has-text("편집 완료")');
    await expect(completeButton).toBeVisible();
    await expect(completeButton).toHaveClass(/btn-success/);
  });

  test('should show delete indicator on subjects in edit mode', async ({ page }) => {
    // Enable edit mode
    await enableEditMode(page);

    // Subject tags should have delete mode class
    const subjectTag = page.locator('.subject-tag').first();
    const subjectsDiv = subjectTag.locator('..');

    await expect(subjectsDiv).toHaveClass(/delete-mode/);

    // Disable edit mode
    await disableEditMode(page);

    // Delete mode should be removed
    await expect(subjectsDiv).not.toHaveClass(/delete-mode/);
  });

  test('should remove a subject when clicked in edit mode', async ({ page }) => {
    // Add a test student with multiple subjects
    const testStudent = {
      name: '과목삭제테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어', '영어', '수학']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    // Find the student row
    const row = page.locator(`tr:has-text("${testStudent.name}")`);

    // Click on "영어" subject to remove it
    await row.locator('.subject-tag:has-text("영어")').click();
    await page.waitForTimeout(500);

    // "영어" should be removed
    await expect(row.locator('.subject-tag:has-text("영어")')).not.toBeVisible();

    // Other subjects should still be there
    await expect(row.locator('.subject-tag:has-text("국어")')).toBeVisible();
    await expect(row.locator('.subject-tag:has-text("수학")')).toBeVisible();
  });

  test('should show add subject button in edit mode', async ({ page }) => {
    // Add buttons should not be visible initially
    await expect(page.locator('.add-subject-btn').first()).not.toBeVisible();

    // Enable edit mode
    await enableEditMode(page);

    // Add buttons should be visible
    const addButtons = page.locator('.add-subject-btn');
    const count = await addButtons.count();
    expect(count).toBeGreaterThan(0);
    await expect(addButtons.first()).toBeVisible();
  });

  test('should add a new subject to a student', async ({ page }) => {
    // Add a test student
    const testStudent = {
      name: '과목추가테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    const row = page.locator(`tr:has-text("${testStudent.name}")`);

    // Click add subject button
    await row.locator('.add-subject-btn').click();

    // Input field should appear
    const subjectInput = row.locator('.subject-input');
    await expect(subjectInput).toBeVisible();

    // Type new subject and press Enter
    await subjectInput.fill('과학');
    await subjectInput.press('Enter');
    await page.waitForTimeout(500);

    // New subject should appear
    await expect(row.locator('.subject-tag:has-text("과학")')).toBeVisible();

    // Original subject should still be there
    await expect(row.locator('.subject-tag:has-text("국어")')).toBeVisible();
  });

  test('should cancel add subject on blur without input', async ({ page }) => {
    const testStudent = {
      name: '취소테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    const row = page.locator(`tr:has-text("${testStudent.name}")`);

    // Click add subject button
    await row.locator('.add-subject-btn').click();

    const subjectInput = row.locator('.subject-input');
    await expect(subjectInput).toBeVisible();

    // Click outside to blur (click on the header)
    await page.locator('h1').click();
    await page.waitForTimeout(500);

    // Input should be gone, add button should be back
    await expect(subjectInput).not.toBeVisible();
    await expect(row.locator('.add-subject-btn')).toBeVisible();
  });

  test('should not add duplicate subjects', async ({ page }) => {
    const testStudent = {
      name: '중복테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어', '영어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    const row = page.locator(`tr:has-text("${testStudent.name}")`);

    // Try to add "국어" again (already exists)
    await row.locator('.add-subject-btn').click();
    const subjectInput = row.locator('.subject-input');
    await subjectInput.fill('국어');
    await subjectInput.press('Enter');
    await page.waitForTimeout(500);

    // Should still have only 2 subject tags (no duplicate)
    const subjectTags = row.locator('.subject-tag');
    const count = await subjectTags.count();
    expect(count).toBe(2);
  });

  test('should persist subject changes to localStorage', async ({ page }) => {
    const testStudent = {
      name: '저장테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어', '영어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    const row = page.locator(`tr:has-text("${testStudent.name}")`);

    // Remove "영어"
    await row.locator('.subject-tag:has-text("영어")').click();
    await page.waitForTimeout(500);

    // Add "수학"
    await row.locator('.add-subject-btn').click();
    await row.locator('.subject-input').fill('수학');
    await row.locator('.subject-input').press('Enter');
    await page.waitForTimeout(500);

    // Check localStorage
    const studentsData = await getLocalStorageData(page, 'studentsData');
    const student = studentsData.find(s => s.name === testStudent.name);

    expect(student.subjects).toEqual(['국어', '수학']);
  });

  test('should maintain subject changes after page reload', async ({ page }) => {
    const testStudent = {
      name: '리로드테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    const row = page.locator(`tr:has-text("${testStudent.name}")`);

    // Add subject
    await row.locator('.add-subject-btn').click();
    await row.locator('.subject-input').fill('영어');
    await row.locator('.subject-input').press('Enter');
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Subject should still be there
    const reloadedRow = page.locator(`tr:has-text("${testStudent.name}")`);
    await expect(reloadedRow.locator('.subject-tag:has-text("국어")')).toBeVisible();
    await expect(reloadedRow.locator('.subject-tag:has-text("영어")')).toBeVisible();
  });

  test('should not allow subject editing when not in edit mode', async ({ page }) => {
    // Subjects should not have delete-mode class
    const subjectsDiv = page.locator('.subjects').first();
    await expect(subjectsDiv).not.toHaveClass(/delete-mode/);

    // Clicking subject should do nothing
    const subjectTag = page.locator('.subject-tag').first();
    const initialText = await subjectTag.textContent();

    await subjectTag.click();
    await page.waitForTimeout(300);

    // Subject should still be there
    expect(await subjectTag.textContent()).toBe(initialText);
  });
});
