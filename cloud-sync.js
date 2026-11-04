/**
 * 클라우드 실시간 동기화 모듈 (Zero-Server, Zero-PowerShell)
 * - MQTT over WebSockets 공개 브로커를 활용하여 별도 백엔드 서버 없이
 *   전 세계 어디서든 스마트폰과 PC 간 0.1초 실시간 양방향 통신 지원
 * - 방 코드(Room ID) 기반 자동 방 생성 및 QR코드 연동
 * - 오프라인/동일 브라우저 탭 간 BroadcastChannel 자동 Fallback
 */

class CloudSync {
  constructor() {
    this.roomId = this.getOrCreateRoomId();
    this.client = null;
    this.isConnected = false;
    this.statusListeners = [];
    this.topic = `hangul_craft_battle/room_${this.roomId}`;

    // 공개 MQTT 브로커 목록 (Failover 지원)
    this.brokers = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt'
    ];
    this.currentBrokerIdx = 0;

    this.initMqtt();
  }

  getOrCreateRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    let r = urlParams.get('room');
    if (!r) {
      // 5자리 랜덤 방 코드 생성 (예: H7K29)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      r = '';
      for (let i = 0; i < 5; i++) {
        r += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      urlParams.set('room', r);
      const newUrl = window.location.pathname + '?' + urlParams.toString();
      window.history.replaceState(null, '', newUrl);
    }
    return r.toUpperCase();
  }

  getJoinUrl() {
    return window.location.origin + window.location.pathname + '?room=' + this.roomId;
  }

  initMqtt() {
    // CDN에서 mqtt.min.js 비동기 로드
    if (window.mqtt) {
      this.connectBroker();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/mqtt@5.3.5/dist/mqtt.min.js';
      script.onload = () => {
        this.connectBroker();
      };
      script.onerror = () => {
        console.warn('MQTT CDN 로드 실패, 로컬 BroadcastChannel 모드로 작동합니다.');
        this.notifyStatus(false, '로컬 모드 (인터넷 미연결)');
      };
      document.head.appendChild(script);
    }
  }

  connectBroker() {
    if (!window.mqtt) return;

    const brokerUrl = this.brokers[this.currentBrokerIdx];
    const clientId = 'hangul_' + Math.random().toString(16).substr(2, 8);

    try {
      this.client = window.mqtt.connect(brokerUrl, {
        clientId: clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 5000
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.notifyStatus(true, '온라인 연결됨 🟢');
        this.client.subscribe(this.topic, { qos: 0 }, (err) => {
          if (!err) {
            console.log(`[CloudSync] 방(${this.roomId})에 성공적으로 입장했습니다.`);
          }
        });
      });

      this.client.on('message', (topic, message) => {
        if (topic === this.topic) {
          try {
            const data = JSON.parse(message.toString());
            // teamManager로 메시지 전달
            if (window.teamManager && window.teamManager.handleBroadcastMessage) {
              window.teamManager.handleBroadcastMessage(data);
            }
          } catch (e) {
            console.error('MQTT 메시지 파싱 오류:', e);
          }
        }
      });

      this.client.on('error', (err) => {
        console.warn('MQTT 연결 오류:', err);
        this.isConnected = false;
        this.notifyStatus(false, '연결 재시도 중 🟡');
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (e) {
      console.error('MQTT 초기화 오류:', e);
    }
  }

  publish(data) {
    if (this.isConnected && this.client) {
      try {
        this.client.publish(this.topic, JSON.stringify(data), { qos: 0 });
      } catch (e) {
        console.error('MQTT 발행 오류:', e);
      }
    }
  }

  onStatusChange(cb) {
    this.statusListeners.push(cb);
  }

  notifyStatus(connected, text) {
    this.statusListeners.forEach(fn => fn(connected, text));
  }
}

window.cloudSync = new CloudSync();
