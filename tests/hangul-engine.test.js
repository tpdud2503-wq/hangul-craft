const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const window = {};
const context = vm.createContext({ window });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'hangul-engine.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'lesson-explanation.js'), 'utf8'), context);

test('old ieung composes as the modern final ㅇ', () => {
  assert.equal(window.HangulEngine.ICHE_MAP['ㅇ'], 'ㆁ');
  assert.equal(window.HangulEngine.composeSyllable('ㄱ', 'ㅏ', 'ㆁ'), '강');
  assert.equal(window.HangulEngine.composeSyllable('ㅂ', 'ㅏ', 'ㆁ'), '방');
  assert.equal(window.HangulEngine.composeSyllable('ㅇ', 'ㅏ', 'ㆁ'), '앙');
  assert.equal(window.HangulEngine.composeSyllable('ㄱ', 'ㅏ', 'ㄴ'), '간');
  assert.match(window.HangulEngine.getFinalConsonantRecipe('ㅇ').steps.join(' '), /이체.*ㆁ/);
});

test('known and custom explanations show the old ieung final', () => {
  const known = window.LessonExplanations.generateExplanationForWord('태양');
  const custom = window.LessonExplanations.generateExplanationForWord('강');
  assert.equal(known.points[1].jong.char, 'ㆁ');
  assert.equal(custom.points[0].jong.char, 'ㆁ');
  assert.match(custom.points[0].jong.text, /이체.*ㆁ/);
});
