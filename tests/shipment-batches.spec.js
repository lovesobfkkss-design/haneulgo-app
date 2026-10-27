const { test, expect } = require('@playwright/test');

// 배부 회차(발송 일정): 회차별 과목·택배일·픽업일, '이번 회차만 변경', 포장/발송 경고, 발송 횟수
const SESSION = { year: 2026, semester: '2', examType: 'final', key: '2026-2-final' };

function seedStudents() {
  return [
    { id: 'sid_a', grade: 1, num: 1, name: '가택배', class: '1반', subjects: ['국어', '영어'], phone: '', parentPhone: '010-1111-1111', deliveryType: '택배' },
    { id: 'sid_b', grade: 1, num: 2, name: '나픽업', class: '1반', subjects: ['영어'], phone: '', parentPhone: '010-2222-2222', deliveryType: '픽업' },
    { id: 'sid_c', grade: 1, num: 3, name: '다과학', class: '2반', subjects: ['과학'], phone: '', parentPhone: '010-3333-3333', deliveryType: '택배' }
  ];
}

async function addBatch(page, { name, subjects, deliveryDate = '', pickupDate = '' }) {
  await page.locator('button:has-text("+ 배부 회차 추가")').click();
  await page.locator('#batchNameInput').fill(name);
  for (const subj of subjects) {
    await page.locator(`#batchSubjectList input[value="${subj}"]`).check();
  }
  if (deliveryDate) await page.locator('#batchDeliveryDateInput').fill(deliveryDate);
  if (pickupDate) await page.locator('#batchPickupDateInput').fill(pickupDate);
  await page.locator('#batchForm button[type=submit]').click();
}

function deliverySection(page) {
  return page.locator('[data-ship-section="delivery"]');
}

function pickupSection(page) {
  return page.locator('[data-ship-section="pickup"]');
}

