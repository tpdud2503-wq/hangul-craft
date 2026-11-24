const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RoomState = require('../room-state.js');

function receiver(initialRows = []) {
  const rows = initialRows.map(row => [...row]);
  const properties = new Map();
  const cache = new Map();
  const formats = new Map();
  let hasLock = false;
  let sheetExists = false;
  let maxRows = 1000;
  const sheet = {
    getLastRow() { return rows.length; },
    getMaxRows() { return maxRows; },
    insertRowsAfter(_last, count) { maxRows += count; },
    getRange(row, col) {
      return {
        setNumberFormat(format) { formats.set(`${row}:${col}`, format); return this; },
        setValues(values) { rows[row - 1] = Array.from(values[0]); return this; },
        getValues() { return [rows[row - 1] || ['', '', '']]; }
      };
    }
  };
  const spreadsheet = {
    getId() { return 'PRIVATE_SHEET_ID'; },
    getSheetByName() { return sheetExists ? sheet : null; },
    insertSheet() { sheetExists = true; return sheet; }
  };
  const SpreadsheetApp = {
    getActiveSpreadsheet() { return spreadsheet; },
    openById(id) { assert.equal(id, 'PRIVATE_SHEET_ID'); return spreadsheet; },
    flush() {}
  };
  const PropertiesService = { getScriptProperties: () => ({
    setProperty(key, value) { properties.set(key, value); },
    getProperty(key) { return properties.get(key); }
  }) };
  const LockService = { getScriptLock: () => ({
    waitLock() { hasLock = true; }, hasLock() { return hasLock; }, releaseLock() { hasLock = false; }
  }) };
  const CacheService = { getScriptCache: () => ({
    get(key) { return cache.get(key); }, put(key, value) { cache.set(key, value); }
  }) };
  const HtmlService = {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createHtmlOutput(content) { return { content, setXFrameOptionsMode(mode) { this.mode = mode; return this; } }; }
  };
  const ContentService = { createTextOutput(content) { return { content }; } };
  const context = vm.createContext({ SpreadsheetApp, PropertiesService, LockService, CacheService, HtmlService, ContentService });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'review-sheet.gs'), 'utf8'), context);
  return { context, rows, properties, formats, setSheetExists(value) { sheetExists = value; } };
}

test('the sheet receiver matches the nine review words and stores only the three approved fields', () => {
  const testReceiver = receiver();
  const { context, rows, formats } = testReceiver;
  assert.deepEqual(Array.from(vm.runInContext('REVIEW_WORDS', context)), RoomState.createReviewLessonState().missions.map(item => item.word));
  context.initializeReviewSheet();
  assert.deepEqual(rows[0], ['학번', '완료 단어', '완료 시각']);
  assert.doesNotMatch(context.doGet().content, /PRIVATE_SHEET_ID|학번.*[0-9]{5}/);
  const event = { parameter: { studentId: '01234', word: '사과', requestId: 'a'.repeat(32), origin: 'https://tpdud2503-wq.github.io', name: '저장하면 안 됨' } };
  const response = context.doPost(event);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], '01234');
  assert.equal(rows[1][1], '사과');
  assert.equal(rows[1].length, 3);
  assert.equal(typeof rows[1][2].getTime, 'function');
  assert.equal(formats.get('2:1'), '@');
  assert.match(response.content, /"ok":true/);
  assert.doesNotMatch(response.content, /01234|PRIVATE_SHEET_ID|저장하면 안 됨/);
  context.doPost(event);
  assert.equal(rows.length, 2, 'retrying the same request should not append a second row');
});

test('the receiver rejects names, wrong lengths, other words and untrusted origins', () => {
  const { context, rows } = receiver();
  context.initializeReviewSheet();
  const valid = { studentId: '01234', word: '사과', requestId: 'a'.repeat(32), origin: 'https://tpdud2503-wq.github.io' };
  for (const change of [
    { studentId: '홍길동' }, { studentId: '1234' }, { studentId: '123456' },
    { studentId: 12345 }, { word: '가방' }, { origin: 'https://evil.test' }, { requestId: '<script>' }
  ]) {
    const response = context.doPost({ parameter: { ...valid, ...change } });
    assert.match(response.content, /"ok":false/);
  }
  assert.equal(rows.length, 1);
});

test('initialization refuses to overwrite a conflicting existing tab', () => {
  const harness = receiver([['기존 데이터', '건드리지 않기', '']]);
  harness.setSheetExists(true);
  assert.throws(() => harness.context.initializeReviewSheet(), /변경하지 않았습니다/);
  assert.deepEqual(harness.rows, [['기존 데이터', '건드리지 않기', '']]);
  assert.equal(harness.properties.size, 0);
});
