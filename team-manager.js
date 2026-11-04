/**
 * 모둠 대항전 관리 및 실시간 동기화 엔진
 * - 교실 수업에서 2~6개 모둠, 모둠당 1~5명 학생 지원
 * - BroadcastChannel 및 localStorage를 활용한 다중 탭/창 실시간 연동
 * - 모둠원 전원 완성 시 실시간 순위(1등, 2등, 3등...) 판정 및 점수 계산
 */

class TeamManager {
  constructor() {
    this.channel = null;
    this.teamCount = 4;
    this.memberCount = 3;
    this.teams = [];
    this.currentStudent = { teamId: 1, memberId: 1, name: '학생 1' };
    this.isMatchActive = false;
    this.matchStartTime = null;
    this.rankings = []; // 순위대로 기록된 모둠 목록
    this.onUpdateCallbacks = [];

    this.defaultTeamNames = ['1모둠 (가온)', '2모둠 (누리)', '3모둠 (라온)', '4모둠 (다솜)', '5모둠 (마루)', '6모둠 (바론)'];

    this.initBroadcastChannel();
    this.loadSettings();
  }

  initBroadcastChannel() {
    try {
      this.channel = new BroadcastChannel('hangul_team_match_channel');
      this.channel.onmessage = (event) => {
        this.handleBroadcastMessage(event.data);
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported, fallback to localStorage only.', e);
    }

    // fallback: storage 이벤트 감지
    window.addEventListener('storage', (e) => {
      if (e.key === 'hangul_match_sync_event' && e.newValue) {
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
    const data = { type, payload, sender: this.currentStudent, timestamp: Date.now() };
    if (this.channel) {
      this.channel.postMessage(data);
    }
    // localStorage를 통한 브로드캐스트 (타 창 감지용)
    localStorage.setItem('hangul_match_sync_event', JSON.stringify(data));

    // 클라우드 브로커로 실시간 발행 (스마트폰/태블릿 등 외부 기기 연동)
    if (window.cloudSync) {
      window.cloudSync.publish(data);
    }
  }

  handleBroadcastMessage(data) {
    if (!data || !data.type) return;

    // 내가 보낸 메시지 중복 처리 방지
    if (data.sender && 
        data.sender.teamId === this.currentStudent.teamId && 
        data.sender.memberId === this.currentStudent.memberId && 
        data.type === 'STUDENT_COMPLETED') {
      return;
    }

    switch (data.type) {
      case 'STUDENT_COMPLETED':
        this.recordMemberCompletion(data.payload.teamId, data.payload.memberId, data.payload.time, false);
        break;
      case 'RESET_MATCH':
        this.resetMatchState(false);
        break;
      case 'SETUP_TEAMS':
        this.applyTeamConfig(data.payload.teamCount, data.payload.memberCount, data.payload.teamNames, false);
        break;
      case 'STAGE_CHANGE':
        if (window.game && window.game.currentStageIdx !== data.payload.stageIdx) {
          window.game.loadStage(data.payload.stageIdx, false);
        }
        break;
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('hangul_team_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.teamCount = parsed.teamCount || 4;
        this.memberCount = parsed.memberCount || 3;
        this.initTeams(parsed.teamNames);
        return;
      } catch (e) {
        console.error(e);
      }
    }
    this.initTeams();
  }

  saveSettings() {
    const data = {
      teamCount: this.teamCount,
      memberCount: this.memberCount,
      teamNames: this.teams.map(t => t.name)
    };
    localStorage.setItem('hangul_team_settings', JSON.stringify(data));
  }

  initTeams(customNames = null) {
    this.teams = [];
    this.rankings = [];
    for (let i = 1; i <= this.teamCount; i++) {
      const name = (customNames && customNames[i - 1]) ? customNames[i - 1] : this.defaultTeamNames[i - 1] || `${i}모둠`;
      const members = [];
      for (let m = 1; m <= this.memberCount; m++) {
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
        members: members,
        isAllCompleted: false,
        completedTime: null,
        rank: null,
        score: 0
      });
    }
    this.triggerUpdate();
  }

  applyTeamConfig(teamCount, memberCount, teamNames = null, broadcast = true) {
    this.teamCount = teamCount;
    this.memberCount = memberCount;
    this.initTeams(teamNames);
    this.saveSettings();

    // 현재 학생 설정도 유효 범위 내로 보정
    if (this.currentStudent.teamId > this.teamCount) this.currentStudent.teamId = 1;
    if (this.currentStudent.memberId > this.memberCount) this.currentStudent.memberId = 1;

    if (broadcast) {
      this.broadcast('SETUP_TEAMS', { teamCount, memberCount, teamNames: this.teams.map(t => t.name) });
    }
    this.triggerUpdate();
  }

  setCurrentStudent(teamId, memberId) {
    this.currentStudent.teamId = teamId;
    this.currentStudent.memberId = memberId;
    const team = this.teams.find(t => t.id === teamId);
    if (team) {
      const member = team.members.find(m => m.id === memberId);
      if (member) {
        this.currentStudent.name = member.name;
      }
    }
    this.triggerUpdate();
  }

  startMatch() {
    this.isMatchActive = true;
    this.matchStartTime = Date.now();
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

    this.broadcast('RESET_MATCH', { startTime: this.matchStartTime });
    this.triggerUpdate();
  }

  resetMatchState(broadcast = true) {
    this.isMatchActive = true;
    this.matchStartTime = Date.now();
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

    if (broadcast) {
      this.broadcast('RESET_MATCH', { startTime: this.matchStartTime });
    }
    this.triggerUpdate();
  }

  /**
   * 학생이 단어를 완성했을 때 호출
   */
  recordMemberCompletion(teamId, memberId, time = null, broadcast = true) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return;

    const member = team.members.find(m => m.id === memberId);
    if (!member) return;

    if (member.completed) return; // 이미 완료됨

    const elapsed = time || (this.matchStartTime ? Math.round((Date.now() - this.matchStartTime) / 1000) : 0);
    member.completed = true;
    member.completedTime = elapsed;

    if (broadcast) {
      this.broadcast('STUDENT_COMPLETED', { teamId, memberId, time: elapsed });
    }

    // 해당 모둠의 모든 학생이 완료되었는지 확인
    const allDone = team.members.every(m => m.completed);
    if (allDone && !team.isAllCompleted) {
      team.isAllCompleted = true;
      team.completedTime = elapsed;
      this.rankings.push(team);
      team.rank = this.rankings.length;

      // 점수 계산 (1등 100점, 2등 80점, 3등 60점, 4등 40점...)
      const scoreTable = [100, 80, 60, 40, 20, 10];
      const earnedScore = scoreTable[team.rank - 1] || 10;
      team.score += earnedScore;

      // 모둠 완주 알림 효과음
      if (window.soundEngine) {
        if (team.rank === 1) {
          window.soundEngine.playWordComplete();
        } else {
          window.soundEngine.playJing();
        }
      }
    }

    this.triggerUpdate();
  }

  /**
   * 모든 모둠이 완료되었는지 확인
   */
  isAllTeamsFinished() {
    return this.teams.every(t => t.isAllCompleted);
  }

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  triggerUpdate() {
    this.onUpdateCallbacks.forEach(cb => cb(this));
  }
}

window.teamManager = new TeamManager();
