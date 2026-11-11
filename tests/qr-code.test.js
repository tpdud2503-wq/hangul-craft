const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const window = {};
const document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {} }) })
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'qrcode.min.js'), 'utf8'), { window, document });

function matrix(text, level) {
  const target = { innerHTML: '', appendChild() {} };
  const qr = new window.QRCode(target, { text, width: 260, height: 260, correctLevel: window.QRCode.CorrectLevel[level] });
  const bits = qr._oQRCode.modules.map(row => row.map(value => value ? '1' : '0').join('')).join('\n');
  return { version: qr._oQRCode.typeNumber, hash: createHash('sha256').update(bits).digest('hex') };
}

// 이 행렬들은 별도의 QR 디코더로 URL이 복원되는지 확인했다.
test('all error correction levels generate valid QR matrices', () => {
  const url = 'https://example.org/student.html?room=ABCD23';
  const expected = {
    L: 'b25020c60e00a1898d51207383fc3f45375c0ea60d36eff8c3e9b685becce578',
    M: 'abd78ca938058d885a30268543423e34fcba30d58c139285bd37617649406976',
    Q: '8e4de9cb769f198e6e3e23030413007c18640be00578f20d4cc9ac3e4e8fbcf6',
    H: 'ff00084d8b8c1f8704e74a07aefd1f9ece913cea754c92c23769ad5e466bef90'
  };
  for (const level of Object.keys(expected)) assert.equal(matrix(url, level).hash, expected[level]);
});

test('long hosted addresses use a supported QR version', () => {
  const url = `https://example.github.io/${'long-path/'.repeat(14)}student.html?room=ABCD23`;
  assert.deepEqual(matrix(url, 'M'), {
    version: 10,
    hash: '3ab19a233ba6cdbb059b2c4117e28d7e66a80e8536cbf8103fa6002051c00a8a'
  });
  assert.throws(() => matrix('x'.repeat(300), 'M'), /QR 주소가 너무 깁니다/);
});
