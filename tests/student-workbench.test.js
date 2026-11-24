const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadStudentGame() {
  const element = () => ({ textContent: '', innerHTML: '', className: '', disabled: false, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {} });
  const hint = element();
  const document = { getElementById: () => hint, createElement: element };
  const window = {
    addEventListener() {},
    soundEngine: { playPyeongyeong() {}, playWordComplete() {}, playGayageum() {}, playMoktak() {} }
  };
  const context = vm.createContext({ window, document, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'hangul-engine.js'), 'utf8'), context);
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'student.js'), 'utf8')}\nwindow.TestStudentGame = StudentGame;`, context);
  return { StudentGame: window.TestStudentGame, element, window };
}

test('consonant workbench clears only after a syllable is correctly completed', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  Object.assign(game, {
    syllables: [{ char: '가', jong: '', completedCho: 'ㄱ', completedJung: 'ㅓ', completedJong: '', isDone: false }],
    activeSyllableIdx: 0, consonantSlots: ['ㄱ'], activeConsonantIdx: 0,
    slotChoEl: element(), slotJungEl: element(), slotJongEl: element(), activeCharPreviewEl: element(),
    btnStudentSubmit: null, renderConsonantWorkbench() {}, renderWordCards() {}, updateTeamStatus() {}
  });
  game.updateAssembly();
  assert.equal(game.consonantSlots.length, 1);
  game.syllables[0].completedJung = 'ㅏ';
  game.updateAssembly();
  assert.equal(game.syllables[0].isDone, true);
  assert.equal(game.consonantSlots.length, 0);
});

test('a reserved vowel can be combined with another constructed vowel', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  Object.assign(game, {
    vowelSlots: ['ㅗ'], vowelReserve: null, vReserveStatus: element(), vSlotsContainerEl: element(),
    btnSaveVowel: element(), btnRestoreVowel: element(), btnChochul: element(),
    btnJaechul: element(), btnHapseong: element(), btnSendJung: element()
  });
  game.renderVowelWorkbench();
  assert.equal(game.btnSaveVowel.disabled, false);
  game.saveVowel();
  assert.equal(game.vowelReserve, 'ㅗ');
  game.vowelSlots = ['ㅏ'];
  game.renderVowelWorkbench();
  game.restoreVowel();
  assert.equal(game.btnHapseong.disabled, false);
  game.actionHapseong();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅘ']);
  assert.equal(game.vowelReserve, null);
});

test('final ㅇ must be made as old ieung while initial ㅇ remains available', () => {
  const { StudentGame } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  const syllable = { char: '앙', jong: 'ㅇ', completedCho: '', completedJung: 'ㅏ', completedJong: '' };
  let notice = '';
  Object.assign(game, {
    syllables: [syllable], activeSyllableIdx: 0, consonantSlots: ['ㅇ'], activeConsonantIdx: 0,
    updateAssembly() {}, showToast(message) { notice = message; }
  });
  game.sendConsonant('cho');
  assert.equal(syllable.completedCho, 'ㅇ');
  game.sendConsonant('jong');
  assert.equal(syllable.completedJong, '');
  assert.match(notice, /이체.*ㆁ/);
  game.consonantSlots = ['ㆁ'];
  game.sendConsonant('jong');
  assert.equal(syllable.completedJong, 'ㆁ');
});

test('self-study preserves unfinished work when changing problems is cancelled', () => {
  const { StudentGame, window } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  const loaded = [];
  Object.assign(game, {
    currentStageIdx: 0,
    selfStudyLesson: { missions: [{ word: '가방' }, { word: '하늘' }] },
    selfStudySelect: { value: '1' },
    syllables: [{ completedCho: 'ㄱ', completedJung: '', completedJong: '', isDone: false }],
    loadStage(index) { loaded.push(index); }
  });
  window.confirm = () => false;
  game.selectSelfStudyStage(1);
  assert.equal(game.selfStudySelect.value, 0);
  assert.deepEqual(loaded, []);
  window.confirm = () => true;
  game.selectSelfStudyStage(1);
  assert.deepEqual(loaded, [1]);
  game.selectSelfStudyStage(99);
  assert.deepEqual(loaded, [1]);
});

test('self-study completion does not submit to a classroom', async () => {
  const { StudentGame } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  let celebrated = 0;
  Object.assign(game, { isSelfStudy: true, reviewConfig: { status: 'none' }, checkAllCompleted: () => true, celebrateWordComplete() { celebrated++; } });
  await game.handleStudentSubmit();
  assert.equal(celebrated, 1);
});

test('connected review accepts only five digits and retries the same unsaved record', async () => {
  const { StudentGame, window } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  const calls = [];
  let celebrated = 0;
  window.ReviewRecorder = {
    newRequestId() { return 'a'.repeat(32); },
    async send(payload) { calls.push({ ...payload }); if (calls.length === 1) throw new Error('확인 실패'); }
  };
  Object.assign(game, {
    isSelfStudy: true, reviewConfig: { status: 'ready', scriptId: 'AKfycb1234567890_abcdef' },
    reviewStudentId: { value: '홍길동', focus() {} }, reviewStatus: { textContent: '' },
    currentWord: '사과', pendingReview: null, isSubmitted: false, isSubmitting: false,
    checkAllCompleted: () => true, updateTeamStatus() {}, celebrateWordComplete() { celebrated++; }
  });
  await game.handleStudentSubmit();
  assert.equal(calls.length, 0);
  assert.match(game.reviewStatus.textContent, /숫자 5자리/);
  game.reviewStudentId.value = '01234';
  await game.handleStudentSubmit();
  assert.equal(game.isSubmitted, false);
  assert.match(game.reviewStatus.textContent, /확인 실패/);
  await game.handleStudentSubmit();
  assert.equal(game.isSubmitted, true);
  assert.equal(celebrated, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].studentId, '01234');
  assert.equal(calls[0].word, '사과');
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.deepEqual(Object.keys(calls[0]).sort(), ['requestId', 'scriptId', 'studentId', 'word']);
});
