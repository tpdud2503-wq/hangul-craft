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
    soundEngine: { playPyeongyeong() {}, playWordComplete() {} }
  };
  const context = vm.createContext({ window, document, console, setTimeout, clearTimeout });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'hangul-engine.js'), 'utf8'), context);
  vm.runInContext(`${fs.readFileSync(path.join(__dirname, '..', 'student.js'), 'utf8')}\nwindow.TestStudentGame = StudentGame;`, context);
  return { StudentGame: window.TestStudentGame, element };
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
