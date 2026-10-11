'use client';
import { ArrowUpRight, ExternalLink, Globe2, MapPin, Trophy, Users } from 'lucide-react';
import type { Hackathon } from '../lib/data';

export default function EventCard({event:h,index,registered,onRegister,onTeamHub}:{event:Hackathon;index:number;registered:boolean;onRegister:()=>void;onTeamHub:()=>void}) {
 const real=Boolean(h.registrationUrl);
 return <article className={`event-card ${real?'real-event':''}`}>
  <div className={`event-art ${h.color}`}>
   <span className="art-label">{real?'AI ENGINEER / NYC':h.theme.toUpperCase()}</span>
   <div className="orbital"><span/><span/><span/></div>
   <span className="event-number">{real?'REAL EVENT · LUMA':`${String(index+1).padStart(2,'0')} / DEMO EVENT`}</span>
   <span className="format">{h.format==='In person'?<MapPin size={12}/>:<Globe2 size={12}/>} {h.format}</span>
  </div>
  <div className="event-content">
   <span className="eyebrow">{h.date} · {h.location}</span>
   <h3>{h.title}</h3>
   {h.time&&<p className="event-time">{h.time}</p>}
   <p>{h.theme} · {h.size}</p>
   {h.description&&<p className="event-description">{h.description}</p>}
   <div className="event-bottom">
    <strong>{real?<Users size={14}/>:<Trophy size={14}/>} {h.prize}<small>{real?'admission':'prize pool'}</small></strong>
    {h.registrationUrl?<a className="luma-rsvp" href={h.registrationUrl} target="_blank" rel="noopener noreferrer" aria-label={`${h.registrationStatus==='Waitlist'?'Join waitlist':'RSVP'} on Luma for ${h.title} (opens in a new tab)`}>{h.registrationStatus==='Waitlist'?'Join waitlist on Luma':'RSVP on Luma'}<ExternalLink size={14}/></a>:<button onClick={onRegister}>{registered?'Registered ✓':'Join event'}<ArrowUpRight size={15}/></button>}
   </div>
   {real?<><p className="sponsor">Hosted by {h.sponsor}</p><div className="rsvp-note"><strong>{h.registrationStatus==='Waitlist'?'Waitlist at last check':'Registration on Luma'}</strong><span>{h.registrationStatus==='Waitlist'?`Checked ${h.verifiedAt}. See Luma for current availability.`:'Availability and registration are managed by the organizer.'}</span></div></>:<p className="sponsor">Supported by {h.sponsor} · fictional demo</p>}
   {h.format==='In person'&&<button className="event-team-link" onClick={onTeamHub}><Users size={14}/>Find a team / Event hub <ArrowUpRight size={14}/></button>}
  </div>
 </article>;
}
