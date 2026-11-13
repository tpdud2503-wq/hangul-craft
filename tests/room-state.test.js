const test = require('node:test');
const assert = require('node:assert/strict');
const { applyEvent, isValidRoom, createLessonState, getLessonState, standings, isFinalRoundComplete, getRoundClock, formatSeconds, ROUND_DURATION_MS } = require('../room-state.js');

function team(id, count = 2) {
  return {
    id, name: `${id}모둠`, memberCount: count,
    members: Array.from({ length: count }, (_, index) => ({
      id: index + 1, name: `학생 ${index + 1}`, completed: false, completedTime: null
    })),
    isAllCompleted: false, completedTime: null, rank: null, score: 0
  };
}

function room() {
  return { room_id: 'ABC234', stage_idx: 0, is_match_active: true, match_start_time: 1000, teams: [team(1), team(2)] };
}

function submit(teamId, memberId, timestamp = 3000, stageIdx = 0, roundStartTime = 1000) {
  return { type: 'STUDENT_COMPLETED', timestamp, payload: { teamId, memberId, stageIdx, roundStartTime } };
}

test('simultaneous members are merged when an update is retried', () => {
  const initial = room();
  const first = applyEvent(initial, submit(1, 1)).room;
  const second = applyEvent(first, submit(1, 2)).room;
  assert.equal(initial.teams[0].members[0].completed, false);
  assert.deepEqual(second.teams[0].members.map(member => member.completed), [true, true]);
  assert.equal(second.teams[0].rank, 1);
  assert.equal(second.teams[0].score, 10);
});

test('team completion order and scores remain consistent', () => {
  let state = room();
  for (const event of [submit(2, 1), submit(2, 2), submit(1, 1), submit(1, 2)]) {
    state = applyEvent(state, event).room;
  }
  assert.deepEqual(state.teams.map(item => item.rank), [2, 1]);
  assert.deepEqual(state.teams.map(item => item.score), [5, 10]);
  const duplicate = applyEvent(state, submit(2, 2));
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.room.teams[1].score, 10);
});

test('old-round submissions cannot mark a new problem complete', () => {
  const next = applyEvent(room(), { type: 'STAGE_CHANGE', timestamp: 4000, payload: { stageIdx: 1 } }).room;
  assert.equal(next.stage_idx, 1);
  assert.equal(next.match_start_time, 4000);
  assert.throws(() => applyEvent(next, submit(1, 1)), { code: 'ROUND_CHANGED' });
});

test('reset clears the current round and does not award points twice', () => {
  let state = room();
  state = applyEvent(state, submit(1, 1)).room;
  state = applyEvent(state, submit(1, 2)).room;
  state = applyEvent(state, { type: 'RESET_MATCH', timestamp: 1000, payload: {} }).room;
  assert.equal(state.match_start_time, 1001);
  assert.equal(state.teams[0].score, 0);
  assert.equal(state.teams[0].rank, null);
  assert.ok(state.teams[0].members.every(member => !member.completed));
});

test('renaming a team preserves submissions while roster changes start a fresh round', () => {
  let state = applyEvent(room(), submit(1, 1)).room;
  const requested = structuredClone(state.teams);
  requested[0].name = '새 이름';
  state = applyEvent(state, { type: 'UPDATE_TEAMS_CONFIG', timestamp: 5000, payload: { teams: requested } }).room;
  assert.equal(state.teams[0].name, '새 이름');
  assert.equal(state.teams[0].members[0].completed, true);
  requested[0].members.push({ id: 3, name: '학생 3' });
  state = applyEvent(state, { type: 'UPDATE_TEAMS_CONFIG', timestamp: 5000, payload: { teams: requested } }).room;
  assert.equal(state.match_start_time, 5000);
  assert.ok(state.teams[0].members.every(member => !member.completed));
  assert.throws(() => applyEvent(state, submit(1, 2)), { code: 'ROUND_CHANGED' });
});

