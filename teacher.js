/**
 * 교사용 대시보드 인터랙션 스크립트
 */

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

class TeacherDashboard {
  constructor() {
    this.currentStageIdx = 0;
    this.currentWord = window.teamManager.lessonState.missions[0].word;
    this.settingsBusy = false;
    this.missionBusy = false;
    this.missionSignature = '';
    this.lastFinalKey = null;

    this.initDOM();
    this.bindEvents();
    this.initCloud();
    this.renderStageSelect();
    this.renderTeamsLive();
  }

  initDOM() {
    this.tRoomCodeEl = document.getElementById('t-room-code');
    this.tCloudStatusEl = document.getElementById('t-cloud-status');
    this.tQrcodeContainer = document.getElementById('t-qrcode-container');
    this.tQrRoomText = document.getElementById('t-qr-room-text');
    this.tJoinUrlInput = document.getElementById('t-join-url-input');
    this.tQrPending = document.getElementById('t-qr-pending');
    this.tQrReady = document.getElementById('t-qr-ready');
    this.tRoomGuide = document.getElementById('t-room-guide');

    this.tStageSelect = document.getElementById('t-stage-select');
    this.btnStartProblem = document.getElementById('btn-t-start-problem');
    this.btnOpenExplanation = document.getElementById('btn-t-open-explanation');
    this.teamsLiveGrid = document.getElementById('t-teams-live-grid');

    // 모달들
    this.modalSettings = document.getElementById('modal-teacher-settings');
    this.teamsConfigList = document.getElementById('t-teams-config-list');
    this.modalBigQr = document.getElementById('modal-teacher-big-qr');
    this.bigQrContainer = document.getElementById('t-big-qr-container');
    this.bigRoomCode = document.getElementById('t-big-room-code');
    this.modalExplanation = document.getElementById('modal-lesson-explanation');
    this.modalMissions = document.getElementById('modal-teacher-missions');
    this.missionList = document.getElementById('t-mission-list');
    this.missionError = document.getElementById('t-mission-error');
    this.newMissionInput = document.getElementById('t-new-mission-word');
    this.modalFinal = document.getElementById('modal-final-results');
    this.finalResultsList = document.getElementById('t-final-results-list');
  }

