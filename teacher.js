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

class TeacherDashboard {
  constructor() {
    this.currentStageIdx = 0;
    this.currentWord = STAGES[0].word;

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
      window.teamManager.addTeam();
      this.renderSettingsList();
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
    this.btnStartProblem.addEventListener('click', () => {
      window.teamManager.resetMatchState(true);
      window.soundEngine.playJing();
      this.showToast('새 라운드가 시작되었습니다! 모든 학생 기기의 타이머가 시작됩니다.');
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

    const roomId = window.cloudSync.roomId;
    const joinUrl = window.cloudSync.getJoinUrl();

    this.tRoomCodeEl.textContent = roomId;
    this.tQrRoomText.textContent = roomId;
    this.tJoinUrlInput.value = joinUrl;

    // 좌측 QR코드 렌더링 (QrHelper 사용으로 인식률 100%)
    window.QrHelper.renderQr(this.tQrcodeContainer, joinUrl, 260);

    window.cloudSync.onStatusChange((connected, text) => {
      this.tCloudStatusEl.textContent = text;
      this.tCloudStatusEl.className = `cloud-status-dot ${connected ? 'online' : 'offline'}`;
      if (connected) {
        // 교사 대시보드 연결 즉시 방 전체에 현재 모둠 설정과 문제 상태 브로드캐스트
        window.teamManager.broadcast('ROOM_STATE_SYNC', {
          teams: window.teamManager.teams,
          stageIdx: this.currentStageIdx,
          matchStartTime: window.teamManager.matchStartTime,
          isMatchActive: window.teamManager.isMatchActive
        });
      }
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

  setStage(idx) {
    this.currentStageIdx = idx;
    this.currentWord = STAGES[idx].word;
    this.tStageSelect.value = idx;
    window.teamManager.broadcast('STAGE_CHANGE', { stageIdx: idx });
    window.teamManager.resetMatchState(false);
    this.renderTeamsLive();
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

      let rankBadgeHtml = '';
      if (team.rank) {
        const medalIcons = ['🥇 1등', '🥈 2등', '🥉 3등'];
        const icon = medalIcons[team.rank - 1] || `${team.rank}등`;
        rankBadgeHtml = `<span class="dash-rank-badge rank-${team.rank}">${icon} (${team.completedTime}초 완주)</span>`;
      } else {
        rankBadgeHtml = `<span class="dash-rank-badge ongoing">도전 중...</span>`;
      }

      card.innerHTML = `
        <div class="dash-team-header">
          <div class="team-name-group">
            <span class="dash-team-name">${team.name}</span>
            <span class="team-member-badge">정원: ${totalCount}명</span>
          </div>
          ${rankBadgeHtml}
        </div>
        <div class="dash-team-score">누적 점수: <strong>${team.score}점</strong></div>
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
              <span>${m.name}</span>
              <span>${m.completed ? `✓ (${m.completedTime}초)` : '풀이중'}</span>
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
        <input type="text" class="t-team-cfg-name" value="${team.name}" data-team-id="${team.id}">
        <div class="t-member-count-controls">
          <button class="count-adjust-btn btn-minus" data-team-id="${team.id}">-</button>
          <span class="count-display">${team.members.length}명</span>
          <button class="count-adjust-btn btn-plus" data-team-id="${team.id}">+</button>
        </div>
        <button class="t-del-team-btn" data-team-id="${team.id}" title="모둠 삭제">🗑️</button>
      `;

      row.querySelector('.btn-minus').addEventListener('click', () => {
        window.teamManager.setTeamMemberCount(team.id, team.members.length - 1);
        this.renderSettingsList();
      });

      row.querySelector('.btn-plus').addEventListener('click', () => {
        window.teamManager.setTeamMemberCount(team.id, team.members.length + 1);
        this.renderSettingsList();
      });

      row.querySelector('.t-del-team-btn').addEventListener('click', () => {
        if (confirm(`'${team.name}'을(를) 삭제하시겠습니까?`)) {
          window.teamManager.removeTeam(team.id);
          this.renderSettingsList();
        }
      });

      row.querySelector('.t-team-cfg-name').addEventListener('change', (e) => {
        team.name = e.target.value.trim() || `${team.id}모둠`;
      });

      this.teamsConfigList.appendChild(row);
    });
  }

  saveSettingsFromModal() {
    window.teamManager.applyTeamsConfig(window.teamManager.teams, true);
    window.teamManager.broadcast('ROOM_STATE_SYNC', {
      teams: window.teamManager.teams,
      stageIdx: this.currentStageIdx,
      matchStartTime: window.teamManager.matchStartTime,
      isMatchActive: window.teamManager.isMatchActive
    });
    this.modalSettings.classList.add('hidden');
    this.renderTeamsLive();
    this.showToast('모둠 구성 및 인원수가 저장되고 학생들에게 즉시 동기화되었습니다!');
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
        <div class="rank-team-name">${team.name} (${team.members.length}명)</div>
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
});
