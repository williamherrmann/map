# PA Territory Map

Field sales territory mapping PWA for solar/energy door-to-door canvassing in Pennsylvania. Built with Leaflet.js + Supabase. Hosted on GitHub Pages, saved to iPhone home screen as a PWA.

---

## File Structure

All JS files sit flat alongside `index.html` — no `js/` subdirectory references in script tags.

```
index.html          — CSS, HTML shell, all <script> tags
js/auth.js          — Supabase init, login/logout, session, notes CRUD
js/map.js           — Leaflet map, GeoJSON, basemap, municipality clicks
js/search.js        — Nominatim address search + autocomplete
js/notes.js         — Municipality sidebar (color, notes, utilities, rating)
js/shapes.js        — Draw tool, shape CRUD, shape popups, Log Visit
js/pins.js          — Pin placement, pin sidebar, pinsCache, Log Visit sheet
js/calendar.js      — Calendar sheet: Callbacks / Scheduled / History tabs
js/builders.js      — New construction / builder reference panel
js/ui.js            — Settings sheet, changelog, overflow menu
js/admin.js         — Admin panel: user list, data transfer, role check
js/utilities.js     — Electric utility data by county
pa_municipalities.geojson — PA municipality polygons
README.md           — This file
```

---

## Things That Must Change Together

### Adding a new pin type / funnel stage
- `pins.js` — add to stage dropdown, `PIN_COLORS`, `PIN_LABELS`, migration map in `loadPinsFromSupabase`
- `analytics.js` (if present) — update `STAGE_ORDER` and funnel mapping
- `calendar.js` — update callback filter logic if stage affects callback tab

### Adding a new Supabase table
- Always run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` AND `FORCE ROW LEVEL SECURITY`
- Without `FORCE`, the `postgres` role bypasses RLS and leaks data across users
- Add a policy for `auth.uid() = user_id` at minimum

### Changing shape popup buttons
- `shapes.js` — `buildShapePopup()` controls popup HTML
- `shapes.js` — `logVisitShape()`, `openShapeSidebar()` are the handlers
- `index.html` — shape sidebar footer HTML must match

### Changing the calendar sheet tabs
- `calendar.js` — tab chip click handlers + render functions per tab
- `index.html` — chip HTML inside `#calendarSheet`

### Changing settings sheet
- `index.html` — HTML inside `#settingsSheet`
- `ui.js` — `openSettings()` / `closeSettings()` handle desktop vs mobile transforms
- Desktop: sheet is centered 420px wide, uses `translateX(-50%) translateY(0)`
- Mobile: sheet slides from bottom, uses `translateY(0)`

### Adding admin features
- `js/admin.js` — all admin logic lives here
- `index.html` — admin sheet HTML (`#adminSheet`), admin CSS block
- `js/auth.js` — `checkAdminRole()` called in `startSession()`, `adminRole` reset in `logout()`
- Supabase: `profiles` table with `role` column, `get_my_role()` security definer function for non-recursive RLS

---

## Supabase Tables

| Table | Key columns | Notes |
|---|---|---|
| `municipality_notes` | `user_id`, `muni_name`, `color`, `note`, `permit_required`, `utilities`, `rating` | RLS forced |
| `custom_shapes` | `user_id`, `name`, `color`, `geojson`, `last_knocked`, `scheduled_at` | RLS forced. `scheduled_at` added via ALTER TABLE |
| `pins` | `user_id`, `lat`, `lng`, `type`, `name`, `phone`, `address`, `notes`, `visited_at` | RLS forced |
| `profiles` | `id`, `email`, `role` | Admin system. Auto-created on signup via trigger. `get_my_role()` function avoids recursive RLS |

---

## Known Quirks & Rules

**Census data**
- Use `incomeDataLoaded` boolean flag — not `Object.keys().length` checks
- Field names are `income`, `ownership`, `age` — not `medianIncome`, `ownerRate`, `medianAge`
- Fetch-only and fetch-plus-draw functions must be separate to prevent heat map rendering as side effect of prospect filter

**Shape layer ordering**
- `shapesLayerGroup` must be brought to front after GeoJSON loads
- Re-assert whenever shapes re-render or basemap changes

**Pin placement + shapes**
- Shape interactivity must be disabled during pin placement
- Requires BOTH pane-level AND individual layer-level pointer event disabling

**window.* assignments**
- Must be deferred to `window.addEventListener('load', ...)` to avoid "not defined" errors

**Python file editing**
- Never use Python regex to capture and rewrite script content — it destroys the HTML shell
- Always use `str_replace` or careful line-range replacement
- Verify with `node -e "new Function(...)"` syntax check before writing output

**Duplicate declarations**
- Watch for duplicate `const meta` declarations across files
- Watch for shifted function parameters when editing shape/pin functions

**Analytics**
- Reads directly from `pinsCache` — no separate Supabase table
- `warm_transfers` table approach was tried and abandoned

**Race/ethnicity Census data**
- Not to be added to the prospecting tool under any framing

---

## Sales Funnel

```
Callback → Warm Transfer → Appointment Run → Contract Signed → Installed
```

- **Callback** = pre-warm-transfer, still needs follow-up (NOT post-appointment)
- **Marker** pins (e.g. New Construction) are separate from funnel — excluded from conversion math

---

## UI Rules (strict)

- Mobile-first, no horizontal scrolling
- No emojis anywhere in UI
- No unnecessary line breaks
- Light-themed panels throughout — no dark navy backgrounds
- Active states use `#222`, not dark blue
- Fonts: DM Sans (UI), DM Mono (version badges, email)
- Version badge in top-right corner (`#badgeVersion`) AND settings version label must both be updated on every release

---

## Version Discipline

**Always update BOTH locations when releasing:**
1. `<span id="badgeVersion">vXX</span>` in `index.html`
2. The version label text in the settings sheet body (e.g. `v86 · What's new ›`)
3. Add a new `cl-version` entry in the changelog modal

---

## Hosting & Deployment

- GitHub Pages serves from `master` branch root
- `index.html` must be at repo root (not in a subfolder)
- PWA saved to iPhone home screen — hard refresh needed after deploys (`Settings > Safari > Clear History` or use Chrome on desktop to verify version badge)
- Force push pattern when local and remote diverge: `git push origin master --force`

---

## Admin System

- `profiles` table controls access — `role` column is `admin` or `user`
- Only `admin@gmail.com` currently has admin role
- Admin panel lives in Settings sheet (visible to admin only)
- Admin tabs: Users (list with join date + shape count), Data Transfer (reassigns `user_id` across tables)
- Data transfer moves: `custom_shapes`, `municipality_notes`, `pins`
- `get_my_role()` is a `security definer` function — prevents recursive RLS infinite loop on `profiles` table

---

## Context for AI Sessions

When starting a new session, paste this README and attach the relevant JS files. The most commonly edited files per task:

| Task | Files to attach |
|---|---|
| Pin changes | `pins.js`, `index.html` |
| Shape / calendar changes | `shapes.js`, `calendar.js`, `index.html` |
| Admin changes | `admin.js`, `auth.js`, `index.html` |
| UI / settings changes | `ui.js`, `index.html` |
| Auth / session changes | `auth.js`, `index.html` |
| Analytics | `analytics.js`, `pins.js` |
| Full rebuild | All files |