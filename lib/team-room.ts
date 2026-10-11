import type { Team } from './data';
export type TaskStatus='To do'|'In progress'|'Done';
export interface RoomTask {id:string;title:string;owner:string;status:TaskStatus;blocked:boolean}
export interface Evidence {text:string;line:number}
export interface MeetingSummary {highlights:Evidence[];decisions:Evidence[];actions:Evidence[];blockers:Evidence[]}
export interface RoomMeeting {id:string;title:string;date:string;transcript:string;summary:MeetingSummary}
export interface RoomVideo {id:string;title:string;url:string;note:string}
export interface RoomActivity {id:string;text:string;time:string}
export interface RoomState {meetUrl?:string;brief:string;goal:string;stage:string;previewUrl:string;repoUrl:string;tasks:RoomTask[];meetings:RoomMeeting[];videos:RoomVideo[];statuses:Record<string,string>;caughtUp:string[];activity:RoomActivity[]}
export function summarizeTranscript(transcript:string):MeetingSummary {
 const lines=transcript.split(/\r?\n/).map((text,i)=>({text:text.trim().slice(0,500),line:i+1})).filter(e=>e.text&&!/^WEBVTT$|^\d+$|^\d{2}:\d{2}.*-->/.test(e.text));
 const decisions=lines.filter(e=>/\b(decision|decided|agreed|agreement)\b/i.test(e.text)).slice(0,8);
 const actions=lines.filter(e=>/\b(action|todo|to-do|next step|will|needs? to|assigned)\b/i.test(e.text)).slice(0,8);
 const blockers=lines.filter(e=>/\b(blocker|blocked|blocking|waiting on|risk|stuck)\b/i.test(e.text)).slice(0,8);
 const marked=new Set([...decisions,...actions,...blockers].map(e=>e.line));
 return {highlights:lines.filter(e=>!marked.has(e.line)).slice(0,3),decisions,actions,blockers};
}
export function seedRoom(team:Team,sample:boolean):RoomState {
 const transcript=`00:00 Host: Today we reviewed ${team.name} and its first usable prototype.\n00:35 Host: Our goal is to test one useful workflow with three people.\n01:20 Host: Decision: build a small web prototype before adding more features.\n02:10 Builder: Action: ${team.members[0]==='me'?'Alex':'The engineering lead'} will prepare the demo flow.\n03:00 Designer: Action: the design lead will test the onboarding with three volunteers.\n04:15 Host: Blocker: we are waiting on feedback before choosing the next feature.`;
 const second=`00:00 Host: The first prototype is ready for feedback.\n00:40 Builder: Decision: keep the demo focused on a single end-to-end user journey.\n01:30 Host: Action: the team will collect three usability observations before the next check-in.\n02:00 Builder: Blocker: keyboard navigation still needs testing.`;
 const meetings:RoomMeeting[]=sample?[{id:'sample-kickoff',title:'Sample kickoff · scope & responsibilities',date:'2026-10-10',transcript,summary:summarizeTranscript(transcript)},{id:'sample-checkin',title:'Sample check-in · prototype & feedback',date:'2026-10-11',transcript:second,summary:summarizeTranscript(second)}]:[];
 return {brief:team.description,goal:sample?'Ship one usable workflow and gather feedback from three testers.':'Define the first milestone together.',stage:sample?'Building':'Planning',previewUrl:'',repoUrl:'',meetUrl:'',tasks:sample?[{id:'task-1',title:'Define the problem and first user journey',owner:team.members[0]||'me',status:'Done',blocked:false},{id:'task-2',title:'Create the first prototype screens',owner:team.members[1]||team.members[0]||'me',status:'Done',blocked:false},{id:'task-3',title:'Connect the end-to-end demo flow',owner:team.members[0]||'me',status:'In progress',blocked:false},{id:'task-4',title:'Verify keyboard navigation',owner:team.members[1]||'me',status:'To do',blocked:true},{id:'task-5',title:'Run three usability interviews',owner:team.members[0]||'me',status:'To do',blocked:false}]:[],meetings,videos:[{id:'room-guide',title:'Your first five minutes in a team room',url:'/media/team-room-guide.mp4',note:'Original product guide · not a team meeting recording'}],statuses:{},caughtUp:[],activity:sample?[{id:'sample-activity',text:'Sample project brief, tasks, and meeting notes loaded.',time:'Sample history'}]:[]};
}
export function safeHttps(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
export function googleMeetUrl(value:string):string|null {
 const safe=safeHttps(value.trim());if(!safe)return null;const u=new URL(safe);
 if(u.hostname!=='meet.google.com'||u.port||!/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(u.pathname))return null;
 return 'https://meet.google.com/'+u.pathname.slice(1).replace(/\/$/,'').toLowerCase();
}
export function videoSource(value:string):{kind:'file'|'youtube'|'vimeo';url:string}|null {
 if(value==='/media/team-room-guide.mp4')return {kind:'file',url:value};
 const safe=safeHttps(value);if(!safe)return null;const u=new URL(safe);
 if(/\.(mp4|webm|ogg)$/i.test(u.pathname))return {kind:'file',url:safe};
 if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname)){
  const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
  if(id&&/^[\w-]{11}$/.test(id))return {kind:'youtube',url:`https://www.youtube-nocookie.com/embed/${id}`};
 }
 if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)){const id=u.pathname.match(/\/(?:video\/)?(\d+)\/?$/)?.[1];if(id)return {kind:'vimeo',url:`https://player.vimeo.com/video/${id}`}}
 return null;
}
export function validRoom(value:unknown):value is RoomState {
 if(!value||typeof value!=='object')return false;const r=value as RoomState;
 return (r.meetUrl===undefined||r.meetUrl===''||(typeof r.meetUrl==='string'&&Boolean(googleMeetUrl(r.meetUrl))))&&['brief','goal','stage','previewUrl','repoUrl'].every(k=>typeof r[k as keyof RoomState]==='string')&&Array.isArray(r.tasks)&&r.tasks.every(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&typeof t.owner==='string'&&['To do','In progress','Done'].includes(t.status)&&typeof t.blocked==='boolean')&&Array.isArray(r.meetings)&&r.meetings.every(m=>m&&typeof m.id==='string'&&typeof m.title==='string'&&typeof m.date==='string'&&typeof m.transcript==='string')&&Array.isArray(r.videos)&&r.videos.every(v=>v&&typeof v.id==='string'&&typeof v.title==='string'&&typeof v.note==='string'&&typeof v.url==='string'&&Boolean(videoSource(v.url)))&&r.statuses!==null&&typeof r.statuses==='object'&&!Array.isArray(r.statuses)&&Object.values(r.statuses).every(s=>typeof s==='string')&&Array.isArray(r.caughtUp)&&r.caughtUp.every(s=>typeof s==='string')&&Array.isArray(r.activity)&&r.activity.every(a=>a&&typeof a.id==='string'&&typeof a.text==='string'&&typeof a.time==='string');
}
