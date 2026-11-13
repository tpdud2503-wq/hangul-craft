/**
 * 한글 창제 원리 (훈민정음) 엔진
 * - 자음: 기본자(ㄱ, ㄴ, ㅁ, ㅅ, ㅇ) -> 가획, 이체, 각자병서, 합용병서
 * - 모음: 기본자(ㆍ, ㅡ, ㅣ) -> 초출, 재출, 합성(합용)
 * - 음절 조합 및 유니코드 분해/조립 기능
 */

const HangulEngine = {
  // 기본자 정의
  CONSONANT_BASICS: ['ㄱ', 'ㄴ', 'ㅁ', 'ㅅ', 'ㅇ'],
  VOWEL_BASICS: ['ㆍ', 'ㅡ', 'ㅣ'],

  // 발음기관 및 상형 원리 설명
  BASIC_INFO: {
    'ㄱ': { name: '기역', organ: '아음 (어금닛소리)', shape: '혀뿌리가 목구멍을 막는 모양을 본뜸' },
    'ㄴ': { name: '니은', organ: '설음 (혓소리)', shape: '혀가 윗잇몸에 붙는 모양을 본뜸' },
    'ㅁ': { name: '미음', organ: '순음 (입술소리)', shape: '입술의 둥근 모양(입 모양)을 본뜸' },
    'ㅅ': { name: '시옷', organ: '치음 (잇소리)', shape: '날카로운 이빨 모양을 본뜸' },
    'ㅇ': { name: '이응', organ: '후음 (목구멍소리)', shape: '목구멍의 둥근 모양을 본뜸' },
    'ㆍ': { name: '아래아', symbol: '천 (天, 하늘)', shape: '둥근 하늘의 모양을 본뜸 (양)' },
    'ㅡ': { name: '으', symbol: '지 (地, 땅)', shape: '평평한 땅의 모양을 본뜸 (음)' },
    'ㅣ': { name: '이', symbol: '인 (人, 사람)', shape: '서 있는 사람의 모양을 본뜸 (중성)' }
  },

  // 자음 가획 단계 트리 (기본자에서 획을 더해 소리가 거세짐)
  GAHOEK_MAP: {
    'ㄱ': 'ㅋ',
    'ㄴ': 'ㄷ',
    'ㄷ': 'ㅌ',
    'ㅁ': 'ㅂ',
    'ㅂ': 'ㅍ',
    'ㅅ': 'ㅈ',
    'ㅈ': 'ㅊ',
    'ㅇ': 'ㅎ' // 교육용 현대한글 연결 (원형: ㅇ -> ㆆ -> ㅎ)
  },

  // 가획 설명
  GAHOEK_EXPLANATIONS: {
    'ㅋ': 'ㄱ에 획을 더하여 거센 소리(아음)를 만듦',
    'ㄷ': 'ㄴ에 획을 더하여 잇몸소리를 만듦',
    'ㅌ': 'ㄷ에 다시 획을 더하여 거센 소리를 만듦',
    'ㅂ': 'ㅁ에 획을 더하여 입술소리를 만듦',
    'ㅍ': 'ㅂ에 다시 획을 더하여 거센 입술소리를 만듦',
    'ㅈ': 'ㅅ에 획을 더하여 잇소리를 만듦',
    'ㅊ': 'ㅈ에 다시 획을 더하여 거센 잇소리를 만듦',
    'ㅎ': 'ㅇ에 획을 더하여 목구멍소리를 거세게 만듦'
  },

  // 자음 이체자 (모양을 달리한 글자)
  ICHE_MAP: {
    'ㄴ': 'ㄹ', // 반설음
    'ㅅ': 'ㅿ', // 반치음 (옛글자)
    'ㅇ': 'ㆁ'  // 옛이응
  },
  ICHE_EXPLANATIONS: {
    'ㄹ': '설음(ㄴ)의 이체자로, 혀끝이 굴러가는 소리(반설음)를 나타냄',
    'ㅿ': '치음(ㅅ)의 이체자로, 반치음을 나타냄',
    'ㆁ': 'ㅇ의 이체자인 옛이응으로, 받침의 울림소리를 나타냄'
  },

  // 각자병서 (같은 자음을 나란히 써서 된소리를 만듦)
  BYEONGSEO_MAP: {
    'ㄱ': 'ㄲ',
    'ㄷ': 'ㄸ',
    'ㅂ': 'ㅃ',
    'ㅅ': 'ㅆ',
    'ㅈ': 'ㅉ'
  },

  // 합용병서 (서로 다른 자음을 나란히 씀 - 주로 받침용 겹자음)
  HAPYONG_CONSONANTS: {
    'ㄱ+ㅅ': 'ㄳ', 'ㅅ+ㄱ': 'ㄳ',
    'ㄴ+ㅈ': 'ㄵ', 'ㅈ+ㄴ': 'ㄵ',
    'ㄴ+ㅎ': 'ㄶ', 'ㅎ+ㄴ': 'ㄶ',
    'ㄹ+ㄱ': 'ㄺ', 'ㄱ+ㄹ': 'ㄺ',
    'ㄹ+ㅁ': 'ㄻ', 'ㅁ+ㄹ': 'ㄻ',
    'ㄹ+ㅂ': 'ㄼ', 'ㅂ+ㄹ': 'ㄼ',
    'ㄹ+ㅅ': 'ㄽ', 'ㅅ+ㄹ': 'ㄽ',
    'ㄹ+ㅌ': 'ㄾ', 'ㅌ+ㄹ': 'ㄾ',
    'ㄹ+ㅍ': 'ㄿ', 'ㅍ+ㄹ': 'ㄿ',
    'ㄹ+ㅎ': 'ㅀ', 'ㅎ+ㄹ': 'ㅀ',
    'ㅂ+ㅅ': 'ㅄ', 'ㅅ+ㅂ': 'ㅄ'
  },

  // 모음 초출자 (기본자를 결합)
  // ㆍ(하늘) + ㅡ(땅) / ㆍ(하늘) + ㅣ(사람)
  CHOCHUL_RULES: [
    { ingredients: ['ㆍ', 'ㅡ'], result: 'ㅗ', desc: '하늘(ㆍ)이 땅(ㅡ) 위에 있어 밝은 양성 모음' },
    { ingredients: ['ㅡ', 'ㆍ'], result: 'ㅜ', desc: '하늘(ㆍ)이 땅(ㅡ) 아래에 있어 어두운 음성 모음' },
    { ingredients: ['ㆍ', 'ㅣ'], result: 'ㅏ', desc: '하늘(ㆍ)이 사람(ㅣ) 바깥(동쪽)에 있어 밝은 양성 모음' },
    { ingredients: ['ㅣ', 'ㆍ'], result: 'ㅓ', desc: '하늘(ㆍ)이 사람(ㅣ) 안쪽(서쪽)에 있어 어두운 음성 모음' }
  ],

  // 모음 재출자 (초출자에 ㆍ를 한 번 더 결합하여 2개의 점/획 형성)
  JAECHUL_RULES: [
    { base: 'ㅗ', add: 'ㆍ', result: 'ㅛ', desc: 'ㅗ에 하늘(ㆍ)을 더하여 소리가 거듭남(재출자)' },
    { base: 'ㅜ', add: 'ㆍ', result: 'ㅠ', desc: 'ㅜ에 하늘(ㆍ)을 더하여 소리가 거듭남(재출자)' },
    { base: 'ㅏ', add: 'ㆍ', result: 'ㅑ', desc: 'ㅏ에 하늘(ㆍ)을 더하여 소리가 거듭남(재출자)' },
    { base: 'ㅓ', add: 'ㆍ', result: 'ㅕ', desc: 'ㅓ에 하늘(ㆍ)을 더하여 소리가 거듭남(재출자)' }
  ],

  // 모음 합성 (합용 - 복합모음 제작)
  VOWEL_COMBINATIONS: {
    'ㅏ+ㅣ': 'ㅐ', 'ㅣ+ㅏ': 'ㅐ',
    'ㅓ+ㅣ': 'ㅔ', 'ㅣ+ㅓ': 'ㅔ',
    'ㅑ+ㅣ': 'ㅒ', 'ㅣ+ㅑ': 'ㅒ',
    'ㅕ+ㅣ': 'ㅖ', 'ㅣ+ㅕ': 'ㅖ',
    'ㅗ+ㅏ': 'ㅘ', 'ㅏ+ㅗ': 'ㅘ',
    'ㅗ+ㅐ': 'ㅙ', 'ㅐ+ㅗ': 'ㅙ',
    'ㅗ+ㅣ': 'ㅚ', 'ㅣ+ㅗ': 'ㅚ',
    'ㅜ+ㅓ': 'ㅝ', 'ㅓ+ㅜ': 'ㅝ',
    'ㅜ+ㅔ': 'ㅞ', 'ㅔ+ㅜ': 'ㅞ',
    'ㅜ+ㅣ': 'ㅟ', 'ㅣ+ㅜ': 'ㅟ',
    'ㅡ+ㅣ': 'ㅢ', 'ㅣ+ㅡ': 'ㅢ'
  },

  // 한글 유니코드 기본 테이블
  CHOSUNG: ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'],
  JUNGSUNG: ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'],
  JONGSUNG: ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'],

  /**
   * 한 글자(음절)를 초성, 중성, 종성으로 분해
   */
  decomposeSyllable(char) {
    const code = char.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) {
      return null;
    }
    const offset = code - 0xAC00;
    const jongIdx = offset % 28;
    const jungIdx = Math.floor((offset / 28) % 21);
    const choIdx = Math.floor(offset / (28 * 21));

    return {
      char: char,
      cho: this.CHOSUNG[choIdx],
      jung: this.JUNGSUNG[jungIdx],
      jong: this.JONGSUNG[jongIdx] || ''
    };
  },

  /**
   * 초성, 중성, 종성을 하나의 한글 음절로 조합
   */
  composeSyllable(cho, jung, jong = '') {
    const choIdx = this.CHOSUNG.indexOf(cho);
    const jungIdx = this.JUNGSUNG.indexOf(jung);
    // 옛이응으로 만든 받침은 현대 완성형 한글의 종성 ㅇ으로 조합한다.
    const modernJong = jong === 'ㆁ' ? 'ㅇ' : jong;
    const jongIdx = modernJong ? this.JONGSUNG.indexOf(modernJong) : 0;

    if (choIdx === -1 || jungIdx === -1 || jongIdx === -1) {
      return null;
    }

    const code = 0xAC00 + (choIdx * 21 * 28) + (jungIdx * 28) + jongIdx;
    return String.fromCharCode(code);
  },

  /**
   * 목표 자음의 창제 원리 레시피(단계)를 역추적
   */
  getConsonantRecipe(target) {
    if (this.CONSONANT_BASICS.includes(target)) {
      return {
        basic: target,
        action: '기본자',
        steps: [`기본자 [${target}] 그대로 사용 (${this.BASIC_INFO[target].organ})`],
        explanation: this.BASIC_INFO[target].shape
      };
    }

    // 각자병서 확인 (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)
    for (let [k, v] of Object.entries(this.BYEONGSEO_MAP)) {
      if (v === target) {
        const subRecipe = this.getConsonantRecipe(k);
        return {
          basic: subRecipe.basic,
          action: '각자병서',
          source: k,
          steps: [...subRecipe.steps, `[${k}]에 [각자병서] 적용 -> [${target}]`],
          explanation: `같은 글자 [${k}]를 나란히 써서 된소리 [${target}]을 만듦`
        };
      }
    }

    // 이체자 확인 (ㄹ)
    for (let [k, v] of Object.entries(this.ICHE_MAP)) {
      if (v === target) {
        return {
          basic: k,
          action: '이체',
          source: k,
          steps: [`기본자 [${k}] 선택`, `[이체] 적용 -> [${target}]`],
          explanation: this.ICHE_EXPLANATIONS[target]
        };
      }
    }

    // 가획 확인 (ㅋ, ㄷ, ㅌ, ㅂ, ㅍ, ㅈ, ㅊ, ㅎ)
    for (let [k, v] of Object.entries(this.GAHOEK_MAP)) {
      if (v === target) {
        const subRecipe = this.getConsonantRecipe(k);
        return {
          basic: subRecipe.basic,
          action: '가획',
          source: k,
          steps: [...subRecipe.steps, `[${k}]에 [가획] 적용 -> [${target}]`],
          explanation: this.GAHOEK_EXPLANATIONS[target]
        };
      }
    }

    // 합용병서 확인 (ㄳ, ㄵ 등)
    for (let [combo, result] of Object.entries(this.HAPYONG_CONSONANTS)) {
      if (result === target) {
        const [c1, c2] = combo.split('+');
        return {
          action: '합용병서',
          source: [c1, c2],
          steps: [`[${c1}]과 [${c2}] 제작`, `두 자음을 [합용병서]로 결합 -> [${target}]`],
          explanation: `서로 다른 자음 [${c1}]과 [${c2}]를 나란히 결합하여 [${target}] 완성`
        };
      }
    }

    return null;
  },

  getFinalConsonantRecipe(target) {
    if (target !== 'ㅇ') return this.getConsonantRecipe(target);
    const recipe = this.getConsonantRecipe('ㆁ');
    return {
      ...recipe,
      steps: [...recipe.steps, '옛이응 [ㆁ]을 현대 한글 받침 [ㅇ]으로 표시'],
      explanation: '기본자 [ㅇ]에 이체를 적용한 옛이응 [ㆁ]으로 받침의 울림소리를 만듭니다.'
    };
  },

  /**
   * 목표 모음의 창제 원리 레시피(단계)를 역추적
   */
  getVowelRecipe(target) {
    if (this.VOWEL_BASICS.includes(target)) {
      return {
        action: '기본자',
        basics: [target],
        steps: [`기본자 [${target}] 사용 (${this.BASIC_INFO[target].symbol})`],
        explanation: this.BASIC_INFO[target].shape
      };
    }

    // 초출자 확인 (ㅗ, ㅜ, ㅏ, ㅓ)
    for (let rule of this.CHOCHUL_RULES) {
      if (rule.result === target) {
        return {
          action: '초출 합성',
          basics: rule.ingredients,
          steps: [`기본자 [${rule.ingredients[0]}]과 [${rule.ingredients[1]}]을 합성 -> [${target}]`],
          explanation: rule.desc
        };
      }
    }

    // 재출자 확인 (ㅛ, ㅠ, ㅑ, ㅕ)
    for (let rule of this.JAECHUL_RULES) {
      if (rule.result === target) {
        const baseRecipe = this.getVowelRecipe(rule.base);
        return {
          action: '재출 합성',
          base: rule.base,
          add: rule.add,
          steps: [...baseRecipe.steps, `초출자 [${rule.base}]에 하늘 [${rule.add}]을 더해 [재출 합성] -> [${target}]`],
          explanation: rule.desc
        };
      }
    }

    // 복합모음(모음 합성) 확인 (ㅐ, ㅔ, ㅘ, ㅢ 등)
    for (let [combo, result] of Object.entries(this.VOWEL_COMBINATIONS)) {
      if (result === target) {
        const [v1, v2] = combo.split('+');
        return {
          action: '모음 합성',
          ingredients: [v1, v2],
          steps: [`[${v1}]과 [${v2}]를 결합하여 [모음 합성] -> [${target}]`],
          explanation: `두 모음 [${v1}]과 [${v2}]를 합용하여 복합 모음 [${target}]을 만듦`
        };
      }
    }

    return null;
  }
};

window.HangulEngine = HangulEngine;
