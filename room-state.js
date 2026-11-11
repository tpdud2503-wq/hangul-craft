/** 방 상태를 서버의 최신 값에 적용하는 순수 함수. */
const RoomState = (() => {
  const SCORE_TABLE = [100, 80, 60, 40, 20, 10];

  function error(code, message) {
    const result = new Error(message);
    result.code = code;
    return result;
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isValidRoom(room) {
    if (!room || !Number.isInteger(room.stage_idx) || room.stage_idx < 0 || room.stage_idx > 7 ||
        !Array.isArray(room.teams) || room.teams.length < 2 || room.teams.length > 8 ||
        (room.is_match_active != null && typeof room.is_match_active !== 'boolean') ||
        (room.is_match_active && room.match_start_time == null) ||
        (room.match_start_time != null && (!Number.isSafeInteger(room.match_start_time) || room.match_start_time < 0)) ||
        (room.updated_at != null && !Number.isFinite(Date.parse(room.updated_at)))) return false;
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
    const now = Number.isFinite(timestamp) ? timestamp : Date.now();
    return Math.max(now, (Number(previous) || 0) + 1);
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

  function applyEvent(room, event) {
    if (!room || !Array.isArray(room.teams) || !event || !event.type) {
      throw error('INVALID_ROOM', '방 상태를 읽을 수 없습니다.');
    }
    const next = copy(room);
    const payload = event.payload || {};

    switch (event.type) {
      case 'UPDATE_TEAMS_CONFIG': {
        const teams = mergeConfig(next.teams, payload.teams);
        const rosterChanged = !sameRoster(next.teams, teams);
        next.teams = teams;
        if (rosterChanged) {
          resetTeams(next.teams);
          if (next.is_match_active) {
            next.match_start_time = nextStartTime(next.match_start_time, event.timestamp);
          }
        }
        break;
      }
      case 'STAGE_CHANGE': {
        const stage = Number(payload.stageIdx);
        if (!Number.isInteger(stage) || stage < 0 || stage > 7) {
          throw error('INVALID_STAGE', '선택한 문제가 올바르지 않습니다.');
        }
        next.stage_idx = stage;
        next.is_match_active = true;
        next.match_start_time = nextStartTime(next.match_start_time, event.timestamp);
        resetTeams(next.teams);
        break;
      }
      case 'RESET_MATCH':
        next.is_match_active = true;
        next.match_start_time = nextStartTime(next.match_start_time, event.timestamp);
        resetTeams(next.teams);
        break;
      case 'STUDENT_COMPLETED': {
        if (!next.is_match_active || payload.stageIdx !== next.stage_idx ||
            payload.roundStartTime !== next.match_start_time) {
          throw error('ROUND_CHANGED', '문제가 변경되었습니다. 현재 문제를 다시 확인해 주세요.');
        }
        const team = next.teams.find(item => item.id === payload.teamId);
        const member = team && team.members.find(item => item.id === payload.memberId);
        if (!member) throw error('MEMBER_NOT_FOUND', '선택한 모둠이나 학생을 찾을 수 없습니다.');
        if (member.completed) return { changed: false, room: next };

        const timestamp = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
        const elapsed = Math.max(0, Math.round((timestamp - next.match_start_time) / 1000));
        member.completed = true;
        member.completedTime = elapsed;
        if (team.members.every(item => item.completed) && !team.isAllCompleted) {
          team.isAllCompleted = true;
          team.completedTime = elapsed;
          team.rank = next.teams.reduce((highest, item) => Math.max(highest, Number(item.rank) || 0), 0) + 1;
          team.score = (Number(team.score) || 0) + (SCORE_TABLE[team.rank - 1] || 10);
        }
        break;
      }
      default:
        throw error('INVALID_EVENT', '지원하지 않는 방 변경 요청입니다.');
    }
    return { changed: true, room: next };
  }

  return { applyEvent, isValidRoom };
})();

if (typeof window !== 'undefined') window.RoomState = RoomState;
if (typeof module !== 'undefined' && module.exports) module.exports = RoomState;
