const { test, expect } = require('@playwright/test');
const {
  setupApp,
  getStats,
  addStudent,
  enableEditMode,
  deleteStudent,
  getLocalStorageData,
  waitForSave
} = require('./helpers');

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('should display initial student count', async ({ page }) => {
    const stats = await getStats(page);

    // The app initially has 28 students (26 grade 1, 2 grade 2)
    expect(stats.total).toBe(28);
    expect(stats.completed).toBe(0);
    expect(stats.remaining).toBe(28);
    expect(stats.rate).toBe('0%');
  });

  test('should open add student modal', async ({ page }) => {
    await page.locator('button:has-text("+ 학생 추가")').click();

    // Modal should be visible
    const modal = page.locator('#addStudentModal');
    await expect(modal).toBeVisible();

    // Modal should have the correct title
    await expect(page.locator('.modal-header')).toHaveText('학생 추가');

    // All form fields should be present
    await expect(page.locator('#studentName')).toBeVisible();
    await expect(page.locator('#studentGrade')).toBeVisible();
    await expect(page.locator('#studentClass')).toBeVisible();
    await expect(page.locator('#studentSubjects')).toBeVisible();
    await expect(page.locator('#studentPhone')).toBeVisible();
  });

  test('should close add student modal on cancel', async ({ page }) => {
    await page.locator('button:has-text("+ 학생 추가")').click();
    await expect(page.locator('#addStudentModal')).toBeVisible();

    await page.locator('button:has-text("취소")').click();
    await expect(page.locator('#addStudentModal')).not.toBeVisible();
  });

  test('should close add student modal on X button', async ({ page }) => {
    await page.locator('button:has-text("+ 학생 추가")').click();
    await expect(page.locator('#addStudentModal')).toBeVisible();

    await page.locator('.close-btn').click();
    await expect(page.locator('#addStudentModal')).not.toBeVisible();
  });

  test('should add a new student with all fields', async ({ page }) => {
    const newStudent = {
      name: '테스트학생',
      grade: 1,
      class: '9반',
      subjects: ['국어', '영어'],
      phone: '010-1234-5678'
    };

    const initialStats = await getStats(page);
    await addStudent(page, newStudent);

    // Check stats updated
    const newStats = await getStats(page);
    expect(newStats.total).toBe(initialStats.total + 1);

    // Verify student appears in the table
    await expect(page.locator('text=' + newStudent.name)).toBeVisible();

    // Verify subjects are displayed
    const row = page.locator(`tr:has-text("${newStudent.name}")`);
    await expect(row.locator('.subject-tag:has-text("국어")')).toBeVisible();
    await expect(row.locator('.subject-tag:has-text("영어")')).toBeVisible();

    // Verify phone number is displayed
    await expect(row.locator('.phone:has-text("010-1234-5678")')).toBeVisible();
  });

  test('should add a new student without phone number', async ({ page }) => {
    const newStudent = {
      name: '전화없음',
      grade: 2,
      class: '1반',
      subjects: ['수학']
    };

    await addStudent(page, newStudent);

    // Verify student appears
    await expect(page.locator('text=' + newStudent.name)).toBeVisible();
  });

  test('should persist added student to localStorage', async ({ page }) => {
    const newStudent = {
      name: '저장테스트',
      grade: 1,
      class: '1반',
      subjects: ['과학']
    };

    await addStudent(page, newStudent);

    // Check localStorage
    const studentsData = await getLocalStorageData(page, 'studentsData');
    expect(studentsData).toBeTruthy();

    const addedStudent = studentsData.find(s => s.name === newStudent.name);
    expect(addedStudent).toBeTruthy();
    expect(addedStudent.grade).toBe(newStudent.grade);
    expect(addedStudent.class).toBe(newStudent.class);
    expect(addedStudent.subjects).toEqual(newStudent.subjects);
  });

  test('should edit student phone number inline', async ({ page }) => {
    const newStudent = {
      name: '전화수정테스트',
      grade: 1,
      class: '1반',
      subjects: ['과학'],
      phone: '010-1111-2222'
    };

    await addStudent(page, newStudent);

    const row = page.locator(`tr:has-text("${newStudent.name}")`);
    const phoneCell = row.locator('.editable-phone[data-phone-field="phone"]').first();

    await phoneCell.click();
    await row.locator('.editable-phone[data-phone-field="phone"] input').fill('01099998888');
    await row.locator('.editable-phone[data-phone-field="phone"] input').blur();
    await waitForSave(page);

    await expect(phoneCell).toHaveText('010-9999-8888');

    const studentsData = await getLocalStorageData(page, 'studentsData');
    const editedStudent = studentsData.find(s => s.name === newStudent.name);
    expect(editedStudent.phone).toBe('010-9999-8888');
  });

  test('should auto-generate student number based on grade', async ({ page }) => {
    const newStudent = {
      name: '번호테스트1',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, newStudent);

    const studentsData = await getLocalStorageData(page, 'studentsData');
    const addedStudent = studentsData.find(s => s.name === newStudent.name);

    // Grade 1 has students up to num 26, so new student should be 27
    expect(addedStudent.num).toBeGreaterThan(26);
  });

  test('should show delete button in edit mode', async ({ page }) => {
    // Initially, delete buttons should not be visible
    await expect(page.locator('.delete-student-btn').first()).not.toBeVisible();

    // Enable edit mode
    await enableEditMode(page);

    // Now delete buttons should be visible
    const deleteButtons = page.locator('.delete-student-btn');
    const count = await deleteButtons.count();
    expect(count).toBeGreaterThan(0);
    await expect(deleteButtons.first()).toBeVisible();
  });

  test('should delete a student in edit mode', async ({ page }) => {
    // Add a test student first
    const testStudent = {
      name: '삭제테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, testStudent);

    const initialStats = await getStats(page);
    await expect(page.locator('text=' + testStudent.name)).toBeVisible();

    // Enable edit mode
    await enableEditMode(page);

    // Set up dialog handler to accept confirmation
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain(testStudent.name);
      dialog.accept();
    });

    // Click delete button for the test student
    const row = page.locator(`tr:has-text("${testStudent.name}")`);
    await row.locator('.delete-student-btn').click();

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify student is gone
    await expect(page.locator('text=' + testStudent.name)).not.toBeVisible();

    // Check stats updated
    const newStats = await getStats(page);
    expect(newStats.total).toBe(initialStats.total - 1);
  });

  test('should cancel student deletion on dialog cancel', async ({ page }) => {
    // Add a test student first
    const testStudent = {
      name: '취소테스트',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    // Set up dialog handler to CANCEL deletion
    page.once('dialog', dialog => {
      dialog.dismiss();
    });

    const row = page.locator(`tr:has-text("${testStudent.name}")`);
    await row.locator('.delete-student-btn').click();

    await page.waitForTimeout(500);

    // Verify student is still there
    await expect(page.locator('text=' + testStudent.name)).toBeVisible();
  });

  test('should remove student data from localStorage on delete', async ({ page }) => {
    const testStudent = {
      name: '로컬스토리지삭제',
      grade: 1,
      class: '1반',
      subjects: ['국어']
    };

    await addStudent(page, testStudent);
    await enableEditMode(page);

    // Accept deletion dialog
    page.once('dialog', dialog => dialog.accept());

    const row = page.locator(`tr:has-text("${testStudent.name}")`);
    await row.locator('.delete-student-btn').click();
    await page.waitForTimeout(500);

    // Check localStorage
    const studentsData = await getLocalStorageData(page, 'studentsData');
    const deletedStudent = studentsData.find(s => s.name === testStudent.name);
    expect(deletedStudent).toBeUndefined();
  });
});
