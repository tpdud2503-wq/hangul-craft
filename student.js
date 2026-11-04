/**
 * 학생용 한글 공방 플레이 스크립트
 */

const STAGES = [
  { word: '하늘', title: '제1장: 하늘과 땅', desc: '세상의 시작인 하늘과 땅의 섭리를 담은 글자입니다.', story: '‘하’는 목구멍소리(ㅇ)에 획을 더한 거센소리 ㅎ과 사람 밖의 하늘 ㅏ로 이루어지고, ‘늘’은 혓소리 ㄴ과 땅 ㅡ, 그리고 혀가 굴러가는 이체자 ㄹ로 이루어집니다.' },
  { word: '바다', title: '제2장: 깊고 넓은 바다', desc: '입술소리(ㅁ)와 혓소리(ㄴ)에서 획을 더해 탄생한 단어입니다.', story: '‘바’는 입술(ㅁ)에 획을 더한 ㅂ과 양성모음 ㅏ, ‘다’는 혀(ㄴ)에 획을 더한 ㄷ과 ㅏ가 어우러졌습니다.' },
  { word: '나무', title: '제3장: 사계절의 나무', desc: '기본자의 소박함과 초출 모음이 조화를 이룹니다.', story: '설음 기본자 ㄴ과 순음 기본자 ㅁ, 그리고 땅 아래의 어두운 음성모음 ㅜ(ㅡ+ㆍ)를 복습해 보세요.' },
  { word: '태양', title: '제4장: 눈부신 태양', desc: '가획의 끝 ㅌ과 거듭나는 재출 모음 ㅑ를 만듭니다.', story: 'ㄴ에 획을 두 번 더한 ㅌ, 모음 합성 ㅐ(ㅏ+ㅣ), 그리고 ㆍ를 두 번 결합한 재출자 ㅑ가 빛납니다.' },
  { word: '꽃', title: '제5장: 피어나는 꽃', desc: '각자병서로 단단해진 된소리 ㄲ과 거센 잇소리 ㅊ 받침입니다.', story: 'ㄱ을 나란히 쓴 각자병서 ㄲ, ㆍ와 ㅡ가 결합한 ㅗ, ㅅ에 획을 두 번 더한 ㅊ이 한 음절을 이룹니다.' },
  { word: '맑은', title: '제6장: 맑은 샘물', desc: '두 자음이 나란히 결합하는 합용병서 겹받침 ㄺ을 완성해 보세요.', story: '‘맑’의 받침 ㄺ은 이체자 ㄹ과 기본자 ㄱ이 나란히 어깨를 맞댄 합용병서의 대표작입니다.' },
  { word: '세종대왕', title: '제7장: 성군 세종대왕', desc: '백성을 사랑하는 마음으로 스물여덟 글자를 창제하신 대왕의 존함입니다.', story: '복합모음 ㅔ, ㅐ, ㅘ와 각 자음의 오묘한 조화를 마음 깊이 새겨보세요.' },
  { word: '훈민정음', title: '제8장: 백성을 가르치는 바른 소리', desc: '모든 원리가 총망라된 우리 글자의 영원한 이름입니다.', story: '지혜로운 자는 아침나절에 깨칠 수 있고, 어리석은 자라도 열흘이면 배울 수 있는 만고의 문자입니다.' }
];

class StudentGame {
  constructor() {
    this.currentStageIdx = 0;
    this.currentWord = STAGES[0].word;
    this.currentStageData = STAGES[0];

    this.syllables = [];
    this.activeSyllableIdx = 0;

    this.consonantSlots = [];
    this.activeConsonantIdx = 0;
    this.vowelSlots = [];

    this.initDOM();
    this.bindEvents();
    this.initCloud();
    this.loadStage(0, false);
  }