test.describe('Shipment Batches', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/firebasejs/**', route => route.abort());
    await page.addInitScript(({ session, students }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('examSessionIndex', JSON.stringify([session]));
      localStorage.setItem('selectedExamSession', JSON.stringify(session));
      localStorage.setItem('adminModeEnabled', 'true');
      localStorage.setItem(`studentsData:${session.key}`, JSON.stringify(students));
    }, { session: SESSION, students: seedStudents() });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('file://' + __dirname + '/../index.html');
    await expect(page.locator('#grade1Body tr')).toHaveCount(3);
    await page.locator('.tab-btn:has-text("택배/픽업")').click();
  });

  test('only students with batch subjects appear, split by delivery and pickup date', async ({ page }) => {
    await addBatch(page, { name: '1차', subjects: ['영어'], deliveryDate: '2099-11-03', pickupDate: '2099-11-07' });

    // 택배일이 자동 선택됨: 영어 신청 + 택배 학생만
    await expect(page.locator('.ship-day-title')).toHaveText('11/3(화)');
    await expect(deliverySection(page).locator('tbody tr')).toHaveCount(1);
    await expect(deliverySection(page)).toContainText('가택배');
    await expect(deliverySection(page)).not.toContainText('다과학');

    await page.locator('.ship-date-pill:has-text("11/7")').click();
    await expect(pickupSection(page).locator('tbody tr')).toHaveCount(1);
    await expect(pickupSection(page)).toContainText('나픽업');
  });

  test('override applies to one batch only and keeps base delivery type', async ({ page }) => {
    await addBatch(page, { name: '1차', subjects: ['영어'], deliveryDate: '2099-11-03', pickupDate: '2099-11-07' });
    await addBatch(page, { name: '2차', subjects: ['국어'], deliveryDate: '2099-11-10', pickupDate: '2099-11-10' });

    await page.locator('.ship-date-pill:has-text("11/3")').click();
    await deliverySection(page).locator('tr:has-text("가택배") button:has-text("이번 회차만 변경")').click();
    await expect(page.locator('#overrideBatchList input:checked')).toHaveCount(1);
    await expect(page.locator('input[name="overrideType"][value="픽업"]')).toBeChecked();
    await page.locator('#overrideMemoInput').fill('어머님 전화');
    await page.locator('#overrideForm button[type=submit]').click();

    // 11/3 택배 명단에서 빠지고 변경자 목록에 표시
    await expect(deliverySection(page)).toContainText('해당 학생 없음');
    await expect(page.locator('#shipChanges')).toContainText('가택배');
    await expect(page.locator('#shipChanges')).toContainText('택배 → 픽업 · 1차만');
    await expect(page.locator('#shipTabBadge')).toHaveText('1');

    // 11/7 픽업 명단에 강조 표시
    await page.locator('.ship-date-pill:has-text("11/7")').click();
    await expect(pickupSection(page).locator('tr.ship-row-changed')).toContainText('가택배');

    // 다음 회차는 기본(택배)
    await page.locator('.ship-date-pill:has-text("11/10")').click();
    await expect(deliverySection(page)).toContainText('가택배');

    const base = await page.evaluate(() => JSON.parse(localStorage.getItem('studentsData:2026-2-final')).find(s => s.id === 'sid_a').deliveryType);
    expect(base).toBe('택배');
  });

  test('changing after packing or shipping leaves a warning', async ({ page }) => {
    await addBatch(page, { name: '1차', subjects: ['국어', '영어', '과학'], deliveryDate: '2099-11-03', pickupDate: '2099-11-07' });

    const rowA = deliverySection(page).locator('tr:has-text("가택배")');
    await rowA.locator('[data-field="packed"]').click();
    await rowA.locator('button:has-text("이번 회차만 변경")').click();
    await page.locator('#overrideForm button[type=submit]').click();
    await expect(page.locator('#shipChanges')).toContainText('포장 다시 확인');
    await page.locator('#shipChanges button:has-text("재확인 완료")').click();
    await expect(page.locator('#shipChanges')).not.toContainText('포장 다시 확인');

    const rowC = deliverySection(page).locator('tr:has-text("다과학")');
    await rowC.locator('[data-field="done"]').click();
    await rowC.locator('button:has-text("이번 회차만 변경")').click();
    await page.locator('#overrideForm button[type=submit]').click();
    await expect(page.locator('#shipChanges')).toContainText('이미 발송됨');
  });

  test('done checks count shipments and sync weekly checks', async ({ page }) => {
    await addBatch(page, { name: '1차', subjects: ['국어', '영어'], deliveryDate: '2099-11-03', pickupDate: '2099-11-03' });
    await addBatch(page, { name: '2차', subjects: ['과학'], deliveryDate: '2099-11-03' });

    await page.locator('.ship-date-pill:has-text("11/3")').click();
    // 같은 날 회차가 겹치는 학생은 한 줄로 합쳐짐
    await expect(deliverySection(page).locator('tbody tr')).toHaveCount(2);
    await deliverySection(page).locator('tr:has-text("가택배") [data-field="done"]').click();
    await deliverySection(page).locator('tr:has-text("다과학") [data-field="done"]').click();
    await pickupSection(page).locator('tr:has-text("나픽업") [data-field="done"]').click();

    await expect(page.locator('#shipSummary')).toContainText('택배 발송 1번 · 2건');
    await expect(page.locator('#shipSummary')).toContainText('픽업 1번 · 1건');

    const checks = await page.evaluate(() => JSON.parse(localStorage.getItem('studentChecklist:2026-2-final')));
    const week = Object.keys(checks)[0];
    expect(checks[week]['sid_a']).toEqual({ '국어': true, '영어': true });

    await page.reload();
    await page.locator('.tab-btn:has-text("택배/픽업")').click();
    await expect(page.locator('#shipSummary')).toContainText('택배 발송 1번 · 2건');
  });
});

test.describe('Courier Excel', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/firebasejs/**', route => route.abort());
    await page.route('**/postcode.v2.js', route => route.abort());
    const students = seedStudents();
    students[0].shipAddress = { name: '', phone: '', zip: '02839', addr: '서울특별시 성북구 선잠로5길 48', addr2: '101동 202호', memo: '문앞에 놓아주세요!' };
    await page.addInitScript(({ session, students }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('examSessionIndex', JSON.stringify([session]));
      localStorage.setItem('selectedExamSession', JSON.stringify(session));
      localStorage.setItem('adminModeEnabled', 'true');
      localStorage.setItem(`studentsData:${session.key}`, JSON.stringify(students));
    }, { session: SESSION, students });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('file://' + __dirname + '/../index.html');
    await expect(page.locator('#grade1Body tr')).toHaveCount(3);
    await page.locator('.tab-btn:has-text("택배/픽업")').click();
  });

  test('address entry and courier excel follow the delivery list', async ({ page }) => {
    await addBatch(page, { name: '1차', subjects: ['국어', '영어', '과학'], deliveryDate: '2099-11-03', pickupDate: '2099-11-07' });
    await expect(deliverySection(page).locator('tr:has-text("다과학") .ship-addr.missing')).toHaveText('⚠ 미입력');

    // 배송지 입력
    await deliverySection(page).locator('tr:has-text("다과학") .ship-addr').click();
    await page.locator('#shipZip').fill('06236');
    await page.locator('#shipAddr1').fill('서울특별시 강남구 테헤란로 152');
    await page.locator('#shipAddr2').fill('3층');
    await page.locator('#shipAddressForm button[type=submit]').click();
    await expect(deliverySection(page).locator('tr:has-text("다과학") .ship-addr')).not.toHaveClass(/missing/);

    await page.locator('button:has-text("택배 접수 엑셀")').click();
    await expect(page.locator('#courierExportInfo')).toContainText('2명');
    await page.locator('#courierBoxType').selectOption('B');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#courierExportForm button[type=submit]').click()
    ]);
    expect(download.suggestedFilename()).toBe('택배접수_2099-11-03_2명.xlsx');
    await download.saveAs(__dirname + '/../test-results/courier.xlsx');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('studentsData:2026-2-final')).find(s => s.id === 'sid_c').shipAddress);
    expect(saved.zip).toBe('06236');
  });
});

