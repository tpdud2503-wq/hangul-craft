/**
 * 교사용 대시보드 인터랙션 스크립트
 */

const STAGES = [
  { word: '하늘', title: '제1장: 하늘과 땅' },
  { word: '바다', title: '제2장: 깊고 넓은 바다' },
  { word: '나무', title: '제3장: 사계절의 나무' },
  { word: '태양', title: '제4장: 눈부신 태양' },
  { word: '꽃', title: '제5장: 피어나는 꽃' },
  { word: '맑은', title: '제6장: 맑은 샘물' },
  { word: '세종대왕', title: '제7장: 성군 세종대왕' },
  { word: '훈민정음', title: '제8장: 훈민정음' }
];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

class TeacherDashboard {
  constructor() {
    this.currentStageIdx = 0;
    this.currentWord = STAGES[0].word;
    this.settingsBusy = false;

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

    // 문제 선택 변경
    this.tStageSelect.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      this.setStage(idx);
    });

    // 문제 일괄 시작 (리셋)
    this.btnStartProblem.addEventListener('click', async () => {
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
      if (this.currentStageIdx < STAGES.length - 1) {
        this.setStage(this.currentStageIdx + 1);
      } else {
        this.setStage(0);
      }
    });

    // 팀 매니저 상태 변화 구독
    window.teamManager.onUpdate(() => {
      this.renderTeamsLive();
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
      this.tRoomGuide.textContent = !connected
        ? '교사 방은 자동으로 열립니다. 연결이 완료되면 학생에게 QR을 보여 주세요.'
        : window.cloudSync.realtimeReady
          ? '교사 방이 열렸습니다. 학생이 QR로 입장한 뒤 문제 시작을 눌러 주세요.'
          : '교사 방이 열렸습니다. 실시간 연결이 차단되어 약 3초 간격으로 동기화합니다.';
      document.getElementById('btn-t-qr-toggle').disabled = !connected;
      document.getElementById('btn-t-copy-url').disabled = !connected;
      this.tJoinUrlInput.disabled = !connected;
      this.btnStartProblem.disabled = !connected;
      this.tStageSelect.disabled = !connected;
      document.getElementById('btn-t-settings').disabled = !connected;
      this.setSettingsControlsDisabled(!connected || this.settingsBusy);
    });
  }

  renderStageSelect() {
    this.tStageSelect.innerHTML = '';
    STAGES.forEach((stg, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${i + 1}. ${stg.word} (${stg.title.split(':')[0]})`;
      this.tStageSelect.appendChild(opt);
    });
    this.tStageSelect.value = this.currentStageIdx;
  }

  applyRoomStage(idx) {
    if (!STAGES[idx]) return;
    this.currentStageIdx = idx;
    this.currentWord = STAGES[idx].word;
    this.tStageSelect.value = idx;
  }

  async setStage(idx) {
    if (!STAGES[idx]) return;
    this.tStageSelect.disabled = true;
    try {
      await window.teamManager.broadcast('STAGE_CHANGE', { stageIdx: idx });
    } catch (_) {
      this.tStageSelect.value = this.currentStageIdx;
    } finally {
      this.tStageSelect.disabled = !window.cloudSync.isConnected;
    }
  }

  // 실시간 전광판 렌더링
  renderTeamsLive() {
    this.teamsLiveGrid.innerHTML = '';

    window.teamManager.teams.forEach(team => {
      const card = document.createElement('div');
      card.className = `dash-team-card ${team.isAllCompleted ? 'team-done' : ''}`;

      const doneCount = team.members.filter(m => m.completed).length;
      const totalCount = team.members.length;
      const percent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

      const rank = Number.isInteger(Number(team.rank)) && Number(team.rank) > 0 ? Number(team.rank) : null;
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
        <div class="dash-team-score">누적 점수: <strong>${escapeHtml(team.score)}점</strong></div>
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

  showBigQrModal() {
    const joinUrl = window.cloudSync.getJoinUrl();
    this.bigRoomCode.textContent = window.cloudSync.roomId;
    window.QrHelper.renderQr(this.bigQrContainer, joinUrl, 320);
    this.modalBigQr.classList.remove('hidden');
  }

  showLessonExplanation() {
    const expl = window.LessonExplanations.generateExplanationForWord(this.currentWord);

    document.getElementById('expl-modal-title').textContent = expl.title;
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
      const timeStr = team.completedTime ? `${team.completedTime}초` : '-';

      item.innerHTML = `
        <div class="rank-pos">${title}</div>
        <div class="rank-team-name">${escapeHtml(team.name)} (${team.members.length}명)</div>
        <div class="rank-meta">소요시간: ${timeStr}</div>
        <div class="rank-score">+${team.rank ? [100, 80, 60, 40, 20, 10][team.rank - 1] || 10 : 0}점</div>
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
