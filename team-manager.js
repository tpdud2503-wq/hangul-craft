/**
 * 모둠 대항전 관리 및 실시간 동기화 엔진 (모둠별 개별 인원수 설정 완벽 지원)
 */

class TeamManager {
  constructor() {
    this.channel = null;
    this.teams = [];
    this.currentStudent = { teamId: 1, memberId: 1, name: '학생 1' };
    this.isMatchActive = false;
    this.matchStartTime = null;
    this.rankings = [];
    this.onUpdateCallbacks = [];

    this.defaultTeamNames = ['1모둠 (가온)', '2모둠 (누리)', '3모둠 (라온)', '4모둠 (다솜)', '5모둠 (마루)', '6모둠 (바론)', '7모둠 (새론)', '8모둠 (예그리나)'];

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
      console.warn('BroadcastChannel not supported', e);
    }

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
    localStorage.setItem('hangul_match_sync_event', JSON.stringify(data));

    if (window.cloudSync) {
      window.cloudSync.publish(data);
    }
  }

  handleBroadcastMessage(data) {
    if (!data || !data.type) return;

    // 내가 보낸 완료 메시지 중복 처리 방지
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
      case 'UPDATE_TEAMS_CONFIG':
        this.applyTeamsConfig(data.payload.teams, false);
        break;
      case 'STAGE_CHANGE':
        if (window.game && window.game.currentStageIdx !== data.payload.stageIdx) {
          window.game.loadStage(data.payload.stageIdx, false);
        }
        break;
    }
  }

  loadSettings() {
    const saved = localStorage.getItem('hangul_team_settings_v2');
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
    localStorage.setItem('hangul_team_settings_v2', JSON.stringify(data));
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

    if (broadcast) {
      this.broadcast('UPDATE_TEAMS_CONFIG', { teams: this.teams });
    }
    this.triggerUpdate();
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

    this.applyTeamsConfig(this.teams, true);
  }

  /**
   * 모둠 추가
   */
  addTeam(name = null, memberCount = 3) {
    if (this.teams.length >= 8) return;
    const nextId = this.teams.length + 1;
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

    this.applyTeamsConfig(this.teams, true);
  }

  /**
   * 모둠 삭제
   */
  removeTeam(teamId) {
    if (this.teams.length <= 2) return; // 최소 2모둠 유지
    this.teams = this.teams.filter(t => t.id !== teamId);
    // id 재정렬
    this.teams.forEach((t, idx) => {
      t.id = idx + 1;
    });
    this.applyTeamsConfig(this.teams, true);
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

    if (member.completed) return;

    const elapsed = time || (this.matchStartTime ? Math.round((Date.now() - this.matchStartTime) / 1000) : 0);
    member.completed = true;
    member.completedTime = elapsed;

    if (broadcast) {
      this.broadcast('STUDENT_COMPLETED', { teamId, memberId, time: elapsed });
    }

    // 해당 모둠의 등록된 인원 전원이 완료되었는지 확인
    const allDone = team.members.every(m => m.completed);
    if (allDone && !team.isAllCompleted) {
      team.isAllCompleted = true;
      team.completedTime = elapsed;
      this.rankings.push(team);
      team.rank = this.rankings.length;

      const scoreTable = [100, 80, 60, 40, 20, 10];
      const earnedScore = scoreTable[team.rank - 1] || 10;
      team.score += earnedScore;

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

  onUpdate(callback) {
    this.onUpdateCallbacks.push(callback);
  }

  triggerUpdate() {
    this.onUpdateCallbacks.forEach(cb => cb(this));
  }
}

window.teamManager = new TeamManager();
