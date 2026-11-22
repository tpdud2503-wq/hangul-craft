const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadQrPage(href, hasCanvas = true) {
  const listeners = {};
  const elements = Object.fromEntries(['solo-address', 'solo-qr', 'solo-share-status', 'solo-download', 'solo-open', 'solo-copy'].map(id => [id, {
    addEventListener(type, callback) { listeners[`${id}:${type}`] = callback; },
    select() { this.selected = true; }
  }]));
  const source = { width: 200, height: 200 };
  elements['solo-qr'].querySelector = () => hasCanvas ? source : null;
  let rendered;
  let copied;
  let saved;
  let image;
  const document = {
    getElementById(id) { return elements[id]; },
    createElement(tag) {
      if (tag === 'canvas') {
        image = {
          getContext() { return { fillRect() {}, drawImage() {} }; },
          toDataURL() { return 'data:image/png;base64,TEST'; }
        };
        return image;
      }
      return { click() { saved = { href: this.href, download: this.download }; } };
    }
  };
  const window = {
    location: new URL(href),
    navigator: { clipboard: { async writeText(text) { copied = text; } } },
    QrHelper: { renderQr(_element, url) { rendered = url; } }
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'practice-qr.js'), 'utf8');
  vm.runInNewContext(code, { window, document, URL });
  return { elements, listeners, rendered: () => rendered, copied: () => copied, saved: () => saved, image: () => image };
}

test('the reusable QR contains the self-study link without a room or release version', async () => {
  const page = loadQrPage('https://example.org/class/index.html?v=old#solo');
  const expected = 'https://example.org/class/student.html?mode=solo';
  assert.equal(page.rendered(), expected);
  assert.equal(page.elements['solo-address'].value, expected);
  assert.equal(page.elements['solo-open'].href, expected);
  await page.listeners['solo-copy:click']();
  assert.equal(page.copied(), expected);
  page.listeners['solo-download:click']();
  assert.equal(page.saved().download, 'hangul-self-study-qr.png');
  assert.equal(page.image().width, 780);
  assert.equal(page.image().height, 780);
});

test('local-only addresses show a warning and missing QR canvas disables download', () => {
  const page = loadQrPage('http://localhost:3000/', false);
  assert.match(page.elements['solo-share-status'].textContent, /배포된 사이트/);
  assert.equal(page.elements['solo-download'].disabled, true);
});
