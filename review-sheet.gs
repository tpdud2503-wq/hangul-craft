/**
 * 새 Google 스프레드시트에 연결하는 복습 기록 수신기.
 * 웹 앱에서는 getActiveSpreadsheet를 쓸 수 없으므로 초기화 시 문서 ID만 저장한다.
 */
const REVIEW_SHEET_NAME = '복습 기록';
const REVIEW_SHEET_ID_KEY = 'REVIEW_SPREADSHEET_ID';
const REVIEW_WORDS = ['사과', '연필', '학교', '친구', '사랑', '고양이', '강아지', '공책', '우리말'];
const REVIEW_HEADERS = ['학번', '완료 단어', '완료 시각'];
// 응답을 보낼 사이트 주소이며, 제출자의 신원을 확인하는 수단은 아니다.
const REVIEW_APP_ORIGIN = 'https://tpdud2503-wq.github.io';

// 스프레드시트에서 확장 프로그램 > Apps Script를 연 뒤 편집기에서 한 번 실행한다.
function initializeReviewSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('기록할 스프레드시트에서 Apps Script를 열어 실행해 주세요.');
  let sheet = spreadsheet.getSheetByName(REVIEW_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(REVIEW_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 3).setValues([REVIEW_HEADERS]);
  } else {
    const existing = sheet.getRange(1, 1, 1, 3).getValues()[0];
    if (REVIEW_HEADERS.some((header, index) => existing[index] !== header)) {
      throw new Error('기존 복습 기록 탭의 첫 행이 예상과 달라 변경하지 않았습니다.');
    }
  }
  PropertiesService.getScriptProperties().setProperty(REVIEW_SHEET_ID_KEY, spreadsheet.getId());
}

function doGet() {
  return ContentService.createTextOutput('복습 기록 전송 전용입니다. 실제 저장은 학생 복습 화면에서 확인해 주세요.');
}

function doPost(event) {
  const params = event && event.parameter || {};
  const requestId = typeof params.requestId === 'string' && /^[0-9a-f]{32}$/.test(params.requestId) ? params.requestId : '';
  if (params.origin !== REVIEW_APP_ORIGIN || !requestId || typeof params.studentId !== 'string' || !/^[0-9]{5}$/.test(params.studentId) ||
      !REVIEW_WORDS.includes(params.word)) return reviewResponse_(requestId, false);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const cache = CacheService.getScriptCache();
    if (cache.get(requestId) === 'saved') return reviewResponse_(requestId, true);
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(REVIEW_SHEET_ID_KEY);
    if (!spreadsheetId) throw new Error('초기화되지 않은 스프레드시트');
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(REVIEW_SHEET_NAME);
    if (!sheet) throw new Error('복습 기록 탭이 없습니다.');
    const row = sheet.getLastRow() + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(row, 1).setNumberFormat('@');
    sheet.getRange(row, 3).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(row, 1, 1, 3).setValues([[params.studentId, params.word, new Date()]]);
    SpreadsheetApp.flush();
    cache.put(requestId, 'saved', 21600);
    return reviewResponse_(requestId, true);
  } catch (_) {
    return reviewResponse_(requestId, false);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// 확인 응답에는 학번이나 시트 주소를 포함하지 않는다.
function reviewResponse_(requestId, ok) {
  const message = JSON.stringify({ type: 'hangul-review-result', requestId, ok }).replace(/</g, '\\u003c');
  const target = JSON.stringify(REVIEW_APP_ORIGIN);
  return HtmlService.createHtmlOutput(`<!doctype html><html><body><script>window.top.postMessage(${message}, ${target});</script></body></html>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
