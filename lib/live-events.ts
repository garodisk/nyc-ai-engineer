import type { Hackathon } from './data';

// Real organizer listings stay separate from fictional seeded demo events.
// Source: https://luma.com/AIEngineerNYHackathon
// Date and hours also verified against https://ai.engineer/nyc/2026#events.
// Availability is a dated snapshot. The organizer's Luma page is authoritative.
export const liveEvents: Hackathon[] = [{
 id: 'live-ai-engineer-nyc-2026-10-11',
 title: 'AI Engineer New York Hackathon',
 theme: 'AI engineering',
 location: 'New York',
 format: 'In person',
 date: 'Oct 11, 2026',
 time: '9 AM–9 PM EDT',
 prize: 'Free',
 sponsor: 'AI Engineer & Major League Hacking',
 size: 'Solo or with a team',
 color: 'lilac',
 description: 'Build with fellow AI engineers, get mentor support, and demo your project. Exact address is shared through organizer registration.',
 registrationUrl: 'https://luma.com/AIEngineerNYHackathon',
 registrationStatus: 'Waitlist',
 verifiedAt: 'Oct 11, 2026',
}];
