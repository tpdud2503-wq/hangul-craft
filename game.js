/**
 * 훈민정음 창제 원리 게임 코어 로직
 */

// 스테이지 단어 목록
const STAGES = [
  {
    word: '하늘',
    title: '제1장: 하늘과 땅',
    desc: '세상의 시작인 하늘과 땅의 섭리를 담은 글자입니다.',
    story: '‘하’는 목구멍소리(ㅇ)에 획을 더한 거센소리 ㅎ과 사람 밖의 하늘 ㅏ로 이루어지고, ‘늘’은 혓소리 ㄴ과 땅 ㅡ, 그리고 혀가 굴러가는 이체자 ㄹ로 이루어집니다.'
  },
  {
    word: '바다',
    title: '제2장: 깊고 넓은 바다',
    desc: '입술소리(ㅁ)와 혓소리(ㄴ)에서 획을 더해 탄생한 단어입니다.',
    story: '‘바’는 입술(ㅁ)에 획을 더한 ㅂ과 양성모음 ㅏ, ‘다’는 혀(ㄴ)에 획을 더한 ㄷ과 ㅏ가 어우러졌습니다.'
  },
  {
    word: '나무',
    title: '제3장: 사계절의 나무',
    desc: '기본자의 소박함과 초출 모음이 조화를 이룹니다.',
    story: '설음 기본자 ㄴ과 순음 기본자 ㅁ, 그리고 땅 아래의 어두운 음성모음 ㅜ(ㅡ+ㆍ)를 복습해 보세요.'
  },
  {
    word: '태양',
    title: '제4장: 눈부신 태양',
    desc: '가획의 끝 ㅌ과 거듭나는 재출 모음 ㅑ를 만듭니다.',
    story: 'ㄴ에 획을 두 번 더한 ㅌ, 모음 합성 ㅐ(ㅏ+ㅣ), 그리고 ㆍ를 두 번 결합한 재출자 ㅑ가 빛납니다.'
  },
  {
    word: '꽃',
    title: '제5장: 피어나는 꽃',
    desc: '각자병서로 단단해진 된소리 ㄲ과 거센 잇소리 ㅊ 받침입니다.',
    story: 'ㄱ을 나란히 쓴 각자병서 ㄲ, ㆍ와 ㅡ가 결합한 ㅗ, ㅅ에 획을 두 번 더한 ㅊ이 한 음절을 이룹니다.'
  },
  {
    word: '맑은',
    title: '제6장: 맑은 샘물',
    desc: '두 자음이 나란히 결합하는 합용병서 겹받침 ㄺ을 완성해 보세요.',
    story: '‘맑’의 받침 ㄺ은 이체자 ㄹ과 기본자 ㄱ이 나란히 어깨를 맞댄 합용병서의 대표작입니다.'
  },
  {
    word: '세종대왕',
    title: '제7장: 성군 세종대왕',
    desc: '백성을 사랑하는 마음으로 스물여덟 글자를 창제하신 대왕의 존함입니다.',
    story: '복합모음 ㅔ, ㅐ, ㅘ와 각 자음의 오묘한 조화를 마음 깊이 새겨보세요.'
  },
  {
    word: '훈민정음',
    title: '제8장: 백성을 가르치는 바른 소리',
    desc: '모든 원리가 총망라된 우리 글자의 영원한 이름입니다.',
    story: '지혜로운 자는 아침나절에 깨칠 수 있고, 어리석은 자라도 열흘이면 배울 수 있는 만고의 문자입니다.'
  }
];

class HangulCraftGame {
  constructor() {
    this.currentStageIdx = 0;
    this.currentWord = STAGES[0].word;
    this.currentStageData = STAGES[0];
    this.customMode = false;

    // 현재 단어 분해 정보
    this.syllables = []; // [{ char, cho, jung, jong, completedCho, completedJung, completedJong, isDone }]
    this.activeSyllableIdx = 0;

    // 작업대 상태 (자음)
    this.consonantSlots = []; // 슬롯에 놓인 자음들 (최대 2개: 합용병서용)
    this.activeConsonantIdx = 0;

    // 작업대 상태 (모음)
    this.vowelSlots = []; // 슬롯에 놓인 모음들 (기본자 및 중간 모음)

    // 통계 & 칭찬
    this.totalCraftCount = 0;

    this.initDOM();
    this.bindEvents();
    this.loadStage(0);
  }

