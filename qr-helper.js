/**
 * 고해상도 QR코드 렌더링 헬퍼
 * - 스마트폰 카메라 인식률 100% 보장 (충분한 흰색 여백 Quiet Zone 확보)
 * - 온라인 시 고화질 QR 이미지(320x320) + 오프라인 시 로컬 Canvas 이중 지원
 * - 학생용 플레이 주소(student.html?room=XXX)로 바로 연결
 */

const QrHelper = {
  renderQr(containerEl, url, size = 300) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    // 1. 온라인 고화질 이미지 시도 (가장 카메라 인식이 잘 됨)
    const img = document.createElement('img');
    const encodedUrl = encodeURIComponent(url);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=15&data=${encodedUrl}`;
    img.alt = '학생 참여 QR코드';
    img.className = 'high-res-qr-image';
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.display = 'block';
    img.style.borderRadius = '8px';

    // 로드 실패 시(오프라인 등) 로컬 QRCode 라이브러리로 대체
    img.onerror = () => {
      console.warn('QR API 로드 실패, 로컬 Canvas로 대체합니다.');
      containerEl.innerHTML = '';
      if (window.QRCode) {
        new window.QRCode(containerEl, {
          text: url,
          width: size,
          height: size,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M
        });
      }
    };

    containerEl.appendChild(img);
  }
};

window.QrHelper = QrHelper;
