/** Supabase 방 상태 저장 및 실시간 동기화. */

const SUPABASE_CONFIG = {
  url: 'https://lyrngmakrvcynuahxoba.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cm5nbWFrcnZjeW51YWh4b2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzU2NzUsImV4cCI6MjEwOTk1MTY3NX0.1rwLrDh4fkyTfW9aiDkxkiicw0NRrsdHqK-23aMYUaE'
};

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
    this.hasRoomState = false;
    this.isConnected = false;
    this.statusText = 'Supabase 연결 중...';
    this.statusListeners = [];
    this.joinOrigin = null;
    this.joinUrlListeners = [];
    this.lastVersion = -1;
    this.writeQueue = Promise.resolve();
    this.refreshPromise = null;
    this.openPromise = null;
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
      window.addEventListener('online', () => this.refreshIfConnected());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.refreshIfConnected();
      });
      // 잠자기 등으로 놓친 이벤트도 다시 읽는다.
      this.pollTimer = window.setInterval(() => this.refreshIfConnected(), 15000);
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
          try {
            await this.ensureRoom();
          } catch (error) {
            console.error('방 연결 오류:', error);
            this.notifyStatus(false, error.code === 'ROOM_COLLISION'
              ? '방 코드가 이미 사용 중입니다. 새 창에서 다시 시작해 주세요'
              : '방 연결 오류 (재시도 중)');
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (err) console.warn('Supabase Realtime:', status, err);
          this.realtimeReady = false;
          this.notifyStatus(false, '실시간 연결이 끊겼습니다 (재연결 중)');
        }
      });
  }

  async fetchRoom() {
    const { data, error } = await this.supabase.from('game_rooms')
      .select('*').eq('room_id', this.roomId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async createRoom() {
    const initial = {
      room_id: this.roomId,
      stage_idx: 0,
      is_match_active: false,
      match_start_time: null,
      teams: JSON.parse(JSON.stringify(window.teamManager.teams)),
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
    else this.notifyStatus(false, '교사의 방이 열리기를 기다리는 중');
  }

  ensureRoom() {
    if (!this.openPromise) this.openPromise = this.openRoom().finally(() => { this.openPromise = null; });
    return this.openPromise;
  }

  async syncRoomFromDatabase() {
    const room = await this.fetchRoom();
    if (room) this.applyRoom(room);
    else this.notifyStatus(false, '교사의 방이 열리기를 기다리는 중');
    return room;
  }

  refreshIfConnected() {
    if (!this.realtimeReady || !this.supabase || this.roomCollision) return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    const refresh = this.role === 'teacher' && !this.hasRoomState ? this.ensureRoom() : this.syncRoomFromDatabase();
    this.refreshPromise = refresh.catch(error => {
      console.warn('방 상태 동기화 실패:', error);
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
      this.notifyStatus(false, '방 데이터가 올바르지 않습니다');
      return;
    }

    const version = room.updated_at ? Date.parse(room.updated_at) : -1;
    if (this.hasRoomState && Number.isFinite(version) && version < this.lastVersion) return;
    if (Number.isFinite(version)) this.lastVersion = version;

    const manager = window.teamManager;
    const previousStart = manager.matchStartTime;
    const previousState = this.hasRoomState;
    const newlyFinished = previousState ? room.teams.filter(team => team.isAllCompleted &&
      !manager.teams.some(previous => previous.id === team.id && previous.isAllCompleted)) : [];
    manager.isMatchActive = Boolean(room.is_match_active);
    manager.matchStartTime = room.match_start_time == null ? null : Number(room.match_start_time);
    manager.applyTeamsConfig(room.teams, false);

    if (window.teacherDashboard) {
      window.teacherDashboard.applyRoomStage(room.stage_idx);
      if (newlyFinished.length && window.soundEngine) {
        if (newlyFinished.some(team => team.rank === 1)) window.soundEngine.playWordComplete();
        else window.soundEngine.playJing();
      }
    }
    if (window.game) {
      const roundChanged = previousState && previousStart !== manager.matchStartTime;
      if (window.game.currentStageIdx !== room.stage_idx || roundChanged) {
        window.game.loadStage(room.stage_idx, true);
      }
      window.game.updateTeamStatus();
    }
    this.hasRoomState = true;
    if (this.realtimeReady) this.notifyStatus(true, 'Supabase 실시간 연결됨 🟢');
  }

  publish(data) {
    if (!this.isConnected || !this.supabase) {
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
      const result = window.RoomState.applyEvent(current, event);
      if (!result.changed) {
        this.applyRoom(current);
        return current;
      }

      const previousMs = current.updated_at ? Date.parse(current.updated_at) : 0;
      const nextMs = Math.max(Date.now(), (Number.isFinite(previousMs) ? previousMs : 0) + 1);
      const next = result.room;
      const changes = {
        stage_idx: next.stage_idx,
        is_match_active: next.is_match_active,
        match_start_time: next.match_start_time,
        teams: next.teams,
        updated_at: new Date(nextMs).toISOString()
      };
      let query = this.supabase.from('game_rooms').update(changes).eq('room_id', this.roomId);
      query = current.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', current.updated_at);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) throw error;
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