test.describe('Per-batch address', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/firebasejs/**', route => route.abort());
    const students = seedStudents();
    students[0].shipAddress = { name: '', phone: '', zip: '02839', addr: '서울특별시 성북구 선잠로5길 48', addr2: '101동 202호', memo: '' };
    await page.addInitScript(({ session, students }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('examSessionIndex', JSON.stringify([session]));
      localStorage.setItem('selectedExamSession', JSON.stringify(session));
      localStorage.setItem('adminModeEnabled', 'true');
      localStorage.setItem(`studentsData:${session.key}`, JSON.stringify(students));
    }, { session: SESSION, students });
    page.on('dialog', dialog => dialog.accept());
    await page.goto('file://' + __dirname + '/../index.html');
    await expect(page.locator('#grade1Body tr')).toHaveCount(3);
    await page.locator('.tab-btn:has-text("택배/픽업")').click();
  });

  test('this-week-only address keeps the base address and flags re-export', async ({ page }) => {
    await addBatch(page, { name: '1차', subjects: ['영어'], deliveryDate: '2099-11-03' });
    await addBatch(page, { name: '2차', subjects: ['국어'], deliveryDate: '2099-11-10' });
    await page.locator('.ship-date-pill:has-text("11/3")').click();

    // 먼저 접수 엑셀을 받아 둔다
    await page.locator('button:has-text("택배 접수 엑셀")').click();
    await Promise.all([page.waitForEvent('download'), page.locator('#courierExportForm button[type=submit]').click()]);

    // 이번 회차만 다른 주소
    await deliverySection(page).locator('tr:has-text("가택배") .ship-addr').click();
    await page.locator('#shipAddr1').fill('경기도 성남시 분당구 판교역로 1');
    await page.locator('#shipAddr2').fill('할머니댁');
    await page.locator('#shipAddressForm button[type=submit]').click();
    // 범위를 고르지 않으면 저장되지 않음
    await expect(page.locator('#shipAddressModal')).toBeVisible();
    await page.locator('input[name="shipAddrScope"][value="batch"]').check();
    await page.locator('#shipAddressForm button[type=submit]').click();

    await expect(deliverySection(page).locator('tr:has-text("가택배") .ship-addr')).toContainText('[이번 회차]');
    await expect(page.locator('#shipChanges')).toContainText('배송지 변경 · 1차만');
    await expect(page.locator('#shipChanges')).toContainText('택배 접수 다시');

    // 다음 회차는 기본 주소
    await page.locator('.ship-date-pill:has-text("11/10")').click();
    await expect(deliverySection(page).locator('tr:has-text("가택배") .ship-addr')).toContainText('선잠로');
    const base = await page.evaluate(() => JSON.parse(localStorage.getItem('studentsData:2026-2-final')).find(s => s.id === 'sid_a').shipAddress);
    expect(base.addr2).toBe('101동 202호');

    // 다시 받으면 경고가 사라지고 이번 회차 주소로 나감
    await page.locator('.ship-date-pill:has-text("11/3")').click();
    await page.locator('button:has-text("택배 접수 엑셀")').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#courierExportForm button[type=submit]').click()]);
    await dl.saveAs(__dirname + '/../test-results/courier_batch.xlsx');
    await expect(page.locator('#shipChanges')).not.toContainText('택배 접수 다시');
  });
});
