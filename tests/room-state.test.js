const test = require('node:test');
const assert = require('node:assert/strict');
const { applyEvent, isValidRoom } = require('../room-state.js');

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
  assert.equal(second.teams[0].score, 100);
});

test('team completion order and scores remain consistent', () => {
  let state = room();
  for (const event of [submit(2, 1), submit(2, 2), submit(1, 1), submit(1, 2)]) {
    state = applyEvent(state, event).room;
  }
  assert.deepEqual(state.teams.map(item => item.rank), [2, 1]);
  assert.deepEqual(state.teams.map(item => item.score), [80, 100]);
  const duplicate = applyEvent(state, submit(2, 2));
  assert.equal(duplicate.changed, false);
  assert.equal(duplicate.room.teams[1].score, 100);
});

test('old-round submissions cannot mark a new problem complete', () => {
  const next = applyEvent(room(), { type: 'STAGE_CHANGE', timestamp: 4000, payload: { stageIdx: 1 } }).room;
  assert.equal(next.stage_idx, 1);
  assert.equal(next.match_start_time, 4000);
  assert.throws(() => applyEvent(next, submit(1, 1)), { code: 'ROUND_CHANGED' });
});

test('reset clears the round without deleting cumulative scores', () => {
  let state = room();
  state = applyEvent(state, submit(1, 1)).room;
  state = applyEvent(state, submit(1, 2)).room;
  state = applyEvent(state, { type: 'RESET_MATCH', timestamp: 1000, payload: {} }).room;
  assert.equal(state.match_start_time, 1001);
  assert.equal(state.teams[0].score, 100);
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
