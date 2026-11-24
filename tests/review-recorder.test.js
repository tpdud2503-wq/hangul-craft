const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RoomState = require('../room-state.js');

function recorder() {
  const listeners = new Map();
  const timers = [];
  const elements = [];
  const window = {
    RoomState,
    location: { origin: 'https://tpdud2503-wq.github.io' },
    crypto: { getRandomValues(bytes) { bytes.fill(1); return bytes; } },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout() {}
  };
  const document = {
    body: { append(...nodes) { elements.push(...nodes); } },
    createElement(tag) {
      const element = { tag, children: [], remove() { this.removed = true; }, setAttribute() {} };
      if (tag === 'iframe') element.contentWindow = { parent: window };
      if (tag === 'form') {
        element.appendChild = child => element.children.push(child);
        element.submit = () => { element.submitted = true; };
      }
      return element;
    }
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'review-recorder.js'), 'utf8');
  vm.runInNewContext(code, { window, document, URL, URLSearchParams, Uint8Array, Promise });
  return { api: window.ReviewRecorder, listeners, timers, elements };
}

test('only a deployed Google Apps Script URL can create a recording QR', () => {
  const { api } = recorder();
  const id = 'AKfycb1234567890_abcdef';
  assert.equal(api.scriptIdFromUrl(`https://script.google.com/macros/s/${id}/exec`), id);
  for (const url of [
    `http://script.google.com/macros/s/${id}/exec`,
    `https://script.google.com.evil.test/macros/s/${id}/exec`,
    `https://script.google.com/macros/s/${id}/dev`,
    `https://script.google.com/macros/s/${id}/exec?next=evil`,
    'https://docs.google.com/spreadsheets/d/secret/edit'
  ]) assert.equal(api.scriptIdFromUrl(url), null);
  assert.equal(api.config('').status, 'none');
  assert.equal(api.config(`?sheet=${id}`).status, 'ready');
  assert.equal(api.config(`?sheet=${id}&sheet=${id}`).status, 'invalid');
  assert.equal(api.config('?sheet=invalid').status, 'invalid');
  assert.equal(api.newRequestId(), '01'.repeat(16));
});

test('recording uses POST and accepts only a matching response from its own Google frame', async () => {
  const { api, listeners, elements } = recorder();
  const requestId = 'a'.repeat(32);
  const scriptId = 'AKfycb1234567890_abcdef';
  const pending = api.send({ scriptId, studentId: '01234', word: '사과', requestId });
  const [frame, form] = elements;
  assert.equal(form.method, 'POST');
  assert.equal(form.action, `https://script.google.com/macros/s/${scriptId}/exec`);
  assert.equal(form.target, frame.name);
  assert.deepEqual(Object.fromEntries(form.children.map(item => [item.name, item.value])), {
    studentId: '01234', word: '사과', requestId, origin: 'https://tpdud2503-wq.github.io'
  });
  assert.equal(form.submitted, true);
  const nested = { parent: { parent: frame.contentWindow } };
  const data = { type: 'hangul-review-result', requestId, ok: true };
  listeners.get('message')({ origin: 'https://evil.test', source: nested, data });
  listeners.get('message')({ origin: 'https://abc-script.googleusercontent.com', source: { parent: null }, data });
  listeners.get('message')({ origin: 'https://abc-script.googleusercontent.com', source: nested, data: { ...data, requestId: 'b'.repeat(32) } });
  assert.equal(frame.removed, undefined);
  listeners.get('message')({ origin: 'https://abc-script.googleusercontent.com', source: nested, data });
  await pending;
  assert.equal(frame.removed, true);
  assert.equal(form.removed, true);
  assert.equal(listeners.has('message'), false);
});

test('invalid names and unconfirmed saves are not reported as recorded', async () => {
  const { api, timers, elements } = recorder();
  const valid = { scriptId: 'AKfycb1234567890_abcdef', word: '사과', requestId: 'a'.repeat(32) };
  await assert.rejects(api.send({ ...valid, studentId: '홍길동' }), /올바르지/);
  await assert.rejects(api.send({ ...valid, studentId: '1234' }), /올바르지/);
  assert.equal(elements.length, 0);
  const pending = api.send({ ...valid, studentId: '01234' });
  timers[0]();
  await assert.rejects(pending, /저장 확인/);
  assert.equal(elements[0].removed, true);
});
