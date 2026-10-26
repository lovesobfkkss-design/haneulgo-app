const { test, expect } = require('@playwright/test');

// 배부 체크가 저장되지 않던 버그 회귀 테스트:
// onchange="toggleCheck("sid_...", "과목")" 처럼 큰따옴표가 속성을 끊어 핸들러가 실행되지 않았음
test.describe('Check Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Firebase 차단 → localStorage 모드로 동작
    await page.route('**/firebasejs/**', route => route.abort());
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      const session = { year: 2026, semester: '2', examType: 'final', key: '2026-2-final' };
      localStorage.setItem('examSessionIndex', JSON.stringify([session]));
      localStorage.setItem('selectedExamSession', JSON.stringify(session));
      localStorage.setItem('adminModeEnabled', 'true');
      localStorage.setItem('studentsData:2026-2-final', JSON.stringify([
        { id: 'sid_test-1', grade: 1, num: 1, name: '테스트', class: '1반', subjects: ['1학년 국어', '1학년 영어'], phone: '010-1111-2222', parentPhone: '010-3333-4444', deliveryType: '택배' }
      ]));
    });
    await page.goto('file://' + __dirname + '/../index.html');
    await expect(page.locator('#grade1Body tr')).toHaveCount(1);
  });

  test('subject check survives reload', async ({ page }) => {
    const checkbox = page.locator('#grade1Body input[type=checkbox]').first();
    await checkbox.check();

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('studentChecklist:2026-2-final') || '{}'));
    const week = await page.locator('#weekSelect').inputValue();
    expect(saved[week]['sid_test-1']['1학년 국어']).toBe(true);

    await page.reload();
    await expect(page.locator('#grade1Body tr')).toHaveCount(1);
    await expect(page.locator('#grade1Body input[type=checkbox]').first()).toBeChecked();
    await expect(page.locator('#grade1Body input[type=checkbox]').nth(1)).not.toBeChecked();
  });
});