  bindEvents() {
    // 사운드 토글
    const btnSound = document.getElementById('btn-sound-toggle');
    btnSound.addEventListener('click', () => {
      const enabled = window.soundEngine.toggleSound();
      btnSound.textContent = enabled ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
      btnSound.classList.toggle('muted', !enabled);
    });

    // 주소 복사
    document.getElementById('btn-t-copy-url').addEventListener('click', () => {
      this.copyJoinUrl();
    });

    // 대형 QR 모달
    document.getElementById('btn-t-qr-toggle').addEventListener('click', () => {
      this.showBigQrModal();
    });
    document.getElementById('btn-t-close-big-qr').addEventListener('click', () => {
      this.modalBigQr.classList.add('hidden');
    });

    // 모둠 설정 모달
    document.getElementById('btn-t-settings').addEventListener('click', () => {
      this.openSettingsModal();
    });
    document.getElementById('btn-t-close-settings').addEventListener('click', () => {
      this.modalSettings.classList.add('hidden');
    });
    document.getElementById('btn-t-add-team').addEventListener('click', () => {
      this.runSettingsAction(() => window.teamManager.addTeam());
    });
    document.getElementById('btn-t-save-config').addEventListener('click', () => {
      this.saveSettingsFromModal();
    });

    document.getElementById('btn-t-missions').addEventListener('click', () => this.openMissionsModal());
    document.getElementById('btn-t-close-missions').addEventListener('click', () => this.modalMissions.classList.add('hidden'));
    document.getElementById('t-add-mission-form').addEventListener('submit', event => {
      event.preventDefault();
      this.addMission();
    });
    document.getElementById('btn-t-final-results').addEventListener('click', () => this.showFinalResults());
    document.getElementById('btn-t-close-final').addEventListener('click', () => this.modalFinal.classList.add('hidden'));

    // 문제 선택 변경
    this.tStageSelect.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      this.setStage(idx);
    });

    // 문제 일괄 시작 (리셋)
    this.btnStartProblem.addEventListener('click', async () => {
      const hasProgress = window.teamManager.isMatchActive && window.teamManager.teams.some(team => team.members.some(member => member.completed));
      if (hasProgress && !confirm('이 문제를 다시 시작하면 현재 라운드의 제출과 점수가 초기화됩니다. 계속하시겠습니까?')) return;
      try {
        await window.teamManager.resetMatchState(true);
        window.soundEngine.playJing();
        this.showToast('새 라운드가 시작되었습니다! 모든 학생 기기에 반영됩니다.');
      } catch (_) {
        // 저장 오류는 팀 매니저가 안내한다.
      }
    });

    // 심층 해설 슬라이드 열기
    this.btnOpenExplanation.addEventListener('click', () => {
      this.showLessonExplanation();
    });
    document.getElementById('btn-close-explanation').addEventListener('click', () => {
      this.modalExplanation.classList.add('hidden');
    });
    document.getElementById('btn-expl-next-stage').addEventListener('click', () => {
      this.modalExplanation.classList.add('hidden');
      if (this.currentStageIdx < window.teamManager.lessonState.missions.length - 1) {
        this.setStage(this.currentStageIdx + 1);
      } else {
        this.showFinalResults();
      }
    });

    // 팀 매니저 상태 변화 구독
    window.teamManager.onUpdate(() => {
      this.renderTeamsLive();
      if (!this.modalFinal.classList.contains('hidden')) this.renderFinalResults();
    });
  }

  initCloud() {
    if (!window.cloudSync) return;

    const renderJoinInfo = () => {
      const roomId = window.cloudSync.roomId;
      const joinUrl = window.cloudSync.getJoinUrl();
      this.tRoomCodeEl.textContent = roomId;
      this.tQrRoomText.textContent = roomId;
      this.tJoinUrlInput.value = joinUrl;
      const url = new URL(joinUrl);
      const unusableOnPhones = url.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      document.getElementById('t-join-warning').classList.toggle('hidden', !unusableOnPhones);
      window.QrHelper.renderQr(this.tQrcodeContainer, joinUrl, 260);
    };
    renderJoinInfo();
    window.cloudSync.onJoinUrlChange(renderJoinInfo);

    window.cloudSync.onStatusChange((connected, text) => {
      this.tCloudStatusEl.textContent = text;
      const statusClass = !connected ? 'offline' : window.cloudSync.realtimeReady ? 'online' : 'fallback';
      this.tCloudStatusEl.className = `cloud-status-dot ${statusClass}`;
      this.tQrPending.classList.toggle('hidden', connected);
      this.tQrReady.classList.toggle('hidden', !connected);
      this.tQrPending.textContent = `QR코드 준비 중입니다. ${text}`;
      this.updateRoomGuide(connected);
      document.getElementById('btn-t-qr-toggle').disabled = !connected;
      document.getElementById('btn-t-copy-url').disabled = !connected;
      this.tJoinUrlInput.disabled = !connected;
      this.btnStartProblem.disabled = !connected;
      this.tStageSelect.disabled = !connected;
      document.getElementById('btn-t-settings').disabled = !connected;
      document.getElementById('btn-t-missions').disabled = !connected;
      this.setSettingsControlsDisabled(!connected || this.settingsBusy);
      this.setMissionControlsDisabled(!connected || this.missionBusy);
    });
  }

  updateRoomGuide(connected) {
    const mission = window.teamManager.lessonState.missions[window.teamManager.currentStageIdx];
    this.tRoomGuide.textContent = !connected
      ? '교사 방은 자동으로 열립니다. 연결이 완료되면 학생에게 QR을 보여 주세요.'
      : window.cloudSync.realtimeReady
        ? mission && mission.isPractice
          ? '연습 문제가 자동으로 시작됩니다. 학생에게 QR을 보여 주고, 준비되면 1라운드를 선택하세요.'
          : '교사 방이 열렸습니다. 학생이 QR로 입장한 뒤 문제를 진행해 주세요.'
        : '교사 방이 열렸습니다. 실시간 연결이 차단되어 약 3초 간격으로 동기화합니다.';
  }

  renderStageSelect() {
    this.tStageSelect.innerHTML = '';
    const missions = window.teamManager.lessonState.missions;
    let round = 0;
    missions.forEach((mission, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = mission.isPractice ? `🧪 연습 문제: ${mission.word}` : `${++round}라운드: ${mission.word}`;
      this.tStageSelect.appendChild(opt);
    });
    this.missionSignature = JSON.stringify(missions);
    this.tStageSelect.value = this.currentStageIdx;
  }

  applyRoomStage(idx) {
    const lesson = window.teamManager.lessonState;
    const mission = lesson.missions[idx];
    if (!mission) return;
    if (this.missionSignature !== JSON.stringify(lesson.missions)) this.renderStageSelect();
    this.currentStageIdx = idx;
    this.currentWord = mission.word;
    this.tStageSelect.value = idx;
    this.updateRoomGuide(window.cloudSync.isConnected);
    document.getElementById('btn-expl-next-stage').textContent = idx === lesson.missions.length - 1 ? '최종 점수 보기 ➔' : '다음 문제로 함께 진행 ➔';
    this.renderTeamsLive();
    if (window.RoomState.isFinalRoundComplete(lesson, idx, window.teamManager.teams)) {
      const key = `${mission.id}:${window.teamManager.matchStartTime}`;
      if (this.lastFinalKey !== key) {
        this.lastFinalKey = key;
        this.showFinalResults();
      }
    }
  }

  async setStage(idx) {
    const lesson = window.teamManager.lessonState;
    const mission = lesson.missions[idx];
    if (!mission) return;
    if (lesson.results[mission.id] && Object.keys(lesson.results[mission.id]).length &&
        !confirm('이 라운드를 다시 시작하면 해당 라운드 점수가 초기화됩니다. 계속하시겠습니까?')) {
      this.tStageSelect.value = this.currentStageIdx;
      return;
    }
    this.tStageSelect.disabled = true;
    try {
      await window.teamManager.broadcast('STAGE_CHANGE', { stageIdx: idx, missionId: mission.id });
    } catch (_) {
      this.tStageSelect.value = this.currentStageIdx;
    } finally {
      this.tStageSelect.disabled = !window.cloudSync.isConnected;
    }
  }

  // 실시간 전광판 렌더링
  renderTeamsLive() {
    this.teamsLiveGrid.innerHTML = '';
    const lesson = window.teamManager.lessonState;
    const mission = lesson.missions[window.teamManager.currentStageIdx];

    window.teamManager.teams.forEach(team => {
      const card = document.createElement('div');
      card.className = `dash-team-card ${team.isAllCompleted ? 'team-done' : ''}`;

      const doneCount = team.members.filter(m => m.completed).length;
      const totalCount = team.members.length;
      const percent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

      const rank = Number.isInteger(Number(team.rank)) && Number(team.rank) > 0 ? Number(team.rank) : null;
      const savedResult = mission && lesson.results[mission.id] && lesson.results[mission.id][String(team.id)];
      const roundScore = mission && mission.isPractice ? '연습 문제 · 점수 미반영'
        : rank && lesson.legacy && !savedResult ? '이전 라운드 기록'
        : `이번 라운드: +${window.RoomState.pointsForRank(rank)}점`;
      let rankBadgeHtml = '';
      if (rank) {
        const medalIcons = ['🥇 1등', '🥈 2등', '🥉 3등'];
        const icon = medalIcons[rank - 1] || `${rank}등`;
        rankBadgeHtml = `<span class="dash-rank-badge rank-${rank}">${icon} (${escapeHtml(team.completedTime)}초 완주)</span>`;
      } else {
        rankBadgeHtml = `<span class="dash-rank-badge ongoing">도전 중...</span>`;
      }

      card.innerHTML = `
        <div class="dash-team-header">
          <div class="team-name-group">
            <span class="dash-team-name">${escapeHtml(team.name)}</span>
            <span class="team-member-badge">정원: ${totalCount}명</span>
          </div>
          ${rankBadgeHtml}
        </div>
        <div class="dash-team-score">${roundScore} · 누적 점수: <strong>${escapeHtml(team.score)}점</strong></div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="dash-progress-info">
          <span>완료 인원: <strong>${doneCount} / ${totalCount}명</strong></span>
          <span>${Math.round(percent)}%</span>
        </div>
        <div class="dash-members-chips">
          ${team.members.map(m => `
            <div class="dash-member-chip ${m.completed ? 'chip-done' : 'chip-waiting'}">
              <span>${escapeHtml(m.name)}</span>
              <span>${m.completed ? `✓ (${escapeHtml(m.completedTime)}초)` : '풀이중'}</span>
            </div>
          `).join('')}
        </div>
      `;

      this.teamsLiveGrid.appendChild(card);
    });
  }

  // 모둠별 인원수 개별 설정 모달 열기
  openSettingsModal() {
    this.renderSettingsList();
    this.modalSettings.classList.remove('hidden');
  }

  renderSettingsList() {
    this.teamsConfigList.innerHTML = '';

    window.teamManager.teams.forEach(team => {
      const row = document.createElement('div');
      row.className = 't-team-cfg-item';

      row.innerHTML = `
        <input type="text" class="t-team-cfg-name" value="${escapeHtml(team.name)}" maxlength="40" data-team-id="${escapeHtml(team.id)}">
        <div class="t-member-count-controls">
          <button class="count-adjust-btn btn-minus" data-team-id="${team.id}">-</button>
          <span class="count-display">${team.members.length}명</span>
          <button class="count-adjust-btn btn-plus" data-team-id="${team.id}">+</button>
        </div>
        <button class="t-del-team-btn" data-team-id="${team.id}" title="모둠 삭제">🗑️</button>
      `;

      row.querySelector('.btn-minus').addEventListener('click', () => {
        this.runSettingsAction(() => window.teamManager.setTeamMemberCount(team.id, team.members.length - 1));
      });

      row.querySelector('.btn-plus').addEventListener('click', () => {
        this.runSettingsAction(() => window.teamManager.setTeamMemberCount(team.id, team.members.length + 1));
      });

      row.querySelector('.t-del-team-btn').addEventListener('click', () => {
        if (confirm(`'${team.name}'을(를) 삭제하시겠습니까?`)) {
          this.runSettingsAction(() => window.teamManager.removeTeam(team.id));
        }
      });

      row.querySelector('.t-team-cfg-name').addEventListener('change', (e) => {
        team.name = e.target.value.trim() || `${team.id}모둠`;
      });

      this.teamsConfigList.appendChild(row);
    });
  }

  setSettingsControlsDisabled(disabled) {
    this.modalSettings.querySelectorAll('button, input').forEach(control => {
      if (control.id !== 'btn-t-close-settings') control.disabled = disabled;
    });
  }

  async runSettingsAction(action) {
    if (this.settingsBusy || !window.cloudSync.isConnected) return false;
    this.settingsBusy = true;
    try {
      const task = action();
      this.renderSettingsList();
      this.setSettingsControlsDisabled(true);
      await task;
      return true;
    } catch (_) {
      await window.cloudSync.refreshIfConnected();
      return false;
    } finally {
      this.settingsBusy = false;
      this.renderSettingsList();
      this.setSettingsControlsDisabled(!window.cloudSync.isConnected);
    }
  }

  async saveSettingsFromModal() {
    const saved = await this.runSettingsAction(() => window.teamManager.applyTeamsConfig(window.teamManager.teams, true));
    if (saved) {
      this.modalSettings.classList.add('hidden');
      this.renderTeamsLive();
      this.showToast('모둠 구성이 저장되고 학생들에게 동기화되었습니다!');
    }
  }

  setMissionControlsDisabled(disabled) {
    this.modalMissions.querySelectorAll('button, input').forEach(control => {
      if (control.id !== 'btn-t-close-missions') control.disabled = disabled;
    });
  }

  openMissionsModal() {
    this.missionError.textContent = '';
    this.renderMissionList();
    this.modalMissions.classList.remove('hidden');
  }

  renderMissionList() {
    const lesson = window.teamManager.lessonState;
    this.missionList.innerHTML = '';
    if (lesson.legacy) {
      const notice = document.createElement('p');
      notice.className = 'settings-guide';
      notice.textContent = '이전 수업방의 문제와 점수는 유지됩니다. 연습부터 새로 시작하려면 새 교사 방을 열어 주세요.';
      this.missionList.appendChild(notice);
    }
    let round = 0;
    lesson.missions.forEach(mission => {
      const row = document.createElement('div');
      row.className = 't-mission-row';
      const label = document.createElement('label');
      label.textContent = mission.isPractice ? '연습 문제' : `${++round}라운드`;
      row.appendChild(label);
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 10;
      input.value = mission.word;
      input.setAttribute('aria-label', mission.isPractice ? '연습 문제 단어' : `${round}라운드 미션 단어`);
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'action-small-btn';
      save.textContent = '저장';
      save.addEventListener('click', () => this.editMission(mission.id, mission.word, input.value));
      row.appendChild(input);
      row.appendChild(save);
      this.missionList.appendChild(row);
    });
    this.setMissionControlsDisabled(!window.cloudSync.isConnected || this.missionBusy);
  }

  async runMissionAction(type, payload) {
    if (this.missionBusy || !window.cloudSync.isConnected) return false;
    this.missionBusy = true;
    this.missionError.textContent = '';
    this.setMissionControlsDisabled(true);
    try {
      await window.teamManager.broadcast(type, payload);
      return true;
    } catch (error) {
      this.missionError.textContent = error.message || '미션을 저장하지 못했습니다.';
      await window.cloudSync.refreshIfConnected();
      return false;
    } finally {
      this.missionBusy = false;
      this.renderMissionList();
    }
  }

  async editMission(id, expectedWord, input) {
    const word = input.trim().normalize('NFC');
    if (!window.RoomState.validWord(word)) {
      this.missionError.textContent = '미션은 한글 음절 1~10자로 입력해 주세요.';
      return;
    }
    if (word === expectedWord) return;
    const lesson = window.teamManager.lessonState;
    const hasResults = lesson.results[id] && Object.keys(lesson.results[id]).length > 0;
    const current = lesson.missions[window.teamManager.currentStageIdx];
    const hasProgress = current && current.id === id && window.teamManager.teams.some(team => team.members.some(member => member.completed));
    if ((hasResults || hasProgress) && !confirm('단어를 바꾸면 이 라운드의 제출과 점수가 초기화됩니다. 계속하시겠습니까?')) return;
    if (await this.runMissionAction('UPDATE_MISSION', { missionId: id, expectedWord, word })) {
      this.showToast('미션 단어가 모든 학생에게 동기화되었습니다.');
    }
  }

  async addMission() {
    const word = this.newMissionInput.value.trim().normalize('NFC');
    if (!window.RoomState.validWord(word)) {
      this.missionError.textContent = '미션은 한글 음절 1~10자로 입력해 주세요.';
      return;
    }
    const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    if (await this.runMissionAction('ADD_MISSION', { missionId: id, word })) {
      this.newMissionInput.value = '';
      this.showToast('새 미션이 추가되었습니다.');
    }
  }

  showFinalResults() {
    this.renderFinalResults();
    this.modalFinal.classList.remove('hidden');
  }

  renderFinalResults() {
    const lesson = window.teamManager.lessonState;
    const regular = lesson.missions.filter(mission => !mission.isPractice);
    const hasPoints = window.teamManager.teams.some(team => team.score > 0);
    document.getElementById('t-final-legacy-note').classList.toggle('hidden', !lesson.legacy);
    this.finalResultsList.innerHTML = '';
    window.RoomState.standings(window.teamManager.teams).forEach(({ team, rank }) => {
      const row = document.createElement('div');
      row.className = 't-final-result-row';
      const name = document.createElement('span');
      name.className = 'result-name';
      name.textContent = `${hasPoints ? `${rank}등` : '순위 대기'} · ${team.name}`;
      const score = document.createElement('strong');
      score.className = 'result-score';
      score.textContent = `${team.score}점`;
      const rounds = document.createElement('span');
      rounds.className = 'result-rounds';
      rounds.textContent = regular.map((mission, index) => {
        const result = lesson.results[mission.id] && lesson.results[mission.id][String(team.id)];
        return `${index + 1}R ${mission.word}: ${result ? `${result.points}점` : '—'}`;
      }).join(' · ');
      row.append(name, score, rounds);
      this.finalResultsList.appendChild(row);
    });
  }

  showBigQrModal() {
    const joinUrl = window.cloudSync.getJoinUrl();
    this.bigRoomCode.textContent = window.cloudSync.roomId;
    window.QrHelper.renderQr(this.bigQrContainer, joinUrl, 320);
    this.modalBigQr.classList.remove('hidden');
  }

  showLessonExplanation() {
    const expl = window.LessonExplanations.generateExplanationForWord(this.currentWord);
    const lesson = window.teamManager.lessonState;
    const currentMission = lesson.missions[this.currentStageIdx];
    const round = lesson.missions.slice(0, this.currentStageIdx + 1).filter(item => !item.isPractice).length;
    document.getElementById('expl-modal-title').textContent = `${currentMission.isPractice ? '연습 문제' : `${round}라운드`} · ‘${this.currentWord}’에 담긴 창제 원리`;
    document.getElementById('expl-summary-box').textContent = expl.summary;

    // 모둠 순위 발표
    const rankContainer = document.getElementById('expl-rank-container');
    rankContainer.innerHTML = '';
    const rankedTeams = [...window.teamManager.teams].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return 0;
    });

    const medalIcons = ['🥇 1등', '🥈 2등', '🥉 3등', '4등', '5등', '6등', '7등', '8등'];
    rankedTeams.forEach((team) => {
      const item = document.createElement('div');
      item.className = `expl-rank-item ${team.rank ? 'rank-finished' : 'rank-dnf'}`;
      const title = team.rank ? medalIcons[team.rank - 1] : '도전중';
      const timeStr = team.completedTime != null ? `${team.completedTime}초` : '-';
      const mission = lesson.missions[this.currentStageIdx];
      const points = window.RoomState.pointsForRank(Number(team.rank), mission && mission.isPractice);
      const savedResult = lesson.results[mission.id] && lesson.results[mission.id][String(team.id)];
      const scoreText = mission.isPractice ? '연습 · 점수 미반영'
        : team.rank && lesson.legacy && !savedResult ? '이전 라운드 기록' : `+${points}점`;

      item.innerHTML = `
        <div class="rank-pos">${title}</div>
        <div class="rank-team-name">${escapeHtml(team.name)} (${team.members.length}명)</div>
        <div class="rank-meta">소요시간: ${timeStr}</div>
        <div class="rank-score">${scoreText}</div>
      `;
      rankContainer.appendChild(item);
    });

    // 음절별 원리 카드
    const sylContainer = document.getElementById('expl-syllables-container');
    sylContainer.innerHTML = '';
    expl.points.forEach(pt => {
      const card = document.createElement('div');
      card.className = 'expl-syllable-card';
      card.innerHTML = `
        <div class="expl-syl-header">
          <span class="expl-syl-char">${pt.target}</span>
          <span class="expl-syl-title">음절 ‘${pt.target}’ 제자 원리</span>
        </div>
        <div class="expl-syl-parts">
          <div class="expl-part-box cho-part">
            <div class="part-badge">초성(첫소리)</div>
            <div class="part-char">${pt.cho.char}</div>
            <div class="part-content">
              <strong>${pt.cho.title}</strong>
              <p>${pt.cho.text}</p>
            </div>
          </div>
          <div class="expl-part-box jung-part">
            <div class="part-badge">중성(가운뎃소리)</div>
            <div class="part-char">${pt.jung.char}</div>
            <div class="part-content">
              <strong>${pt.jung.title}</strong>
              <p>${pt.jung.text}</p>
            </div>
          </div>
          <div class="expl-part-box jong-part">
            <div class="part-badge">종성(받침)</div>
            <div class="part-char">${pt.jong.char}</div>
            <div class="part-content">
              <strong>${pt.jong.title}</strong>
              <p>${pt.jong.text}</p>
            </div>
          </div>
        </div>
      `;
      sylContainer.appendChild(card);
    });

    // 토의 마당
    document.getElementById('expl-discussion-box').innerHTML = `
      <div class="discussion-box-inner">
        <h4>🗣️ 국어 수업 탐구 & 토의 마당</h4>
        <p>${expl.discussion}</p>
      </div>
    `;

    this.modalExplanation.classList.remove('hidden');
    window.soundEngine.playPyeongyeong(700);
  }

  copyJoinUrl() {
    const url = window.cloudSync.getJoinUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('참여 주소가 복사되었습니다!');
      });
    } else {
      prompt('참여 주소:', url);
    }
  }

  showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-notice toast-info visible';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.remove();
    }, 2200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.teacherDashboard = new TeacherDashboard();
  if (window.cloudSync) window.cloudSync.start('teacher');
});
