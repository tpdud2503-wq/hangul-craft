const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const RoomState = require('../room-state.js');

function makeTeam(id) {
  return {
    id, name: `${id}모둠`, memberCount: 3,
    members: Array.from({ length: 3 }, (_, index) => ({
      id: index + 1, name: `학생 ${index + 1}`, completed: false, completedTime: null
    })),
    isAllCompleted: false, completedTime: null, rank: null, score: 0
  };
}

function makeRoom() {
  return {
    room_id: 'ABC234', stage_idx: 0, is_match_active: true, match_start_time: 1000,
    teams: [makeTeam(1), makeTeam(2)], updated_at: '2026-01-01T00:00:00.000Z'
  };
}

function fakeClient(store) {
  return {
    from() {
      const query = {
        operation: 'select', filters: [], changes: null,
        select() { return this; },
        update(changes) { this.operation = 'update'; this.changes = changes; return this; },
        eq(field, value) { this.filters.push([field, value]); return this; },
        is(field, value) { this.filters.push([field, value]); return this; },
        async maybeSingle() {
          await new Promise(resolve => setTimeout(resolve, 1));
          if (!store.room || !this.filters.every(([field, value]) => store.room[field] === value)) {
            if (this.operation === 'update') store.conflicts++;
            return { data: null, error: null };
          }
          if (this.operation === 'update') store.room = { ...store.room, ...structuredClone(this.changes) };
          return { data: structuredClone(store.room), error: null };
        }
      };
      return query;
    }
  };
}

function createClient(store) {
  const manager = {
    teams: structuredClone(store.room ? store.room.teams : [makeTeam(1), makeTeam(2)]), isMatchActive: true, matchStartTime: 1000,
    applyTeamsConfig(teams) { this.teams = teams; }
  };
  const window = {
    location: { search: '?room=ABC234', pathname: '/student.html', href: 'http://localhost/student.html?room=ABC234', hash: '' },
    teamManager: manager,
    RoomState
  };
  const code = fs.readFileSync(path.join(__dirname, '..', 'cloud-sync.js'), 'utf8');
  vm.runInNewContext(code, { window, URL, URLSearchParams, Uint8Array, Date, Math, Promise, setTimeout, console });
  const sync = window.cloudSync;
  sync.supabase = fakeClient(store);
  sync.channel = { send: () => Promise.resolve('ok') };
  sync.realtimeReady = true;
  sync.isConnected = true;
  return sync;
}

test('conditioned writes retry and preserve concurrent student submissions', async () => {
  const store = {
    conflicts: 0,
    room: makeRoom()
  };
  const clients = Array.from({ length: 6 }, () => createClient(store));
  await Promise.all(clients.map((client, index) => client.publish({
    type: 'STUDENT_COMPLETED', timestamp: 4000,
    payload: { teamId: Math.floor(index / 3) + 1, memberId: index % 3 + 1, stageIdx: 0, roundStartTime: 1000 }
  })));
  assert.ok(store.conflicts > 0);
  assert.ok(store.room.teams.every(team => team.members.every(member => member.completed)));
  assert.deepEqual(store.room.teams.map(team => team.rank).sort(), [1, 2]);
  assert.deepEqual(store.room.teams.map(team => team.score).sort((a, b) => a - b), [5, 10]);
});

test('database polling keeps a room usable when realtime is blocked', async () => {
  const store = { conflicts: 0, room: makeRoom() };
  const sync = createClient(store);
  sync.role = 'student';
  sync.realtimeReady = false;
  sync.pollingMode = true;
  sync.isConnected = false;
  await sync.refreshIfConnected();
  assert.equal(sync.isConnected, true);
  assert.equal(sync.roomAvailable, true);
  assert.match(sync.statusText, /3초/);
  store.room = null;
  await sync.refreshIfConnected();
  assert.equal(sync.isConnected, false);
  assert.equal(sync.roomAvailable, false);
  assert.equal(sync.waitingForRoom, true);
  assert.match(sync.statusText, /방 코드/);
});

test('join links keep the room code and specify the current release', () => {
  const sync = createClient({ conflicts: 0, room: makeRoom() });
  const url = new URL(sync.getJoinUrl());
  assert.equal(url.searchParams.get('room'), 'ABC234');
  assert.equal(url.searchParams.get('v'), '20261113-1');
});
