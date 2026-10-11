import './codex-demo.css';
import type { Metadata } from 'next';
import './globals.css';
import './light-theme.css';
import './chat.css';
import './event-hub.css';
import './team-room.css';
export const metadata: Metadata = { title: 'Always-On Hackathon — Find your people', description: 'Meet global builders, find your team, and build your next big idea. An interactive fictional demo.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
