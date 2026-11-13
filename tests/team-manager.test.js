const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RoomState = require('../room-state.js');

function createManager(roomId, storage = new Map()) {
  const published = [];
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, value); }
  };
  const window = {
    cloudSync: { roomId, publish(event) { published.push(event); return Promise.resolve(); } },
    RoomState,
    addEventListener() {}
  };
  class BroadcastChannel { postMessage() {} }
  const code = fs.readFileSync(path.join(__dirname, '..', 'team-manager.js'), 'utf8');
  vm.runInNewContext(code, { window, localStorage, BroadcastChannel, console });
  return { manager: window.teamManager, published };
}

test('new rooms start with six teams of five students', () => {
  const { manager } = createManager('NEW234');
  assert.deepEqual(Array.from(manager.teams, team => team.id), [1, 2, 3, 4, 5, 6]);
  assert.ok(manager.teams.every(team => team.memberCount === 5 && team.members.length === 5 && team.score === 0));
  assert.deepEqual(Array.from(manager.teams[0].members, member => member.id), [1, 2, 3, 4, 5]);
  assert.equal(manager.lessonState.missions[0].word, '가방');
});

test('newly added teams have five students unless another count is specified', async () => {
  const { manager, published } = createManager('NEW234');
  await manager.addTeam();
  assert.equal(manager.teams[6].id, 7);
  assert.equal(manager.teams[6].memberCount, 5);
  assert.equal(manager.teams[6].members.length, 5);
  assert.equal(published[0].type, 'UPDATE_TEAMS_CONFIG');
  await manager.addTeam('여덟 모둠', 4);
  assert.equal(manager.teams[7].members.length, 4);
});

test('saved team settings stay isolated from new-room defaults', () => {
  const savedTeams = [
    { id: 1, name: '기존 모둠', memberCount: 1, members: [{ id: 1, name: '학생 1', completed: true, completedTime: 2 }], isAllCompleted: true, completedTime: 2, rank: 1, score: 10 },
    { id: 2, name: '다른 모둠', memberCount: 1, members: [{ id: 1, name: '학생 1', completed: false, completedTime: null }], isAllCompleted: false, completedTime: null, rank: null, score: 0 }
  ];
  const oldKey = 'hangul_team_settings_v2_OLD234';
  const saved = JSON.stringify({ teams: savedTeams });
  const storage = new Map([[oldKey, saved]]);
  const old = createManager('OLD234', storage).manager;
  const fresh = createManager('NEW234', storage).manager;
  assert.deepEqual(JSON.parse(JSON.stringify(old.teams)), savedTeams);
  assert.equal(storage.get(oldKey), saved);
  assert.equal(fresh.teams.length, 6);
  assert.ok(fresh.teams.every(team => team.members.length === 5));
});