test('invalid stages and duplicate team IDs are rejected', () => {
  assert.throws(() => applyEvent(room(), { type: 'STAGE_CHANGE', payload: { stageIdx: 8 } }), { code: 'INVALID_STAGE' });
  assert.throws(() => applyEvent(room(), { type: 'UPDATE_TEAMS_CONFIG', payload: { teams: [team(1), team(1)] } }), { code: 'INVALID_CONFIG' });
});

test('malformed room data is rejected before rendering', () => {
  assert.equal(isValidRoom(room()), true);
  assert.equal(isValidRoom({ ...room(), teams: [null, team(2)] }), false);
  assert.equal(isValidRoom({ ...room(), teams: [team(1), { ...team(2), members: [null] }] }), false);
  assert.equal(isValidRoom({ ...room(), is_match_active: true, match_start_time: null }), false);
});

test('practice comes first and never changes the cumulative score', () => {
  const state = room();
  state.lesson_state = createLessonState(state.teams);
  assert.equal(state.lesson_state.missions[0].word, '가');
  assert.equal(state.lesson_state.missions[0].isPractice, true);
  const first = applyEvent(state, submit(1, 1)).room;
  const completed = applyEvent(first, submit(1, 2)).room;
  assert.equal(completed.teams[0].rank, 1);
  assert.equal(completed.teams[0].score, 0);
  assert.equal(completed.lesson_state.results.practice['1'].points, 0);
  const edited = applyEvent(completed, { type: 'UPDATE_MISSION', timestamp: 5000, payload: { missionId: 'practice', expectedWord: '가', word: '나' } }).room;
  assert.equal(edited.lesson_state.missions[0].word, '나');
  assert.equal(edited.teams[0].score, 0);
  assert.equal(edited.teams[0].isAllCompleted, false);
});

test('first earns 10, second and third 5, and fourth onward 2', () => {
  let state = room();
  state.teams = Array.from({ length: 8 }, (_, index) => team(index + 1, 1));
  for (let id = 1; id <= 8; id++) state = applyEvent(state, submit(id, 1)).room;
  assert.deepEqual(state.teams.map(item => item.score), [10, 5, 5, 2, 2, 2, 2, 2]);
});

test('round scores accumulate and replay only clears the replayed round', () => {
  let state = room();
  state = applyEvent(state, submit(1, 1)).room;
  state = applyEvent(state, submit(1, 2)).room;
  state = applyEvent(state, { type: 'STAGE_CHANGE', timestamp: 5000, payload: { stageIdx: 1, missionId: 'm2' } }).room;
  state = applyEvent(state, submit(2, 1, 6000, 1, 5000)).room;
  state = applyEvent(state, submit(2, 2, 6000, 1, 5000)).room;
  state = applyEvent(state, submit(1, 1, 6000, 1, 5000)).room;
  state = applyEvent(state, submit(1, 2, 6000, 1, 5000)).room;
  assert.deepEqual(state.teams.map(item => item.score), [15, 10]);
  state = applyEvent(state, { type: 'RESET_MATCH', timestamp: 7000, payload: {} }).room;
  assert.deepEqual(state.teams.map(item => item.score), [10, 0]);
  assert.equal(state.lesson_state.results.m2, undefined);
  assert.equal(state.lesson_state.results.m1['1'].points, 10);
});

