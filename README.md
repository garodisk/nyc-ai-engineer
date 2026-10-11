# Always-On Hackathon

A responsive interactive MVP built with Next.js App Router, TypeScript, and Tailwind CSS. Builders, projects, sponsor campaigns, the current identity (Alex Rivers), and eight seeded events are fictional demo data. One verified real event—the AI Engineer New York Hackathon on October 11, 2026—links to its organizer's Luma registration page. The app itself sends no messages or real registrations.

## Run locally

Requires Node 22+ and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` creates a static export in `out/`. `npm run lint` checks source. `npm test` verifies seed integrity and matching behavior.

## Demo walkthrough

1. Open Builders. Search for a city or skill, use location and availability filters, or select Find my matches.
2. Open a profile to see skills, projects, and reasons for compatibility. Save or connect with a builder.
3. Create a team in Teams, then return to a profile and invite that builder. You can also join an open team.
4. Filter Hackathons and register for a demo event.
5. Reload: saved builders, connections, teams, memberships, invitations, and event registrations persist in this browser.
6. Open Ask Buildmate from any page. Try “Find 3 React builders worldwide”, “Find Python people in NYC”, or “I am building a climate app worldwide”. Follow with “Only remote” or “Make that worldwide”. Results open profiles, save builders, start team invitations, and link to event listings or Luma.
7. On an in-person event, open Find a team / Event hub. Join a recruiting crew or create an event team with a project idea, needed skills, and up to five members. You can bring selected fictional attendees as an existing team. Check in as Alex and opt into assignment to enter the organizer’s pool.
8. Switch to Organizer. Filter/search attendees, update demo check-in and assignment preferences, move members, and lock settled teams. Preview random or skill-balanced assignments, optionally fill recruiting teams that accept assigned attendees, reshuffle, and apply. Undo is available for the last batch until another roster edit or reload. Export the sample roster as CSV.
9. Open the event Sponsors tab to see supporter attribution and linked demo campaigns. Real event campaigns are not invented or imported from Luma.

Buildmate searches all five local directories, including browser-created teams and saved builders. It supports counts up to 10, supported skills, city/country, role, experience, weekly hours, collaboration mode, and project domains. Multiple skills require every skill unless you use “or”. A shortage returns the actual count without substituting mismatches. Project ideas rank complementary roles within the stated filters. It is a deterministic keyword/rule assistant, not an LLM or semantic reasoning engine; unsupported phrasing may need a simpler query. Chat history and follow-up filters persist with `always-on-buildmate-v1`; New chat resets them. No conversations leave the browser.

Actions use the localStorage key `always-on-demo-v1`. Clear that key in browser developer tools to reset the demo. No backend, accounts, payment provider, or external AI APIs are used.

## Architecture

- `app/`: Next.js route, metadata, responsive styling and Tailwind import.
- `lib/data.ts`: typed fictional seed entities, separate from user-created state.
- `lib/live-events.ts`: verified real event listings with external registration URLs, separate from fictional seeds. Luma is authoritative for current availability; the NYC listing showed waitlist-only registration when checked on October 11, 2026.
- `components/event-card.tsx`: distinguishes external Luma RSVP links from local demo registration actions. Real events never add a local registered state or imply confirmed attendance. Existing fictional in-person events have no invented Luma pages.
- `lib/matching.ts`: deterministic compatibility ranking and human-readable explanations. Weights reward complementary skills, shared interests, similar weekly commitment, time zone proximity, and remote collaboration. Scores illustrate compatibility, not probabilities. Time zone offsets are fixed demo values, not a scheduling engine.
- `components/platform.tsx`: interactive views, profile and team dialogs, search/filter state, and guarded browser persistence.
- `lib/checks.ts`: executable integrity/ranking checks.
- `lib/copilot.ts`: typed conversational query parser, strict builder filtering, contextual follow-ups, and results across teams, events, projects, and challenges.
- `components/buildmate.tsx` and `app/chat.css`: global responsive chat panel, result actions, prompt suggestions, and browser-local conversation persistence.
- `lib/event-teams.ts`: independent event rosters, validation, unique membership and capacity checks, team creation, protected manual moves, and assignment planning. Only checked-in, opted-in, unassigned attendees are eligible. Existing crews remain intact. Assignment spreads team sizes and optionally roles, with shuffled ties; newly generated teams require at least two attendees, leaving an unmatched singleton waiting.
- `components/event-hub.tsx` and `app/event-hub.css`: attendee team finder, idea/preformed-team creation, demo organizer controls, assignment preview/apply/undo, roster CSV, and sponsor context. Each of the four in-person events has a static URL `/hackathons/<event-id>/` and its own `always-on-event-v1:<event-id>` browser storage key. All 12 sample attendees are fictional, including on the real NYC event. This roster is not Luma’s attendee list; check-in does not register attendance. Event teams are separate from the global directory.

Every section has a statically exported App Router URL: `/`, `/builders/`, `/teams/`, `/hackathons/`, `/projects/`, and `/challenges/`. Navigation uses real links with client-side transitions and browser history support. Direct URLs and reloads render the selected section. Project showcases describe fictional prototypes; no live external project demos are implied. Sponsored challenges illustrate future hosting; the sponsor CTA explains that hosting is not implemented.

Development uses `.next-dev/`, while production builds use `.next/`. This keeps a production build from corrupting the running development server's JavaScript manifests. The interface uses a light canvas, electric gradients, and an original SVG neural ribbon illustration.

## Next iteration

Add Supabase Auth with Google OAuth, replace the demo identity with authenticated profiles, and move entities to PostgreSQL tables for profiles, skills, teams, memberships, invitations, registrations, and projects. Use row-level security so only authorized members can manage teams. Introduce a repository layer to replace local storage with authenticated queries. Add invitation acceptance, capacity checks in transactions, notification preferences, moderation, and real-time updates for multi-user collaboration. Migrate browser-created demo state only with explicit user consent.

The current MVP has no multi-user synchronization. Local actions belong to the current browser and origin.

The organizer layer is a functional local prototype, with open controls for evaluation rather than real authorization. Production needs authenticated organizer/attendee roles, a shared transactional roster, consent-aware Luma imports, invitation/approval flows, and concurrent seat reservation. Sponsors currently have five fictional campaign cards, discovery and event attribution. Sponsor onboarding, campaign publishing, submissions, judging, prize payments, and analytics remain future work.

## Team rooms

Join & enter room opens a team's catch-up dashboard. Existing members can choose Open team room. Event crews have their own rooms inside the event hub. Global room links use `/teams/?room=<team-id>`; event room links use `/hackathons/<event-id>/?room=<crew-id>`.

- Catch up: project brief, next milestone, completion/blocker counts, onboarding checklist, suggested unfinished tasks, and latest meeting briefing.
- Workspace: playable original onboarding guide with captions, HTTPS recording links (direct MP4/WebM/OGG, YouTube, or Vimeo), session-only local video playback, editable project brief/stage/preview/repository, tasks with owners/status/blockers, member status updates, and activity timeline.
- Meetings: paste notes or import TXT/VTT, retain meeting history, extract highlights/decisions/actions/blockers, and follow each excerpt to its numbered transcript line. Extraction uses local keywords; it does not transcribe audio or interpret meetings with AI.

`lib/team-room.ts` contains room types, seed data, transcript extraction and source-line references, URL validation, video provider parsing, and guarded persistence validation. `components/team-room.tsx` and `app/team-room.css` implement the responsive views. Rooms persist separately under `always-on-room-v1:<room-key>`. Sample crews have clearly labeled fictional tasks/meetings; new user-created teams begin with empty task and meeting history. The video guide is original product instruction, not an actual team meeting recording.

Checks cover sample/fresh state, summary evidence and VTT line numbering, invalid saved state, and recording URL safety. Browser QA verifies playback, task completion/blocker clearing, status posting, meeting summaries, source navigation, onboarding persistence, team entry, and mobile layout. These rooms are browser-local prototypes without shared storage, membership enforcement, live calls, automatic audio transcription, or private access control. Production collaboration requires authenticated team access and shared records before teammates can see each other's updates.

### Google Meet room links

Every global and event room has a Team video call card. Create a Meet in Google opens Google's meeting creation page; paste a meeting URL to save it, then use Join video call in a new tab or Copy link. Links can be edited or removed. Only HTTPS `meet.google.com/<meeting-code>` URLs are accepted, credentials and unrelated hosts are rejected, and query/fragment information is stripped. Existing stored rooms load without losing their tasks or meeting history. Links remain device-local in this demo, so teammates should receive the actual Meet URL directly. Google manages meeting admission and media permissions. There is no Google OAuth integration, automated recording, transcript import, or embedded live call.

`components/team-call.tsx` implements these controls; `googleMeetUrl` in `lib/team-room.ts` validates and normalizes saved links. URL safety and old-room compatibility are checked by `npm test`.

### Codex Build lab concept demo

Team rooms now include a Build lab tab styled as a light futuristic workspace. A simulated Codex agent uses the visible room brief/milestone as context. Guided prompts choose one of three prepared scenarios: landing page, progress dashboard, or accessibility update. Activity animates, a sample proposal appears in Changes, and Apply updates the visual preview and sample App.tsx. Discard leaves files unchanged. The editor supports App.tsx/styles.css changes and downloads; manually edited code is not executed by the preview. Reset restores starter files.

Demo source and selected preview persist per room in `always-on-codex-demo-v1:<room-key>`. This is explicitly labeled simulated, with no external AI calls, real builds/tests, repository writes, or backend. Dashboard numbers are labeled sample metrics. `components/codex-demo.tsx` and `app/codex-demo.css` implement the concept. Google Meet remains an external link-based call launcher.
