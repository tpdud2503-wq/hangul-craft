/** 학번과 복습 완료 정보만 Google Apps Script 웹 앱으로 전송한다. */
const ReviewRecorder = (() => {
  const scriptIdPattern = /^[A-Za-z0-9_-]{20,200}$/;
  const requestIdPattern = /^[0-9a-f]{32}$/;

  function scriptIdFromUrl(value) {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash) return null;
      const match = url.pathname.match(/^\/macros\/s\/([A-Za-z0-9_-]{20,200})\/exec\/?$/);
      return match ? match[1] : null;
    } catch (_) {
      return null;
    }
  }

  function config(search) {
    const params = new URLSearchParams(search);
    const ids = params.getAll('sheet');
    if (ids.length === 0) return { status: 'none', scriptId: null };
    if (ids.length !== 1 || !scriptIdPattern.test(ids[0])) return { status: 'invalid', scriptId: null };
    return { status: 'ready', scriptId: ids[0] };
  }

  function newRequestId() {
    if (!window.crypto || !window.crypto.getRandomValues) throw new Error('이 브라우저에서는 안전하게 전송할 수 없습니다.');
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function fromFrame(source, frameWindow) {
    try {
      let current = source;
      for (let depth = 0; current && depth < 8; depth++) {
        if (current === frameWindow) return true;
        if (current === window || current.parent === current) return false;
        current = current.parent;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function send({ scriptId, studentId, word, requestId }) {
    const validWords = window.RoomState.createReviewLessonState().missions.map(mission => mission.word);
    if (typeof scriptId !== 'string' || !scriptIdPattern.test(scriptId) ||
        typeof studentId !== 'string' || !/^[0-9]{5}$/.test(studentId) ||
        !validWords.includes(word) || typeof requestId !== 'string' || !requestIdPattern.test(requestId)) {
      return Promise.reject(new Error('학번이나 복습 기록이 올바르지 않습니다.'));
    }

    return new Promise((resolve, reject) => {
      const frame = document.createElement('iframe');
      frame.name = `review-${requestId}`;
      frame.hidden = true;
      frame.setAttribute('title', '복습 기록 전송');
      const form = document.createElement('form');
      form.hidden = true;
      form.method = 'POST';
      form.target = frame.name;
      form.action = `https://script.google.com/macros/s/${scriptId}/exec`;
      Object.entries({ studentId, word, requestId, origin: window.location.origin }).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      let timeout;
      const cleanup = () => {
        window.clearTimeout(timeout);
        window.removeEventListener('message', onMessage);
        form.remove();
        frame.remove();
      };
      const onMessage = event => {
        if (!/^https:\/\/(?:script\.google\.com|[a-z0-9-]+-script\.googleusercontent\.com)$/i.test(event.origin) ||
            !fromFrame(event.source, frame.contentWindow) || !event.data || event.data.type !== 'hangul-review-result' ||
            event.data.requestId !== requestId || typeof event.data.ok !== 'boolean') return;
        cleanup();
        if (event.data.ok) resolve();
        else reject(new Error('시트에 기록하지 못했습니다. 연결 설정을 확인해 주세요.'));
      };
      window.addEventListener('message', onMessage);
      timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('저장 확인이 늦어지고 있습니다. 연결을 확인하고 다시 시도해 주세요.'));
      }, 45000);
      document.body.append(frame, form);
      try {
        form.submit();
      } catch (_) {
        cleanup();
        reject(new Error('기록을 전송하지 못했습니다. 다시 시도해 주세요.'));
      }
    });
  }

  return { config, scriptIdFromUrl, newRequestId, send };
})();

if (typeof window !== 'undefined') window.ReviewRecorder = ReviewRecorder;
if (typeof module !== 'undefined' && module.exports) module.exports = ReviewRecorder;
