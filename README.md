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


## v0.5 App Edition

This release adds installable PWA support. Upload `manifest.webmanifest`, `sw.js`, and the entire `icons` folder along with the existing site files. On iPhone, open the site in Safari, tap the in-app **Install** prompt, then use **Share → Add to Home Screen**. The app launches in standalone mode from the Home Screen.
