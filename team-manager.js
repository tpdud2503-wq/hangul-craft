/**
 * 모둠 대항전 관리 및 실시간 동기화 엔진 (모둠별 개별 인원수 설정 완벽 지원)
 */

class TeamManager {
  constructor() {
    this.channel = null;
    this.roomId = window.cloudSync && window.cloudSync.roomId || 'local';
    this.settingsKey = `hangul_team_settings_v2_${this.roomId}`;
    this.eventKey = `hangul_match_sync_event_${this.roomId}`;
    this.clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.eventSequence = 0;
    this.seenEvents = new Set();
    this.teams = [];
    this.currentStudent = { teamId: 1, memberId: 1, name: '학생 1' };
    this.isMatchActive = false;
    this.matchStartTime = null;
    this.rankings = [];
    this.onUpdateCallbacks = [];

    this.defaultTeamNames = ['1모둠 (가온)', '2모둠 (누리)', '3모둠 (라온)', '4모둠 (다솜)', '5모둠 (마루)', '6모둠 (바론)', '7모둠 (새론)', '8모둠 (예그리나)'];

    this.initBroadcastChannel();
    this.loadSettings();
    this.lessonState = window.RoomState.createLessonState(this.teams);
    this.currentStageIdx = 0;
  }

  initBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel(`hangul_team_match_channel_${this.roomId}`);
      this.channel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    window.addEventListener('storage', (e) => {
      if (e.key === this.eventKey && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleBroadcastMessage(data);
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  broadcast(type, payload) {
    const data = {
      type, payload, roomId: this.roomId, sender: { ...this.currentStudent },
      clientId: this.clientId, eventId: `${this.clientId}-${++this.eventSequence}`, timestamp: Date.now()
    };
    if (window.cloudSync) {
      const task = window.cloudSync.publish(data);
      task.catch(error => {
        console.warn('방 상태 저장 실패:', error);
        if (window.teacherDashboard) window.teacherDashboard.showToast(`동기화 실패: ${error.message}`);
        window.cloudSync.refreshIfConnected();
      });
      return task;
    }

    // 클라우드 모듈이 없는 구형 화면에서만 같은 방의 로컬 탭을 연결한다.
    if (this.channel) {
      this.channel.postMessage(data);
    }
    localStorage.setItem(this.eventKey, JSON.stringify(data));
    return Promise.resolve();
  }

  handleBroadcastMessage(data) {
    if (!data || !data.type || data.roomId !== this.roomId || data.clientId === this.clientId) return;
    if (data.eventId) {
      if (this.seenEvents.has(data.eventId)) return;
      this.seenEvents.add(data.eventId);
      if (this.seenEvents.size > 200) this.seenEvents.delete(this.seenEvents.values().next().value);
    }

    switch (data.type) {
      case 'STUDENT_COMPLETED':
        this.recordMemberCompletion(data.payload.teamId, data.payload.memberId, data.payload.time, false);
        break;
      case 'RESET_MATCH':
        this.resetMatchState(false, data.payload.startTime);
        break;
      case 'UPDATE_TEAMS_CONFIG':
        this.applyTeamsConfig(data.payload.teams, false);
        break;
      case 'STAGE_CHANGE':
        this.resetMatchState(false, data.payload.startTime);
        if (window.game && window.game.currentStageIdx !== data.payload.stageIdx) {
          window.game.loadStage(data.payload.stageIdx, false);
        }
        break;
      case 'REQUEST_ROOM_STATE':
        // 교사 대시보드가 이 방의 호스트로서 현재 최신 모둠 구성 및 진행 스테이지를 즉시 회신
        if (window.teacherDashboard) {
          this.broadcast('ROOM_STATE_SYNC', {
            teams: this.teams,
            stageIdx: window.teacherDashboard.currentStageIdx,
            matchStartTime: this.matchStartTime,
            isMatchActive: this.isMatchActive
          });
        }
        break;
      case 'ROOM_STATE_SYNC':
        // 학생 화면에서 교사의 최신 모둠 설정 및 문제 상태를 완벽 동기화
        if (data.payload.teams && Array.isArray(data.payload.teams)) {
          this.applyTeamsConfig(data.payload.teams, false);
        }
        if (data.payload.matchStartTime) {
          this.matchStartTime = data.payload.matchStartTime;
        }
        if (window.game && typeof data.payload.stageIdx === 'number' && window.game.currentStageIdx !== data.payload.stageIdx) {
          window.game.loadStage(data.payload.stageIdx, false);
        }
        break;
    }
  }

  loadSettings() {
    const saved = localStorage.getItem(this.settingsKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.teams) && parsed.teams.length > 0) {
          this.teams = parsed.teams;
          this.triggerUpdate();
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // 기본 모둠 4개, 각각 3명씩 초기화
    this.initDefaultTeams(4, 3);
  }

  saveSettings() {
    const data = {
      teams: this.teams
    };
    localStorage.setItem(this.settingsKey, JSON.stringify(data));
  }

  initDefaultTeams(teamCount = 4, defaultMemberCount = 3) {
    this.teams = [];
    this.rankings = [];
    for (let i = 1; i <= teamCount; i++) {
      const name = this.defaultTeamNames[i - 1] || `${i}모둠`;
      const members = [];
      for (let m = 1; m <= defaultMemberCount; m++) {
        members.push({
          id: m,
          name: `학생 ${m}`,
          completed: false,
          completedTime: null
        });
      }
      this.teams.push({
        id: i,
        name: name,
        memberCount: defaultMemberCount,
        members: members,
        isAllCompleted: false,
        completedTime: null,
        rank: null,
        score: 0
      });
    }
    this.saveSettings();
    this.triggerUpdate();
  }

  /**
   * 모둠 설정 일괄 적용 (모둠별 개별 인원수 및 이름 지원)
   */
  applyTeamsConfig(newTeams, broadcast = true) {
    this.teams = newTeams;
    this.rankings = this.teams.filter(team => team.rank).sort((a, b) => a.rank - b.rank);
    this.saveSettings();

    // 현재 학생 설정 보정
    const team = this.teams.find(t => t.id === this.currentStudent.teamId) || this.teams[0];
    if (team) {
      this.currentStudent.teamId = team.id;
      if (this.currentStudent.memberId > team.members.length) {
        this.currentStudent.memberId = 1;
      }
      const member = team.members.find(m => m.id === this.currentStudent.memberId);
      if (member) {
        this.currentStudent.name = member.name;
      }
    }

    const task = broadcast ? this.broadcast('UPDATE_TEAMS_CONFIG', { teams: this.teams }) : Promise.resolve();
    this.triggerUpdate();
    return task;
  }

  /**
   * 특정 모둠의 인원수 개별 변경 (예: 1모둠 4명, 2모둠 3명)
   */
  setTeamMemberCount(teamId, count) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return;

    count = Math.max(1, Math.min(8, parseInt(count, 10)));
    team.memberCount = count;

    // 인원수가 늘어나면 학생 추가
    while (team.members.length < count) {
      const nextId = team.members.length + 1;
      team.members.push({
        id: nextId,
        name: `학생 ${nextId}`,
        completed: false,
        completedTime: null
      });
    }

    // 인원수가 줄어들면 뒤에서부터 제거
    if (team.members.length > count) {
      team.members = team.members.slice(0, count);
    }

    return this.applyTeamsConfig(this.teams, true);
  }

  /**
   * 모둠 추가
   */
  addTeam(name = null, memberCount = 3) {
    if (this.teams.length >= 8) return;
    const nextId = Array.from({ length: 8 }, (_, i) => i + 1).find(id => !this.teams.some(team => team.id === id));
    const teamName = name || this.defaultTeamNames[nextId - 1] || `${nextId}모둠`;
    const members = [];
    for (let m = 1; m <= memberCount; m++) {
      members.push({
        id: m,
        name: `학생 ${m}`,
        completed: false,
        completedTime: null
      });
    }

    this.teams.push({
      id: nextId,
      name: teamName,
      memberCount: memberCount,
      members: members,
      isAllCompleted: false,
      completedTime: null,
      rank: null,
      score: 0
    });

    return this.applyTeamsConfig(this.teams, true);
  }

  /**
   * 모둠 삭제
   */
  removeTeam(teamId) {
    if (this.teams.length <= 2) return; // 최소 2모둠 유지
    this.teams = this.teams.filter(t => t.id !== teamId);
    return this.applyTeamsConfig(this.teams, true);
  }

  setCurrentStudent(teamId, memberId) {
    const changed = this.currentStudent.teamId !== teamId || this.currentStudent.memberId !== memberId;
    this.currentStudent.teamId = teamId;
    this.currentStudent.memberId = memberId;
    const team = this.teams.find(t => t.id === teamId);
    if (team) {
      const member = team.members.find(m => m.id === memberId);
      if (member) {
        this.currentStudent.name = member.name;
      }
    }
    if (changed) this.triggerUpdate();
  }

  resetMatchState(broadcast = true, startTime = Date.now()) {
    if (broadcast && window.cloudSync) return this.broadcast('RESET_MATCH', {});
    this.isMatchActive = true;
    this.matchStartTime = startTime || Date.now();
    this.rankings = [];

    this.teams.forEach(t => {
      t.isAllCompleted = false;
      t.completedTime = null;
      t.rank = null;
      t.members.forEach(m => {
        m.completed = false;
        m.completedTime = null;
      });
    });

    const task = broadcast ? this.broadcast('RESET_MATCH', { startTime: this.matchStartTime }) : Promise.resolve();
    this.triggerUpdate();
    return task;
  }

  /**
   * 학생이 단어를 완성했을 때 호출
   */
  recordMemberCompletion(teamId, memberId, time = null, broadcast = true) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return broadcast ? Promise.reject(new Error('모둠을 찾을 수 없습니다.')) : Promise.resolve();

    const member = team.members.find(m => m.id === memberId);
    if (!member) return broadcast ? Promise.reject(new Error('학생을 찾을 수 없습니다.')) : Promise.resolve();

    if (member.completed) return Promise.resolve();

    if (broadcast && window.cloudSync) {
      return this.broadcast('STUDENT_COMPLETED', {
        teamId, memberId,
        stageIdx: window.game.currentStageIdx,
        missionId: this.lessonState.missions[window.game.currentStageIdx].id,
        roundStartTime: this.matchStartTime
      });
    }

    const elapsed = time != null ? time : (this.matchStartTime ? Math.round((Date.now() - this.matchStartTime) / 1000) : 0);
    member.completed = true;
    member.completedTime = elapsed;

    // 해당 모둠의 등록된 인원 전원이 완료되었는지 확인
    const allDone = team.members.every(m => m.completed);
    if (allDone && !team.isAllCompleted) {
      team.isAllCompleted = true;
      team.completedTime = elapsed;
      this.rankings.push(team);
      team.rank = this.rankings.length;

      const mission = this.lessonState.missions[this.currentStageIdx];
      const earnedScore = window.RoomState.pointsForRank(team.rank, mission && mission.isPractice);
      team.score += earnedScore;

      if (window.soundEngine) {
        if (team.rank === 1) {
          window.soundEngine.playWordComplete();
        } else {
          window.soundEngine.playJing();
        }
      }
    }

    this.saveSettings();
    this.triggerUpdate();
    return broadcast ? this.broadcast('STUDENT_COMPLETED', { teamId, memberId, time: elapsed }) : Promise.resolve();
  }

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  triggerUpdate() {
    this.onUpdateCallbacks.forEach(cb => cb(this));
  }
}

window.teamManager = new TeamManager();
