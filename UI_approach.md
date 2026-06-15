# UI / UX approach — portable design reference

This document describes a **reusable visual and interaction system** (colors, typography, layout, components, motion, and responsiveness). It is **not tied to any product, domain, or page list**. Teams can adopt the same look and behavior in any stack (plain HTML/CSS, a component library, SPA frameworks, or native shells) by mapping these rules to their own routes and structures.

---

## 1. Design intent

- **Aesthetic:** Light, airy **glassmorphism** on a **soft cool gradient** background (blue–lavender family). Content sits in frosted panels; the background stays alive with subtle motion.
- **Tone:** Professional tool UI — clear hierarchy, readable tables and forms, calm accents (no loud neon).
- **Feel:** **One accent color** drives links, primary actions, and active navigation; everything else stays neutral slate/blue-gray.

To **rebrand** another product: keep structure and component rules; only replace the token values in §3 (especially `--accent`, background stops, and optional orb colors).

---

## 2. Typography

| Role | Rule |
|------|------|
| **Font stack** | `Inter` first, then `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`. Load Inter via your preferred method (CDN, self-host, or substitute another geometric sans). |
| **Body text** | Default color from `--text`; secondary copy from `--text-secondary` or `--text-muted`. |
| **Scale** | Prefer **relative units** (`rem`, `clamp()`) for headings and body so zoom and accessibility work. Example pattern: page title around `1.25rem–1.35rem`, section titles `1rem–1.05rem`, helper text `0.82rem–0.92rem`. |
| **Weight** | `500–600` for labels and emphasis; `600` for nav active state and primary headings. |

---

## 3. Design tokens (CSS custom properties)

Define these on `:root` (or equivalent global theme) so **all screens inherit one palette**. Values below are the reference set; swap hex/rgba to theme a different product while keeping the same variable **names** for easy porting.

### 3.1 Background & atmosphere

| Token | Reference | Role |
|-------|-----------|------|
| `--bg-gradient-1` | `#f3f8ff` | Gradient stop (lightest) |
| `--bg-gradient-2` | `#eaf3ff` | Mid stop |
| `--bg-gradient-3` | `#f8fbff` | Alternate stop |
| `--bg-gradient-accent` | `#b5d9ff` | Decorative orb (blue) |
| `--bg-gradient-accent-2` | `#d3c8ff` | Decorative orb (lavender) |

**Page background:** Full-viewport layer with:

- `linear-gradient(135deg, …)` cycling the three `--bg-gradient-*` stops.
- `background-size: 400% 400%` and a **slow** `background-position` animation (e.g. ~20s ease infinite) for a gentle shift.
- Two **pseudo-elements** (`::before`, `::after`): large circles, heavy `blur` (~80px), low opacity (~0.25), soft `translate` animation for “floating orbs.”

Keep motion **subtle**; respect `prefers-reduced-motion` in production by disabling or shortening animations.

### 3.2 Glass surfaces

| Token | Reference | Role |
|-------|-----------|------|
| `--glass-bg` | `rgba(255,255,255,0.72)` | Generic glass panel |
| `--glass-bg-hover` | `rgba(255,255,255,0.88)` | Hover on list rows / buttons |
| `--glass-bg-card` | `rgba(255,255,255,0.76)` | Cards, floating controls |
| `--glass-bg-sidebar` | `rgba(245,250,255,0.86)` | Sidebar column |
| `--glass-bg-main` | `rgba(255,255,255,0.74)` | Main content panel |
| `--glass-bg-input` | `rgba(255,255,255,0.8)` | Inputs |
| `--glass-bg-input-focus` | `rgba(255,255,255,0.95)` | Input focus |

**Glass recipe:** `backdrop-filter: blur(var(--glass-blur))` (and `-webkit-` prefix), plus `border: 1px solid var(--glass-border)` and a soft shadow.

