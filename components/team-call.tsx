'use client';
import { useState } from 'react';
import { Check, Copy, ExternalLink, Video } from 'lucide-react';
import { googleMeetUrl } from '../lib/team-room';

export default function TeamCall({url,ready,onSave,onNotice}:{url:string;ready:boolean;onSave:(url:string)=>void;onNotice:(message:string)=>void}) {
 const [editing,setEditing]=useState(false);
 const [draft,setDraft]=useState('');
 const [error,setError]=useState('');
 const valid=googleMeetUrl(url);
 const showForm=editing||!valid;
 return <section className="room-card room-call" aria-label="Team video call">
  <div className="room-call-heading"><div className="room-call-icon"><Video size={21}/></div><div><span className="eyebrow">TALK IT THROUGH</span><h2>Team video call</h2><p className="room-muted">Join Google Meet in a new tab while keeping your project room open.</p></div></div>
  <div className="room-call-actions">
   {valid&&<><a className="room-primary" href={valid} target="_blank" rel="noopener noreferrer"><Video size={15}/>Join video call <ExternalLink size={13}/></a><button className="room-secondary" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(valid);onNotice('Meet link copied. Share it with your teammates.')}catch{onNotice('Could not copy the link. Select the Meet URL below to copy it manually.')}}}><Copy size={14}/>Copy link</button><button className="room-text-link" type="button" disabled={!ready} onClick={()=>{setDraft(valid);setError('');setEditing(!editing)}}>{editing?'Cancel':'Edit Meet link'}</button></>}
   <a className="room-secondary" href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer">{valid?'Open Google Meet':'Create a Meet in Google'} <ExternalLink size={13}/></a>
  </div>
  {valid&&<a className="room-call-url" href={valid} target="_blank" rel="noopener noreferrer">{valid}</a>}
  {showForm&&<form className="room-call-form" onSubmit={e=>{e.preventDefault();const normalized=googleMeetUrl(draft);if(!normalized){setError('Use a Google Meet link such as https://meet.google.com/abc-defg-hij.');return}onSave(normalized);setEditing(false);setDraft('');setError('')}}><label className="room-field">Google Meet link<input type="url" required maxLength={500} placeholder="https://meet.google.com/abc-defg-hij" value={draft} onChange={e=>{setDraft(e.target.value);setError('')}} aria-invalid={Boolean(error)} aria-describedby={error?'meet-link-error':'meet-link-help'}/></label><button className="room-secondary" type="submit" disabled={!ready}>Save Meet link <Check size={14}/></button>{error&&<p className="room-call-error" id="meet-link-error" role="alert">{error}</p>}<p className="room-muted" id="meet-link-help">Create a meeting in Google, then paste its link here. In this demo the link saves on this device; send it directly to teammates who use another browser.</p></form>}
  {editing&&valid&&<button className="room-text-link" type="button" onClick={()=>{onSave('');setDraft('');setEditing(false);setError('')}}>Remove Meet link</button>}
  <p className="room-call-footnote">Google controls admission, camera, microphone, and recording. This room does not automatically record calls or import transcripts.</p>
 </section>;
}
