/**
 * 훈민정음 전통 악기 음향 효과 엔진 (Web Audio API)
 * - 편경 (Stone Chime - 맑고 영롱한 옥소리)
 * - 장구/북 (Korean Drum - 묵직한 북소리)
 * - 징 (Gong - 웅장하고 깊은 울림)
 * - 가야금 (Gayageum - 현 튕기는 소리)
 * - 목탁 (Wooden Bell - 정갈한 둔탁음)
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // 1. 편경 / 맑은 옥구슬 소리 (기본자 선택, 가획 성공)
  playPyeongyeong(freq = 880) {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // 약간의 배음으로 옥의 맑은 울림 형성
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.76, t);

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0.3, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

    osc.connect(gain);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.9);
    osc2.stop(t + 0.6);
  }

  // 2. 가야금 톤 (버튼 클릭 / 자음,모음 슬롯 장착)
  playGayageum(freq = 440) {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    // 살짝 피치 밴드(농현 효과)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.4);

    // 필터로 부드러운 현악기 느낌
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // 3. 전통 북소리 (가획, 합성 등 창제 원리 액션 버튼)
  playBuk() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.25);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // 4. 징소리 (글자 완성 및 스테이지 클리어)
  playJing() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;

    // 복합 주파수로 웅장한 징소리 시뮬레이션
    const freqs = [180, 260, 390, 540];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, t);
      // 울렁거리는 비브라토
      osc.frequency.linearRampToValueAtTime(f * 0.97, t + 2.5);

      const initVol = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(initVol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 2.5);
    });
  }

  // 5. 목탁 소리 (취소/지우기/오류)
  playMoktak() {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // 6. 팡파르/축하 멜로디 (단어 완성)
  playWordComplete() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // 도, 미, 솔, 높은 도
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playPyeongyeong(n);
      }, idx * 130);
    });
    setTimeout(() => {
      this.playJing();
    }, 550);
  }
}

window.soundEngine = new SoundEngine();