| Token | Reference | Role |
|-------|-----------|------|
| `--glass-border` | `rgba(128,155,185,0.25)` | Default border |
| `--glass-border-hover` | `rgba(98,132,170,0.38)` | Panel hover |
| `--glass-border-focus` | `rgba(79,109,245,0.42)` | Focus rings (inputs) |
| `--glass-blur` | `16px` | Content panels |
| `--glass-blur-heavy` | `24px` | Sidebar, auth card |
| `--glass-shadow` | `0 18px 44px rgba(77,108,142,0.2)` | Elevated overlays |
| `--glass-shadow-hover` | `0 22px 50px rgba(77,108,142,0.28)` | Stronger hover |
| `--glass-shadow-card` | `0 10px 30px rgba(86,120,156,0.14)` | Default card elevation |

### 3.3 Accent & text

| Token | Reference | Role |
|-------|-----------|------|
| `--accent` | `#4f6df5` | Primary actions, links, active nav |
| `--accent-hover` | `#3f5ce8` | Hover / pressed |
| `--text` | `#1e2b37` | Primary body |
| `--text-muted` | `#607283` | De-emphasized |
| `--text-secondary` | `#445869` | Labels, table headers, secondary headings |

### 3.4 Shape & motion

| Token | Reference | Role |
|-------|-----------|------|
| `--radius` | `12px` | Buttons, inputs, small cards |
| `--radius-lg` | `16px` | Main content region |
| `--radius-xl` | `24px` | Large cards (e.g. auth) |
| `--transition-base` | `250ms ease` | Hover states |

---

## 4. Semantic colors (feedback)

Use **consistent** tints for system messages, toasts, and inline alerts (not necessarily CSS variables if you prefer):

| Type | Text | Border tint | Background tint |
|------|------|-------------|-----------------|
| Success | `#0f7b4b` | green ~0.25–0.3 alpha | light green wash ~0.9 alpha |
| Error | `#b83737` | red ~0.25–0.3 alpha | light red wash |
| Warning | `#96610a` | amber ~0.25–0.3 alpha | light amber wash |
| Info | `#275db7` | blue ~0.25–0.3 alpha | light blue wash |

---

## 5. Application shell layout (signed-in experience)

### 5.1 Structure

1. **Background layer** — fixed, full viewport, z-index below content (`z-index: -1` pattern).
2. **`.app-layout`** — `display: flex; min-height: 100vh`.
3. **Sidebar** — fixed width (~`260px`), `sticky` top, full height, `flex-shrink: 0`.
4. **Main** — `flex: 1; min-width: 0` (critical so flex children don’t overflow).
5. **Main content panel** — single glass card filling the column with padding; this is where page-specific markup lives.

### 5.2 Sidebar behavior

- **Desktop:** Sidebar visible; nav links with icon + label; **active** state: left border accent, tinted background, `font-weight: 600`, accent color.
- **Tablet / mobile (e.g. ≤1024px):** Sidebar becomes an **off-canvas drawer**: `transform: translateX(-100%)` by default; `.open` slides in; **overlay** (`rgba` darkening + light blur) covers the main area; **Escape** and overlay click close the drawer.
- **Top bar on small screens:** Optional “Menu” control in the main column opens the drawer; optional “Home” shortcut to the dashboard route.

### 5.3 Spacing and safe areas

- Use `env(safe-area-inset-*)` on padding for notched devices (footer, main padding, toasts).
- Minimum **~44px** touch height for primary controls (logout, profile row, menu button).

---

## 6. Auth / marketing card layout (centered)

- **Body:** `min-height: 100vh`, centered flex, same gradient background as the app (or a simplified variant).
- **Card:** Max width ~`440px`, `--radius-xl`, heavy blur, generous padding (`2.5rem` desktop), `fade-in-up` entrance optional.
- **Inputs:** Full width, `border-radius: 8px`, inherit `--glass-bg-input`, focus: border `--glass-border-focus` + soft outer glow (`box-shadow` with accent-related rgba).
- **Primary button:** Full width, `--accent` fill, hover `--accent-hover`.

This pattern is **independent** of the app shell: same tokens, different layout.

---

## 7. Component patterns

### 7.1 Buttons

