import type { Builder } from './data';

export interface Attendee { id:string; checkedIn:boolean; randomOptIn:boolean; idea:string }
export interface EventTeam { id:string; name:string; idea:string; needs:string[]; capacity:number; members:string[]; recruiting:boolean; acceptsRandom:boolean; locked:boolean }
export interface EventRoster { eventId:string; attendees:Attendee[]; teams:EventTeam[] }
export interface AssignmentPlan { teams:EventTeam[]; placed:string[]; waiting:string[]; mode:'random'|'balanced' }
export function seedRoster(eventId:string,people:Builder[],me:Builder):EventRoster {
 const ids=[...people.slice(0,11).map(b=>b.id),me.id];
 return {eventId,attendees:ids.map((id,i)=>({id,checkedIn:i<10,randomOptIn:i>=4&&i<11,idea:i>=4?'Looking for a useful weekend project.':''})),teams:[
  {id:'crew-1',name:'Signal Makers',idea:'An AI assistant for community knowledge.',needs:['React','Product design'],capacity:4,members:ids.slice(0,2),recruiting:true,acceptsRandom:true,locked:false},
  {id:'crew-2',name:'Local Spark',idea:'Help neighbors find local climate actions.',needs:['Python','Backend'],capacity:4,members:ids.slice(2,4),recruiting:true,acceptsRandom:true,locked:false}
 ]};
}
export function teamFor(roster:EventRoster,id:string){return roster.teams.find(t=>t.members.includes(id))}
export function assignmentPool(roster:EventRoster){return roster.attendees.filter(a=>a.checkedIn&&a.randomOptIn&&!teamFor(roster,a.id))}
export function validateRoster(value:unknown,eventId:string,validIds:string[]):value is EventRoster {
 if(!value||typeof value!=='object')return false;
 const r=value as EventRoster;
 if(r.eventId!==eventId||!Array.isArray(r.attendees)||!Array.isArray(r.teams)||r.attendees.length>100||r.teams.length>100)return false;
 if(!r.attendees.every(a=>a&&validIds.includes(a.id)&&typeof a.checkedIn==='boolean'&&typeof a.randomOptIn==='boolean'&&typeof a.idea==='string'))return false;
 const ids=r.attendees.map(a=>a.id);if(new Set(ids).size!==ids.length||!ids.includes('me'))return false;
 if(!r.teams.every(t=>t&&typeof t.id==='string'&&typeof t.name==='string'&&typeof t.idea==='string'&&Array.isArray(t.needs)&&t.needs.every(n=>typeof n==='string')&&Number.isInteger(t.capacity)&&t.capacity>=2&&t.capacity<=5&&Array.isArray(t.members)&&t.members.length<=t.capacity&&t.members.every(id=>ids.includes(id))&&typeof t.recruiting==='boolean'&&typeof t.acceptsRandom==='boolean'&&typeof t.locked==='boolean'))return false;
 const members=r.teams.flatMap(t=>t.members);
 return new Set(members).size===members.length&&new Set(r.teams.map(t=>t.id)).size===r.teams.length;
}
export function moveAttendee(roster:EventRoster,id:string,targetId:string):{roster:EventRoster;error?:string} {
 if(!roster.attendees.some(a=>a.id===id))return {roster,error:'This person is not on the event roster.'};
 const from=teamFor(roster,id);const to=roster.teams.find(t=>t.id===targetId);
 if(from?.id===targetId)return {roster};
 if(from?.locked)return {roster,error:'Unlock the current team before moving a member.'};
 if(targetId&&!to)return {roster,error:'That team no longer exists.'};
 if(to&&(to.locked||to.members.length>=to.capacity))return {roster,error:'That team is locked or full.'};
 return {roster:{...roster,teams:roster.teams.map(t=>({...t,members:t.id===targetId?[...t.members,id]:t.members.filter(m=>m!==id)}))}};
}
export function createEventTeam(roster:EventRoster,team:EventTeam):{roster:EventRoster;error?:string} {
 if(!team.name.trim()||!team.idea.trim())return {roster,error:'Add a team name and project idea.'};
 if(roster.teams.some(t=>t.id===team.id))return {roster,error:'This team already exists.'};
 if(!team.members.length||team.members.length>team.capacity||new Set(team.members).size!==team.members.length)return {roster,error:'Choose members within the team size limit.'};
 if(team.members.some(id=>!roster.attendees.some(a=>a.id===id)||teamFor(roster,id)))return {roster,error:'A selected attendee already has a team or is not on this roster.'};
 const next={...roster,teams:[...roster.teams,{...team,name:team.name.trim(),idea:team.idea.trim()}]};
 if(!validateRoster(next,roster.eventId,roster.attendees.map(a=>a.id)))return {roster,error:'The team settings are invalid.'};
 return {roster:next};
}
function shuffled<T>(items:T[],random:()=>number){const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export function planAssignments(roster:EventRoster,people:Builder[],options:{mode:'random'|'balanced';size:number;fillExisting:boolean},random:()=>number=Math.random):AssignmentPlan {
 const pool=shuffled(assignmentPool(roster).map(a=>a.id),random);
 const size=Math.max(2,Math.min(5,Math.floor(options.size)||4));
 const teams=roster.teams.map(t=>({...t,members:[...t.members]}));
 const placed:string[]=[];
 const role=(id:string)=>people.find(b=>b.id===id)?.role||'Builder';
 const skill=(id:string)=>people.find(b=>b.id===id)?.skills||[];
 function put(id:string,candidates:EventTeam[]){
  const ranked=shuffled(candidates,random).sort((a,b)=>{
   if(a.members.length!==b.members.length)return a.members.length-b.members.length;
   if(options.mode==='balanced'){
    const diversity=(t:EventTeam)=>(t.members.some(m=>role(m)===role(id))?0:2)+(t.needs.some(n=>skill(id).some(s=>s.toLowerCase()===n.toLowerCase()))?1:0);
    const difference=diversity(b)-diversity(a);if(difference)return difference;
   }
   return 0;
  });
  if(!ranked.length)return false;ranked[0].members.push(id);placed.push(id);return true;
 }
 const remaining:string[]=[];
 for(const id of pool){const candidates=options.fillExisting?teams.filter(t=>t.recruiting&&t.acceptsRandom&&!t.locked&&t.members.length<t.capacity):[];if(!put(id,candidates))remaining.push(id);}
 const waiting:string[]=[];
 if(remaining.length===1)waiting.push(remaining[0]);
 else if(remaining.length>1){
  const count=Math.ceil(remaining.length/size);const groups:EventTeam[]=[];
  for(let i=0;i<count;i++){let id=`assigned-${i+1}`;while(teams.some(t=>t.id===id)||groups.some(t=>t.id===id))id+='-new';groups.push({id,name:`Launch Crew ${teams.length+i+1}`,idea:'Choose your project together at the event.',needs:[],capacity:size,members:[],recruiting:true,acceptsRandom:true,locked:false});}
  for(const id of remaining)put(id,groups.filter(t=>t.members.length<size));
  // With size >= 2 and round-robin placement, only a two-person pool creates one group.
  // For odd pools at size 2, keep one attendee waiting instead of creating a solo team.
  for(const group of groups){if(group.members.length===1){waiting.push(group.members[0]);placed.splice(placed.indexOf(group.members[0]),1)}else teams.push(group);}
 }
 return {teams,placed,waiting,mode:options.mode};
}
