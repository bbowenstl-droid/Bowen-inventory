# Bowen Inventory v0.3 — Shared Family Edition

A phone-friendly family storage inventory system styled like a warehouse management console, with the Olive / Bikini Bottom theme.

## Live-data architecture
- GitHub Pages hosts the frontend.
- Supabase Auth handles family sign-in.
- Supabase Postgres stores locations, containers, items, and activity history.
- Row Level Security limits database access to authenticated users.
- QR labels point back to permanent container codes such as `TOTE-001`.

## Files to upload to GitHub
Upload/replace these files in the repository root:
- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `README.md`

## What works in v0.3
- Email/password sign-in for existing Supabase users
- Shared inventory across phones/computers
- Locations stored in Supabase
- Create containers with permanent codes
- Add/remove inventory items and quantities
- Global search
- Container audit timestamps
- Activity history with the signed-in user's email
- QR code generation and direct container URLs
- Printable QR labels
- JSON backup export
- Sign out

## Security note
`config.js` contains only the Supabase Project URL and publishable frontend key. This key is designed to be used in browser applications. Database protection comes from the Row Level Security policies configured in Supabase. Never put a Supabase secret/service-role key or database password in this repository.


## v0.6 Bikini Bottom Ops Edition

This release adds installable PWA support. Upload `manifest.webmanifest`, `sw.js`, and the entire `icons` folder along with the existing site files. On iPhone, open the site in Safari, tap the in-app **Install** prompt, then use **Share → Add to Home Screen**. The app launches in standalone mode from the Home Screen.


## v0.6 Easter eggs
Character-themed QR labels, Gary loading animation, Squidward Audit Mode, Plankton empty/delete states, SpongeBob scan flash, time-card audit warnings, themed system messages, and a secret five-tap Bikini Bottom mode. QR modules remain standard for reliable scanning.

## v0.9 Character Crew
This build integrates actual character artwork for SpongeBob, Patrick, Squidward, Gary, Mr. Krabs, and Sandy throughout the dashboard, loading states, audit UI, empty states, and QR labels. Artwork credits are included in `credits.html` and use the CC BY 3.0 sources documented there.


## v0.9 patch
Character PNG files now live at the repository root to match the current GitHub upload layout. This build also fixes never-audited containers showing 99999 days and automatically clears invalid/stale Supabase sessions so users can sign back in cleanly.


## v0.9
QR character labels now render crew artwork as a CSS background overlay using an absolute URL, avoiding broken inline image icons while preserving printability.
