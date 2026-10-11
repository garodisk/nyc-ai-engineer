// Browser lifecycle regressions with controllable media requests; no physical camera is captured.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function track(kind = 'video') { return { kind, enabled: true, readyState: 'live', stopped: false, listeners: {},
  stop() { this.stopped = true; this.readyState = 'ended'; }, addEventListener(name, fn) { this.listeners[name] = fn; } }; }
class Stream {
  constructor(tracks = []) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter((t) => t.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); }
}
class Element {
  constructor() { this.children = []; this.dataset = {}; this.parts = {}; this.flags = new Map();
    this.classList = { toggle: (key, value) => this.flags.set(key, value) }; }
  set innerHTML(value) { this.html = value; this.children = []; if (value.includes('<video')) this.parts.video = { srcObject: null, plays: 0, play() { this.plays++; return Promise.resolve(); } }; }
  get innerHTML() { return this.html || ''; }
  append(el) { el.parent = this; this.children.push(el); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  querySelector(selector) { if (selector === '.tiles-empty') return null; return this.parts[selector] ||= {}; }
  querySelectorAll() { return [...this.children]; }
}
function setup() {
  const boxes = { tiles: new Element(), 'call-controls': new Element(), 'call-status': new Element() };
  const media = deferred(); let requests = 0, interval = 0;
  const context = vm.createContext({ console: { ...console, warn() {} }, crypto: webcrypto, CSS: { escape: (s) => s }, MediaStream: Stream,
    me: { id: 1, handle: 'ada' }, esc: String, avatar: () => 'Ada', toast: () => {},
    window: { addEventListener() {}, removeEventListener() {} },
    document: { getElementById: (id) => boxes[id] || null, createElement: () => new Element(), removeEventListener() {},
      querySelector(selector) { const session = selector.match(/data-session="([^"]+)"/)?.[1]; return boxes.tiles.children.find((el) => el.dataset.session === session) || null; } },
    navigator: { mediaDevices: { getUserMedia() { requests++; return media.promise; } } },
    fetch: async () => ({}), api: () => new Promise(() => {}),
    setInterval: () => ++interval, clearInterval() {}, setTimeout, clearTimeout,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'static/room.js'), 'utf8') + `
    globalThis.hooks = { toggleCamera, setTalking, leaveRoom, stopCall, joinCall, heartbeat, attachLocal,
      setRoom(value) { room = value; }, setOnSignal(fn) { onSignal = fn; } };`, context);
  const r = { teamId: 1, session: 'self-session', joined: true, mediaGeneration: 1, peers: new Map(),
    members: [{ id: 1, name: 'Ada', handle: 'ada', where: 'room' }], participants: [],
    local: { cam: null, mic: null, talking: false }, caption: '', lines: [], since: 0, transcribe: false };
  context.hooks.setRoom(r);
  return { context, r, boxes, media, hooks: context.hooks, requests: () => requests };
}

test('rapid camera clicks share one permission request and show local video without a heartbeat', async () => {
  const h = setup(), camera = track();
  const first = h.hooks.toggleCamera(h.r);
  await h.hooks.toggleCamera(h.r);
  assert.equal(h.requests(), 1);
  assert.match(h.boxes['call-controls'].innerHTML, /Starting camera/);
  h.media.resolve(new Stream([camera])); await first;
  assert.equal(h.r.cameraBusy, false);
  assert.equal(h.r.local.cam, camera);
  const tile = h.boxes.tiles.children[0];
  assert.equal(tile.flags.get('cam-on'), true);
  assert.equal(tile.parts.video.srcObject.getVideoTracks()[0], camera);
  assert.equal(tile.parts.video.plays, 1);
  await h.hooks.toggleCamera(h.r);
  assert.equal(camera.stopped, true);
  assert.equal(tile.parts.video.srcObject, null);
});

test('camera permission resolving after leaving stops every acquired track', async () => {
  const h = setup(), camera = track();
  const pending = h.hooks.toggleCamera(h.r);
  h.hooks.leaveRoom();
  h.media.resolve(new Stream([camera])); await pending;
  assert.equal(camera.stopped, true);
  assert.equal(h.r.local.cam, null);
});

test('permission denial restores a usable camera button and explains the error', async () => {
  const h = setup();
  const pending = h.hooks.toggleCamera(h.r);
  h.media.reject(Object.assign(new Error('Denied'), { name: 'NotAllowedError' })); await pending;
  assert.equal(h.r.cameraBusy, false);
  assert.equal(h.r.local.cam, null);
  assert.match(h.boxes['call-controls'].innerHTML, /Permission denied/);
});

test('camera device ending clears its tile immediately', async () => {
  const h = setup(), camera = track();
  const pending = h.hooks.toggleCamera(h.r);
  h.media.resolve(new Stream([camera])); await pending;
  camera.listeners.ended();
  assert.equal(h.r.local.cam, null);
  assert.equal(h.boxes.tiles.children[0].flags.get('cam-on'), false);
  assert.match(h.boxes['call-controls'].innerHTML, /Camera stopped/);
});

test('leaving and rejoining before old permission resolves cannot attach the old camera', async () => {
  const h = setup(), camera = track();
  const pending = h.hooks.toggleCamera(h.r);
  h.hooks.stopCall(h.r); h.hooks.joinCall(h.r);
  h.media.resolve(new Stream([camera])); await pending;
  assert.equal(h.r.joined, true);
  assert.equal(camera.stopped, true);
  assert.equal(h.r.local.cam, null);
});

test('mic permission is deduplicated and releasing push-to-talk before approval stays muted', async () => {
  const h = setup(), mic = track('audio');
  const pending = h.hooks.setTalking(h.r, true);
  await h.hooks.setTalking(h.r, true);
  await h.hooks.setTalking(h.r, false);
  h.media.resolve(new Stream([mic])); await pending;
  assert.equal(h.requests(), 1);
  assert.equal(mic.enabled, false);
  assert.equal(h.r.local.talking, false);
});

test('failed AudioContext cannot prevent joining the call', () => {
  const h = setup(); h.r.joined = false;
  h.context.window.AudioContext = class { constructor() { throw new Error('Unavailable'); } };
  h.hooks.joinCall(h.r);
  assert.equal(h.r.joined, true);
  assert.equal(h.boxes.tiles.children.length, 1);
  assert.match(h.boxes['call-controls'].innerHTML, /Camera off/);
});

test('signaling processing does not stall presence heartbeats', async () => {
  const h = setup();
  h.context.api = async () => ({ signals: [{ id: 1, from: 'other' }], participants: [], transcript: [] });
  h.hooks.setOnSignal(() => new Promise(() => {}));
  await h.hooks.heartbeat(h.r);
  assert.equal(h.r.beating, false);
  assert.equal(h.r.since, 1);
});

test('server instance reset clears the signal cursor without stopping local video', async () => {
  const h = setup(), camera = track();
  h.r.local.cam = camera; h.r.instance = 'old'; h.r.since = 999;
  h.context.api = async () => ({ instance: 'new', signals: [], participants: [], transcript: [] });
  await h.hooks.heartbeat(h.r);
  assert.equal(h.r.since, 0);
  assert.equal(h.r.local.cam, camera);
  assert.equal(camera.stopped, false);
  assert.equal(h.boxes.tiles.children[0].flags.get('cam-on'), true);
});

test('network error keeps call alive and the next heartbeat recovers', async () => {
  const h = setup(); h.context.api = async () => { throw new Error('Offline'); };
  await h.hooks.heartbeat(h.r);
  assert.equal(h.r.joined, true);
  assert.equal(h.r.connectionStatus, 'Reconnecting…');
  h.context.api = async () => ({ signals: [], participants: [], transcript: [] });
  await h.hooks.heartbeat(h.r);
  assert.equal(h.r.connectionStatus, 'In call');
});

test('failed sender replacement is handled and removes only its connection', async () => {
  const h = setup(); let closed = false;
  const peer = { pc: { close() { closed = true; } }, videoTx: { sender: { replaceTrack: async () => { throw new Error('Closed sender'); } } } };
  h.r.peers.set('other', peer);
  await h.hooks.attachLocal(h.r, peer);
  assert.equal(closed, true); assert.equal(h.r.peers.size, 0);
});

test('API timeout aborts a stuck fetch instead of leaving room loading forever', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'static/app.js'), 'utf8');
  const apiSource = source.slice(source.indexOf('async function api('), source.indexOf('let toastTimer'));
  const context = vm.createContext({ AbortController, setTimeout, clearTimeout,
    fetch: (_, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })))) });
  vm.runInContext(apiSource + ';globalThis.testApi = api;', context);
  await assert.rejects(context.testApi('/teams/1/room', undefined, { timeoutMs: 10 }), /Connection timed out/);
  context.fetch = async (_, options) => ({ json: () => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted body'), { name: 'AbortError' })))) });
  await assert.rejects(context.testApi('/teams/1/room', undefined, { timeoutMs: 10 }), /Connection timed out/);
});
