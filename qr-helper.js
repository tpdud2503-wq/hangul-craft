/**
 * 학생 참여 주소를 흰 여백이 있는 QR코드로 표시한다.
 * 가능한 한 로컬에서 생성하고, 지원 길이를 초과한 경우에만 외부 서비스를 사용한다.
 */

const QrHelper = {
  renderQr(containerEl, url, size = 300) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (window.QRCode) {
      try {
        const frame = document.createElement('div');
        const padding = Math.ceil(size * 0.12);
        const codeSize = size - padding * 2;
        frame.style.width = `${size}px`;
        frame.style.maxWidth = '100%';
        frame.style.padding = `${padding}px`;
        frame.style.boxSizing = 'border-box';
        frame.style.background = '#fff';
        frame.setAttribute('role', 'img');
        frame.setAttribute('aria-label', '학생 참여 QR코드');
        new window.QRCode(frame, {
          text: url, width: codeSize, height: codeSize,
          colorDark: '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M
        });
        const canvas = frame.querySelector('canvas');
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        containerEl.appendChild(frame);
        return;
      } catch (error) {
        console.warn('로컬 QR 생성 실패, 외부 이미지로 대체합니다.', error);
      }
    }

    // 로컬 QR이 지원하지 않는 긴 주소는 외부 이미지로 표시한다.
    const img = document.createElement('img');
    const encodedUrl = encodeURIComponent(url);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=15&data=${encodedUrl}`;
    img.alt = '학생 참여 QR코드';
    img.className = 'high-res-qr-image';
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.display = 'block';
    img.style.borderRadius = '8px';

    img.onerror = () => {
      containerEl.textContent = 'QR을 만들 수 없습니다. 참여 주소를 복사해 주세요.';
    };

    containerEl.appendChild(img);
  }
};

window.QrHelper = QrHelper;