| Variant | Appearance |
|---------|------------|
| **Primary** | Background `--accent`, text white, `border-radius: 8px` (or `--radius` for larger chips). Hover `--accent-hover`. |
| **Secondary / ghost** | Transparent or glass background, border `--accent` or `--glass-border`, text `--accent`; hover light wash `rgba(accent, ~0.1)`. |
| **Destructive** (optional) | Keep separate hue; do not reuse `--accent` for errors. |

Always provide **`:focus-visible`** outline (2px accent, 2px offset) for keyboard users.

### 7.2 Form fields

- Border `--glass-border`, background `--glass-bg-input`.
- Focus: `--glass-border-focus` + ring; background `--glass-bg-input-focus`.
- Labels: `font-weight: 500`, `--text`, slightly smaller than body if needed.

### 7.3 Data tables

- Wrapper: `overflow-x: auto` for horizontal scroll on small screens.
- Cells: `border: 1px solid var(--glass-border)`; header row background `--glass-bg`, text `--text-secondary`, `font-weight: 600`.
- Sortable headers: pointer cursor; hover text `--accent`; optional ▲/▼ indicators.

### 7.4 Inline messages (django-style `messages` or equivalent)

- List with no bullets; each item: `border-radius: 8px`, glass background, border `--glass-border`.
- Use semantic **success** / **error** / **warning** / **info** classes with the palette in §4.

### 7.5 Toasts (floating)

- Fixed position (e.g. bottom-right); stack vertically with gap.
- Same glass + semantic tint as alerts; short **slide-in** animation; auto-dismiss after a few seconds with fade/slide out.

### 7.6 Optional: “highlight” bar

- For contextual actions (e.g. bulk selection): light tinted background `rgba(accent, 0.06)`, border `1px solid var(--accent)`, `border-radius: 10px`, padding `0.75rem 1rem`.

### 7.7 Loading

- Spinner: circular border with `border-top-color: var(--accent)` and rotate animation.

---

## 8. Dashboard / page header (optional block)

- Bottom border `1px solid var(--glass-border)` under the welcome block.
- Title line: `clamp()` for responsive size; **label** in `--text-secondary`, **name** or emphasis in `--accent-hover`.

---

## 9. Responsive breakpoints (reference)

| Range | Behavior |
|-------|----------|
| **> 1024px** | Full sidebar; optional extra main padding from ~`1400px` upward. |
| **≤ 1024px** | Drawer sidebar, overlay, top menu + optional home shortcut. |
| **≤ 600px** | Tighter main padding; toasts may span full width with side insets; slightly larger touch targets in footer. |

These are **guidelines**; adjust to your content grid.

---

## 10. Accessibility checklist

- **Contrast:** Body text on glass backgrounds should meet WCAG AA; verify after changing tokens.
- **Focus:** Visible focus rings on interactive elements; don’t rely on hover alone.
- **Motion:** Honor `prefers-reduced-motion`.
- **Drawer:** `aria-expanded`, `aria-controls`, `aria-label` on menu buttons; close on Escape.
- **Touch:** Adequate hit areas (≥44px) for primary actions on mobile.

---

## 11. How to port to another codebase

1. **Copy the token block** (`:root`) into global styles or a theme provider.
2. **Recreate two layouts:** (1) app shell = background + sidebar + main glass panel; (2) auth = centered glass card.
3. **Map your router** to the sidebar and active states; **no change** to tokens required.
4. **Page content:** Build only inside the main glass region; use §7 for tables, forms, and feedback.
5. **Rebrand:** Replace §3 values only; re-check contrast and focus rings.

---

## 12. Naming convention for page-specific CSS

- Prefix page-scoped classes (e.g. `.feature-page`, `.feature-section`) to avoid collisions.
- **Always** reference shared tokens (`var(--accent)`, `var(--glass-border)`) instead of hard-coding hex in feature CSS so rebranding stays one place.

---

This reference is sufficient to **replicate the same UI identity** on any project structure, as long as global tokens and the shell patterns above are preserved.
