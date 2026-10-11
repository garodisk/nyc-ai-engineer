const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function setup() {
  let resolve, reject, requests = 0;
  const pending = new Promise((a,b) => { resolve=a; reject=b; });
  const controls = { innerHTML: '' };
  const context = vm.createContext({ console, navigator: { mediaDevices: {
    getUserMedia() { requests++; return pending; }, getDisplayMedia() { requests++; return pending; }
  } }, document: { getElementById: id => id === 'stage-controls' ? controls : null },
    window: { removeEventListener() {} }, fetch: async()=>({}), api: async()=>({participants:[],signals:[]}),
    toast() {}, esc: String, mediaError: e=>e.message, clearTimeout, clearInterval, setInterval, setTimeout,
    MediaStream: class { constructor(tracks) { this.tracks=tracks; } getVideoTracks() { return this.tracks; } }
  });
  vm.runInContext(fs.readFileSync('static/stage.js','utf8') + '\nglobalThis.hooks={toggleStageCam,toggleStageMic,toggleScreen,leaveStage,attachStageLocal,paintStageControls,paintStageMedia,setStage:s=>stage=s};', context);
  const s={teamId:1,session:'self',presenter:true,joined:true,mediaGeneration:0,peers:new Map(),
    state:{team:{status:'shipped',id:1},live:false},local:{cam:null,mic:null,screen:null},participants:[]};
  context.hooks.setStage(s);
  const track={enabled:true,readyState:'live',stop(){this.readyState='ended';this.stopped=true;}};
  const stream={getTracks:()=>[track],getVideoTracks:()=>[track],getAudioTracks:()=>[track]};
  return {hooks:context.hooks,s,track,stream,resolve,reject,controls,requests:()=>requests};
}

for (const [name, fn, key] of [['camera','toggleStageCam','cam'],['microphone','toggleStageMic','mic'],['screen','toggleScreen','screen']]) {
  test(`${name} prevents duplicate acquisition and stops late media after leaving`,async()=>{
    const h=setup(); const first=h.hooks[fn](h.s);
    await h.hooks[fn](h.s); assert.equal(h.requests(),1); assert.match(h.controls.innerHTML,/disabled/);
    h.hooks.leaveStage();h.resolve(h.stream);await first;
    assert.equal(h.track.stopped,true);assert.equal(h.s.local[key],null);
  });
  test(`${name} denial restores controls and shows an error`,async()=>{
    const h=setup();const first=h.hooks[fn](h.s);h.reject(new Error('Permission denied'));await first;
    assert.equal(h.s[key+'Busy'],false);assert.match(h.controls.innerHTML,/Permission denied/);
  });
}

test('replacing presenter tracks waits for all senders',async()=>{
  const h=setup();let finish;const waiting=new Promise(r=>finish=r);let done=false;
  const peer={tx:[0,1,2].map(()=>({sender:{replaceTrack:()=>waiting}}))};
  const pending=h.hooks.attachStageLocal(h.s,peer).then(()=>done=true);
  await Promise.resolve();assert.equal(done,false);finish();await pending;assert.equal(done,true);
});

test('local screen preview paints without any server participants',async()=>{
  const h=setup();let visible=false;const video={srcObject:null,play:()=>Promise.resolve()};
  const main={querySelector:s=>s==='video'?video:{textContent:''},classList:{toggle:(k,v)=>visible=v}};
  const cams={querySelectorAll:()=>[],querySelector:()=>null,append(){}};
  // Test only screen preview, with no presenter tile required.
  h.s.presenter=false;h.s.local.screen=h.track;
  // The read-only stub exposes the rendered elements to the stage code.
  // Injected test globals are isolated from any real browser or device.
  const source=fs.readFileSync('static/stage.js','utf8');
  const ctx=vm.createContext({document:{getElementById:id=>id==='stage-main'?main:id==='stage-cams'?cams:null},
    MediaStream:class{constructor(t){this.t=t}getVideoTracks(){return this.t}},me:{id:1},CSS:{escape:String}});
  vm.runInContext(source+'\nglobalThis.paint=s=>{stage=s;paintStageMedia(s)}',ctx);
  ctx.paint(h.s);assert.equal(visible,true);assert.equal(video.srcObject.getVideoTracks()[0],h.track);
});
