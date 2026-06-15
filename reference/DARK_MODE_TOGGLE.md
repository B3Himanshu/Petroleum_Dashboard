# DARK_MODE_TOGGLE — How It Works

## The setting

```ini
# backend/.env
DARK_MODE_TOGGLE=false   # hides the Dark UI toggle → dashboard locked to light theme
# DARK_MODE_TOGGLE=true  # shows the toggle (default when variable is absent)
```

This is a **server-side UI flag**. It decides whether end-users can switch themes
from inside the dashboard. It does **not** change any features, data, or layout —
only whether the theme-toggle button is visible and usable.

---

## How it flows through the stack

```
backend/.env  →  DARK_MODE_TOGGLE=false
        │
        ▼
backend/server.js  →  GET /api/ui-config  →  { darkModeToggle: false }
        │
        ▼
frontend/src/contexts/ThemeContext.jsx
  • setDarkModeToggleEnabled(false)
  • forces theme → 'light'  (overwrites any localStorage value)
  • toggleTheme() becomes a no-op
        │
        ▼
frontend/src/components/dashboard/Header.jsx
  showThemeToggle = uiConfigHydrated && darkModeToggleEnabled
  → false  →  "Dark UI" switch is NOT rendered (absent from DOM)
```

### Build-time vs runtime

| Stage | Source | Purpose |
|---|---|---|
| Vite build | `backend/.env` → `VITE_DARK_MODE_TOGGLE` baked via `vite.config.mjs` `define` | Prevents a flash of the toggle before the server responds |
| Runtime | `GET /api/ui-config → { darkModeToggle }` | Authoritative — always overrides the baked value |

If `DARK_MODE_TOGGLE` is **absent** from `.env`, the backend defaults to `true`
(toggle visible, user can switch to dark).

---

## When DARK_MODE_TOGGLE=false — Complete UI Description

### Theme: Light (locked)

`<html class="light">` — the `.dark` CSS block is never applied.
All colour values resolve from the `:root` block in `frontend/src/index.css`.

---

### Light Theme — Full Colour Palette

#### Page background

The page body uses an **animated CSS gradient** layered with two soft **colour orbs**:

| Layer | Colours | Effect |
|---|---|---|
| Base gradient (`body::before`) | `#f3f8ff` → `#eaf3ff` → `#f8fbff` (135°, 22 s cycle) | Very pale blue-white atmosphere — never stark white |
| Orb top-left (`body::after`, 32% opacity, 80 px blur) | `#b5d9ff` (sky blue) | Soft blue glow, top-left region |
| Orb bottom-right (`body::after`) | `#d3c8ff` (lavender) | Soft purple glow, bottom-right region |

Result: the page background feels alive — a barely perceptible blue-lavender wash,
not a flat white.

#### Semantic design tokens (used everywhere via Tailwind)

| Token | HSL value | Approximate hex | Used for |
|---|---|---|---|
| `--background` | `210 50% 98%` | `#f4f8fd` | Page / layout background fallback |
| `--foreground` | `210 35% 17%` | `#1e2b37` | Body text, headings |
| `--card` | `210 45% 99.5%` | `#fafcff` | Card / panel surfaces |
| `--card-foreground` | `210 35% 17%` | `#1e2b37` | Text inside cards |
| `--popover` | `210 45% 99.5%` | `#fafcff` | Dropdown / tooltip surfaces |
| `--popover-foreground` | `210 35% 17%` | `#1e2b37` | Dropdown text |
| `--primary` | `231 89% 64%` | `#4f6df5` | Buttons, badges, active states |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | Text on primary elements |
| `--secondary` | `210 35% 96%` | `#edf2f7` | Secondary button / chip background |
| `--secondary-foreground` | `210 35% 17%` | `#1e2b37` | Text on secondary |
| `--muted` | `210 32% 95%` | `#ecf1f7` | Subtle background fills |
| `--muted-foreground` | `215 18% 42%` | `#607283` | Placeholder / label / hint text |
| `--accent` | `231 89% 64%` | `#4f6df5` | Hover highlights, focus rings |
| `--accent-foreground` | `0 0% 100%` | `#ffffff` | Text on accent |
| `--destructive` | `0 84% 60%` | `#f03e3e` | Error states, delete actions |
| `--border` | `214 28% 88%` | `#d0dae5` | Card borders, dividers, inputs |
| `--input` | `214 28% 88%` | `#d0dae5` | Input field borders |
| `--ring` | `231 89% 64%` | `#4f6df5` | Focus ring colour |
| `--radius` | `0.75rem` | — | Border radius on all rounded elements |

#### Sidebar tokens

| Token | HSL value | Approximate hex | Used for |
|---|---|---|---|
| `--sidebar-bg` | `210 55% 98%` | `#f3f8ff` | Sidebar panel background |
| `--sidebar-foreground` | `210 35% 17%` | `#1e2b37` | Sidebar nav text |
| `--sidebar-muted` | `215 18% 42%` | `#607283` | Inactive nav item text |
| `--sidebar-accent` | `231 89% 64%` | `#4f6df5` | Active nav item highlight |