  initDOM() {
    // 단어 영역
    this.stageTitleEl = document.getElementById('stage-title');
    this.stageDescEl = document.getElementById('stage-desc');
    this.wordContainerEl = document.getElementById('target-word-container');
    this.stageSelectEl = document.getElementById('stage-select');

    // 현재 조립 글자 미리보기
    this.activeCharPreviewEl = document.getElementById('active-char-preview');
    this.slotChoEl = document.getElementById('slot-cho');
    this.slotJungEl = document.getElementById('slot-jung');
    this.slotJongEl = document.getElementById('slot-jong');

    // 자음 작업대
    this.cWorkbenchEl = document.getElementById('consonant-workbench');
    this.cSlotsContainerEl = document.getElementById('c-slots-container');
    this.cPrincipleInfoEl = document.getElementById('c-principle-info');

    // 모음 작업대
    this.vWorkbenchEl = document.getElementById('vowel-workbench');
    this.vSlotsContainerEl = document.getElementById('v-slots-container');
    this.vPrincipleInfoEl = document.getElementById('v-principle-info');

    // 조작 버튼들 (자음)
    this.btnGahoek = document.getElementById('btn-gahoek');
    this.btnByeongseo = document.getElementById('btn-byeongseo');
    this.btnIche = document.getElementById('btn-iche');
    this.btnHapyong = document.getElementById('btn-hapyong');
    this.btnSendCho = document.getElementById('btn-send-cho');
    this.btnSendJong = document.getElementById('btn-send-jong');
    this.btnClearC = document.getElementById('btn-clear-c');

    // 조작 버튼들 (모음)
    this.btnChochul = document.getElementById('btn-chochul');
    this.btnJaechul = document.getElementById('btn-jaechul');
    this.btnHapseong = document.getElementById('btn-hapseong');
    this.btnSendJung = document.getElementById('btn-send-jung');
    this.btnClearV = document.getElementById('btn-clear-v');

    // 탭
    this.tabConsonant = document.getElementById('tab-consonant');
    this.tabVowel = document.getElementById('tab-vowel');
    this.sectionConsonant = document.getElementById('section-consonant');
    this.sectionVowel = document.getElementById('section-vowel');

    // 모달 & 안내
    this.modalComplete = document.getElementById('modal-complete');
    this.modalGuide = document.getElementById('modal-guide');
    this.hintBoxEl = document.getElementById('hint-content');

    // 모둠 대항전 UI 요소
    this.selectMyTeam = document.getElementById('select-my-team');
    this.selectMyMember = document.getElementById('select-my-member');
    this.studentStatusBadge = document.getElementById('student-status-badge');
    this.teamProgressBar = document.getElementById('team-progress-bar');
    this.teamProgressText = document.getElementById('team-progress-text');

    this.modalDashboard = document.getElementById('modal-team-dashboard');
    this.teamsLiveContainer = document.getElementById('teams-live-container');
    this.dashCurrentProblem = document.getElementById('dash-current-problem');

    this.modalSettings = document.getElementById('modal-team-settings');
    this.cfgTeamCount = document.getElementById('cfg-team-count');
    this.cfgMemberCount = document.getElementById('cfg-member-count');

    this.modalExplanation = document.getElementById('modal-lesson-explanation');
    this.explModalTitle = document.getElementById('expl-modal-title');
    this.explRankContainer = document.getElementById('expl-rank-container');
    this.explSummaryBox = document.getElementById('expl-summary-box');
    this.explSyllablesContainer = document.getElementById('expl-syllables-container');
    this.explDiscussionBox = document.getElementById('expl-discussion-box');

    // QR코드 및 방 정보 요소
    this.modalQr = document.getElementById('modal-qrcode');
    this.qrCanvasContainer = document.getElementById('qrcode-canvas-container');
    this.qrModalRoomCode = document.getElementById('qr-modal-room-code');
    this.qrJoinUrlInput = document.getElementById('qr-join-url-input');
    this.roomCodeBadge = document.getElementById('room-code-badge');
    this.cloudStatusIndicator = document.getElementById('cloud-status-indicator');

    this.initTeamUI();
    this.initCloudUI();

    // 스테이지 셀렉트 옵션 채우기
    this.stageSelectEl.innerHTML = '';
    STAGES.forEach((stg, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${i + 1}. ${stg.word} (${stg.title.split(':')[0]})`;
      this.stageSelectEl.appendChild(opt);
    });
  }

  bindEvents() {
    // 탭 전환
    this.tabConsonant.addEventListener('click', () => this.switchTab('consonant'));
    this.tabVowel.addEventListener('click', () => this.switchTab('vowel'));

    // 스테이지 변경
    this.stageSelectEl.addEventListener('change', (e) => {
      this.customMode = false;
      this.loadStage(parseInt(e.target.value, 10));
    });

    // 커스텀 단어 입력
    document.getElementById('btn-custom-word').addEventListener('click', () => {
      this.promptCustomWord();
    });

    // 사운드 토글
    const btnSound = document.getElementById('btn-sound-toggle');
    btnSound.addEventListener('click', () => {
      const enabled = window.soundEngine.toggleSound();
      btnSound.textContent = enabled ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
      btnSound.classList.toggle('muted', !enabled);
    });

    // 도감 모달 열기/닫기
    document.getElementById('btn-open-guide').addEventListener('click', () => {
      this.modalGuide.classList.remove('hidden');
      window.soundEngine.playGayageum(500);
    });
    document.getElementById('btn-close-guide').addEventListener('click', () => {
      this.modalGuide.classList.add('hidden');
    });

    // 완료 모달 다음 단계 버튼
    document.getElementById('btn-next-stage').addEventListener('click', () => {
      this.modalComplete.classList.add('hidden');
      if (this.currentStageIdx < STAGES.length - 1) {
        this.loadStage(this.currentStageIdx + 1);
      } else {
        this.loadStage(0);
      }
    });

    // --- QR코드 모달 이벤트 바인딩 ---
    document.getElementById('btn-show-qr').addEventListener('click', () => {
      this.showQrModal();
      window.soundEngine.playGayageum(560);
    });
    document.getElementById('btn-close-qr').addEventListener('click', () => {
      this.modalQr.classList.add('hidden');
    });
    document.getElementById('btn-copy-join-url').addEventListener('click', () => {
      this.copyJoinUrl();
    });
    this.roomCodeBadge.addEventListener('click', () => {
      this.copyJoinUrl();
    });

    // --- 모둠 대항전 이벤트 바인딩 ---
    this.selectMyTeam.addEventListener('change', () => {
      const teamId = parseInt(this.selectMyTeam.value, 10);
      const memberId = parseInt(this.selectMyMember.value, 10);
      window.teamManager.setCurrentStudent(teamId, memberId);
    });

    this.selectMyMember.addEventListener('change', () => {
      const teamId = parseInt(this.selectMyTeam.value, 10);
      const memberId = parseInt(this.selectMyMember.value, 10);
      window.teamManager.setCurrentStudent(teamId, memberId);
    });

    // 모둠 전광판 열기/닫기
    document.getElementById('btn-team-dashboard').addEventListener('click', () => {
      this.modalDashboard.classList.remove('hidden');
      this.renderTeamDashboard();
      window.soundEngine.playGayageum(550);
    });
    document.getElementById('btn-close-dashboard').addEventListener('click', () => {
      this.modalDashboard.classList.add('hidden');
    });

    // 모둠 설정 열기/닫기/저장
    document.getElementById('btn-team-settings').addEventListener('click', () => {
      this.cfgTeamCount.value = window.teamManager.teamCount;
      this.cfgMemberCount.value = window.teamManager.memberCount;
      this.modalSettings.classList.remove('hidden');
    });
    document.getElementById('btn-close-settings').addEventListener('click', () => {
      this.modalSettings.classList.add('hidden');
    });
    document.getElementById('btn-save-team-settings').addEventListener('click', () => {
      const tc = parseInt(this.cfgTeamCount.value, 10);
      const mc = parseInt(this.cfgMemberCount.value, 10);
      window.teamManager.applyTeamConfig(tc, mc);
      this.modalSettings.classList.add('hidden');
      this.showNotice('모둠 구성 설정이 저장되고 동기화되었습니다.', 'success');
      this.initTeamUI();
    });

    // 문제 해설 보기 버튼들
    document.getElementById('btn-open-explanation').addEventListener('click', () => {
      this.showLessonExplanation();
    });
    document.getElementById('btn-close-explanation').addEventListener('click', () => {
      this.modalExplanation.classList.add('hidden');
    });
    document.getElementById('btn-view-explanation-from-complete').addEventListener('click', () => {
      this.modalComplete.classList.add('hidden');
      this.showLessonExplanation();
    });
    document.getElementById('btn-open-expl-from-dash').addEventListener('click', () => {
      this.modalDashboard.classList.add('hidden');
      this.showLessonExplanation();
    });

    // 해설 화면에서 다음 문제 진행
    document.getElementById('btn-expl-next-stage').addEventListener('click', () => {
      this.modalExplanation.classList.add('hidden');
      if (this.currentStageIdx < STAGES.length - 1) {
        this.loadStage(this.currentStageIdx + 1);
      } else {
        this.loadStage(0);
      }
    });

    // 이번 문제 재시작
    document.getElementById('btn-reset-match').addEventListener('click', () => {
      window.teamManager.resetMatchState(true);
      this.showNotice('이번 문제 모둠 대항전이 재시작되었습니다.', 'info');
    });

    // 힌트 버튼 토글
    const btnHint = document.getElementById('btn-toggle-hint');
    const hintPanel = document.getElementById('hint-panel');
    btnHint.addEventListener('click', () => {
      hintPanel.classList.toggle('hidden');
      window.soundEngine.playGayageum(440);
    });

    // --- 자음 기본자 버튼들 ---
    document.querySelectorAll('.c-basic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const char = e.currentTarget.dataset.char;
        this.addConsonantToWorkbench(char);
      });
    });

    // --- 모음 기본자 버튼들 ---
    document.querySelectorAll('.v-basic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const char = e.currentTarget.dataset.char;
        this.addVowelToWorkbench(char);
      });
    });

    // 자음 제자 액션 버튼들
    this.btnGahoek.addEventListener('click', () => this.actionGahoek());
    this.btnByeongseo.addEventListener('click', () => this.actionByeongseo());
    this.btnIche.addEventListener('click', () => this.actionIche());
    this.btnHapyong.addEventListener('click', () => this.actionHapyongConsonant());
    this.btnClearC.addEventListener('click', () => this.clearConsonantWorkbench());

    // 자음 슬롯으로 보내기
    this.btnSendCho.addEventListener('click', () => this.sendConsonantToSlot('cho'));
    this.btnSendJong.addEventListener('click', () => this.sendConsonantToSlot('jong'));

    // 모음 제자 액션 버튼들
    this.btnChochul.addEventListener('click', () => this.actionChochul());
    this.btnJaechul.addEventListener('click', () => this.actionJaechul());
    this.btnHapseong.addEventListener('click', () => this.actionHapseongVowel());
    this.btnClearV.addEventListener('click', () => this.clearVowelWorkbench());

    // 모음 슬롯으로 보내기
    this.btnSendJung.addEventListener('click', () => this.sendVowelToSlot());

    // 슬롯 자체 클릭 시 해당 요소 제거
    this.slotChoEl.addEventListener('click', () => {
      if (this.slotChoEl.textContent) {
        this.getCurrentSyllable().completedCho = '';
        window.soundEngine.playMoktak();
        this.updateAssemblyView();
      }
    });
    this.slotJungEl.addEventListener('click', () => {
      if (this.slotJungEl.textContent) {
        this.getCurrentSyllable().completedJung = '';
        window.soundEngine.playMoktak();
        this.updateAssemblyView();
      }
    });
    this.slotJongEl.addEventListener('click', () => {
      if (this.slotJongEl.textContent) {
        this.getCurrentSyllable().completedJong = '';
        window.soundEngine.playMoktak();
        this.updateAssemblyView();
      }
    });
  }

  switchTab(tab) {
    if (tab === 'consonant') {
      this.tabConsonant.classList.add('active');
      this.tabVowel.classList.remove('active');
      this.sectionConsonant.classList.remove('hidden');
      this.sectionVowel.classList.add('hidden');
    } else {
      this.tabVowel.classList.add('active');
      this.tabConsonant.classList.remove('active');
      this.sectionVowel.classList.remove('hidden');
      this.sectionConsonant.classList.add('hidden');
    }
    window.soundEngine.playGayageum(520);
  }

  promptCustomWord() {
    const input = prompt('직접 창제해보고 싶은 한글 단어를 입력하세요 (1~5글자 권장):', '대한민국');
    if (!input) return;
    const cleanWord = input.trim().replace(/[^가-힣]/g, '');
    if (!cleanWord) {
      alert('올바른 한글 단어를 입력해 주세요.');
      return;
    }
    this.customMode = true;
    this.currentWord = cleanWord;
    this.currentStageData = {
      word: cleanWord,
      title: '자유 창제 마당',
      desc: `‘${cleanWord}’ 단어를 훈민정음의 원리로 빚어냅니다.`,
      story: `직접 정한 소중한 단어를 초성, 중성, 종성의 제자 원리로 완성해 보세요!`
    };
    this.loadCustomWord();
  }

  loadStage(idx, sync = true) {
    this.currentStageIdx = idx;
    this.currentStageData = STAGES[idx];
    this.currentWord = this.currentStageData.word;
    this.stageSelectEl.value = idx;
    if (sync && window.teamManager) {
      window.teamManager.broadcast('STAGE_CHANGE', { stageIdx: idx });
      window.teamManager.resetMatchState(false);
    }
    this.setupWord();
  }

  loadCustomWord() {
    if (window.teamManager) {
      window.teamManager.resetMatchState(false);
    }
    this.setupWord();
  }

  setupWord() {
    this.stageTitleEl.textContent = this.currentStageData.title;
    this.stageDescEl.textContent = this.currentStageData.desc;

    this.syllables = [];
    for (let i = 0; i < this.currentWord.length; i++) {
      const char = this.currentWord[i];
      const decomp = window.HangulEngine.decomposeSyllable(char);
      if (decomp) {
        this.syllables.push({
          char: char,
          cho: decomp.cho,
          jung: decomp.jung,
          jong: decomp.jong,
          completedCho: '',
          completedJung: '',
          completedJong: '',
          isDone: false
        });
      }
    }

    this.activeSyllableIdx = 0;
    this.clearConsonantWorkbench();
    this.clearVowelWorkbench();
    this.renderWordCards();
    this.updateAssemblyView();
    this.updateHints();

    window.soundEngine.playPyeongyeong(660);
  }

  getCurrentSyllable() {
    return this.syllables[this.activeSyllableIdx];
  }

  renderWordCards() {
    this.wordContainerEl.innerHTML = '';
    this.syllables.forEach((syl, idx) => {
      const card = document.createElement('div');
      card.className = `word-card ${idx === this.activeSyllableIdx ? 'active' : ''} ${syl.isDone ? 'done' : ''}`;
      
      const targetChar = document.createElement('span');
      targetChar.className = 'target-char';
      targetChar.textContent = syl.char;

      const currentAssembled = window.HangulEngine.composeSyllable(
        syl.completedCho || 'ㅇ',
        syl.completedJung || 'ㅡ',
        syl.completedJong || ''
      );

      const statusBadge = document.createElement('span');
      statusBadge.className = 'status-badge';
      statusBadge.textContent = syl.isDone ? '✓ 완성' : `${idx + 1}번째`;

      card.appendChild(targetChar);
      card.appendChild(statusBadge);

      card.addEventListener('click', () => {
        this.activeSyllableIdx = idx;
        this.renderWordCards();
        this.updateAssemblyView();
        this.updateHints();
        window.soundEngine.playGayageum(440);
      });

      this.wordContainerEl.appendChild(card);
    });
  }

  updateAssemblyView() {
    const syl = this.getCurrentSyllable();
    if (!syl) return;

    this.slotChoEl.textContent = syl.completedCho || '';
    this.slotChoEl.classList.toggle('filled', !!syl.completedCho);

    this.slotJungEl.textContent = syl.completedJung || '';
    this.slotJungEl.classList.toggle('filled', !!syl.completedJung);

    this.slotJongEl.textContent = syl.completedJong || '';
    this.slotJongEl.classList.toggle('filled', !!syl.completedJong);

    // 종성이 필요 없는 글자일 경우 힌트 표시
    const jongHint = document.getElementById('jong-required-hint');
    if (!syl.jong) {
      jongHint.textContent = '(받침 없음)';
      jongHint.className = 'jong-optional';
    } else {
      jongHint.textContent = `(받침: ${syl.jong})`;
      jongHint.className = 'jong-needed';
    }

    // 완성 글자 미리보기
    if (syl.completedCho && syl.completedJung) {
      const assembled = window.HangulEngine.composeSyllable(syl.completedCho, syl.completedJung, syl.completedJong);
      this.activeCharPreviewEl.textContent = assembled;

      if (assembled === syl.char) {
        if (!syl.isDone) {
          syl.isDone = true;
          this.activeCharPreviewEl.classList.add('match-success');
          window.soundEngine.playPyeongyeong(880);
          this.showNotice(`✨ ‘${syl.char}’ 음절 완성!`, 'success');
          this.renderWordCards();

          // 단어 전체 완성 확인
          if (this.checkAllCompleted()) {
            setTimeout(() => this.celebrateWordComplete(), 600);
          } else {
            // 아직 남은 글자가 있다면 다음 미완성 글자로 자동 이동 제안
            setTimeout(() => {
              const nextIdx = this.syllables.findIndex(s => !s.isDone);
              if (nextIdx !== -1) {
                this.activeSyllableIdx = nextIdx;
                this.renderWordCards();
                this.updateAssemblyView();
                this.updateHints();
              }
            }, 800);
          }
        }
      } else {
        syl.isDone = false;
        this.activeCharPreviewEl.classList.remove('match-success');
        this.renderWordCards();
      }
    } else {
      syl.isDone = false;
      this.activeCharPreviewEl.textContent = '?';
      this.activeCharPreviewEl.classList.remove('match-success');
    }
  }

  checkAllCompleted() {
    return this.syllables.every(s => s.isDone);
  }

  celebrateWordComplete() {
    window.soundEngine.playWordComplete();
    this.totalCraftCount++;

    // 팀 매니저에 현재 학생 완료 등록
    if (window.teamManager) {
      const cur = window.teamManager.currentStudent;
      window.teamManager.recordMemberCompletion(cur.teamId, cur.memberId);
    }

    const modalTitle = document.getElementById('modal-complete-title');
    const modalWord = document.getElementById('modal-complete-word');
    const modalStory = document.getElementById('modal-complete-story');
    const modalTeamInfo = document.getElementById('modal-complete-team-info');

    modalTitle.textContent = `경축! ‘${this.currentWord}’ 창제 완성`;
    modalWord.textContent = this.currentWord;
    modalStory.textContent = this.currentStageData.story;

    if (window.teamManager) {
      const cur = window.teamManager.currentStudent;
      const team = window.teamManager.teams.find(t => t.id === cur.teamId);
      if (team) {
        const doneCount = team.members.filter(m => m.completed).length;
        const totalCount = team.members.length;

        if (team.isAllCompleted) {
          modalTeamInfo.innerHTML = `
            <div class="team-all-done-banner">
              🎉 <strong>${team.name}</strong> 전원 완성! <br>
              <strong>모둠 등수: <span class="rank-highlight">${team.rank}등 🏆</span></strong> (소요 시간: ${team.completedTime}초)
            </div>
          `;
        } else {
          modalTeamInfo.innerHTML = `
            <div class="team-waiting-banner">
              🏃‍♂️ 나의 글자 완성 완료! <br>
              우리 모둠원들의 완성을 기다리는 중입니다... (<strong>${doneCount} / ${totalCount}명 완료</strong>)
            </div>
          `;
        }
      }
    }

    this.modalComplete.classList.remove('hidden');
    this.createConfetti();
  }

  createConfetti() {
    const container = document.body;
    for (let i = 0; i < 40; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-particle';
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.backgroundColor = ['#c92a2a', '#e03131', '#1971c2', '#2f9e44', '#f59f00', '#f08c00'][Math.floor(Math.random() * 6)];
      confetti.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(confetti);
      setTimeout(() => confetti.remove(), 3500);
    }
  }

  // =====================
  // 자음 작업대 로직
  // =====================
  addConsonantToWorkbench(char) {
    if (this.consonantSlots.length >= 2) {
      // 2개 초과 시 첫 번째 교체
      this.consonantSlots[0] = this.consonantSlots[1];
      this.consonantSlots[1] = char;
      this.activeConsonantIdx = 1;
    } else {
      this.consonantSlots.push(char);
      this.activeConsonantIdx = this.consonantSlots.length - 1;
    }

    const info = window.HangulEngine.BASIC_INFO[char];
    this.showConsonantPrinciple(`[기본자 ${char}] ${info.name}: ${info.organ} - ${info.shape}`);
    window.soundEngine.playBuk();
    this.renderConsonantWorkbench();
  }

  renderConsonantWorkbench() {
    this.cSlotsContainerEl.innerHTML = '';
    if (this.consonantSlots.length === 0) {
      this.cSlotsContainerEl.innerHTML = '<span class="empty-hint">아래 기본자(ㄱ, ㄴ, ㅁ, ㅅ, ㅇ)를 선택하세요</span>';
      this.btnGahoek.disabled = true;
      this.btnByeongseo.disabled = true;
      this.btnIche.disabled = true;
      this.btnHapyong.disabled = true;
      this.btnSendCho.disabled = true;
      this.btnSendJong.disabled = true;
      return;
    }

    this.consonantSlots.forEach((char, idx) => {
      const slot = document.createElement('div');
      slot.className = `workbench-chip ${idx === this.activeConsonantIdx ? 'active' : ''}`;
      slot.textContent = char;
      slot.title = '클릭하여 선택';
      slot.addEventListener('click', () => {
        this.activeConsonantIdx = idx;
        this.renderConsonantWorkbench();
        window.soundEngine.playGayageum(480);
      });
      this.cSlotsContainerEl.appendChild(slot);
    });

    const activeChar = this.consonantSlots[this.activeConsonantIdx];

    // 버튼 활성화 여부 계산
    this.btnGahoek.disabled = !window.HangulEngine.GAHOEK_MAP[activeChar];
    this.btnByeongseo.disabled = !window.HangulEngine.BYEONGSEO_MAP[activeChar];
    this.btnIche.disabled = !window.HangulEngine.ICHE_MAP[activeChar];
    this.btnHapyong.disabled = this.consonantSlots.length < 2;
    this.btnSendCho.disabled = false;
    this.btnSendJong.disabled = false;
  }

  // 1. 가획 (加劃)
  actionGahoek() {
    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    const nextChar = window.HangulEngine.GAHOEK_MAP[activeChar];
    if (nextChar) {
      this.consonantSlots[this.activeConsonantIdx] = nextChar;
      const desc = window.HangulEngine.GAHOEK_EXPLANATIONS[nextChar] || '소리가 거세어져 획을 더함';
      this.showConsonantPrinciple(`[가획 加劃] ${activeChar} ➔ ${nextChar} : ${desc}`);
      window.soundEngine.playPyeongyeong(720);
      this.renderConsonantWorkbench();
      this.animateCraftAction(this.btnGahoek);
    }
  }

  // 2. 각자병서 (各自並書)
  actionByeongseo() {
    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    const nextChar = window.HangulEngine.BYEONGSEO_MAP[activeChar];
    if (nextChar) {
      this.consonantSlots[this.activeConsonantIdx] = nextChar;
      this.showConsonantPrinciple(`[각자병서 各自並書] ${activeChar} ➔ ${nextChar} : 같은 글자를 나란히 써서 된소리를 냄`);
      window.soundEngine.playBuk();
      this.renderConsonantWorkbench();
      this.animateCraftAction(this.btnByeongseo);
    }
  }

  // 3. 이체 (異體)
  actionIche() {
    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    const nextChar = window.HangulEngine.ICHE_MAP[activeChar];
    if (nextChar) {
      this.consonantSlots[this.activeConsonantIdx] = nextChar;
      const desc = window.HangulEngine.ICHE_EXPLANATIONS[nextChar] || '기본자에서 모양을 달리하여 만듦';
      this.showConsonantPrinciple(`[이체 異體] ${activeChar} ➔ ${nextChar} : ${desc}`);
      window.soundEngine.playGayageum(640);
      this.renderConsonantWorkbench();
      this.animateCraftAction(this.btnIche);
    }
  }

  // 4. 합용병서 (合用並書)
  actionHapyongConsonant() {
    if (this.consonantSlots.length < 2) return;
    const c1 = this.consonantSlots[0];
    const c2 = this.consonantSlots[1];
    const key1 = `${c1}+${c2}`;
    const key2 = `${c2}+${c1}`;
    const result = window.HangulEngine.HAPYONG_CONSONANTS[key1] || window.HangulEngine.HAPYONG_CONSONANTS[key2];

    if (result) {
      this.consonantSlots = [result];
      this.activeConsonantIdx = 0;
      this.showConsonantPrinciple(`[합용병서 合用並書] ${c1} + ${c2} ➔ ${result} : 서로 다른 자음을 나란히 써서 겹받침을 완성함`);
      window.soundEngine.playPyeongyeong(800);
      this.renderConsonantWorkbench();
      this.animateCraftAction(this.btnHapyong);
    } else {
      this.showNotice(`[${c1}]와 [${c2}]는 합용병서로 결합할 수 없는 조합입니다.`, 'error');
      window.soundEngine.playMoktak();
    }
  }

  clearConsonantWorkbench() {
    this.consonantSlots = [];
    this.activeConsonantIdx = 0;
    this.showConsonantPrinciple('자음 기본자(ㄱ, ㄴ, ㅁ, ㅅ, ㅇ)를 선택하여 창제를 시작하세요.');
    this.renderConsonantWorkbench();
  }

  sendConsonantToSlot(slotType) {
    if (this.consonantSlots.length === 0) return;
    const char = this.consonantSlots[this.activeConsonantIdx];
    const syl = this.getCurrentSyllable();

    if (slotType === 'cho') {
      // 초성 검증 (초성에는 ㄳ, ㄺ 등 합용병서 겹받침 불가)
      if (window.HangulEngine.CHOSUNG.includes(char)) {
        syl.completedCho = char;
        this.showNotice(`‘${char}’을 초성 슬롯에 넣었습니다.`, 'info');
        window.soundEngine.playGayageum(600);
        this.updateAssemblyView();
        // 초성 넣은 후 모음 탭으로 자연스럽게 안내
        if (!syl.completedJung) {
          setTimeout(() => this.switchTab('vowel'), 300);
        }
      } else {
        this.showNotice(`[${char}]은 초성에 올 수 없는 겹받침 자음입니다. 종성(받침)에 넣어보세요!`, 'error');
        window.soundEngine.playMoktak();
      }
    } else if (slotType === 'jong') {
      if (window.HangulEngine.JONGSUNG.includes(char)) {
        syl.completedJong = char;
        this.showNotice(`‘${char}’을 종성(받침) 슬롯에 넣었습니다.`, 'info');
        window.soundEngine.playGayageum(500);
        this.updateAssemblyView();
      } else {
        this.showNotice(`[${char}]은 받침으로 사용할 수 없는 자음입니다.`, 'error');
        window.soundEngine.playMoktak();
      }
    }
  }

  showConsonantPrinciple(text) {
    this.cPrincipleInfoEl.innerHTML = text;
  }

  // =====================
  // 모음 작업대 로직
  // =====================
  addVowelToWorkbench(char) {
    if (this.vowelSlots.length >= 2) {
      this.vowelSlots[0] = this.vowelSlots[1];
      this.vowelSlots[1] = char;
    } else {
      this.vowelSlots.push(char);
    }

    const info = window.HangulEngine.BASIC_INFO[char];
    if (info) {
      this.showVowelPrinciple(`[기본자 ${char}] ${info.name}: ${info.symbol} - ${info.shape}`);
    } else {
      this.showVowelPrinciple(`모음 [${char}]이 작업대에 놓였습니다.`);
    }

    window.soundEngine.playBuk();
    this.renderVowelWorkbench();
  }

  renderVowelWorkbench() {
    this.vSlotsContainerEl.innerHTML = '';
    if (this.vowelSlots.length === 0) {
      this.vSlotsContainerEl.innerHTML = '<span class="empty-hint">아래 삼재 기본자(ㆍ, ㅡ, ㅣ)를 선택하세요</span>';
      this.btnChochul.disabled = true;
      this.btnJaechul.disabled = true;
      this.btnHapseong.disabled = true;
      this.btnSendJung.disabled = true;
      return;
    }

    this.vowelSlots.forEach((char, idx) => {
      const slot = document.createElement('div');
      slot.className = 'workbench-chip active';
      slot.textContent = char;
      this.vSlotsContainerEl.appendChild(slot);
    });

    // 버튼 활성화 여부 계산
    // 초출자: 기본자 2개 (ㆍ+ㅡ, ㅡ+ㆍ, ㆍ+ㅣ, ㅣ+ㆍ)
    let canChochul = false;
    if (this.vowelSlots.length === 2) {
      const [v1, v2] = this.vowelSlots;
      canChochul = window.HangulEngine.CHOCHUL_RULES.some(r => 
        (r.ingredients[0] === v1 && r.ingredients[1] === v2) ||
        (r.ingredients[0] === v2 && r.ingredients[1] === v1)
      );
    }
    this.btnChochul.disabled = !canChochul;

    // 재출자: 초출자(ㅗ, ㅜ, ㅏ, ㅓ) + ㆍ 또는 슬롯에 초출자 1개 있을 때 ㆍ를 즉시 재출
    let canJaechul = false;
    if (this.vowelSlots.length === 2) {
      const [v1, v2] = this.vowelSlots;
      canJaechul = (v2 === 'ㆍ' && ['ㅗ','ㅜ','ㅏ','ㅓ'].includes(v1)) ||
                   (v1 === 'ㆍ' && ['ㅗ','ㅜ','ㅏ','ㅓ'].includes(v2));
    } else if (this.vowelSlots.length === 1) {
      canJaechul = ['ㅗ','ㅜ','ㅏ','ㅓ'].includes(this.vowelSlots[0]);
    }
    this.btnJaechul.disabled = !canJaechul;

    // 모음 합성 (합용): 2개 결합 (ㅏ+ㅣ, ㅗ+ㅏ 등)
    let canHapseong = false;
    if (this.vowelSlots.length === 2) {
      const combo1 = `${this.vowelSlots[0]}+${this.vowelSlots[1]}`;
      const combo2 = `${this.vowelSlots[1]}+${this.vowelSlots[0]}`;
      canHapseong = !!(window.HangulEngine.VOWEL_COMBINATIONS[combo1] || window.HangulEngine.VOWEL_COMBINATIONS[combo2]);
    }
    this.btnHapseong.disabled = !canHapseong;

    // 중성으로 보내기: 슬롯이 1개이고 현대 한글 유니코드 중성에 있는 경우
    const canSend = this.vowelSlots.length === 1 && window.HangulEngine.JUNGSUNG.includes(this.vowelSlots[0]);
    this.btnSendJung.disabled = !canSend;
  }

  // 1. 초출 합성 (初出 合成: ㆍ와 ㅡ, ㅣ의 결합)
  actionChochul() {
    if (this.vowelSlots.length < 2) return;
    const v1 = this.vowelSlots[0];
    const v2 = this.vowelSlots[1];

    const hasCheon = (v1 === 'ㆍ' || v2 === 'ㆍ');
    const hasJi = (v1 === 'ㅡ' || v2 === 'ㅡ');
    const hasIn = (v1 === 'ㅣ' || v2 === 'ㅣ');

    if (hasCheon && hasJi) {
      // ㆍ와 ㅡ 결합 -> ㅗ(하늘이 땅 위) 또는 ㅜ(하늘이 땅 아래) 선택 모달/팝업
      this.promptChochulChoice([
        { char: 'ㅗ', name: 'ㅗ (오)', desc: '하늘(ㆍ)이 땅(ㅡ) 위에 있음 (밝은 양성 모음)' },
        { char: 'ㅜ', name: 'ㅜ (우)', desc: '하늘(ㆍ)이 땅(ㅡ) 아래에 있음 (어두운 음성 모음)' }
      ]);
    } else if (hasCheon && hasIn) {
      // ㆍ와 ㅣ 결합 -> ㅏ(하늘이 사람 밖) 또는 ㅓ(하늘이 사람 안) 선택
      this.promptChochulChoice([
        { char: 'ㅏ', name: 'ㅏ (아)', desc: '하늘(ㆍ)이 사람(ㅣ) 바깥(동쪽)에 있음 (양성 모음)' },
        { char: 'ㅓ', name: 'ㅓ (어)', desc: '하늘(ㆍ)이 사람(ㅣ) 안쪽(서쪽)에 있음 (음성 모음)' }
      ]);
    } else {
      this.showNotice('초출 합성은 ㆍ(하늘)과 ㅡ(땅) 또는 ㅣ(사람)의 결합이어야 합니다.', 'error');
      window.soundEngine.playMoktak();
    }
  }

  promptChochulChoice(options) {
    // 기존 팝업이 있다면 제거
    const existing = document.getElementById('chochul-choice-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'chochul-choice-overlay';
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card choice-dialog-card';

    card.innerHTML = `
      <div class="choice-dialog-header">
        <h3>☀️ 초출자(初出字) 방향과 음양의 선택</h3>
        <p>하늘(ㆍ)이 놓인 위치에 따라 소리와 음양이 달라집니다. 어느 글자를 빚으시겠습니까?</p>
      </div>
      <div class="choice-dialog-options"></div>
    `;

    const optionsContainer = card.querySelector('.choice-dialog-options');
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'choice-option-btn';
      btn.innerHTML = `
        <span class="choice-opt-char">${opt.char}</span>
        <div class="choice-opt-text">
          <strong>${opt.name}</strong>
          <span>${opt.desc}</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.vowelSlots = [opt.char];
        this.showVowelPrinciple(`[초출자 初出字] ➔ ${opt.char} : ${opt.desc}`);
        window.soundEngine.playPyeongyeong(820);
        this.renderVowelWorkbench();
        this.animateCraftAction(this.btnChochul);
        overlay.remove();
      });
      optionsContainer.appendChild(btn);
    });

    overlay.appendChild(card);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
    window.soundEngine.playGayageum(560);
  }

  // 2. 재출 합성 (再出 合成: 초출자에 ㆍ를 한 번 더 합성)
  actionJaechul() {
    let baseChar = '';
    if (this.vowelSlots.length === 2) {
      if (this.vowelSlots[0] === 'ㆍ') baseChar = this.vowelSlots[1];
      else if (this.vowelSlots[1] === 'ㆍ') baseChar = this.vowelSlots[0];
    } else if (this.vowelSlots.length === 1) {
      baseChar = this.vowelSlots[0];
    }

    const rule = window.HangulEngine.JAECHUL_RULES.find(r => r.base === baseChar);
    if (rule) {
      this.vowelSlots = [rule.result];
      this.showVowelPrinciple(`[재출자 再出字] ${baseChar} + ㆍ ➔ ${rule.result} : ${rule.desc}`);
      window.soundEngine.playPyeongyeong(880);
      this.renderVowelWorkbench();
      this.animateCraftAction(this.btnJaechul);
    } else {
      this.showNotice('재출 합성을 하려면 초출자(ㅗ, ㅜ, ㅏ, ㅓ)와 ㆍ가 필요합니다.', 'error');
      window.soundEngine.playMoktak();
    }
  }

  // 3. 모음 합성 (합용: 복합모음 제작)
  actionHapseongVowel() {
    if (this.vowelSlots.length < 2) return;
    const v1 = this.vowelSlots[0];
    const v2 = this.vowelSlots[1];
    const key1 = `${v1}+${v2}`;
    const key2 = `${v2}+${v1}`;
    const result = window.HangulEngine.VOWEL_COMBINATIONS[key1] || window.HangulEngine.VOWEL_COMBINATIONS[key2];

    if (result) {
      this.vowelSlots = [result];
      this.showVowelPrinciple(`[모음 합성 合用] ${v1} + ${v2} ➔ ${result} : 두 모음을 결합하여 복합 모음을 만듦`);
      window.soundEngine.playPyeongyeong(840);
      this.renderVowelWorkbench();
      this.animateCraftAction(this.btnHapseong);
    } else {
      this.showNotice(`[${v1}]와 [${v2}]는 합성할 수 없는 모음 조합입니다.`, 'error');
      window.soundEngine.playMoktak();
    }
  }

  clearVowelWorkbench() {
    this.vowelSlots = [];
    this.showVowelPrinciple('삼재 기본자(ㆍ, ㅡ, ㅣ)를 선택하여 모음 창제를 시작하세요.');
    this.renderVowelWorkbench();
  }

  sendVowelToSlot() {
    if (this.vowelSlots.length !== 1) return;
    const char = this.vowelSlots[0];
    const syl = this.getCurrentSyllable();

    if (window.HangulEngine.JUNGSUNG.includes(char)) {
      syl.completedJung = char;
      this.showNotice(`‘${char}’을 중성 슬롯에 넣었습니다.`, 'info');
      window.soundEngine.playGayageum(640);
      this.updateAssemblyView();

      // 만약 종성이 필요한 글자이고 아직 안 채워졌다면 자음 탭으로 안내
      if (syl.jong && !syl.completedJong) {
        setTimeout(() => this.switchTab('consonant'), 300);
      }
    } else {
      this.showNotice(`[${char}]은 완성된 중성 모음이 아닙니다. 합성 버튼을 눌러보세요!`, 'error');
      window.soundEngine.playMoktak();
    }
  }

  showVowelPrinciple(text) {
    this.vPrincipleInfoEl.innerHTML = text;
  }

  // =====================
  // 힌트 시스템
  // =====================
  updateHints() {
    const syl = this.getCurrentSyllable();
    if (!syl) return;

    const choRecipe = window.HangulEngine.getConsonantRecipe(syl.cho);
    const jungRecipe = window.HangulEngine.getVowelRecipe(syl.jung);
    const jongRecipe = syl.jong ? window.HangulEngine.getConsonantRecipe(syl.jong) : null;

    let html = `<div class="hint-syllable-title">🎯 목표 음절: <strong>${syl.char}</strong></div>`;

    // 초성 레시피
    html += `<div class="hint-part"><strong>[초성 ${syl.cho}]</strong>: `;
    if (choRecipe) {
      html += `${choRecipe.steps.join(' ➔ ')} <br><span class="hint-sub">${choRecipe.explanation}</span>`;
    }
    html += `</div>`;

    // 중성 레시피
    html += `<div class="hint-part"><strong>[중성 ${syl.jung}]</strong>: `;
    if (jungRecipe) {
      html += `${jungRecipe.steps.join(' ➔ ')} <br><span class="hint-sub">${jungRecipe.explanation}</span>`;
    }
    html += `</div>`;

    // 종성 레시피
    if (jongRecipe) {
      html += `<div class="hint-part"><strong>[받침 ${syl.jong}]</strong>: `;
      html += `${jongRecipe.steps.join(' ➔ ')} <br><span class="hint-sub">${jongRecipe.explanation}</span>`;
      html += `</div>`;
    } else {
      html += `<div class="hint-part"><strong>[받침]</strong>: 없음 (초성과 중성만으로 완성!)</div>`;
    }

    this.hintBoxEl.innerHTML = html;
  }

  // 액션 버튼 애니메이션
  animateCraftAction(btn) {
    btn.classList.add('pulse-highlight');
    setTimeout(() => btn.classList.remove('pulse-highlight'), 400);
  }

  // 토스트 메시지
  showNotice(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notice toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 20);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  // =====================
  // 모둠 대항전 UI 연동
  // =====================
  initTeamUI() {
    if (!window.teamManager) return;

    // 모둠 드롭다운 채우기
    this.selectMyTeam.innerHTML = '';
    window.teamManager.teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      this.selectMyTeam.appendChild(opt);
    });
    this.selectMyTeam.value = window.teamManager.currentStudent.teamId;

    // 학생 드롭다운 채우기
    this.updateMemberSelectOptions();

    // 팀 매니저 업데이트 콜백 등록
    window.teamManager.onUpdate(() => {
      this.updateTeamQuickBar();
      if (!this.modalDashboard.classList.contains('hidden')) {
        this.renderTeamDashboard();
      }
    });

    this.updateTeamQuickBar();
  }

  updateMemberSelectOptions() {
    const teamId = parseInt(this.selectMyTeam.value, 10);
    const team = window.teamManager.teams.find(t => t.id === teamId);
    this.selectMyMember.innerHTML = '';

    if (team) {
      team.members.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        this.selectMyMember.appendChild(opt);
      });
      this.selectMyMember.value = window.teamManager.currentStudent.memberId;
    }
  }

  updateTeamQuickBar() {
    if (!window.teamManager) return;
    const cur = window.teamManager.currentStudent;
    const team = window.teamManager.teams.find(t => t.id === cur.teamId);
    if (!team) return;

    const myMember = team.members.find(m => m.id === cur.memberId);
    if (myMember && myMember.completed) {
      this.studentStatusBadge.textContent = '완성 완료 ✓';
      this.studentStatusBadge.className = 'student-status-chip completed';
    } else {
      this.studentStatusBadge.textContent = '풀이 중 ✍️';
      this.studentStatusBadge.className = 'student-status-chip solving';
    }

    const doneCount = team.members.filter(m => m.completed).length;
    const totalCount = team.members.length;
    const percent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    this.teamProgressBar.style.width = `${percent}%`;
    this.teamProgressText.textContent = `${doneCount} / ${totalCount}명 완료`;

    if (team.isAllCompleted) {
      this.teamProgressText.innerHTML = `<strong>${doneCount}/${totalCount}명 전원 완료! (${team.rank}등 🏆)</strong>`;
    }
  }

  // 실시간 모둠 전광판 렌더링
  renderTeamDashboard() {
    if (!window.teamManager) return;
    this.dashCurrentProblem.textContent = `현재 문제: ‘${this.currentWord}’`;

    this.teamsLiveContainer.innerHTML = '';

    window.teamManager.teams.forEach(team => {
      const card = document.createElement('div');
      card.className = `dash-team-card ${team.isAllCompleted ? 'team-done' : ''}`;

      const doneCount = team.members.filter(m => m.completed).length;
      const totalCount = team.members.length;
      const percent = (doneCount / totalCount) * 100;

      let rankBadgeHtml = '';
      if (team.rank) {
        const medalIcons = ['🥇', '🥈', '🥉'];
        const icon = medalIcons[team.rank - 1] || '🎖️';
        rankBadgeHtml = `<span class="dash-rank-badge rank-${team.rank}">${icon} ${team.rank}등 (${team.completedTime}초)</span>`;
      } else {
        rankBadgeHtml = `<span class="dash-rank-badge ongoing">도전 중...</span>`;
      }

      card.innerHTML = `
        <div class="dash-team-header">
          <span class="dash-team-name">${team.name}</span>
          ${rankBadgeHtml}
        </div>
        <div class="dash-team-score">누적 점수: <strong>${team.score}점</strong></div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="dash-progress-info">
          <span>진척도: ${doneCount} / ${totalCount}명</span>
          <span>${Math.round(percent)}%</span>
        </div>
        <div class="dash-members-chips">
          ${team.members.map(m => `
            <div class="dash-member-chip ${m.completed ? 'chip-done' : 'chip-waiting'}">
              <span>${m.name}</span>
              <span>${m.completed ? `✓ (${m.completedTime}s)` : '풀이중'}</span>
            </div>
          `).join('')}
        </div>
      `;

      this.teamsLiveContainer.appendChild(card);
    });
  }

  // 문제 심층 해설 슬라이드 열기
  showLessonExplanation() {
    const expl = window.LessonExplanations.generateExplanationForWord(this.currentWord);

    this.explModalTitle.textContent = expl.title;
    this.explSummaryBox.textContent = expl.summary;

    // 1. 모둠 순위 발표
    this.explRankContainer.innerHTML = '';
    const rankedTeams = [...window.teamManager.teams].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank) return -1;
      if (b.rank) return 1;
      return 0;
    });

    const medalIcons = ['🥇 1등', '🥈 2등', '🥉 3등', '4등', '5등', '6등'];
    rankedTeams.forEach((team, idx) => {
      const item = document.createElement('div');
      item.className = `expl-rank-item ${team.rank ? 'rank-finished' : 'rank-dnf'}`;
      
      const title = team.rank ? medalIcons[team.rank - 1] : '미완료';
      const timeStr = team.completedTime ? `${team.completedTime}초` : '-';

      item.innerHTML = `
        <div class="rank-pos">${title}</div>
        <div class="rank-team-name">${team.name}</div>
        <div class="rank-meta">소요시간: ${timeStr}</div>
        <div class="rank-score">+${team.rank ? [100, 80, 60, 40, 20, 10][team.rank - 1] : 0}점</div>
      `;
      this.explRankContainer.appendChild(item);
    });

    // 2. 음절별 제자 원리 카드 채우기
    this.explSyllablesContainer.innerHTML = '';
    expl.points.forEach(pt => {
      const card = document.createElement('div');
      card.className = 'expl-syllable-card';

      card.innerHTML = `
        <div class="expl-syl-header">
          <span class="expl-syl-char">${pt.target}</span>
          <span class="expl-syl-title">음절 ‘${pt.target}’ 제자 원리</span>
        </div>
        <div class="expl-syl-parts">
          <!-- 초성 -->
          <div class="expl-part-box cho-part">
            <div class="part-badge">초성(첫소리)</div>
            <div class="part-char">${pt.cho.char}</div>
            <div class="part-content">
              <strong>${pt.cho.title}</strong>
              <p>${pt.cho.text}</p>
            </div>
          </div>
          <!-- 중성 -->
          <div class="expl-part-box jung-part">
            <div class="part-badge">중성(가운뎃소리)</div>
            <div class="part-char">${pt.jung.char}</div>
            <div class="part-content">
              <strong>${pt.jung.title}</strong>
              <p>${pt.jung.text}</p>
            </div>
          </div>
          <!-- 종성 -->
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
      this.explSyllablesContainer.appendChild(card);
    });

    // 3. 교과서 탐구 토의 질문
    this.explDiscussionBox.innerHTML = `
      <div class="discussion-box-inner">
        <h4>🗣️ 국어 수업 탐구 & 토의 마당</h4>
        <p>${expl.discussion}</p>
      </div>
    `;

    this.modalExplanation.classList.remove('hidden');
    window.soundEngine.playPyeongyeong(660);
  }

  // =====================
  // 클라우드 동기화 및 QR코드 UI
  // =====================
  initCloudUI() {
    if (!window.cloudSync) return;

    this.roomCodeBadge.textContent = window.cloudSync.roomId;

    window.cloudSync.onStatusChange((connected, text) => {
      this.cloudStatusIndicator.textContent = text;
      this.cloudStatusIndicator.className = `cloud-status-dot ${connected ? 'online' : 'offline'}`;
    });
  }

  showQrModal() {
    if (!window.cloudSync) return;

    const joinUrl = window.cloudSync.getJoinUrl();
    this.qrModalRoomCode.textContent = window.cloudSync.roomId;
    this.qrJoinUrlInput.value = joinUrl;

    // QR코드 렌더링
    this.qrCanvasContainer.innerHTML = '';
    if (window.QRCode) {
      new window.QRCode(this.qrCanvasContainer, {
        text: joinUrl,
        width: 240,
        height: 240,
        colorDark: '#1f1e1c',
        colorLight: '#ffffff'
      });
    }

    this.modalQr.classList.remove('hidden');
  }

  copyJoinUrl() {
    if (!window.cloudSync) return;
    const url = window.cloudSync.getJoinUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showNotice('참여 링크가 클립보드에 복사되었습니다!', 'success');
      }).catch(() => {
        prompt('아래 참여 주소를 복사하세요:', url);
      });
    } else {
      prompt('아래 참여 주소를 복사하세요:', url);
    }
  }
}

// 브라우저 로드 시 게임 초기화
window.addEventListener('DOMContentLoaded', () => {
  window.game = new HangulCraftGame();
});
