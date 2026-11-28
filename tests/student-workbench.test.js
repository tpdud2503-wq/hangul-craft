const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadStudentGame(timers = { setTimeout, clearTimeout }) {
  const element = () => ({
    textContent: '', className: '', disabled: false, children: [], events: {},
    classList: { add() {}, remove() {}, toggle() {} },
    set innerHTML(value) { this.html = value; this.children = []; },
    get innerHTML() { return this.html || ''; },
    appendChild(child) { this.children.push(child); },
    addEventListener(type, callback) { this.events[type] = callback; },
    setAttribute() {}
  });
  const hint = element();
  const document = { getElementById: () => hint, createElement: element };
  const window = {
    addEventListener() {},
    soundEngine: { playPyeongyeong() {}, playWordComplete() {}, playGayageum() {}, playMoktak() {}, playBuk() {} }
  };
  const context = vm.createContext({ window, document, console, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'hangul-engine.js'), 'utf8'), context);
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'student.js'), 'utf8')}\nwindow.TestStudentGame = StudentGame;`, context);
  return { StudentGame: window.TestStudentGame, element, window };
}

test('consonant workbench clears when a syllable is correctly completed', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  Object.assign(game, {
    syllables: [{ char: '가', jong: '', completedCho: 'ㄱ', completedJung: 'ㅓ', completedJong: '', isDone: false }],
    activeSyllableIdx: 0, consonantSlots: ['ㄱ'], activeConsonantIdx: 0,
    slotChoEl: element(), slotJungEl: element(), slotJongEl: element(), activeCharPreviewEl: element(),
    btnStudentSubmit: null, renderConsonantWorkbench() {}, renderWordCards() {}, updateTeamStatus() {}, switchTab() {}
  });
  game.updateAssembly();
  assert.equal(game.consonantSlots.length, 1);
  game.syllables[0].completedJung = 'ㅏ';
  game.updateAssembly();
  assert.equal(game.syllables[0].isDone, true);
  assert.equal(game.consonantSlots.length, 0);
});

test('a finished syllable immediately selects the next one and returns to consonants', () => {
  const cleared = [];
  const timers = { setTimeout() { return 7; }, clearTimeout(id) { cleared.push(id); } };
  const { StudentGame, element } = loadStudentGame(timers);
  const game = Object.create(StudentGame.prototype);
  const switches = [];
  Object.assign(game, {
    syllables: [
      { char: '가', jong: '', completedCho: 'ㄱ', completedJung: 'ㅏ', completedJong: '', isDone: false },
      { char: '나', jong: '', completedCho: '', completedJung: '', completedJong: '', isDone: false }
    ],
    activeSyllableIdx: 0, consonantSlots: ['ㄱ'], activeConsonantIdx: 0,
    slotChoEl: element(), slotJungEl: element(), slotJongEl: element(), activeCharPreviewEl: element(),
    btnStudentSubmit: null, renderConsonantWorkbench() {}, renderWordCards() {}, updateTeamStatus() {}, updateHints() {},
    switchTab(tab) { switches.push(tab); }
  });
  game.scheduleTabSwitch('vowel');
  game.updateAssembly();
  assert.equal(game.syllables[0].isDone, true);
  assert.equal(game.activeSyllableIdx, 1);
  assert.deepEqual(switches, ['consonant']);
  assert.deepEqual(cleared, [7]);
});

function vowelGame(StudentGame, element) {
  const game = Object.create(StudentGame.prototype);
  Object.assign(game, {
    vowelSlots: [], vSlotsContainerEl: element(), vPrincipleInfoEl: element(),
    btnChochul: element(), btnJaechul: element(), btnHapseong: element(), btnSendJung: element(),
    showToast(message) { this.notice = message; }
  });
  return game;
}

test('two constructed vowels can be combined without a reserve step', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = vowelGame(StudentGame, element);
  game.addVowel('ㆍ');
  game.addVowel('ㅡ');
  assert.equal(game.btnChochul.disabled, false);
  game.applyChochulChoice('ㅗ');
  game.addVowel('ㆍ');
  game.addVowel('ㅣ');
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅗ', 'ㆍ', 'ㅣ']);
  assert.equal(game.btnChochul.disabled, false);
  game.applyChochulChoice('ㅏ');
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅗ', 'ㅏ']);
  assert.equal(game.btnHapseong.disabled, false);
  game.actionHapseong();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅘ']);
  assert.equal(game.btnSendJung.disabled, false);
});

test('nested compound and secondary vowels preserve the earlier vowel', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = vowelGame(StudentGame, element);
  game.vowelSlots = ['ㅗ', 'ㅏ', 'ㅣ'];
  game.actionHapseong();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅗ', 'ㅐ']);
  game.actionHapseong();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅙ']);
  game.vowelSlots = ['ㅜ', 'ㅏ', 'ㆍ'];
  game.actionJaechul();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅜ', 'ㅑ']);
});

test('all modern vowels remain constructible without a reserve', () => {
  const { StudentGame, element, window } = loadStudentGame();
  const engine = window.HangulEngine;
  function build(game, target) {
    if (target === 'ㅡ' || target === 'ㅣ') {
      game.addVowel(target);
      return;
    }
    const first = engine.CHOCHUL_RULES.find(rule => rule.result === target);
    if (first) {
      first.ingredients.forEach(char => game.addVowel(char));
      assert.equal(game.btnChochul.disabled, false, target);
      game.applyChochulChoice(target);
      return;
    }
    const second = engine.JAECHUL_RULES.find(rule => rule.result === target);
    if (second) {
      build(game, second.base);
      assert.equal(game.btnJaechul.disabled, false, target);
      game.actionJaechul();
      return;
    }
    const combination = Object.entries(engine.VOWEL_COMBINATIONS).find(([, result]) => result === target);
    assert.ok(combination, target);
    const [left, right] = combination[0].split('+');
    build(game, left);
    build(game, right);
    assert.equal(game.btnHapseong.disabled, false, target);
    game.actionHapseong();
  }

  for (const target of engine.JUNGSUNG) {
    const game = vowelGame(StudentGame, element);
    build(game, target);
    assert.deepEqual(Array.from(game.vowelSlots), [target], target);
    assert.equal(game.btnSendJung.disabled, false, target);
    assert.equal(game.notice, undefined, target);
  }
});

test('a full vowel bench keeps all existing letters and allows removing one', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = vowelGame(StudentGame, element);
  game.vowelSlots = ['ㅗ', 'ㆍ', 'ㅣ'];
  game.renderVowelWorkbench();
  game.addVowel('ㅡ');
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅗ', 'ㆍ', 'ㅣ']);
  assert.match(game.notice, /지운 뒤/);
  game.vSlotsContainerEl.children[1].events.click();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㅗ', 'ㅣ']);
});

test('sending a valid vowel clears its bench even before the syllable is complete', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = vowelGame(StudentGame, element);
  const syllable = { char: '과', jong: '', completedJung: '' };
  Object.assign(game, { syllables: [syllable], activeSyllableIdx: 0, updateAssembly() {} });
  game.vowelSlots = ['ㅘ'];
  game.sendVowel();
  assert.equal(syllable.completedJung, 'ㅘ');
  assert.equal(game.vowelSlots.length, 0);
  game.vowelSlots = ['ㆍ'];
  game.sendVowel();
  assert.deepEqual(Array.from(game.vowelSlots), ['ㆍ']);
});

test('final ㅇ must be made as old ieung while initial ㅇ remains available', () => {
  const { StudentGame } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  const syllable = { char: '앙', jong: 'ㅇ', completedCho: '', completedJung: 'ㅏ', completedJong: '' };
  let notice = '';
  Object.assign(game, {
    syllables: [syllable], activeSyllableIdx: 0, consonantSlots: ['ㅇ'], activeConsonantIdx: 0,
    renderConsonantWorkbench() {}, updateAssembly() {}, showToast(message) { notice = message; }
  });
  game.sendConsonant('cho');
  assert.equal(syllable.completedCho, 'ㅇ');
  assert.equal(game.consonantSlots.length, 0);
  game.consonantSlots = ['ㅇ'];
  game.sendConsonant('jong');
  assert.equal(syllable.completedJong, '');
  assert.match(notice, /이체.*ㆁ/);
  assert.deepEqual(Array.from(game.consonantSlots), ['ㅇ']);
  game.actionIche();
  game.sendConsonant('jong');
  assert.equal(syllable.completedJong, 'ㆁ');
  assert.equal(game.consonantSlots.length, 0);
});

test('self-study preserves unfinished work when changing problems is cancelled', () => {
  const { StudentGame, window } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  const loaded = [];
  Object.assign(game, {
    currentStageIdx: 0,
    selfStudyLesson: { missions: [{ word: '가방' }, { word: '하늘' }] },
    selfStudySelect: { value: '1' },
    consonantSlots: [], vowelSlots: [],
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

test('self-study also protects unfinished letters on the workbench', () => {
  const { StudentGame, window } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  let loads = 0;
  Object.assign(game, {
    currentStageIdx: 0, selfStudyLesson: { missions: [{}, {}] }, selfStudySelect: { value: '1' },
    syllables: [{ completedCho: '', completedJung: '', completedJong: '', isDone: false }],
    consonantSlots: [], vowelSlots: ['ㅗ'], loadStage() { loads++; }
  });
  window.confirm = () => false;
  game.selectSelfStudyStage(1);
  assert.equal(loads, 0);
  assert.equal(game.selfStudySelect.value, 0);
});

test('self-study completion does not submit to a classroom', async () => {
  const { StudentGame } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  let celebrated = 0;
  Object.assign(game, {
    isSelfStudy: true, reviewConfig: { status: 'none' }, selfStudyLesson: { missions: [{ id: 'a' }] },
    completedReviewIds: new Set(['a']), checkAllCompleted: () => true, updateTeamStatus() {},
    celebrateWordComplete() { celebrated++; }
  });
  await game.handleStudentSubmit();
  assert.equal(celebrated, 1);
  assert.equal(game.isSubmitted, true);
});

test('individual review advances to an unfinished problem and records only after all are done', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  const missions = [{ id: 'a', word: '사과' }, { id: 'b', word: '연필' }, { id: 'c', word: '우리말' }];
  let submissions = 0;
  Object.assign(game, {
    selfStudyLesson: { missions }, completedReviewIds: new Set(), currentStageIdx: 2, currentMissionId: 'c',
    selfStudyProgress: element(), selfStudyReset: element(), reviewConfig: { status: 'ready' },
    reviewStudentId: { value: '01234', focus() {} }, showToast() {},
    loadStage(index) { this.currentStageIdx = index; this.currentMissionId = missions[index].id; },
    handleStudentSubmit() { submissions++; }
  });
  game.completeSelfStudyWord();
  assert.equal(game.currentStageIdx, 0);
  assert.equal(game.selfStudyProgress.textContent, '완료 1 / 3문제');
  assert.equal(submissions, 0);
  game.completeSelfStudyWord();
  assert.equal(game.currentStageIdx, 1);
  assert.equal(submissions, 0);
  game.completeSelfStudyWord();
  assert.equal(game.selfStudyProgress.textContent, '완료 3 / 3문제');
  assert.equal(submissions, 1);
});

test('changing a student number after progress requires a fresh review', () => {
  const { StudentGame, element, window } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  let loaded = -1;
  Object.assign(game, {
    selfStudyLesson: { missions: [{ id: 'a' }, { id: 'b' }] }, completedReviewIds: new Set(['a']),
    reviewOwnerId: '01234', reviewStudentId: { value: '56789' }, reviewStatus: element(),
    selfStudyProgress: element(), selfStudyReset: element(), reviewConfig: { status: 'ready' },
    syllables: [], consonantSlots: [], vowelSlots: [], isSubmitted: false,
    loadStage(index) { loaded = index; }
  });
  window.confirm = () => false;
  game.onReviewStudentIdInput();
  assert.equal(game.reviewStudentId.value, '01234');
  assert.equal(game.completedReviewIds.size, 1);
  window.confirm = () => true;
  game.reviewStudentId.value = '56789';
  game.onReviewStudentIdInput();
  assert.equal(game.completedReviewIds.size, 0);
  assert.equal(game.reviewOwnerId, '56789');
  assert.equal(loaded, 0);
});

test('entering a valid student number after finishing triggers the final record', () => {
  const { StudentGame, element } = loadStudentGame();
  const game = Object.create(StudentGame.prototype);
  let submissions = 0;
  Object.assign(game, {
    selfStudyLesson: { missions: [{ id: 'a' }] }, completedReviewIds: new Set(['a']), reviewOwnerId: null,
    reviewStudentId: { value: '01234' }, reviewStatus: element(), reviewConfig: { status: 'ready' },
    syllables: [], consonantSlots: [], vowelSlots: [], isSubmitting: false, isSubmitted: false,
    checkAllCompleted: () => true, handleStudentSubmit() { submissions++; }
  });
  game.onReviewStudentIdInput();
  assert.equal(game.reviewOwnerId, '01234');
  assert.equal(submissions, 1);
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
    selfStudyLesson: { missions: [{ id: 'a', word: '사과' }, { id: 'b', word: '우리말' }] },
    completedReviewIds: new Set(['a']),
    reviewStudentId: { value: '홍길동', focus() {} }, reviewStatus: { textContent: '' },
    currentWord: '사과', pendingReview: null, isSubmitted: false, isSubmitting: false,
    checkAllCompleted: () => true, updateTeamStatus() {}, showToast() {}, celebrateWordComplete() { celebrated++; }
  });
  await game.handleStudentSubmit();
  assert.equal(calls.length, 0);
  game.completedReviewIds.add('b');
  await game.handleStudentSubmit();
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
  assert.equal(calls[0].word, '우리말');
  assert.equal(calls[0].requestId, calls[1].requestId);
  assert.deepEqual(Object.keys(calls[0]).sort(), ['requestId', 'scriptId', 'studentId', 'word']);
});