#### Chart colours

| Token | HSL value | Approximate hex |
|---|---|---|
| `--chart-blue` | `231 89% 64%` | `#4f6df5` |
| `--chart-green` | `142 71% 45%` | `#28a745` |
| `--chart-yellow` | `43 96% 56%` | `#f5a623` |
| `--chart-orange` | `25 95% 53%` | `#f56315` |
| `--chart-purple` | `262 83% 58%` | `#7c3aed` |

#### Metric card accent colours

| Token | HSL value | Approximate hex |
|---|---|---|
| `--metric-blue` | `231 89% 64%` | `#4f6df5` |
| `--metric-green` | `142 71% 45%` | `#28a745` |
| `--metric-yellow` | `43 96% 56%` | `#f5a623` |
| `--metric-orange` | `25 95% 53%` | `#f56315` |
| `--metric-purple` | `262 83% 58%` | `#7c3aed` |
| `--metric-pink` | `330 81% 60%` | `#e84393` |
| `--metric-red` | `0 84% 60%` | `#f03e3e` |
| `--metric-cyan` | `188 78% 41%` | `#12a4b4` |
| `--metric-indigo` | `239 84% 67%` | `#6366f1` |
| `--metric-teal` | `173 80% 40%` | `#0d9488` |

#### Shadows (light — very subtle)

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px hsl(0 0% 0% / 5%)` |
| `--shadow-md` | `0 4px 6px -1px hsl(0 0% 0% / 10%)` |
| `--shadow-lg` | `0 10px 15px -3px hsl(0 0% 0% / 10%)` |
| `--shadow-card` | `0 1px 3px hsl(0 0% 0% / 4%)` — barely visible lift on cards |

---

### Header (what you see when DARK_MODE_TOGGLE=false)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☰  HIGHWAY STOPS RETAIL LIMITED          Total Sales: £ 1.23M    [HSRL]   │
└─────────────────────────────────────────────────────────────────────────────┘
  bg: transparent (shows the page gradient through)
  text: #1e2b37 (deep navy)
```

Elements present:
- **☰ Menu button** — muted/40 background, border, navy icon
- **Company name** — `HIGHWAY STOPS RETAIL LIMITED`, bold uppercase, navy
- **Total Sales badge** — indigo (`#4f6df5`) pill with white £ amount
- **Show M toggle** (if wired) — small switch in a white/border box
- **HSRL avatar** — indigo gradient pill, white text
- **Dark UI toggle: ABSENT** — the entire switch element is not in the DOM

What is gone:
```
  [ Dark UI  ◉ ]   ← not rendered at all
```

---

### Overall visual character in light mode

| Aspect | Description |
|---|---|
| **Base feel** | Clean, airy enterprise BI dashboard |
| **Background** | Animated pale blue-lavender gradient wash — never flat white |
| **Text** | Deep navy (`#1e2b37`) on near-white surfaces — high contrast |
| **Accent / interactive** | Indigo-blue (`#4f6df5`) throughout — buttons, active nav, chart bars |
| **Cards** | Almost-white with very light blue tint, 1 px light-grey border, minimal shadow |
| **Sidebar** | Pale blue-white panel, same indigo accent on active item |
| **Charts** | Vivid indigo/green/yellow/orange bars and lines on white grid |
| **User control** | None — theme is locked; no toggle visible |

---

## Switching the toggle back on

1. Open `backend/.env`.
2. Change `DARK_MODE_TOGGLE=false` → `DARK_MODE_TOGGLE=true` (or delete the line entirely).
3. Restart the backend (`node server.js` / `docker compose up -d`).
4. Optionally rebuild the frontend (`cd frontend && npm run build`) so the
   baked build-time default also matches — at runtime the server value always wins.

After restart the "Dark UI" switch reappears in the header. The user's last choice
is persisted in `localStorage` under key `theme`; dark is the default if nothing
is stored.

---

## Files involved

| File | Role |
|---|---|
| `backend/.env` | Source of truth — `DARK_MODE_TOGGLE=false\|true` |
| `backend/server.js:120-124` | Reads env var, exposes `GET /api/ui-config → { darkModeToggle }` |
| `frontend/vite.config.mjs:68-90` | Reads same env var at build time, bakes into `import.meta.env.VITE_DARK_MODE_TOGGLE` |
| `frontend/src/contexts/ThemeContext.jsx` | Consumes both sources; forces light theme and disables `toggleTheme()` when flag is false |
| `frontend/src/components/dashboard/Header.jsx:64,115-120` | Conditionally renders the "Dark UI" switch only when `showThemeToggle` is true |
| `frontend/src/index.css` | CSS custom properties: `:root` block = light palette, `.dark` block = dark palette (inactive when flag is false) |
