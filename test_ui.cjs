const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const app=fs.readFileSync('static/app.js','utf8');
const builders=fs.readFileSync('static/builders.js','utf8');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}

test('older account refresh cannot overwrite a newer result or revive a logged-out user',async()=>{
  const requests=[];
  const c=vm.createContext({api:()=>{const d=deferred();requests.push(d);return d.promise;},renderNav(){},refreshClock(){}});
  vm.runInContext('let me=null,authEpoch=0,meRequestSeq=0;'+app.slice(app.indexOf('async function refreshMe()'),app.indexOf('// ---------- shared components ----------'))+
    '\nglobalThis.hooks={refreshMe,user:()=>me,logout:()=>{authEpoch++;me=null}};',c);
  const first=c.hooks.refreshMe(),second=c.hooks.refreshMe();
  requests[1].resolve({user:{id:2}});await second;requests[0].resolve({user:{id:1}});await first;
  assert.equal(c.hooks.user().id,2);
  const pending=c.hooks.refreshMe();c.hooks.logout();requests[2].resolve({user:{id:2}});await pending;
  assert.equal(c.hooks.user(),null);
});

test('skill and interest filters match both capitalization variants',()=>{
  const c=vm.createContext({me:null,builderFilters:{q:'',skill:'React',interest:'AI'},builderCache:[
    {id:1,name:'A',handle:'a',skills:['react'],interests:['ai']},
    {id:2,name:'B',handle:'b',skills:['React'],interests:['AI']},
    {id:3,name:'C',handle:'c',skills:['Python'],interests:['AI']}],lowerSet:xs=>new Set(xs.map(x=>x.toLowerCase()))});
  vm.runInContext(builders.slice(builders.indexOf('function filteredBuilders()'),builders.indexOf('function builderSelect(')),c);
  assert.deepEqual(Array.from(c.filteredBuilders(),b=>b.id),[1,2]);
});

test('forms prevent a duplicate Enter submission while saving',async()=>{
  const pending=deferred(),button={disabled:false};let submit,calls=0;
  const form={querySelector:()=>button,addEventListener:(event,fn)=>submit=fn};
  const c=vm.createContext({app:{querySelector:()=>form},formValues:()=>({}),toast(){}});
  vm.runInContext(app.slice(app.indexOf('function onSubmit('),app.indexOf('function modal(')),c);
  c.onSubmit('#form',async()=>{calls++;await pending.promise});
  const first=submit({preventDefault(){}});await submit({preventDefault(){}});assert.equal(calls,1);
  pending.resolve();await first;assert.equal(button.disabled,false);
});

test('a join approval does not redirect after the user navigates away',async()=>{
  const pending=deferred();let refresh=0;
  const c=vm.createContext({me:{id:1},location:{hash:'#/teams'},Date,setTimeout:fn=>fn(),toast(){},
    api:()=>pending.promise,refreshMe:()=>refresh++,render(){}});
  vm.runInContext(app.slice(app.indexOf('async function awaitApproval('),app.indexOf('// ---------- actions ----------')),c);
  const result=c.awaitApproval({dataset:{name:'QA'}},3,0);
  await Promise.resolve();c.location.hash='#/builders';pending.resolve({team:{members:[{id:1}],name:'QA'}});await result;
  assert.equal(c.location.hash,'#/builders');assert.equal(refresh,0);
});
