/** 방 상태를 서버의 최신 값에 적용하는 순수 함수. */
const RoomState = (() => {
  const DEFAULT_WORDS = ['하늘', '바다', '나무', '태양', '꽃', '맑은', '세종대왕', '훈민정음'];
  const MAX_MISSIONS = 30;
  const ROUND_DURATION_MS = 3 * 60 * 1000;

  function error(code, message) {
    const result = new Error(message);
    result.code = code;
    return result;
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validWord(word) {
    return typeof word === 'string' && word === word.normalize('NFC') && /^[가-힣]{1,10}$/.test(word);
  }

  function pointsForRank(rank, isPractice = false) {
    if (isPractice || !Number.isInteger(rank) || rank < 1) return 0;
    if (rank === 1) return 10;
    if (rank <= 3) return 5;
    return 2;
  }

  function createLessonState(teams = [], includePractice = true) {
    const missions = DEFAULT_WORDS.map((word, index) => ({ id: `m${index + 1}`, word, isPractice: false }));
    if (includePractice) missions.unshift({ id: 'practice', word: '가', isPractice: true });
    const baseScores = {};
    teams.forEach(team => { baseScores[String(team.id)] = includePractice ? 0 : (Number(team.score) || 0); });
    return { version: 1, legacy: !includePractice, missions, results: {}, baseScores };
  }

  function getLessonState(room) {
    return room.lesson_state == null ? createLessonState(room.teams, false) : copy(room.lesson_state);
  }

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function validMissionId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(id) &&
      !['__proto__', 'constructor', 'prototype'].includes(id) && !Object.prototype.hasOwnProperty.call(Object.prototype, id);
  }

  function isValidLessonState(state) {
    if (!isObject(state) || state.version !== 1 || typeof state.legacy !== 'boolean' ||
        !Array.isArray(state.missions) || state.missions.length < 1 ||
        state.missions.length > MAX_MISSIONS + 1 || !isObject(state.results) || !isObject(state.baseScores)) return false;
    const ids = new Set();
    for (let index = 0; index < state.missions.length; index++) {
      const mission = state.missions[index];
      if (!isObject(mission) || !validMissionId(mission.id) || ids.has(mission.id) || !validWord(mission.word) ||
          typeof mission.isPractice !== 'boolean' || (mission.isPractice && (index !== 0 || mission.id !== 'practice'))) return false;
      ids.add(mission.id);
    }
    if (!state.legacy && (!state.missions[0].isPractice || state.missions.length < 2)) return false;
    if (state.timer != null) {
      const timer = state.timer;
      if (!isObject(timer) || !Number.isSafeInteger(timer.startedAt) || timer.startedAt < 0 ||
          timer.durationMs !== ROUND_DURATION_MS || ![null, 'completed', 'timeout'].includes(timer.reason) ||
          (timer.endedAt != null && (!Number.isSafeInteger(timer.endedAt) || timer.endedAt < timer.startedAt ||
            timer.endedAt > timer.startedAt + timer.durationMs)) ||
          ((timer.reason == null) !== (timer.endedAt == null))) return false;
    }
    if (!Object.entries(state.baseScores).every(([id, score]) => /^[1-8]$/.test(id) && Number.isFinite(score) && score >= 0)) return false;
    return Object.entries(state.results).every(([id, results]) => {
      const mission = state.missions.find(item => item.id === id);
      if (!mission || !isObject(results)) return false;
      const ranks = new Set();
      return Object.entries(results).every(([teamId, result]) => {
        if (!/^[1-8]$/.test(teamId) || !isObject(result) || !Number.isInteger(result.rank) || result.rank < 1 ||
            result.rank > 8 || ranks.has(result.rank) || result.points !== pointsForRank(result.rank, mission.isPractice) ||
            !Number.isFinite(result.time) || result.time < 0) return false;
        ranks.add(result.rank);
        return true;
      });
    });
  }

  function standings(teams) {
    const sorted = [...teams].sort((a, b) => b.score - a.score || a.id - b.id);
    let previousScore = null;
    let rank = 0;
    return sorted.map((team, index) => {
      if (index === 0 || team.score !== previousScore) rank = index + 1;
      previousScore = team.score;
      return { team, rank };
    });
  }

  function isFinalRoundComplete(lesson, stageIdx, teams, roundStart = null) {
    return stageIdx === lesson.missions.length - 1 && !lesson.missions[stageIdx].isPractice &&
      teams.length > 0 && (teams.every(team => team.isAllCompleted) ||
        Boolean(lesson.timer && lesson.timer.startedAt === roundStart && lesson.timer.reason === 'timeout'));
  }

  function getRoundClock(lesson, roundStart, isActive, now) {
    const timer = lesson && lesson.timer;
    if (roundStart == null) return { status: 'waiting', elapsedSeconds: 0, remainingSeconds: 180 };
    if (!timer || timer.startedAt !== roundStart) return { status: 'legacy', elapsedSeconds: null, remainingSeconds: null };
    if (!Number.isFinite(now)) return { status: 'syncing', elapsedSeconds: 0, remainingSeconds: 180 };
    const deadline = timer.startedAt + timer.durationMs;
    const end = timer.endedAt == null ? now : timer.endedAt;
    const elapsedMs = Math.max(0, Math.min(timer.durationMs, end - timer.startedAt));
    let status = 'running';
    if (timer.reason === 'completed') status = 'completed';
    else if (timer.reason === 'timeout' || !isActive || now >= deadline) status = 'expired';
    return {
      status,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      remainingSeconds: Math.ceil((timer.durationMs - elapsedMs) / 1000),
      deadline
    };
  }

  function formatSeconds(seconds) {
    if (!Number.isFinite(seconds)) return '--:--';
    const value = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }

  function isValidRoom(room) {
    if (!room || !Number.isInteger(room.stage_idx) || room.stage_idx < 0 ||
        !Array.isArray(room.teams) || room.teams.length < 2 || room.teams.length > 8 ||
        (room.is_match_active != null && typeof room.is_match_active !== 'boolean') ||
        (room.is_match_active && room.match_start_time == null) ||
        (room.match_start_time != null && (!Number.isSafeInteger(room.match_start_time) || room.match_start_time < 0)) ||
        (room.updated_at != null && !Number.isFinite(Date.parse(room.updated_at)))) return false;
    if (room.lesson_state != null && !isValidLessonState(room.lesson_state)) return false;
    if (room.stage_idx >= (room.lesson_state == null ? DEFAULT_WORDS.length : room.lesson_state.missions.length)) return false;
    const teamIds = new Set();
    return room.teams.every(team => {
      if (!team || typeof team !== 'object' || !Number.isInteger(team.id) || team.id < 1 || team.id > 8 || teamIds.has(team.id) ||
          typeof team.name !== 'string' || team.name.length > 100 ||
          !Array.isArray(team.members) || team.members.length < 1 || team.members.length > 8 ||
          (team.rank != null && (!Number.isInteger(team.rank) || team.rank < 1 || team.rank > 8)) ||
          (team.completedTime != null && (!Number.isFinite(team.completedTime) || team.completedTime < 0)) ||
          !Number.isFinite(team.score) || team.score < 0) return false;
      teamIds.add(team.id);
      const memberIds = new Set();
      return team.members.every(member => {
        if (!member || typeof member !== 'object' || !Number.isInteger(member.id) || member.id < 1 || member.id > 8 || memberIds.has(member.id) ||
            typeof member.name !== 'string' || member.name.length > 100 || typeof member.completed !== 'boolean' ||
            (member.completedTime != null && (!Number.isFinite(member.completedTime) || member.completedTime < 0))) return false;
        memberIds.add(member.id);
        return true;
      });
    });
  }

  function resetTeams(teams) {
    teams.forEach(team => {
      team.isAllCompleted = false;
      team.completedTime = null;
      team.rank = null;
      team.members.forEach(member => {
        member.completed = false;
        member.completedTime = null;
      });
    });
  }

  function nextStartTime(previous, timestamp) {
    const now = Math.floor(Number.isFinite(timestamp) ? timestamp : Date.now());
    if (Number(previous) > now + 60000) return now;
    return Math.max(now, (Number(previous) || 0) + 1);
  }

  function beginTimedRound(room, lesson, timestamp) {
    const startedAt = nextStartTime(room.match_start_time, timestamp);
    room.is_match_active = true;
    room.match_start_time = startedAt;
    lesson.timer = { startedAt, durationMs: ROUND_DURATION_MS, endedAt: null, reason: null };
  }

  function sameRoster(oldTeams, newTeams) {
    if (oldTeams.length !== newTeams.length) return false;
    return newTeams.every(team => {
      const previous = oldTeams.find(item => item.id === team.id);
      return previous && Array.isArray(previous.members) &&
        previous.members.length === team.members.length &&
        team.members.every(member => previous.members.some(item => item.id === member.id));
    });
  }

  function mergeConfig(oldTeams, requestedTeams) {
    if (!Array.isArray(requestedTeams) || requestedTeams.length < 2 || requestedTeams.length > 8) {
      throw error('INVALID_CONFIG', '모둠은 2개부터 8개까지 설정할 수 있습니다.');
    }
    const ids = new Set();
    return requestedTeams.map(requested => {
      const id = Number(requested.id);
      if (!Number.isInteger(id) || id < 1 || id > 8 || ids.has(id) ||
          !Array.isArray(requested.members) || requested.members.length < 1 || requested.members.length > 8) {
        throw error('INVALID_CONFIG', '모둠 구성이나 인원수가 올바르지 않습니다.');
      }
      ids.add(id);
      const previous = oldTeams.find(team => team.id === id);
      const memberIds = new Set();
      const members = requested.members.map(requestedMember => {
        const memberId = Number(requestedMember.id);
        if (!Number.isInteger(memberId) || memberId < 1 || memberId > 8 || memberIds.has(memberId)) {
          throw error('INVALID_CONFIG', '학생 번호가 올바르지 않습니다.');
        }
        memberIds.add(memberId);
        const oldMember = previous && previous.members.find(member => member.id === memberId);
        return {
          id: memberId,
          name: String(requestedMember.name || `학생 ${memberId}`).trim().slice(0, 40),
          completed: Boolean(oldMember && oldMember.completed),
          completedTime: oldMember && oldMember.completedTime != null ? oldMember.completedTime : null
        };
      });
      return {
        id,
        name: String(requested.name || `${id}모둠`).trim().slice(0, 40),
        memberCount: members.length,
        members,
        isAllCompleted: Boolean(previous && previous.isAllCompleted),
        completedTime: previous && previous.completedTime != null ? previous.completedTime : null,
        rank: previous && previous.rank != null ? previous.rank : null,
        score: previous && Number.isFinite(Number(previous.score)) ? Number(previous.score) : 0
      };
    });
  }

  function recalculateScores(teams, lesson) {
    teams.forEach(team => {
      const id = String(team.id);
      if (!Object.prototype.hasOwnProperty.call(lesson.baseScores, id)) lesson.baseScores[id] = 0;
      team.score = lesson.baseScores[id] + Object.values(lesson.results).reduce((total, results) => {
        const result = results[id];
        return total + (result ? result.points : 0);
      }, 0);
    });
  }

  function clearRound(lesson, missionId) {
    delete lesson.results[missionId];
  }

  function normalizeWord(word) {
    const normalized = typeof word === 'string' ? word.trim().normalize('NFC') : '';
    if (!validWord(normalized)) throw error('INVALID_WORD', '미션은 한글 음절 1~10자로 입력해 주세요.');
    return normalized;
  }

  function applyEvent(room, event) {
    if (!room || !Array.isArray(room.teams) || !event || !event.type) {
      throw error('INVALID_ROOM', '방 상태를 읽을 수 없습니다.');
    }
    const next = copy(room);
    const payload = event.payload || {};
    const lesson = getLessonState(next);
    next.lesson_state = lesson;

    switch (event.type) {
      case 'UPDATE_TEAMS_CONFIG': {
        const oldIds = new Set(next.teams.map(team => team.id));
        const teams = mergeConfig(next.teams, payload.teams);
        const rosterChanged = !sameRoster(next.teams, teams);
        const newIds = new Set(teams.map(team => team.id));
        oldIds.forEach(id => {
          if (!newIds.has(id)) {
            delete lesson.baseScores[String(id)];
            Object.values(lesson.results).forEach(results => { delete results[String(id)]; });
          }
        });
        next.teams = teams;
        if (rosterChanged) {
          resetTeams(next.teams);
          if (next.is_match_active) {
            clearRound(lesson, lesson.missions[next.stage_idx].id);
            beginTimedRound(next, lesson, event.timestamp);
          }
        }
        break;
      }
      case 'STAGE_CHANGE': {
        const stage = Number(payload.stageIdx);
        if (!Number.isInteger(stage) || stage < 0 || stage >= lesson.missions.length) {
          throw error('INVALID_STAGE', '선택한 문제가 올바르지 않습니다.');
        }
        if (payload.missionId && payload.missionId !== lesson.missions[stage].id) {
          throw error('MISSION_CHANGED', '미션 목록이 변경되었습니다. 다시 선택해 주세요.');
        }
        next.stage_idx = stage;
        beginTimedRound(next, lesson, event.timestamp);
        clearRound(lesson, lesson.missions[stage].id);
        resetTeams(next.teams);
        break;
      }
      case 'RESET_MATCH':
        beginTimedRound(next, lesson, event.timestamp);
        clearRound(lesson, lesson.missions[next.stage_idx].id);
        resetTeams(next.teams);
        break;
      case 'START_PRACTICE': {
        let index = lesson.missions.findIndex(mission => mission.isPractice);
        if (index < 0) {
          if (lesson.missions.some(mission => mission.id === 'practice')) {
            throw error('INVALID_MISSION', '연습 문제를 추가할 수 없습니다.');
          }
          lesson.missions.unshift({ id: 'practice', word: '가', isPractice: true });
          index = 0;
        }
        next.stage_idx = index;
        clearRound(lesson, lesson.missions[index].id);
        resetTeams(next.teams);
        beginTimedRound(next, lesson, event.timestamp);
        break;
      }
      case 'STUDENT_COMPLETED': {
        const mission = lesson.missions[next.stage_idx];
        if (payload.stageIdx !== next.stage_idx ||
            payload.roundStartTime !== next.match_start_time || (payload.missionId && payload.missionId !== mission.id)) {
          throw error('ROUND_CHANGED', '문제가 변경되었습니다. 현재 문제를 다시 확인해 주세요.');
        }
        const team = next.teams.find(item => item.id === payload.teamId);
        const member = team && team.members.find(item => item.id === payload.memberId);
        if (!member) throw error('MEMBER_NOT_FOUND', '선택한 모둠이나 학생을 찾을 수 없습니다.');
        if (member.completed) return { changed: false, room: next };

        const timestamp = Math.floor(Number.isFinite(event.timestamp) ? event.timestamp : Date.now());
        const timer = lesson.timer && lesson.timer.startedAt === next.match_start_time ? lesson.timer : null;
        if (!next.is_match_active || (timer && (timer.reason === 'timeout' || timestamp >= timer.startedAt + timer.durationMs))) {
          throw error(timer ? 'ROUND_EXPIRED' : 'ROUND_CHANGED', timer ? '3분이 지나 제출이 마감되었습니다.' : '문제가 변경되었습니다.');
        }
        const elapsed = Math.max(0, Math.round((timestamp - next.match_start_time) / 1000));
        member.completed = true;
        member.completedTime = elapsed;
        if (team.members.every(item => item.completed) && !team.isAllCompleted) {
          team.isAllCompleted = true;
          team.completedTime = elapsed;
          team.rank = next.teams.reduce((highest, item) => Math.max(highest, Number(item.rank) || 0), 0) + 1;
          if (!lesson.results[mission.id]) lesson.results[mission.id] = {};
          lesson.results[mission.id][String(team.id)] = {
            rank: team.rank, points: pointsForRank(team.rank, mission.isPractice), time: elapsed
          };
        }
        if (timer && next.teams.every(team => team.isAllCompleted)) {
          timer.endedAt = Math.min(timer.startedAt + timer.durationMs, Math.max(timer.startedAt, timestamp));
          timer.reason = 'completed';
        }
        break;
      }
      case 'EXPIRE_MATCH': {
        const timer = lesson.timer;
        if (!next.is_match_active || payload.stageIdx !== next.stage_idx || payload.roundStartTime !== next.match_start_time ||
            !timer || timer.startedAt !== next.match_start_time || timer.reason === 'completed') {
          return { changed: false, room: next };
        }
        const timestamp = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
        if (timestamp < timer.startedAt + timer.durationMs) {
          throw error('ROUND_NOT_EXPIRED', '아직 제한 시간이 남았습니다.');
        }
        next.is_match_active = false;
        timer.endedAt = timer.startedAt + timer.durationMs;
        timer.reason = 'timeout';
        break;
      }
      case 'UPDATE_MISSION': {
        const index = lesson.missions.findIndex(mission => mission.id === payload.missionId);
        if (index < 0) throw error('MISSION_CHANGED', '미션 목록이 변경되었습니다. 다시 확인해 주세요.');
        const mission = lesson.missions[index];
        if (payload.expectedWord != null && payload.expectedWord !== mission.word) {
          throw error('MISSION_CHANGED', '다른 화면에서 단어를 수정했습니다. 다시 확인해 주세요.');
        }
        const word = normalizeWord(payload.word);
        if (word === mission.word) return { changed: false, room: next };
        mission.word = word;
        clearRound(lesson, mission.id);
        if (index === next.stage_idx) {
          resetTeams(next.teams);
          if (next.is_match_active) beginTimedRound(next, lesson, event.timestamp);
        }
        break;
      }
      case 'ADD_MISSION': {
        const id = payload.missionId;
        const word = normalizeWord(payload.word);
        if (!validMissionId(id) || id === 'practice') throw error('INVALID_MISSION', '미션 정보가 올바르지 않습니다.');
        const existing = lesson.missions.find(mission => mission.id === id);
        if (existing && existing.word === word) return { changed: false, room: next };
        const practiceCount = lesson.missions.some(mission => mission.isPractice) ? 1 : 0;
        if (existing || lesson.missions.length >= MAX_MISSIONS + practiceCount) {
          throw error('INVALID_MISSION', `미션은 최대 ${MAX_MISSIONS}개까지 추가할 수 있습니다.`);
        }
        lesson.missions.push({ id, word, isPractice: false });
        break;
      }
      default:
        throw error('INVALID_EVENT', '지원하지 않는 방 변경 요청입니다.');
    }
    recalculateScores(next.teams, lesson);
    return { changed: true, room: next };
  }

  return { applyEvent, isValidRoom, createLessonState, getLessonState, validWord, pointsForRank, standings, isFinalRoundComplete, getRoundClock, formatSeconds, MAX_MISSIONS, ROUND_DURATION_MS };
})();

if (typeof window !== 'undefined') window.RoomState = RoomState;
if (typeof module !== 'undefined' && module.exports) module.exports = RoomState;
