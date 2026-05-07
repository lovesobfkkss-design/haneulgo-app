/**
 * Helper functions for Playwright tests
 */

/**
 * Navigate to the app and wait for it to load
 */
async function setupApp(page) {
  await page.goto('file://' + __dirname + '/../index.html');
  await page.waitForLoadState('domcontentloaded');

  // Clear localStorage before each test for clean state
  await page.evaluate(() => {
    localStorage.clear();
  });

  // Reload to apply clean state
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Get the current week value from the week selector
 */
async function getCurrentWeek(page) {
  return await page.locator('#weekSelect').inputValue();
}

/**
 * Set a specific week
 */
async function setWeek(page, weekValue) {
  await page.locator('#weekSelect').fill(weekValue);
  await page.locator('button:has-text("불러오기")').click();
  await page.waitForTimeout(500); // Wait for data to load
}

/**
 * Get the statistics from the page
 */
async function getStats(page) {
  const totalCount = await page.locator('#totalCount').textContent();
  const completedCount = await page.locator('#completedCount').textContent();
  const remainingCount = await page.locator('#remainingCount').textContent();
  const completionRate = await page.locator('#completionRate').textContent();

  return {
    total: parseInt(totalCount),
    completed: parseInt(completedCount),
    remaining: parseInt(remainingCount),
    rate: completionRate
  };
}

/**
 * Get grade-specific statistics
 */
async function getGradeStats(page, grade) {
  const statsText = await page.locator(`#grade${grade}Stats`).textContent();
  const match = statsText.match(/(\d+)\/(\d+)/);

  if (match) {
    return {
      completed: parseInt(match[1]),
      total: parseInt(match[2])
    };
  }

  return { completed: 0, total: 0 };
}

/**
 * Check if a student is checked
 */
async function isStudentChecked(page, studentNum) {
  return await page.locator(`#student-${studentNum}`).isChecked();
}

/**
 * Toggle a student's checkbox
 */
async function toggleStudent(page, studentNum) {
  await page.locator(`#student-${studentNum}`).click();
  await page.waitForTimeout(300); // Wait for state to save
}

/**
 * Search for students
 */
async function search(page, searchTerm) {
  await page.locator('#searchInput').fill(searchTerm);
  await page.waitForTimeout(300);
}

/**
 * Filter by grade
 */
async function filterByGrade(page, grade) {
  if (grade === 'all') {
    await page.locator('button:has-text("전체")').first().click();
  } else {
    await page.locator(`button:has-text("${grade}학년")`).click();
  }
  await page.waitForTimeout(300);
}

/**
 * Filter by class
 */
async function filterByClass(page, className) {
  await page.locator('#classFilter').selectOption(className);
  await page.waitForTimeout(300);
}

/**
 * Get visible student rows
 */
async function getVisibleStudentRows(page) {
  return await page.locator('tbody tr').filter({ hasNot: page.locator('[style*="display: none"]') });
}

/**
 * Count visible students
 */
async function countVisibleStudents(page) {
  const rows = await page.locator('tbody tr').all();
  let visibleCount = 0;

  for (const row of rows) {
    const display = await row.evaluate(el => window.getComputedStyle(el).display);
    if (display !== 'none') {
      visibleCount++;
    }
  }

  return visibleCount;
}

/**
 * Open the add student modal
 */
async function openAddStudentModal(page) {
  await page.locator('button:has-text("+ 학생 추가")').click();
  await page.waitForSelector('#addStudentModal[style*="display: block"]');
}

/**
 * Fill and submit the add student form
 */
async function addStudent(page, studentData) {
  await openAddStudentModal(page);

  await page.locator('#studentName').fill(studentData.name);
  await page.locator('#studentGrade').selectOption(studentData.grade.toString());
  await page.locator('#studentClass').fill(studentData.class);
  await page.locator('#studentSubjects').fill(studentData.subjects.join(', '));

  if (studentData.phone) {
    await page.locator('#studentPhone').fill(studentData.phone);
  }

  await page.locator('#addStudentForm button[type="submit"]').click();
  await page.waitForTimeout(500); // Wait for student to be added and modal to close
}

/**
 * Enable edit mode
 */
async function enableEditMode(page) {
  await page.locator('button:has-text("과목 편집")').click();
  await page.waitForTimeout(300);
}

/**
 * Disable edit mode
 */
async function disableEditMode(page) {
  await page.locator('button:has-text("편집 완료")').click();
  await page.waitForTimeout(300);
}

/**
 * Get student subjects
 */
async function getStudentSubjects(page, studentNum) {
  const row = await page.locator(`#student-${studentNum}`).locator('..').locator('..');
  const subjects = await row.locator('.subject-tag').allTextContents();
  return subjects.filter(s => s.trim() !== '');
}

/**
 * Delete a student (must be in edit mode)
 */
async function deleteStudent(page, studentName) {
  // Handle the confirmation dialog
  page.once('dialog', dialog => dialog.accept());

  await page.locator(`button.delete-student-btn`).filter({ hasText: '' }).first().click();
  await page.waitForTimeout(500);
}

/**
 * Check all students
 */
async function checkAll(page) {
  await page.locator('button:has-text("전체 체크")').click();
  await page.waitForTimeout(500);
}

/**
 * Uncheck all students
 */
async function uncheckAll(page) {
  await page.locator('button:has-text("전체 해제")').click();
  await page.waitForTimeout(500);
}

/**
 * Reset week data
 */
async function resetWeek(page) {
  await page.locator('button:has-text("초기화")').click();
  await page.waitForSelector('#resetWarning[style*="display: block"]');
  await page.locator('#resetWarning button:has-text("확인")').click();
  await page.waitForTimeout(500);
}

/**
 * Get localStorage data
 */
async function getLocalStorageData(page, key) {
  return await page.evaluate((storageKey) => {
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : null;
  }, key);
}

/**
 * Wait for save indicator
 */
async function waitForSave(page) {
  await page.waitForSelector('#saveIndicator[style*="display: block"]', { timeout: 3000 });
  await page.waitForSelector('#saveIndicator[style*="display: none"]', { timeout: 3000 });
}

module.exports = {
  setupApp,
  getCurrentWeek,
  setWeek,
  getStats,
  getGradeStats,
  isStudentChecked,
  toggleStudent,
  search,
  filterByGrade,
  filterByClass,
  getVisibleStudentRows,
  countVisibleStudents,
  openAddStudentModal,
  addStudent,
  enableEditMode,
  disableEditMode,
  getStudentSubjects,
  deleteStudent,
  checkAll,
  uncheckAll,
  resetWeek,
  getLocalStorageData,
  waitForSave
};
