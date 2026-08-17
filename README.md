# Bowen Inventory

A mobile-friendly home inventory / container tracking prototype designed to feel like a real warehouse management system.

## What works now
- Dashboard with container, inventory, location, and audit counts
- Containers with permanent IDs such as `TOTE-001`
- Items and quantities inside each container
- Search across container names, IDs, locations, notes, and item names
- QR label generation for each container
- QR URLs automatically open the correct container via `?bin=TOTE-001`
- Audit logging
- Activity history
- Location rollups
- JSON export
- Responsive phone layout
- Data saved in the browser with `localStorage`

## Put it on GitHub Pages
1. Create a new GitHub repository, for example `bowen-inventory`.
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. In GitHub: **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and `/ (root)`, then save.
6. Open the GitHub Pages URL.

## Important limitation of this prototype
The current version stores data in the browser. That means your phone and another family member's phone will NOT automatically share the same inventory yet.

The next production step is replacing localStorage with Supabase so the entire family shares one live database and can sign in.


## Theme
Version 0.2 uses an olive-green warehouse theme with subtle SpongeBob/Bikini Bottom-inspired yellow, aqua, bubble, and flower accents while keeping the inventory UI professional.
