/** 방 코드나 배포 버전에 묶이지 않는 자율 연습 QR을 제공한다. */
(function () {
  const url = new URL('student.html?mode=solo', window.location.href).toString();
  const address = document.getElementById('solo-address');
  const qr = document.getElementById('solo-qr');
  const status = document.getElementById('solo-share-status');
  const download = document.getElementById('solo-download');
  address.value = url;
  document.getElementById('solo-open').href = url;
  window.QrHelper.renderQr(qr, url, 260);

  const hostname = window.location.hostname;
  if (window.location.protocol === 'file:' || hostname === '[::1]' ||
      /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(hostname)) {
    status.textContent = '다른 장소에서도 사용하려면 인터넷에 배포된 사이트에서 QR을 저장해 주세요.';
  }

  document.getElementById('solo-copy').addEventListener('click', async () => {
    try {
      if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
        await window.navigator.clipboard.writeText(url);
      } else {
        address.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
      }
      status.textContent = '자율 연습 주소를 복사했습니다.';
    } catch (_) {
      address.select();
      status.textContent = '주소를 선택했습니다. 직접 복사해 주세요.';
    }
  });

  const source = qr.querySelector('canvas');
  if (!source) {
    download.disabled = true;
    status.textContent += ' QR 이미지는 화면을 캡처해 주세요.';
  }
  download.addEventListener('click', () => {
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
    link.download = 'hangul-self-study-qr.png';
    link.href = image.toDataURL('image/png');
    link.click();
    status.textContent = 'QR 이미지를 저장했습니다.';
  });
})();
