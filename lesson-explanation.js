/**
 * 훈민정음 문제별 심층 해설 (교과 수업용 슬라이드) 엔진
 * - 초성, 중성, 종성의 창제 원리 분해 시각화
 * - 해례본 원문과 교과서 탐구 질문 제공
 * - 모둠별 최종 순위 및 획득 점수 발표
 */

const LessonExplanations = {
  // 기본 스테이지별 심층 해설 데이터
  DETAILS: {
    '하늘': {
      title: '제1장: ‘하늘’에 담긴 창제 원리',
      summary: '세상의 시작인 하늘과 땅, 사람의 섭리가 온전히 담긴 훈민정음의 대표 단어입니다.',
      points: [
        {
          target: '하',
          cho: { char: 'ㅎ', title: '초성 ㅎ (후음 가획자)', text: '목구멍의 둥근 모양을 본뜬 기본자 [ㅇ]에서 소리가 거세어짐에 따라 획을 더해 ㆆ(여린히읗)을 거쳐 [ㅎ]이 되었습니다. (가획의 원리)' },
          jung: { char: 'ㅏ', title: '중성 ㅏ (초출자)', text: '서 있는 사람(ㅣ)의 바깥(동쪽)에 밝은 하늘(ㆍ)이 위치하여 밝고 가벼운 양성(陽性) 모음이 됩니다. (초출 합성)' },
          jong: { char: '-', title: '종성 없음', text: '초성과 중성만으로 맑게 열린 음절을 이룹니다.' }
        },
        {
          target: '늘',
          cho: { char: 'ㄴ', title: '초성 ㄴ (설음 기본자)', text: '혀끝이 윗잇몸에 붙는 모양을 본뜬 기본자입니다. 소리의 근본이 되는 혓소리(설음)입니다. (상형의 원리)' },
          jung: { char: 'ㅡ', title: '중성 ㅡ (삼재 기본자 - 땅 지)', text: '평평하게 펼쳐진 땅의 모양을 본뜬 기본자로, 차분하고 어두운 음성(陰性)의 성질을 지닙니다.' },
          jong: { char: 'ㄹ', title: '종성 ㄹ (설음 이체자)', text: '설음 기본자 [ㄴ]에서 획의 모양을 달리하여 만든 이체자(異體字)로, 혀가 가볍게 구르는 반설음 소리를 냅니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "왜 세종대왕은 사람(ㅣ)의 바깥에 점(ㆍ)이 있는 글자를 밝은 느낌(ㅏ)으로 정하셨을까요?"'
    },
    '바다': {
      title: '제2장: ‘바다’에 담긴 창제 원리',
      summary: '입술소리(순음)와 혓소리(설음)에 획을 더해가는 규칙적인 가획의 묘미를 보여줍니다.',
      points: [
        {
          target: '바',
          cho: { char: 'ㅂ', title: '초성 ㅂ (순음 가획자)', text: '입의 네모난 모양을 본뜬 기본자 [ㅁ]에 획을 위로 뻗치며 더하여 입술소리 [ㅂ]을 만들었습니다.' },
          jung: { char: 'ㅏ', title: '중성 ㅏ (초출자)', text: '사람(ㅣ)과 하늘(ㆍ)의 조화로 시원하게 터져 나오는 양성 모음입니다.' },
          jong: { char: '-', title: '종성 없음', text: '입술이 열리며 소리가 시원하게 뻗어나갑니다.' }
        },
        {
          target: '다',
          cho: { char: 'ㄷ', title: '초성 ㄷ (설음 가획자)', text: '혓소리 기본자 [ㄴ]에 윗획을 더하여 소리가 단단하게 닫히며 울리는 [ㄷ]을 만들었습니다.' },
          jung: { char: 'ㅏ', title: '중성 ㅏ (초출자)', text: '동일한 밝은 초출 모음 ㅏ가 반복되어 경쾌한 운율을 형성합니다.' },
          jong: { char: '-', title: '종성 없음', text: '열린 음절로 바다의 넓은 기상을 노래합니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "ㅁ에서 ㅂ으로, 다시 ㅍ으로 갈수록 입술에 들어가는 힘과 소리의 세기는 어떻게 변하나요?"'
    },
    '나무': {
      title: '제3장: ‘나무’에 담긴 창제 원리',
      summary: '기본자의 순수함과 양성 모음(ㅏ), 음성 모음(ㅜ)의 대조적 미학을 담고 있습니다.',
      points: [
        {
          target: '나',
          cho: { char: 'ㄴ', title: '초성 ㄴ (설음 기본자)', text: '발음기관(혀가 윗잇몸에 닿는 모양)을 본뜬 순수한 기본자입니다.' },
          jung: { char: 'ㅏ', title: '중성 ㅏ (초출 양성모음)', text: '하늘이 사람 바깥에 있어 싹이 트고 뻗어나가는 밝은 기운을 품었습니다.' },
          jong: { char: '-', title: '종성 없음', text: '초성과 중성이 조화롭게 결합합니다.' }
        },
        {
          target: '무',
          cho: { char: 'ㅁ', title: '초성 ㅁ (순음 기본자)', text: '입술의 모양을 본뜬 순음 기본자로, 모든 입술소리(ㅂ, ㅍ, ㅃ)의 어머니가 됩니다.' },
          jung: { char: 'ㅜ', title: '중성 ㅜ (초출 음성모음)', text: '땅(ㅡ) 아래에 하늘(ㆍ)이 있어 땅속 깊이 뿌리를 내리는 깊고 그윽한 음성 모음입니다.' },
          jong: { char: '-', title: '종성 없음', text: '위로 뻗는 ㅏ와 아래로 뿌리내리는 ㅜ가 완벽한 대칭을 이룹니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "‘나무’의 ‘나(ㅏ-양성)’와 ‘무(ㅜ-음성)’처럼 음양의 조화가 글자 속에 어떻게 녹아있을까요?"'
    },
    '태양': {
      title: '제4장: ‘태양’에 담긴 창제 원리',
      summary: '2차 가획 거센소리 ㅌ과 복합모음 ㅐ, 그리고 재출자 ㅑ가 어우러져 화려함을 뽐냅니다.',
      points: [
        {
          target: '태',
          cho: { char: 'ㅌ', title: '초성 ㅌ (설음 2차 가획자)', text: 'ㄴ ➔ ㄷ ➔ ㅌ 순으로 획을 두 번 더하여 가장 거세고 강렬한 혓소리를 나타냅니다.' },
          jung: { char: 'ㅐ', title: '중성 ㅐ (모음 합성/합용)', text: '초출자 [ㅏ]에 사람 [ㅣ]를 결합하여 복합 모음 [ㅐ]를 빚어냈습니다.' },
          jong: { char: '-', title: '종성 없음', text: '거센소리와 합성모음이 어우러집니다.' }
        },
        {
          target: '양',
          cho: { char: 'ㅇ', title: '초성 ㅇ (후음 기본자)', text: '목구멍의 둥근 모양을 본뜬 글자로, 초성에서는 음가가 없는 순수한 시작을 담당합니다.' },
          jung: { char: 'ㅑ', title: '중성 ㅑ (재출자)', text: '초출자 [ㅏ]에 하늘(ㆍ)을 한 번 더 더하여 점이 두 개가 된 재출자로, 이중모음의 풍부한 울림을 줍니다.' },
          jong: { char: 'ㅇ', title: '종성 ㅇ (후음 받침)', text: '훈민정음 종성부용초성(終聲復用初聲) 원리에 따라 초성의 ㅇ을 받침에 다시 사용하여 깊은 비음 울림소리를 냅니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "초출자(ㅏ)와 재출자(ㅑ)를 발음할 때 입술과 혀의 움직임은 어떻게 다를까요?"'
    },
    '꽃': {
      title: '제5장: ‘꽃’에 담긴 창제 원리',
      summary: '된소리를 만드는 각자병서 ㄲ과 거센소리 ㅊ이 받침으로 만난 한 음절의 예술입니다.',
      points: [
        {
          target: '꽃',
          cho: { char: 'ㄲ', title: '초성 ㄲ (각자병서 된소리)', text: '기본자 [ㄱ]을 가로로 나란히 써서(各自並書) 목에 힘이 들어가는 단단한 된소리를 표현했습니다.' },
          jung: { char: 'ㅗ', title: '중성 ㅗ (초출 양성모음)', text: '평평한 땅(ㅡ) 위에 둥근 하늘(ㆍ)이 우뚝 솟아오른 모양으로, 봉오리가 피어나는 모양새입니다.' },
          jong: { char: 'ㅊ', title: '종성 ㅊ (치음 2차 가획자)', text: '잇소리 기본자 ㅅ ➔ ㅈ ➔ ㅊ으로 획을 두 번 더한 거센소리로, 받침 자리에서 단호하게 음절을 매듭짓습니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "각자병서(ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)는 왜 자음을 두 개 겹쳐 쓰도록 설계했을까요?"'
    },
    '맑은': {
      title: '제6장: ‘맑은’에 담긴 창제 원리',
      summary: '서로 다른 자음을 나란히 합쳐 쓰는 합용병서 겹받침 ㄺ의 규칙성을 학습합니다.',
      points: [
        {
          target: '맑',
          cho: { char: 'ㅁ', title: '초성 ㅁ (순음 기본자)', text: '입술의 형태를 본뜬 온화한 울림소리입니다.' },
          jung: { char: 'ㅏ', title: '중성 ㅏ (초출자)', text: '사람 밖의 밝은 하늘 기운입니다.' },
          jong: { char: 'ㄺ', title: '종성 ㄺ (합용병서 겹받침)', text: '이체자 [ㄹ]과 기본자 [ㄱ]을 나란히 합쳐 쓴 합용병서(合用並書)로, 한국어의 정교한 겹받침을 온전히 기록합니다.' }
        },
        {
          target: '은',
          cho: { char: 'ㅇ', title: '초성 ㅇ (첫소리)', text: '첫소리 자리에서 소릿값이 없는 맑은 후음입니다.' },
          jung: { char: 'ㅡ', title: '중성 ㅡ (땅 지 기본자)', text: '평온하고 고요한 땅의 기운입니다.' },
          jong: { char: 'ㄴ', title: '종성 ㄴ (설음 받침)', text: '혀가 윗잇몸에 닿으며 부드럽게 끝맺는 혓소리 받침입니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "겹받침 ㄺ은 [ㄹ]과 [ㄱ]의 소리를 어떻게 담고 있을까요? ‘맑다[막따]’와 ‘맑아[말가]’의 발음을 비교해 보세요."'
    },
    '세종대왕': {
      title: '제7장: ‘세종대왕’에 담긴 창제 원리',
      summary: '복합 모음(ㅔ, ㅐ, ㅘ)과 초성·중성·종성의 조화가 집대성된 거룩한 이름입니다.',
      points: [
        {
          target: '세',
          cho: { char: 'ㅅ', title: '초성 ㅅ (치음 기본자)', text: '날카로운 이빨의 모양을 본뜬 잇소리 기본자입니다.' },
          jung: { char: 'ㅔ', title: '중성 ㅔ (모음 합성)', text: '음성모음 [ㅓ]에 [ㅣ]를 결합하여 만든 복합 모음입니다.' },
          jong: { char: '-', title: '종성 없음', text: '부드럽게 이어지는 음절입니다.' }
        },
        {
          target: '종',
          cho: { char: 'ㅈ', title: '초성 ㅈ (치음 1차 가획자)', text: '기본자 [ㅅ]에 획을 더하여 만든 잇소리입니다.' },
          jung: { char: 'ㅗ', title: '중성 ㅗ (초출자)', text: '하늘(ㆍ)이 땅(ㅡ) 위에 있는 양성 모음입니다.' },
          jong: { char: 'ㅇ', title: '종성 ㅇ (후음 받침)', text: '풍부하고 웅장한 목구멍 울림소리입니다.' }
        },
        {
          target: '대',
          cho: { char: 'ㄷ', title: '초성 ㄷ (설음 1차 가획자)', text: '기본자 [ㄴ]에 획을 더한 단단한 소리입니다.' },
          jung: { char: 'ㅐ', title: '중성 ㅐ (모음 합성)', text: '[ㅏ]와 [ㅣ]의 결합으로 넓게 트인 소리입니다.' },
          jong: { char: '-', title: '종성 없음', text: '크고 넓음을 뜻합니다.' }
        },
        {
          target: '왕',
          cho: { char: 'ㅇ', title: '초성 ㅇ (후음)', text: '목구멍의 모양입니다.' },
          jung: { char: 'ㅘ', title: '중성 ㅘ (양성 모음 결합)', text: '양성 초출자 [ㅗ]와 [ㅏ]가 결합하여 가장 크고 웅장한 이중모음을 형성합니다.' },
          jong: { char: 'ㅇ', title: '종성 ㅇ (후음 받침)', text: '위엄 있는 울림소리 받침입니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "‘세종대왕’ 네 글자에 쓰인 모음 중 결합(합성)으로 만들어진 글자들은 무엇일까요?"'
    },
    '훈민정음': {
      title: '제8장: ‘훈민정음’에 담긴 창제 원리',
      summary: '백성을 가르치는 바른 소리 — 세상 모든 소리를 적을 수 있는 과학적 문자의 극치입니다.',
      points: [
        {
          target: '훈',
          cho: { char: 'ㅎ', title: '초성 ㅎ (후음 가획자)', text: 'ㅇ에 획을 더해 맑고 깊게 뿜어내는 가획 목구멍소리입니다.' },
          jung: { char: 'ㅜ', title: '중성 ㅜ (초출 음성모음)', text: '땅(ㅡ) 아래에 하늘(ㆍ)이 있는 깊은 모음입니다.' },
          jong: { char: 'ㄴ', title: '종성 ㄴ (설음 받침)', text: '혓소리 기본자 받침입니다.' }
        },
        {
          target: '민',
          cho: { char: 'ㅁ', title: '초성 ㅁ (순음 기본자)', text: '입술의 모양을 본뜬 소박하고 따뜻한 기본자입니다.' },
          jung: { char: 'ㅣ', title: '중성 ㅣ (삼재 기본자 - 사람 인)', text: '하늘과 땅 사이에 우뚝 서 있는 인간(人)을 본뜬 중성 모음입니다.' },
          jong: { char: 'ㄴ', title: '종성 ㄴ (설음 받침)', text: '백성(민)들의 따스한 숨결을 담았습니다.' }
        },
        {
          target: '정',
          cho: { char: 'ㅈ', title: '초성 ㅈ (치음 가획자)', text: 'ㅅ에 획을 더한 바르고 명확한 잇소리입니다.' },
          jung: { char: 'ㅓ', title: '중성 ㅓ (초출 음성모음)', text: '사람(ㅣ) 안쪽에 하늘(ㆍ)이 깃든 내면의 소리입니다.' },
          jong: { char: 'ㅇ', title: '종성 ㅇ (후음 받침)', text: '바른 소리(정음)의 청아한 울림입니다.' }
        },
        {
          target: '음',
          cho: { char: 'ㅇ', title: '초성 ㅇ (후음)', text: '순수한 음가의 첫소리입니다.' },
          jung: { char: 'ㅡ', title: '중성 ㅡ (삼재 기본자 - 땅 지)', text: '만물을 품는 어머니 대지의 평평한 모음입니다.' },
          jong: { char: 'ㅁ', title: '종성 ㅁ (순음 받침)', text: '입술을 다물며 깊게 머금는 소리입니다.' }
        }
      ],
      discussion: '💡 함께 생각해 볼 탐구 질문: "‘훈민정음’ 서문에서 세종대왕께서 글자를 만드신 가장 중요한 까닭은 무엇이었을까요?"'
    }
  },

  /**
   * 커스텀 단어나 등록되지 않은 단어의 경우 HangulEngine을 통해 자동 생성
   */
  generateExplanationForWord(word) {
    if (this.DETAILS[word]) {
      return this.DETAILS[word];
    }

    const points = [];
    for (let char of word) {
      const decomp = window.HangulEngine.decomposeSyllable(char);
      if (decomp) {
        const choRecipe = window.HangulEngine.getConsonantRecipe(decomp.cho);
        const jungRecipe = window.HangulEngine.getVowelRecipe(decomp.jung);
        const jongRecipe = decomp.jong ? window.HangulEngine.getConsonantRecipe(decomp.jong) : null;

        points.push({
          target: char,
          cho: {
            char: decomp.cho,
            title: `초성 ${decomp.cho} (${choRecipe ? choRecipe.action : '자음'})`,
            text: choRecipe ? `${choRecipe.steps.join(' ➔ ')} (${choRecipe.explanation})` : '자음 원리'
          },
          jung: {
            char: decomp.jung,
            title: `중성 ${decomp.jung} (${jungRecipe ? jungRecipe.action : '모음'})`,
            text: jungRecipe ? `${jungRecipe.steps.join(' ➔ ')} (${jungRecipe.explanation})` : '모음 원리'
          },
          jong: {
            char: decomp.jong || '-',
            title: decomp.jong ? `종성 ${decomp.jong} (받침)` : '종성 없음',
            text: jongRecipe ? `${jongRecipe.steps.join(' ➔ ')} (${jongRecipe.explanation})` : '초성과 중성으로 완성'
          }
        });
      }
    }

    return {
      title: `‘${word}’에 담긴 훈민정음 창제 원리`,
      summary: `‘${word}’ 단어를 이루는 모든 음절의 초성, 중성, 종성 제자 원리를 체계적으로 복습해 봅니다.`,
      points: points,
      discussion: `💡 함께 생각해 볼 탐구 질문: "‘${word}’ 단어를 만들 때 사용한 가획이나 합성의 원리를 친구들에게 직접 설명해 보세요!"`
    };
  }
};

window.LessonExplanations = LessonExplanations;