test('editing and adding missions preserve other rounds and reject stale or invalid words', () => {
  let state = room();
  state = applyEvent(state, submit(1, 1)).room;
  state = applyEvent(state, submit(1, 2)).room;
  state = applyEvent(state, { type: 'STAGE_CHANGE', timestamp: 5000, payload: { stageIdx: 1, missionId: 'm2' } }).room;
  state = applyEvent(state, submit(2, 1, 6000, 1, 5000)).room;
  state = applyEvent(state, submit(2, 2, 6000, 1, 5000)).room;
  state = applyEvent(state, { type: 'UPDATE_MISSION', timestamp: 6500, payload: { missionId: 'm1', expectedWord: '하늘', word: '학교' } }).room;
  assert.deepEqual(state.teams.map(item => item.score), [0, 10]);
  assert.equal(state.teams[1].isAllCompleted, true);
  state = applyEvent(state, { type: 'UPDATE_MISSION', timestamp: 7000, payload: { missionId: 'm2', expectedWord: '바다', word: '연필' } }).room;
  assert.deepEqual(state.teams.map(item => item.score), [0, 0]);
  assert.equal(state.match_start_time, 7000);
  assert.ok(state.teams.every(item => !item.isAllCompleted));
  state = applyEvent(state, { type: 'ADD_MISSION', timestamp: 8000, payload: { missionId: 'extra-1', word: '사랑' } }).room;
  assert.equal(state.lesson_state.missions.at(-1).word, '사랑');
  assert.throws(() => applyEvent(state, { type: 'UPDATE_MISSION', payload: { missionId: 'm1', expectedWord: '하늘', word: '나무' } }), { code: 'MISSION_CHANGED' });
  assert.throws(() => applyEvent(state, { type: 'ADD_MISSION', payload: { missionId: 'extra-2', word: 'abc' } }), { code: 'INVALID_WORD' });
});

test('legacy scores are retained and final standings handle ties', () => {
  const old = room();
  old.teams[0].score = 100;
  assert.equal(getLessonState(old).legacy, true);
  assert.equal(getLessonState(old).missions[0].word, '하늘');
  const next = applyEvent(old, { type: 'ADD_MISSION', payload: { missionId: 'extra-1', word: '사랑' } }).room;
  assert.equal(next.teams[0].score, 100);
  const tied = [team(1), team(2), team(3)];
  tied[0].score = 15; tied[1].score = 15; tied[2].score = 10;
  assert.deepEqual(standings(tied).map(item => item.rank), [1, 1, 3]);
  const lesson = createLessonState(tied);
  tied.forEach(item => { item.isAllCompleted = true; });
  assert.equal(isFinalRoundComplete(lesson, lesson.missions.length - 1, tied), true);
  assert.equal(isFinalRoundComplete(lesson, 0, tied), false);
});

test('changing a roster only clears the current round and never revives removed team scores', () => {
  let state = room();
  state.teams.push(team(3, 1));
  state = applyEvent(state, submit(3, 1)).room;
  state = applyEvent(state, { type: 'STAGE_CHANGE', timestamp: 5000, payload: { stageIdx: 1, missionId: 'm2' } }).room;
  state = applyEvent(state, submit(1, 1, 6000, 1, 5000)).room;
  state = applyEvent(state, submit(1, 2, 6000, 1, 5000)).room;
  const changed = structuredClone(state.teams).filter(item => item.id !== 3);
  state = applyEvent(state, { type: 'UPDATE_TEAMS_CONFIG', timestamp: 7000, payload: { teams: changed } }).room;
  assert.deepEqual(state.teams.map(item => item.score), [0, 0]);
  assert.equal(state.lesson_state.results.m1['3'], undefined);
  assert.equal(state.lesson_state.results.m2, undefined);
  changed.push(team(3, 1));
  state = applyEvent(state, { type: 'UPDATE_TEAMS_CONFIG', timestamp: 8000, payload: { teams: changed } }).room;
  assert.equal(state.teams.find(item => item.id === 3).score, 0);
});

test('invalid round scores and mission words are rejected when reading a room', () => {
  const state = room();
  state.lesson_state = createLessonState(state.teams);
  state.lesson_state.results.m1 = { 1: { rank: 1, points: 100, time: 2 } };
  assert.equal(isValidRoom(state), false);
  state.lesson_state.results = {};
  state.lesson_state.missions[1].word = '<script>';
  assert.equal(isValidRoom(state), false);
});

