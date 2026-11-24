/** 교사가 자신의 Google Apps Script URL로 기록 전용 QR을 만든다. */
(function () {
  const scriptSource = document.getElementById('review-script-source');
  const scriptStatus = document.getElementById('review-script-status');
  const copyScript = document.getElementById('review-copy-script');
  const setupStatus = document.getElementById('review-setup-status');
  const result = document.getElementById('review-qr-result');
  const qr = document.getElementById('review-qr');
  const share = document.getElementById('review-share-url');
  const download = document.getElementById('review-download');

  async function copy(text, input, status) {
    try {
      if (window.navigator.clipboard && window.navigator.clipboard.writeText) await window.navigator.clipboard.writeText(text);
      else {
        input.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
      }
      status.textContent = '복사했습니다.';
    } catch (_) {
      input.select();
      status.textContent = '선택한 내용을 직접 복사해 주세요.';
    }
  }

  fetch('review-sheet.gs?v=20261124-1').then(response => {
    if (!response.ok) throw new Error('not found');
    return response.text();
  }).then(source => {
    scriptSource.value = source;
    copyScript.disabled = false;
  }).catch(() => {
    scriptSource.value = '';
    scriptStatus.textContent = '코드를 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  });
  copyScript.addEventListener('click', () => copy(scriptSource.value, scriptSource, scriptStatus));

  document.getElementById('review-create-qr').addEventListener('click', () => {
    const id = window.ReviewRecorder.scriptIdFromUrl(document.getElementById('review-webapp-url').value);
    if (!id) {
      result.classList.add('hidden');
      setupStatus.textContent = '구글 Apps Script에서 배포한 /exec 웹 앱 URL을 확인해 주세요.';
      return;
    }
    const url = new URL('student.html', window.location.href);
    url.searchParams.set('mode', 'solo');
    url.searchParams.set('sheet', id);
    share.value = url.toString();
    document.getElementById('review-open').href = share.value;
    window.QrHelper.renderQr(qr, share.value, 280);
    download.disabled = !qr.querySelector('canvas');
    result.classList.remove('hidden');
    setupStatus.textContent = window.location.origin === 'https://tpdud2503-wq.github.io'
      ? '연동 QR을 만들었습니다. 테스트 제출로 실제 저장 여부를 확인해 주세요.'
      : '제공된 스크립트는 공개 사이트용입니다. 다른 주소에서 쓰려면 코드의 REVIEW_APP_ORIGIN을 바꿔 배포하세요.';
    if (download.disabled) setupStatus.textContent += ' QR 이미지는 화면을 캡처해 주세요.';
  });

  document.getElementById('review-copy-url').addEventListener('click', () => copy(share.value, share, setupStatus));
  download.addEventListener('click', () => {
    const source = qr.querySelector('canvas');
    if (!source) return;
    const scale = 3;
    const padding = Math.ceil(source.width * 0.15);
    const image = document.createElement('canvas');
    image.width = (source.width + padding * 2) * scale;
    image.height = (source.height + padding * 2) * scale;
    const context = image.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, image.width, image.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(source, padding * scale, padding * scale, source.width * scale, source.height * scale);
    const link = document.createElement('a');
    link.download = 'hangul-review-sheet-qr.png';
    link.href = image.toDataURL('image/png');
    link.click();
    setupStatus.textContent = '연동 QR 이미지를 저장했습니다. 실제 저장 여부를 테스트해 주세요.';
  });
})();
