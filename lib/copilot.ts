import type { Builder, Hackathon, Team } from './data';

export type SearchKind = 'builders'|'teams'|'events'|'projects'|'challenges'|'overview';
export interface SearchContext { kind:SearchKind; count:number; skills:string[]; anySkill:boolean; location:string; interest:string; role:string; experience:string; mode:string; hours:number; goal:string; savedOnly:boolean }
export interface SearchResult { kind:SearchKind; id:string; title:string; subtitle:string; detail:string; tags:string[]; reasons:string[]; externalUrl?:string }
export interface ChatReply { text:string; context:SearchContext; filters:string[]; results:SearchResult[]; suggestions:string[] }
export interface SearchData { builders:Builder[]; teams:Team[]; events:Hackathon[]; projects:{id:string;name:string;description:string;stack:string[];members:string[];stage:string}[]; challenges:{id:string;name:string;title:string;prize:string;tech:string}[]; saved:string[] }
const blank:SearchContext={kind:'builders',count:3,skills:[],anySkill:false,location:'',interest:'',role:'',experience:'',mode:'',hours:0,goal:'',savedOnly:false};
const normalize=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const has=(text:string,word:string)=>new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z0-9]|$)`,'i').test(text);
const aliases:Record<string,string[]>={React:['react','reactjs','react.js'],TypeScript:['typescript','ts'],'Next.js':['next.js','nextjs','next js'],Python:['python'],PyTorch:['pytorch'],AI:['ai','artificial intelligence'],Figma:['figma'],'UX research':['ux research','user research'],'Design systems':['design systems'],Go:['go','golang'],PostgreSQL:['postgresql','postgres','sql'],Docker:['docker'],CSS:['css'],Accessibility:['accessibility','accessible'],Rust:['rust'],'Node.js':['node.js','nodejs'],Java:['java'],'C++':['c++'],Swift:['swift'],Kotlin:['kotlin']};
const domainAliases:Record<string,string[]>={'Climate tech':['climate','carbon','sustainability','environment','green energy'],'Healthcare':['healthcare','health','medical','care'],'Education':['education','learning','edtech','students'],'Developer tools':['developer tools','devtools','developer tooling'],'AI for good':['ai for good','social impact','ethical ai']};
const roleAliases:Record<string,string[]>={'Product designer':['designer','designers','product design','ux designer','ux design'],'Frontend engineer':['frontend','front-end','front end'],'Backend engineer':['backend','back-end','back end'],'Full-stack engineer':['fullstack','full-stack','full stack'],'AI / ML engineer':['ml engineer','machine learning engineer','ai engineer']};
export function parseRequest(prompt:string,data:SearchData,previous?:SearchContext):SearchContext {
 const text=normalize(prompt);
 const followup=Boolean(previous)&&(/\b(only|instead|also|make (it|that)|what about|same|more|those|them)\b/.test(text)||/^(worldwide|globally|remote|senior|any role|any skill)\b/.test(text)||text.split(/\s+/).length<=3);
 const c:SearchContext=followup?{...previous!,skills:[...previous!.skills]}:{...blank,skills:[]};
 if(/\b(reset|start over|new search)\b/.test(text))return {...blank,skills:[]};
 if(/\b(database|everything|capabilities|what can you|all data)\b/.test(text))c.kind='overview';
 else if(/\b(hackathons?|events?|rsvp|luma)\b/.test(text))c.kind='events';
 else if(/\b(sponsors?|sponsored|campaigns?|challenges?)\b/.test(text))c.kind='challenges';
 else if(/\b(projects?|showcase|prototypes?)\b/.test(text)&&!/\b(my|our|idea|building|build|want|need)\b/.test(text))c.kind='projects';
 else if(/\b(teams?|crews?)\b/.test(text)&&!/\b(my|our|idea|building|build)\b/.test(text))c.kind='teams';
 else if(/\b(people|builders?|teammates?|cofounders?|co-founders?|designers?|engineers?)\b/.test(text))c.kind='builders';
 if(previous&&c.kind!==previous.kind)Object.assign(c,{...blank,kind:c.kind,skills:[]});
 const amount=text.match(/\b(\d{1,2})\s*(people|builders?|teammates?|engineers?|designers?|teams?|events?|hackathons?|projects?|results?)\b/)||text.match(/\b(top|first|show|find me)\s+(\d{1,2})\b/);
 if(amount)c.count=Math.max(1,Math.min(10,Number(/^\d+$/.test(amount[1])?amount[1]:amount[2])));
 else {const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5};for(const [word,n] of Object.entries(words))if(has(text,word))c.count=n;}
 const skills=Object.entries(aliases).filter(([,names])=>names.some(a=>has(text,a))).map(([skill])=>skill);
 // Preserve explicit skill requirements even when the demo has no such skill.
 const requested=text.match(/\bwith\s+(?:skills?(?:\s+in)?\s*:?\s*)?(.+?)(?=\s+(?:in|near|for|who|available|worldwide|globally)\b|[!?]|$)/)?.[1];
 if(requested)for(const phrase of requested.split(/\s+(?:and|or)\s+|,/)){
  const skill=phrase.replace(/\b(experience|expertise|skills|knowledge|development)\b/g,'').trim();
  if(skill&&!/\d|\b(my|a|an|their|these|those|any|all|interest|hours|week|availability)\b/.test(skill)&&!Object.values(aliases).flat().some(a=>has(skill,a))&&!Object.values(domainAliases).flat().some(a=>has(skill,a)))skills.push(skill);
 }
 if(skills.length)c.skills=followup&&has(text,'also')?[...new Set([...c.skills,...skills])]:skills;
 if(/\b(no skill|any skill|all skills)\b/.test(text))c.skills=[];
 if(skills.length)c.anySkill=/\bor\b|\bany of\b/.test(text);
 if(/\b(show all|all sponsor)\b/.test(text)){c.skills=[];c.count=10;}
 const locations=[...new Set(data.builders.flatMap(b=>[b.city,b.country]).concat(data.events.map(e=>e.location)))].filter(l=>l!=='Worldwide').sort((a,b)=>b.length-a.length);
 const found=locations.find(l=>has(text,normalize(l)));
 if(found)c.location=found;
 if(/\b(nyc|new york city|manhattan)\b/.test(text))c.location='New York';
 if(/\b(sf|san fran)\b/.test(text))c.location='San Francisco';
 if(/\b(usa|us|united states)\b/.test(text))c.location='United States';
 if(/\b(uk)\b/.test(text))c.location='United Kingdom';
 if(/\b(worldwide|global|globally|anywhere|world|international|no location)\b/.test(text))c.location='';
 // Do not silently turn an unknown requested city into a worldwide search.
 if(!found&&!/\b(nyc|manhattan|usa|uk|worldwide|global|globally|anywhere|world|international)\b/.test(text)){
  const unknown=prompt.match(/\b(?:in|near|located in|based in)\s+([A-Za-zÀ-ž][A-Za-zÀ-ž .-]*?)(?=\s+(?:with|who|for|using|and|or|to|available)\b|[,.!?]|$)/i)?.[1]?.trim();
  if(unknown&&!Object.values(aliases).flat().some(a=>normalize(unknown)===a)&&!['my project','a team','ai','person'].includes(normalize(unknown)))c.location=unknown;
 }
 for(const [domain,names] of Object.entries(domainAliases))if(names.some(a=>has(text,a)))c.interest=domain;
 if(/\b(any interest|all interests|any domain)\b/.test(text))c.interest='';
 for(const [role,names] of Object.entries(roleAliases))if(names.some(a=>has(text,a))){c.role=role;if(has(text,'instead'))c.skills=[];}
 if(skills.length&&followup&&has(text,'instead'))c.role='';
 if(/\b(any role|all roles)\b/.test(text))c.role='';
 if(has(text,'senior'))c.experience='Senior';else if(/\b(junior|early career|entry level)\b/.test(text))c.experience='Early career';else if(/\b(mid-level|mid level)\b/.test(text))c.experience='Mid-level';
 if(has(text,'remote'))c.mode='Remote';else if(has(text,'hybrid'))c.mode='Hybrid';else if(/\b(in person|in-person|local)\b/.test(text))c.mode=c.kind==='events'?'In person':'Local';else if(has(text,'online'))c.mode='Online';
 const hours=text.match(/\b(\d{1,2})\s*(?:\+\s*)?(?:hours?|hrs?|h)(?:\s*(?:\/|per|a)\s*week)?\b/);if(hours)c.hours=Number(hours[1]);
 if(/\b(saved|bookmarked)\b/.test(text))c.savedOnly=true;
 if(/\b(all builders|not just saved)\b/.test(text))c.savedOnly=false;
 if(/\b(my project|my idea|our project|building|i want to build|i am building|i'm building|help me build|for a project|for an idea|for my|project idea)\b/.test(text)){c.goal=prompt;c.kind='builders';}
 return c;
}
function builderResult(b:Builder,c:SearchContext):SearchResult {
 const reasons=[...(c.location?[`Located in ${b.city}, ${b.country}`]:[`Worldwide search · ${b.city}`]),...c.skills.filter(s=>b.skills.includes(s)).map(s=>`Has ${s}`),...(c.interest?[`Interested in ${c.interest}`]:[]),...(c.role?[`Matches ${c.role}`]:[]),...(c.goal?[`${b.role} contributes ${b.skills.slice(0,2).join(' + ')}`]:[]),`${b.hours}h/week · ${b.mode}`];
 return {kind:'builders',id:b.id,title:b.name,subtitle:`${b.role} · ${b.city}`,detail:b.bio,tags:b.skills,reasons};
}
export function answerRequest(prompt:string,data:SearchData,previous?:SearchContext):ChatReply {
 const c=parseRequest(prompt,data,previous);
 const filters=[...(c.location?[c.location]:['Worldwide']),...c.skills,...(c.anySkill&&c.skills.length>1?['Any listed skill']:[]),...[c.interest,c.role,c.experience,c.mode].filter(Boolean),...(c.hours?[`${c.hours}+ hours/week`]:[]),...(c.savedOnly?['Saved builders']:[])];
 const reply=(text:string,results:SearchResult[],suggestions:string[]):ChatReply=>({text,results,context:c,filters,suggestions});
 if(c.kind==='overview')return reply(`I can search ${data.builders.length} fictional builders, ${data.teams.length} teams (including teams you created in this browser), ${data.events.length} events, ${data.projects.length} projects, and ${data.challenges.length} sponsor challenges. Tell me the skills, location, or project idea. I use local rules and keyword matching—not an external AI model.`,[],['Find 3 React builders worldwide','Find in-person hackathons in NYC','Show projects using Python']);
 if(c.kind==='builders'){
  let matches=data.builders.filter(b=>(!c.location||[b.city,b.country].some(l=>normalize(l)===normalize(c.location)))&&(!c.skills.length||(c.anySkill?c.skills.some(s=>b.skills.includes(s)):c.skills.every(s=>b.skills.includes(s))))&&(!c.interest||b.interests.includes(c.interest))&&(!c.role||b.role===c.role)&&(!c.experience||b.experience===c.experience)&&(!c.mode||b.mode===c.mode)&&b.hours>=c.hours&&(!c.savedOnly||data.saved.includes(b.id)));
  matches.sort((a,b)=>b.hours-a.hours||a.name.localeCompare(b.name));
  if(c.goal){const diverse:Builder[]=[];const used=new Set<string>();for(const b of matches)if(!used.has(b.role)){diverse.push(b);used.add(b.role)}matches=[...diverse,...matches.filter(b=>!diverse.includes(b))];}
  const found=matches.slice(0,c.count);
  if(!found.length)return reply(`I found no builders matching ${filters.join(' · ')}. I won't fill the list with people who miss your requirements. ${c.skills.length>1&&!c.anySkill?'Your skills are required together on each profile. Try “React or Python” to match either skill. ':''}${c.location?'Try worldwide to broaden the location. ':''}The directory currently contains 40 fictional profiles.`,[],[...(c.location?['Make that worldwide']:[]),...(c.skills.length>1?[`Find ${c.count} people with ${c.skills.join(' or ')}${c.location?` in ${c.location}`:' worldwide'}`]:[]),'Start over']);
  return reply(`${found.length<c.count?`I found ${found.length} matching ${found.length===1?'builder':'builders'}, fewer than the ${c.count} requested.`:`Here are ${found.length} matching builders.`} ${c.goal?'For your idea, I prioritize different roles where possible so the shortlist brings complementary capabilities. ':''}Every result meets the shown filters. Profiles are fictional demo data.`,found.map(b=>builderResult(b,c)),[...(c.location?['Make that worldwide']:['Only remote']),...(c.role?['Any role']:['Show designers instead']),'Show my saved builders']);
 }
 if(c.kind==='teams'){
  const matches=data.teams.filter(t=>
   (!c.interest||t.interests.includes(c.interest)) &&
   (!c.skills.length||c.skills.some(s=>t.needs.some(n=>has(normalize(n),normalize(s))))) &&
   (!c.role||c.role!=='Product designer'||t.needs.some(n=>/figma|design|ux/i.test(n)))
  );
  const found=matches.slice(0,c.count).map(t=>({kind:'teams' as const,id:t.id,title:t.name,subtitle:`${t.members.length}/${t.capacity} members`,detail:t.description,tags:t.needs,reasons:[`Needs ${t.needs.join(' + ')}`,...t.interests]}));
  return reply(`${found.length?`Found ${matches.length} matching teams. Showing ${found.length}.`:'No teams match those needs.'} Teams do not have location or availability metadata, so those filters cannot be applied here. Membership is a browser-local demo action.`,found,['Teams that need design','Show climate teams','Find builders worldwide']);
 }
 if(c.kind==='events'){
  const text=normalize(prompt);const found=data.events.filter(e=>(!c.location||normalize(e.location)===normalize(c.location))&&(!c.mode||e.format===c.mode)&&(!/\b(luma|real)\b/.test(text)||Boolean(e.registrationUrl))&&(!c.interest||e.theme===c.interest)).slice(0,c.count).map(e=>({kind:'events' as const,id:e.id,title:e.title,subtitle:`${e.date} · ${e.location} · ${e.format}`,detail:e.registrationUrl?`${e.time}. Real event. Waitlist at last check; use Luma for current availability.`:`${e.prize} demo prize pool. Fictional event; registration is local only.`,tags:[e.theme,e.registrationUrl?'Real · Luma':'Fictional demo'],reasons:[e.size,`Hosted / supported by ${e.sponsor}`],externalUrl:e.registrationUrl}));
  return reply(found.length?`Here are ${found.length} matching events. Real event RSVPs happen on the organizer's Luma page; demo registrations stay in this browser.`:'No events match that location, format, and theme. Try worldwide or another format.',found,['Find in-person hackathons in NYC','Show online events worldwide','Find teams']);
 }
 if(c.kind==='projects'){
  const found=data.projects.filter(p=>!c.skills.length||c.skills.some(s=>p.stack.includes(s))).slice(0,c.count).map(p=>({kind:'projects' as const,id:p.id,title:p.name,subtitle:p.stage,detail:p.description,tags:p.stack,reasons:[`Built by ${p.members.map(id=>data.builders.find(b=>b.id===id)?.name||'Demo builder').join(' & ')}`]}));
  return reply(found.length?`Here are ${found.length} fictional project concepts${c.skills.length?` using ${c.skills.join(' or ')}`:''}. No live external product demos are implied.`:'No projects use those technologies in this demo.',found,['Show projects using React','Find Python builders worldwide','Show sponsor challenges']);
 }
 const found=data.challenges.filter(ch=>!c.skills.length||c.skills.some(s=>has(normalize(ch.tech+' '+ch.title),normalize(s)))).slice(0,c.count).map(ch=>({kind:'challenges' as const,id:ch.id,title:ch.title,subtitle:ch.name,detail:`${ch.prize} fictional prize · ${ch.tech}`,tags:['Fictional sponsor campaign',ch.tech],reasons:['Illustrates sponsor challenges; hosting is a future feature.']}));
 return reply(found.length?`Here are ${found.length} fictional sponsor campaigns. SDKs and prizes are illustrative.`:'No sponsor campaigns match that technology.',found,['Show all sponsor challenges','Find AI builders worldwide','Show hackathons']);
}