  initDOM() {
    this.roomDisplay = document.getElementById('student-room-display');
    this.selectMyTeam = document.getElementById('select-my-team');
    this.selectMyMember = document.getElementById('select-my-member');
    this.studentStatusBadge = document.getElementById('student-status-badge');
    this.teamProgressBar = document.getElementById('team-progress-bar');
    this.teamProgressText = document.getElementById('team-progress-text');

    this.stageDisplayTitle = document.getElementById('stage-display-title');
    this.stageTitleEl = document.getElementById('stage-title');
    this.stageDescEl = document.getElementById('stage-desc');
    this.wordContainerEl = document.getElementById('target-word-container');

    this.activeCharPreviewEl = document.getElementById('active-char-preview');
    this.slotChoEl = document.getElementById('slot-cho');
    this.slotJungEl = document.getElementById('slot-jung');
    this.slotJongEl = document.getElementById('slot-jong');

    // 자음
    this.cSlotsContainerEl = document.getElementById('c-slots-container');
    this.cPrincipleInfoEl = document.getElementById('c-principle-info');
    this.btnGahoek = document.getElementById('btn-gahoek');
    this.btnByeongseo = document.getElementById('btn-byeongseo');
    this.btnIche = document.getElementById('btn-iche');
    this.btnHapyong = document.getElementById('btn-hapyong');
    this.btnSendCho = document.getElementById('btn-send-cho');
    this.btnSendJong = document.getElementById('btn-send-jong');
    this.btnClearC = document.getElementById('btn-clear-c');

    // 모음
    this.vSlotsContainerEl = document.getElementById('v-slots-container');
    this.vPrincipleInfoEl = document.getElementById('v-principle-info');
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

    // 힌트 및 완료 모달
    this.hintPanel = document.getElementById('hint-panel');
    this.hintContent = document.getElementById('hint-content');
    this.modalComplete = document.getElementById('modal-complete');
  }

