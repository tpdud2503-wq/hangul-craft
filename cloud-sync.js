/** Supabase 방 상태 저장 및 실시간 동기화. */

const SUPABASE_CONFIG = {
  url: 'https://lyrngmakrvcynuahxoba.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cm5nbWFrcnZjeW51YWh4b2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzU2NzUsImV4cCI6MjEwOTk1MTY3NX0.1rwLrDh4fkyTfW9aiDkxkiicw0NRrsdHqK-23aMYUaE'
};
// HTML의 정적 파일 버전과 함께 갱신해 오래된 화면·스크립트 혼용을 방지한다.
const APP_VERSION = '20261113-3';

class CloudSync {
  constructor() {
    this.generatedRoom = false;
    this.roomId = this.getOrCreateRoomId();
    this.generatedRoomClaimed = !this.generatedRoom;
    this.roomCollision = false;
    this.supabase = null;
    this.channel = null;
    this.role = null;
    this.realtimeReady = false;
    this.pollingMode = false;
    this.waitingForRoom = false;
    this.hasRoomState = false;
    this.roomAvailable = false;
    this.isConnected = false;
    this.statusText = 'Supabase 연결 중...';
    this.statusListeners = [];
    this.joinOrigin = null;
    this.joinUrlListeners = [];
    this.lastVersion = -1;
    this.writeQueue = Promise.resolve();
    this.refreshPromise = null;
    this.openPromise = null;
    this.clockServerAtAnchor = null;
    this.clockMonotonicAnchor = null;
    this.clockSyncedAt = null;
    this.clockSyncPromise = null;
    this.expiryTimer = null;
    this.expiryKey = null;
    this.expiryPending = false;
  }

  getOrCreateRoomId() {
    const params = new URLSearchParams(window.location.search);
    const input = (params.get('room') || '').trim().toUpperCase();
    if (/^[A-Z0-9]{5,8}$/.test(input)) return input;
    if (/student\.html$/i.test(window.location.pathname)) return null;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    const roomId = Array.from(bytes, value => chars[value % chars.length]).join('');
    this.generatedRoom = true;
    params.set('room', roomId);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
    return roomId;
  }

  getJoinUrl() {
    const url = new URL('student.html', window.location.href);
    if (this.joinOrigin) {
      const origin = new URL(this.joinOrigin);
      url.protocol = origin.protocol;
      url.host = origin.host;
    }
    url.search = '';
    url.hash = '';
    if (this.roomId) url.searchParams.set('room', this.roomId);
    url.searchParams.set('v', APP_VERSION);
    return url.toString();
  }

  onJoinUrlChange(callback) {
    this.joinUrlListeners.push(callback);
  }

  async resolveLocalJoinOrigin() {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
    try {
      const response = await fetch('/__classroom_config', { cache: 'no-store' });
      if (!response.ok) return;
      const config = await response.json();
      const origin = new URL(config.joinOrigin);
      if (origin.protocol !== window.location.protocol || origin.port !== window.location.port ||
          !/^\d{1,3}(\.\d{1,3}){3}$/.test(origin.hostname)) return;
      this.joinOrigin = origin.origin;
      this.joinUrlListeners.forEach(callback => callback());
    } catch (_) {
      // 정적 호스팅에는 교실 서버 설정 경로가 없을 수 있다.
    }
  }

  loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Supabase 라이브러리를 불러오지 못했습니다.'));
      document.head.appendChild(script);
    });
  }

  // 각 화면의 DOM과 전역 객체가 준비된 뒤 시작한다.
  async start(role) {
    this.role = role;
    if (role === 'teacher') this.resolveLocalJoinOrigin();
    if (!this.roomId) {
      this.notifyStatus(false, '교사의 방 코드를 입력해 주세요');
      return;
    }
    try {
      await this.loadSdk();
      this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      this.subscribe();
      // 방 생성은 WebSocket 구독과 독립적으로 진행한다.
      this.ensureRoom().catch(error => this.handleRoomError(error));
      this.syncClock().catch(error => this.handleClockError(error));
      window.addEventListener('online', () => {
        this.syncClock().catch(error => this.handleClockError(error));
        this.refreshIfConnected();
      });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncClock().catch(error => this.handleClockError(error));
          this.refreshIfConnected();
        }
      });
      // WebSocket이 차단되면 3초마다, 정상 연결 중에는 15초마다 상태를 확인한다.
      let ticks = 0;
      this.pollTimer = window.setInterval(() => {
        ticks++;
        if (this.clockServerAtAnchor == null || this.monotonicNow() - this.clockSyncedAt >= 60000) {
          this.syncClock().catch(error => this.handleClockError(error));
        }
        if (this.pollingMode || ticks % 5 === 0) this.refreshIfConnected();
      }, 3000);
    } catch (err) {
      console.error('Supabase 초기화 오류:', err);
      this.notifyStatus(false, '연결 실패: 인터넷을 확인해 주세요');
    }
  }

  subscribe() {
    this.channel = this.supabase.channel(`hangul_room_${this.roomId}`, {
      config: { broadcast: { self: false } }
    });
    this.channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rooms',
        filter: `room_id=eq.${this.roomId}`
      }, (payload) => {
        if (payload.new && payload.new.room_id === this.roomId) this.applyRoom(payload.new);
      })
      .on('broadcast', { event: 'room_updated' }, ({ payload }) => {
        const version = payload && Date.parse(payload.updatedAt);
        if (!this.hasRoomState || !Number.isFinite(version) || version > this.lastVersion) this.refreshIfConnected();
      })
      .subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          this.realtimeReady = true;
          this.pollingMode = false;
          try {
            await this.ensureRoom();
          } catch (error) {
            this.handleRoomError(error);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (err) console.warn('Supabase Realtime:', status, err);
          this.realtimeReady = false;
          this.pollingMode = true;
          if (this.roomAvailable) this.updateConnectionStatus();
          else this.notifyStatus(false, '실시간 연결이 차단되어 방을 확인 중입니다');
          this.refreshIfConnected();
        }
      });
  }

  handleRoomError(error) {
    console.error('방 연결 오류:', error);
    this.roomAvailable = false;
    this.notifyStatus(false, error.code === 'ROOM_COLLISION'
      ? '방 코드가 이미 사용 중입니다. 새 창에서 다시 시작해 주세요'
      : '방 연결 오류: 인터넷 상태를 확인해 주세요');
  }

  monotonicNow() {
    return window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
  }

  serverNow() {
    if (this.clockServerAtAnchor == null) return null;
    return Math.floor(this.clockServerAtAnchor + this.monotonicNow() - this.clockMonotonicAnchor);
  }

  syncClock() {
    if (this.clockSyncPromise) return this.clockSyncPromise;
    const started = this.monotonicNow();
    this.clockSyncPromise = (async () => {
      const { data, error } = await this.supabase.rpc('hangul_clock_ms');
      if (error) throw error;
      const received = this.monotonicNow();
      const serverTime = Number(data);
      if (!Number.isSafeInteger(serverTime) || serverTime <= 0) throw new Error('서버 시각이 올바르지 않습니다.');
      this.clockServerAtAnchor = serverTime + (received - started) / 2;
      this.clockMonotonicAnchor = received;
      this.clockSyncedAt = received;
      if (this.roomAvailable) this.updateConnectionStatus();
      this.scheduleRoundExpiry(true);
    })().finally(() => { this.clockSyncPromise = null; });
    return this.clockSyncPromise;
  }

  handleClockError(error) {
    console.warn('서버 시간 동기화 실패:', error);
    if (this.clockServerAtAnchor == null) this.notifyStatus(false, '서버 시간 연결 실패 (재시도 중)');
  }

  updateConnectionStatus() {
    if (this.clockServerAtAnchor == null) this.notifyStatus(false, '서버 시간 동기화 중');
    else if (this.realtimeReady) this.notifyStatus(true, 'Supabase 실시간 연결됨 🟢');
    else if (this.pollingMode) this.notifyStatus(true, '자동 동기화 중 (약 3초 간격)');
    else this.notifyStatus(false, '방을 확인했습니다. 실시간 연결 중입니다');
  }

  notifyRoomMissing() {
    this.roomAvailable = false;
    this.scheduleRoundExpiry();
    this.waitingForRoom = this.role === 'student';
    this.notifyStatus(false, this.waitingForRoom
      ? '교사 방을 찾을 수 없습니다. 교사의 연결 상태와 방 코드를 확인해 주세요'
      : '교사 방을 찾을 수 없습니다. 페이지를 새로고침해 주세요');
  }

  async fetchRoom() {
    const { data, error } = await this.supabase.from('game_rooms')
      .select('*').eq('room_id', this.roomId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async createRoom() {
    const initialTeams = JSON.parse(JSON.stringify(window.teamManager.teams));
    initialTeams.forEach(team => {
      team.score = 0;
      team.rank = null;
      team.isAllCompleted = false;
      team.completedTime = null;
      team.members.forEach(member => { member.completed = false; member.completedTime = null; });
    });
    const initial = {
      room_id: this.roomId,
      stage_idx: 0,
      is_match_active: false,
      match_start_time: null,
      teams: initialTeams,
      lesson_state: window.RoomState.createLessonState(initialTeams),
      updated_at: new Date().toISOString()
    };
    const result = await this.supabase.from('game_rooms').insert(initial).select('*').single();
    if (result.error) {
      if (result.error.code === '23505' && this.generatedRoom && !this.generatedRoomClaimed) {
        this.roomCollision = true;
        const error = new Error('이미 존재하는 방입니다.');
        error.code = 'ROOM_COLLISION';
        throw error;
      }
      if (result.error.code !== '23505') throw result.error;
      return this.fetchRoom();
    }
    this.generatedRoomClaimed = true;
    return result.data;
  }

  async openRoom() {
    if (this.roomCollision) {
      const error = new Error('이미 존재하는 방입니다.');
      error.code = 'ROOM_COLLISION';
      throw error;
    }
    let room;
    if (this.role === 'teacher' && this.generatedRoom && !this.generatedRoomClaimed) {
      room = await this.createRoom();
    } else {
      room = await this.fetchRoom();
      if (!room && this.role === 'teacher') room = await this.createRoom();
    }
    if (room) this.applyRoom(room);
    else this.notifyRoomMissing();
  }

  ensureRoom() {
    if (!this.openPromise) this.openPromise = this.openRoom().finally(() => { this.openPromise = null; });
    return this.openPromise;
  }

  async syncRoomFromDatabase() {
    const room = await this.fetchRoom();
    if (room) this.applyRoom(room);
    else this.notifyRoomMissing();
    return room;
  }

  refreshIfConnected() {
    if ((!this.realtimeReady && !this.pollingMode) || !this.supabase || this.roomCollision) return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    const refresh = this.role === 'teacher' && !this.hasRoomState ? this.ensureRoom() : this.syncRoomFromDatabase();
    this.refreshPromise = refresh.catch(error => {
      console.warn('방 상태 동기화 실패:', error);
      this.roomAvailable = false;
      this.notifyStatus(false, error.code === 'ROOM_COLLISION'
        ? '방 코드가 이미 사용 중입니다. 새 창에서 다시 시작해 주세요'
        : '방 상태 확인 실패 (재시도 중)');
    }).finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  applyRoom(room) {
    if (!room || room.room_id !== this.roomId || !window.teamManager ||
        (this.role === 'teacher' && this.generatedRoom && !this.generatedRoomClaimed)) return;
    if (!window.RoomState.isValidRoom(room)) {
      this.roomAvailable = false;
      this.notifyStatus(false, '방 데이터가 올바르지 않습니다');
      return;
    }

    const version = room.updated_at ? Date.parse(room.updated_at) : -1;
    if (this.hasRoomState && Number.isFinite(version) && version < this.lastVersion) return;
    if (Number.isFinite(version)) this.lastVersion = version;

    const manager = window.teamManager;
    const lesson = window.RoomState.getLessonState(room);
    const previousStart = manager.matchStartTime;
    const previousActive = manager.isMatchActive;
    const previousState = this.hasRoomState;
    const newlyFinished = previousState ? room.teams.filter(team => team.isAllCompleted &&
      !manager.teams.some(previous => previous.id === team.id && previous.isAllCompleted)) : [];
    manager.isMatchActive = Boolean(room.is_match_active);
    manager.matchStartTime = room.match_start_time == null ? null : Number(room.match_start_time);
    manager.lessonState = lesson;
    manager.currentStageIdx = room.stage_idx;
    manager.applyTeamsConfig(room.teams, false);

    if (window.teacherDashboard) {
      window.teacherDashboard.applyRoomStage(room.stage_idx);
      if (newlyFinished.length && window.soundEngine) {
        if (newlyFinished.some(team => team.rank === 1)) window.soundEngine.playWordComplete();
        else window.soundEngine.playJing();
      }
    }
    if (window.game) {
      const mission = lesson.missions[room.stage_idx];
      const preservePractice = previousState && !previousActive && previousStart == null && manager.isMatchActive &&
        mission.isPractice && window.game.currentStageIdx === room.stage_idx &&
        window.game.currentMissionId === mission.id && window.game.currentWord === mission.word;
      const roundChanged = previousState && previousStart !== manager.matchStartTime && !preservePractice;
      if (window.game.currentStageIdx !== room.stage_idx || window.game.currentMissionId !== mission.id ||
          window.game.currentWord !== mission.word || roundChanged) {
        window.game.loadStage(room.stage_idx, true);
      }
      window.game.updateTeamStatus();
    }
    this.hasRoomState = true;
    this.roomAvailable = true;
    this.waitingForRoom = false;
    this.updateConnectionStatus();
    this.scheduleRoundExpiry();
  }

  getRoundClock() {
    const manager = window.teamManager;
    return window.RoomState.getRoundClock(manager.lessonState, manager.matchStartTime, manager.isMatchActive, this.serverNow());
  }

  scheduleRoundExpiry(force = false) {
    const manager = window.teamManager;
    const timer = manager && manager.lessonState && manager.lessonState.timer;
    const active = this.roomAvailable && this.clockServerAtAnchor != null && manager.isMatchActive &&
      timer && timer.startedAt === manager.matchStartTime && timer.reason == null;
    if (!active) {
      if (this.expiryTimer != null) window.clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
      this.expiryKey = null;
      return;
    }
    const stage = manager.currentStageIdx;
    const start = timer.startedAt;
    const key = `${stage}:${start}`;
    if (this.expiryPending && this.expiryKey === key) return;
    if (!force && this.expiryKey === key && this.expiryTimer != null) return;
    if (this.expiryTimer != null) window.clearTimeout(this.expiryTimer);
    const delay = Math.min(2147483647, Math.max(0, start + timer.durationMs - this.serverNow()));
    this.expiryKey = key;
    this.expiryTimer = window.setTimeout(() => {
      this.expiryTimer = null;
      this.expireRound(key, stage, start);
    }, delay);
  }

  async expireRound(key, stage, start) {
    if (this.expiryPending || this.expiryKey !== key) return;
    if (!this.isConnected) {
      this.expiryTimer = window.setTimeout(() => this.expireRound(key, stage, start), 3000);
      return;
    }
    this.expiryPending = true;
    try {
      await this.publish({ type: 'EXPIRE_MATCH', payload: { stageIdx: stage, roundStartTime: start } });
    } catch (error) {
      if (error.code === 'ROUND_NOT_EXPIRED') {
        await this.syncClock().catch(clockError => this.handleClockError(clockError));
      } else {
        console.warn('시간 종료 동기화 재시도:', error);
      }
    } finally {
      this.expiryPending = false;
      const manager = window.teamManager;
      const timer = manager.lessonState && manager.lessonState.timer;
      if (this.expiryKey === key && manager.isMatchActive && timer && timer.startedAt === start && timer.reason == null) {
        const delay = Math.min(2147483647, Math.max(1000, start + timer.durationMs - this.serverNow()));
        this.expiryTimer = window.setTimeout(() => {
          this.expiryTimer = null;
          this.expireRound(key, stage, start);
        }, delay);
      }
    }
  }

  publish(data) {
    if (!this.isConnected || !this.supabase || this.clockServerAtAnchor == null) {
      return Promise.reject(new Error('실시간 연결이 준비되지 않았습니다.'));
    }
    const event = JSON.parse(JSON.stringify(data));
    const task = this.writeQueue.then(() => this.updateRoom(event));
    this.writeQueue = task.catch(() => {});
    return task;
  }

  // updated_at 조건부 갱신으로 다른 학생이 먼저 저장하면 최신 상태에 다시 적용한다.
  async updateRoom(event) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const current = await this.fetchRoom();
      if (!current) throw new Error('교사의 방을 찾을 수 없습니다.');
      const timestamp = this.serverNow();
      if (timestamp == null) throw new Error('서버 시간을 확인하지 못했습니다.');
      const result = window.RoomState.applyEvent(current, { ...event, timestamp });
      if (!result.changed) {
        this.applyRoom(current);
        return current;
      }

      const previousMs = current.updated_at ? Date.parse(current.updated_at) : 0;
      const nextMs = Math.max(timestamp, (Number.isFinite(previousMs) ? previousMs : 0) + 1);
      const next = result.room;
      const changes = {
        stage_idx: next.stage_idx,
        is_match_active: next.is_match_active,
        match_start_time: next.match_start_time,
        teams: next.teams,
        lesson_state: next.lesson_state,
        updated_at: new Date(nextMs).toISOString()
      };
      let query = this.supabase.from('game_rooms').update(changes).eq('room_id', this.roomId);
      query = current.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', current.updated_at);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) {
        if (error.message === 'ROUND_TIME_EXPIRED' || error.message === 'ROUND_NOT_EXPIRED') {
          const mapped = new Error(error.message === 'ROUND_TIME_EXPIRED' ? '3분이 지나 제출이 마감되었습니다.' : '아직 제한 시간이 남았습니다.');
          mapped.code = error.message === 'ROUND_TIME_EXPIRED' ? 'ROUND_EXPIRED' : 'ROUND_NOT_EXPIRED';
          throw mapped;
        }
        throw error;
      }
      if (data) {
        this.applyRoom(data);
        if (this.channel && this.realtimeReady) {
          this.channel.send({ type: 'broadcast', event: 'room_updated', payload: { updatedAt: data.updated_at } })
            .catch(error => console.warn('상태 알림 전송 실패:', error));
        }
        return data;
      }
      await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 60));
    }
    throw new Error('동시 제출이 많아 저장하지 못했습니다. 다시 시도해 주세요.');
  }

  onStatusChange(cb) {
    this.statusListeners.push(cb);
    cb(this.isConnected, this.statusText);
  }

  notifyStatus(connected, text) {
    if (this.isConnected === connected && this.statusText === text) return;
    this.isConnected = connected;
    this.statusText = text;
    this.statusListeners.forEach(fn => fn(connected, text));
  }
}

window.cloudSync = new CloudSync();