test('starting a round creates a three-minute stopwatch', () => {
  const next = applyEvent(room(), { type: 'RESET_MATCH', timestamp: 5000, payload: {} }).room;
  assert.equal(next.lesson_state.timer.startedAt, 5000);
  assert.equal(next.lesson_state.timer.durationMs, 180000);
  const running = getRoundClock(next.lesson_state, next.match_start_time, true, 17345);
  assert.equal(running.status, 'running');
  assert.equal(formatSeconds(running.elapsedSeconds), '00:12');
  assert.equal(formatSeconds(running.remainingSeconds), '02:48');
  const deadline = getRoundClock(next.lesson_state, next.match_start_time, true, 185000);
  assert.equal(deadline.status, 'expired');
  assert.equal(formatSeconds(deadline.elapsedSeconds), '03:00');
  assert.equal(formatSeconds(deadline.remainingSeconds), '00:00');
});

test('timeout preserves earned scores, rejects late submissions and ignores stale timeouts', () => {
  let state = applyEvent(room(), { type: 'RESET_MATCH', timestamp: 5000, payload: {} }).room;
  state = applyEvent(state, submit(1, 1, 6000, 0, 5000)).room;
  state = applyEvent(state, submit(1, 2, 7000, 0, 5000)).room;
  assert.equal(state.teams[0].score, 10);
  const timeout = { type: 'EXPIRE_MATCH', timestamp: 5000 + ROUND_DURATION_MS, payload: { stageIdx: 0, roundStartTime: 5000 } };
  assert.throws(() => applyEvent(state, { ...timeout, timestamp: timeout.timestamp - 1 }), { code: 'ROUND_NOT_EXPIRED' });
  assert.equal(applyEvent(state, { ...timeout, payload: { stageIdx: 0, roundStartTime: 1 } }).changed, false);
  assert.throws(() => applyEvent(state, submit(2, 1, timeout.timestamp, 0, 5000)), { code: 'ROUND_EXPIRED' });
  state = applyEvent(state, timeout).room;
  assert.equal(state.is_match_active, false);
  assert.equal(state.lesson_state.timer.reason, 'timeout');
  assert.deepEqual(state.teams.map(item => item.score), [10, 0]);
  assert.equal(applyEvent(state, submit(1, 2, timeout.timestamp + 1, 0, 5000)).changed, false);
  assert.throws(() => applyEvent(state, submit(2, 1, timeout.timestamp + 1, 0, 5000)), { code: 'ROUND_EXPIRED' });
});

test('stopwatch freezes when all teams finish before the limit', () => {
  let state = room();
  state.teams = [team(1, 1), team(2, 1)];
  state = applyEvent(state, { type: 'RESET_MATCH', timestamp: 5000, payload: {} }).room;
  state = applyEvent(state, submit(1, 1, 8000, 0, 5000)).room;
  state = applyEvent(state, submit(2, 1, 10000, 0, 5000)).room;
  assert.equal(state.lesson_state.timer.reason, 'completed');
  const clock = getRoundClock(state.lesson_state, state.match_start_time, true, 999999);
  assert.equal(clock.status, 'completed');
  assert.equal(formatSeconds(clock.elapsedSeconds), '00:05');
  assert.equal(applyEvent(state, { type: 'EXPIRE_MATCH', timestamp: 999999, payload: { stageIdx: 0, roundStartTime: 5000 } }).changed, false);
});

test('existing untimed rounds remain intact and an expired last round shows final standings', () => {
  const old = room();
  assert.equal(getRoundClock(getLessonState(old), old.match_start_time, true, 999999).status, 'legacy');
  let state = { ...room(), lesson_state: createLessonState(room().teams) };
  const last = state.lesson_state.missions.length - 1;
  state = applyEvent(state, { type: 'STAGE_CHANGE', timestamp: 5000, payload: { stageIdx: last } }).room;
  state = applyEvent(state, { type: 'EXPIRE_MATCH', timestamp: 185000, payload: { stageIdx: last, roundStartTime: 5000 } }).room;
  assert.equal(isFinalRoundComplete(state.lesson_state, last, state.teams, state.match_start_time), true);
});