  bindEvents() {
    this.tabConsonant.addEventListener('click', () => this.switchTab('consonant'));
    this.tabVowel.addEventListener('click', () => this.switchTab('vowel'));

    document.getElementById('btn-toggle-hint').addEventListener('click', () => {
      this.hintPanel.classList.toggle('hidden');
      window.soundEngine.playGayageum(440);
    });

    document.getElementById('btn-next-stage').addEventListener('click', () => {
      this.modalComplete.classList.add('hidden');
    });

    // 팀 선택 변경
    this.selectMyTeam.addEventListener('change', () => {
      this.updateMemberSelect();
      this.updateTeamStatus();
    });
    this.selectMyMember.addEventListener('change', () => {
      this.updateTeamStatus();
    });

    // 기본자 클릭
    document.querySelectorAll('.c-basic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.addConsonant(e.currentTarget.dataset.char);
      });
    });
    document.querySelectorAll('.v-basic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.addVowel(e.currentTarget.dataset.char);
      });
    });

    // 원리 액션들
    this.btnGahoek.addEventListener('click', () => this.actionGahoek());
    this.btnByeongseo.addEventListener('click', () => this.actionByeongseo());
    this.btnIche.addEventListener('click', () => this.actionIche());
    this.btnHapyong.addEventListener('click', () => this.actionHapyong());
    this.btnClearC.addEventListener('click', () => this.clearConsonantWorkbench());

    this.btnSendCho.addEventListener('click', () => this.sendConsonant('cho'));
    this.btnSendJong.addEventListener('click', () => this.sendConsonant('jong'));

    this.btnChochul.addEventListener('click', () => this.actionChochul());
    this.btnJaechul.addEventListener('click', () => this.actionJaechul());
    this.btnHapseong.addEventListener('click', () => this.actionHapseong());
    this.btnClearV.addEventListener('click', () => this.clearVowelWorkbench());

    this.btnSendJung.addEventListener('click', () => this.sendVowel());

    // 슬롯 자체 클릭 시 지우기
    this.slotChoEl.addEventListener('click', () => {
      if (this.slotChoEl.textContent) {
        this.getCurrentSyllable().completedCho = '';
        window.soundEngine.playMoktak();
        this.updateAssembly();
      }
    });
    this.slotJungEl.addEventListener('click', () => {
      if (this.slotJungEl.textContent) {
        this.getCurrentSyllable().completedJung = '';
        window.soundEngine.playMoktak();
        this.updateAssembly();
      }
    });
    this.slotJongEl.addEventListener('click', () => {
      if (this.slotJongEl.textContent) {
        this.getCurrentSyllable().completedJong = '';
        window.soundEngine.playMoktak();
        this.updateAssembly();
      }
    });

    // 팀 매니저 업데이트 콜백
    window.teamManager.onUpdate(() => {
      this.updateTeamStatus();
    });
  }

  initCloud() {
    if (window.cloudSync) {
      this.roomDisplay.textContent = window.cloudSync.roomId;
    }
    this.updateTeamSelect();
  }

  updateTeamSelect() {
    this.selectMyTeam.innerHTML = '';
    window.teamManager.teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.members.length}명)`;
      this.selectMyTeam.appendChild(opt);
    });
    this.updateMemberSelect();
  }

  updateMemberSelect() {
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
    }
  }

  updateTeamStatus() {
    const teamId = parseInt(this.selectMyTeam.value, 10);
    const memberId = parseInt(this.selectMyMember.value, 10);
    window.teamManager.setCurrentStudent(teamId, memberId);

    const team = window.teamManager.teams.find(t => t.id === teamId);
    if (!team) return;

    const myMember = team.members.find(m => m.id === memberId);
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
    this.teamProgressText.textContent = `${doneCount} / ${totalCount}명`;

    if (team.isAllCompleted) {
      this.teamProgressText.innerHTML = `<strong>전원 완성! (${team.rank}등 🏆)</strong>`;
    }
  }

  loadStage(idx, isAuto = false) {
    this.currentStageIdx = idx;
    this.currentStageData = STAGES[idx];
    this.currentWord = this.currentStageData.word;

    this.stageDisplayTitle.textContent = `${idx + 1}. ${this.currentWord}`;
    this.stageTitleEl.textContent = this.currentStageData.title;
    this.stageDescEl.textContent = this.currentStageData.desc;

    this.syllables = [];
    for (let char of this.currentWord) {
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
    this.modalComplete.classList.add('hidden');
    this.clearConsonantWorkbench();
    this.clearVowelWorkbench();
    this.renderWordCards();
    this.updateAssembly();
    this.updateHints();

    if (isAuto) {
      this.showToast(`새로운 과제 ‘${this.currentWord}’이(가) 시작되었습니다!`);
      window.soundEngine.playJing();
    }
  }

  getCurrentSyllable() {
    return this.syllables[this.activeSyllableIdx];
  }

  renderWordCards() {
    this.wordContainerEl.innerHTML = '';
    this.syllables.forEach((syl, idx) => {
      const card = document.createElement('div');
      card.className = `word-card ${idx === this.activeSyllableIdx ? 'active' : ''} ${syl.isDone ? 'done' : ''}`;
      card.innerHTML = `
        <span class="target-char">${syl.char}</span>
        <span class="status-badge">${syl.isDone ? '✓ 완성' : `${idx + 1}번째`}</span>
      `;
      card.addEventListener('click', () => {
        this.activeSyllableIdx = idx;
        this.renderWordCards();
        this.updateAssembly();
        this.updateHints();
        window.soundEngine.playGayageum(440);
      });
      this.wordContainerEl.appendChild(card);
    });
  }

  updateAssembly() {
    const syl = this.getCurrentSyllable();
    if (!syl) return;

    this.slotChoEl.textContent = syl.completedCho || '';
    this.slotChoEl.classList.toggle('filled', !!syl.completedCho);

    this.slotJungEl.textContent = syl.completedJung || '';
    this.slotJungEl.classList.toggle('filled', !!syl.completedJung);

    this.slotJongEl.textContent = syl.completedJong || '';
    this.slotJongEl.classList.toggle('filled', !!syl.completedJong);

    const jongHint = document.getElementById('jong-required-hint');
    if (!syl.jong) {
      jongHint.textContent = '(받침 없음)';
      jongHint.className = 'jong-optional';
    } else {
      jongHint.textContent = `(받침: ${syl.jong})`;
      jongHint.className = 'jong-needed';
    }

    if (syl.completedCho && syl.completedJung) {
      const assembled = window.HangulEngine.composeSyllable(syl.completedCho, syl.completedJung, syl.completedJong);
      this.activeCharPreviewEl.textContent = assembled;

      if (assembled === syl.char) {
        if (!syl.isDone) {
          syl.isDone = true;
          this.activeCharPreviewEl.classList.add('match-success');
          window.soundEngine.playPyeongyeong(880);
          this.renderWordCards();

          if (this.checkAllCompleted()) {
            setTimeout(() => this.celebrateWordComplete(), 500);
          } else {
            setTimeout(() => {
              const nextIdx = this.syllables.findIndex(s => !s.isDone);
              if (nextIdx !== -1) {
                this.activeSyllableIdx = nextIdx;
                this.renderWordCards();
                this.updateAssembly();
                this.updateHints();
              }
            }, 600);
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

    const cur = window.teamManager.currentStudent;
    window.teamManager.recordMemberCompletion(cur.teamId, cur.memberId);

    const team = window.teamManager.teams.find(t => t.id === cur.teamId);
    const modalTitle = document.getElementById('modal-complete-title');
    const modalWord = document.getElementById('modal-complete-word');
    const modalStory = document.getElementById('modal-complete-story');
    const modalTeamInfo = document.getElementById('modal-complete-team-info');

    modalTitle.textContent = `경축! ‘${this.currentWord}’ 창제 완성`;
    modalWord.textContent = this.currentWord;
    modalStory.textContent = this.currentStageData.story;

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
            우리 모둠원들의 완성을 기다리는 중입니다... (<strong>${doneCount} / ${totalCount}명</strong>)
          </div>
        `;
      }
    }

    this.modalComplete.classList.remove('hidden');
  }

  // 자음 로직
  addConsonant(char) {
    if (this.consonantSlots.length >= 2) {
      this.consonantSlots[0] = this.consonantSlots[1];
      this.consonantSlots[1] = char;
      this.activeConsonantIdx = 1;
    } else {
      this.consonantSlots.push(char);
      this.activeConsonantIdx = this.consonantSlots.length - 1;
    }
    window.soundEngine.playBuk();
    this.renderConsonantWorkbench();
  }

  renderConsonantWorkbench() {
    this.cSlotsContainerEl.innerHTML = '';
    if (this.consonantSlots.length === 0) {
      this.cSlotsContainerEl.innerHTML = '<span class="empty-hint">위의 기본자(ㄱ, ㄴ, ㅁ, ㅅ, ㅇ)를 누르세요</span>';
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
      slot.addEventListener('click', () => {
        this.activeConsonantIdx = idx;
        this.renderConsonantWorkbench();
        window.soundEngine.playGayageum(480);
      });
      this.cSlotsContainerEl.appendChild(slot);
    });

    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    this.btnGahoek.disabled = !window.HangulEngine.GAHOEK_MAP[activeChar];
    this.btnByeongseo.disabled = !window.HangulEngine.BYEONGSEO_MAP[activeChar];
    this.btnIche.disabled = !window.HangulEngine.ICHE_MAP[activeChar];
    this.btnHapyong.disabled = this.consonantSlots.length < 2;
    this.btnSendCho.disabled = false;
    this.btnSendJong.disabled = false;
  }

  actionGahoek() {
    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    const nextChar = window.HangulEngine.GAHOEK_MAP[activeChar];
    if (nextChar) {
      this.consonantSlots[this.activeConsonantIdx] = nextChar;
      window.soundEngine.playPyeongyeong(720);
      this.renderConsonantWorkbench();
    }
  }

  actionByeongseo() {
    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    const nextChar = window.HangulEngine.BYEONGSEO_MAP[activeChar];
    if (nextChar) {
      this.consonantSlots[this.activeConsonantIdx] = nextChar;
      window.soundEngine.playBuk();
      this.renderConsonantWorkbench();
    }
  }

  actionIche() {
    const activeChar = this.consonantSlots[this.activeConsonantIdx];
    const nextChar = window.HangulEngine.ICHE_MAP[activeChar];
    if (nextChar) {
      this.consonantSlots[this.activeConsonantIdx] = nextChar;
      window.soundEngine.playGayageum(640);
      this.renderConsonantWorkbench();
    }
  }

  actionHapyong() {
    if (this.consonantSlots.length < 2) return;
    const c1 = this.consonantSlots[0];
    const c2 = this.consonantSlots[1];
    const result = window.HangulEngine.HAPYONG_CONSONANTS[`${c1}+${c2}`] || window.HangulEngine.HAPYONG_CONSONANTS[`${c2}+${c1}`];
    if (result) {
      this.consonantSlots = [result];
      this.activeConsonantIdx = 0;
      window.soundEngine.playPyeongyeong(800);
      this.renderConsonantWorkbench();
    } else {
      window.soundEngine.playMoktak();
    }
  }

  clearConsonantWorkbench() {
    this.consonantSlots = [];
    this.activeConsonantIdx = 0;
    this.renderConsonantWorkbench();
  }

  sendConsonant(slotType) {
    if (this.consonantSlots.length === 0) return;
    const char = this.consonantSlots[this.activeConsonantIdx];
    const syl = this.getCurrentSyllable();

    if (slotType === 'cho') {
      if (window.HangulEngine.CHOSUNG.includes(char)) {
        syl.completedCho = char;
        window.soundEngine.playGayageum(600);
        this.updateAssembly();
        if (!syl.completedJung) setTimeout(() => this.switchTab('vowel'), 250);
      } else {
        window.soundEngine.playMoktak();
      }
    } else if (slotType === 'jong') {
      if (window.HangulEngine.JONGSUNG.includes(char)) {
        syl.completedJong = char;
        window.soundEngine.playGayageum(500);
        this.updateAssembly();
      } else {
        window.soundEngine.playMoktak();
      }
    }
  }

  // 모음 로직
  addVowel(char) {
    if (this.vowelSlots.length >= 2) {
      this.vowelSlots[0] = this.vowelSlots[1];
      this.vowelSlots[1] = char;
    } else {
      this.vowelSlots.push(char);
    }
    window.soundEngine.playBuk();
    this.renderVowelWorkbench();
  }

  renderVowelWorkbench() {
    this.vSlotsContainerEl.innerHTML = '';
    if (this.vowelSlots.length === 0) {
      this.vSlotsContainerEl.innerHTML = '<span class="empty-hint">위의 삼재 기본자(ㆍ, ㅡ, ㅣ)를 누르세요</span>';
      this.btnChochul.disabled = true;
      this.btnJaechul.disabled = true;
      this.btnHapseong.disabled = true;
      this.btnSendJung.disabled = true;
      return;
    }

    this.vowelSlots.forEach(char => {
      const slot = document.createElement('div');
      slot.className = 'workbench-chip active';
      slot.textContent = char;
      this.vSlotsContainerEl.appendChild(slot);
    });

    let canChochul = false;
    if (this.vowelSlots.length === 2) {
      const [v1, v2] = this.vowelSlots;
      canChochul = window.HangulEngine.CHOCHUL_RULES.some(r =>
        (r.ingredients[0] === v1 && r.ingredients[1] === v2) ||
        (r.ingredients[0] === v2 && r.ingredients[1] === v1)
      );
    }
    this.btnChochul.disabled = !canChochul;

    let canJaechul = false;
    if (this.vowelSlots.length === 2) {
      const [v1, v2] = this.vowelSlots;
      canJaechul = (v2 === 'ㆍ' && ['ㅗ','ㅜ','ㅏ','ㅓ'].includes(v1)) ||
                   (v1 === 'ㆍ' && ['ㅗ','ㅜ','ㅏ','ㅓ'].includes(v2));
    } else if (this.vowelSlots.length === 1) {
      canJaechul = ['ㅗ','ㅜ','ㅏ','ㅓ'].includes(this.vowelSlots[0]);
    }
    this.btnJaechul.disabled = !canJaechul;

    let canHapseong = false;
    if (this.vowelSlots.length === 2) {
      const combo1 = `${this.vowelSlots[0]}+${this.vowelSlots[1]}`;
      const combo2 = `${this.vowelSlots[1]}+${this.vowelSlots[0]}`;
      canHapseong = !!(window.HangulEngine.VOWEL_COMBINATIONS[combo1] || window.HangulEngine.VOWEL_COMBINATIONS[combo2]);
    }
    this.btnHapseong.disabled = !canHapseong;

    this.btnSendJung.disabled = !(this.vowelSlots.length === 1 && window.HangulEngine.JUNGSUNG.includes(this.vowelSlots[0]));
  }

  actionChochul() {
    if (this.vowelSlots.length < 2) return;
    const v1 = this.vowelSlots[0];
    const v2 = this.vowelSlots[1];
    const hasCheon = (v1 === 'ㆍ' || v2 === 'ㆍ');
    const hasJi = (v1 === 'ㅡ' || v2 === 'ㅡ');
    const hasIn = (v1 === 'ㅣ' || v2 === 'ㅣ');

    if (hasCheon && hasJi) {
      this.promptChochulChoice([
        { char: 'ㅗ', name: 'ㅗ (오)', desc: '하늘(ㆍ)이 땅(ㅡ) 위에 있음 (양성)' },
        { char: 'ㅜ', name: 'ㅜ (우)', desc: '하늘(ㆍ)이 땅(ㅡ) 아래에 있음 (음성)' }
      ]);
    } else if (hasCheon && hasIn) {
      this.promptChochulChoice([
        { char: 'ㅏ', name: 'ㅏ (아)', desc: '하늘(ㆍ)이 사람(ㅣ) 바깥에 있음 (양성)' },
        { char: 'ㅓ', name: 'ㅓ (어)', desc: '하늘(ㆍ)이 사람(ㅣ) 안쪽에 있음 (음성)' }
      ]);
    }
  }

  promptChochulChoice(options) {
    const existing = document.getElementById('chochul-choice-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'chochul-choice-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card choice-dialog-card">
        <div class="choice-dialog-header">
          <h3>☀️ 초출자 선택</h3>
          <p>하늘(ㆍ)의 위치에 따른 글자를 선택하세요:</p>
        </div>
        <div class="choice-dialog-options">
          ${options.map(opt => `
            <button class="choice-option-btn" data-char="${opt.char}">
              <span class="choice-opt-char">${opt.char}</span>
              <div class="choice-opt-text">
                <strong>${opt.name}</strong>
                <span>${opt.desc}</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    overlay.querySelectorAll('.choice-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const char = e.currentTarget.dataset.char;
        this.vowelSlots = [char];
        window.soundEngine.playPyeongyeong(820);
        this.renderVowelWorkbench();
        overlay.remove();
      });
    });

    document.body.appendChild(overlay);
  }

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
      window.soundEngine.playPyeongyeong(880);
      this.renderVowelWorkbench();
    }
  }

  actionHapseong() {
    if (this.vowelSlots.length < 2) return;
    const v1 = this.vowelSlots[0];
    const v2 = this.vowelSlots[1];
    const result = window.HangulEngine.VOWEL_COMBINATIONS[`${v1}+${v2}`] || window.HangulEngine.VOWEL_COMBINATIONS[`${v2}+${v1}`];
    if (result) {
      this.vowelSlots = [result];
      window.soundEngine.playPyeongyeong(840);
      this.renderVowelWorkbench();
    }
  }

  clearVowelWorkbench() {
    this.vowelSlots = [];
    this.renderVowelWorkbench();
  }

  sendVowel() {
    if (this.vowelSlots.length !== 1) return;
    const char = this.vowelSlots[0];
    const syl = this.getCurrentSyllable();
    if (window.HangulEngine.JUNGSUNG.includes(char)) {
      syl.completedJung = char;
      window.soundEngine.playGayageum(640);
      this.updateAssembly();
      if (syl.jong && !syl.completedJong) setTimeout(() => this.switchTab('consonant'), 250);
    }
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

  updateHints() {
    const syl = this.getCurrentSyllable();
    if (!syl) return;
    const choRecipe = window.HangulEngine.getConsonantRecipe(syl.cho);
    const jungRecipe = window.HangulEngine.getVowelRecipe(syl.jung);
    const jongRecipe = syl.jong ? window.HangulEngine.getConsonantRecipe(syl.jong) : null;

    let html = `<div class="hint-syllable-title">🎯 목표: <strong>${syl.char}</strong></div>`;
    if (choRecipe) html += `<div class="hint-part"><strong>초성 ${syl.cho}</strong>: ${choRecipe.steps.join(' ➔ ')}</div>`;
    if (jungRecipe) html += `<div class="hint-part"><strong>중성 ${syl.jung}</strong>: ${jungRecipe.steps.join(' ➔ ')}</div>`;
    if (jongRecipe) html += `<div class="hint-part"><strong>받침 ${syl.jong}</strong>: ${jongRecipe.steps.join(' ➔ ')}</div>`;
    else html += `<div class="hint-part"><strong>받침</strong>: 없음</div>`;
    this.hintContent.innerHTML = html;
  }

  showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-notice toast-info visible';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new StudentGame();
});
