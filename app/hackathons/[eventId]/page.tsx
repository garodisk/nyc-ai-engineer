import { notFound } from 'next/navigation';
import Platform from '../../../components/platform';
import { hackathons } from '../../../lib/data';
import { liveEvents } from '../../../lib/live-events';
const events=[...liveEvents,...hackathons].filter(e=>e.format==='In person');
export function generateStaticParams(){return events.map(e=>({eventId:e.id}))}
export default async function EventPage({params}:{params:Promise<{eventId:string}>}){
 const {eventId}=await params;if(!events.some(e=>e.id===eventId))notFound();
 return <Platform initialPage="Hackathons" initialEventId={eventId}/>;
}
