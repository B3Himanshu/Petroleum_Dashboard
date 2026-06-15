# CLAUDE.md — HSRL Petroleum Dashboard

This file is read automatically by Claude Code at the start of every session.

---

## ACTIVE CONSTRAINT — Mobile Responsiveness Work

> **Desktop view is frozen. Do not touch it.**

We are currently fixing **mobile responsiveness only**.

- Only modify base / `sm:` Tailwind classes
- **Never** add, remove, or change classes at `md:` / `lg:` / `xl:` / `2xl:`
- Do not restructure JSX in a way that shifts desktop layout
- Do not change props, state, or data logic while doing layout work
- Full rule: `.cursor/rules/mobile-responsive-only.mdc`

---

## Project Overview

**HSRL Petroleum Dashboard** — a full-stack web app that pulls data from a PostgreSQL database (Sage audit journal) and renders KPI cards, charts, and breakdowns for fuel, shop, and valet operations across multiple petrol station sites.

- **Backend:** Node.js + Express (`backend/`)
- **Frontend:** React + Vite + Tailwind + shadcn/ui (`frontend/`)
- **DB table:** `HSRL_sage_audit_journal` (nominal_code, dept_number, sage_date, amount, details, volume)
- **Volume table (2025):** `HSRL_volumne_2025`

---

## Key Nominal Code Groups

| Group | Codes | Notes |
|---|---|---|
| Fuel Sales (value) | 4000–4004 | Used for £ sales only |
| Fuel Volume | 4000–4004 + **4101** | 4101 = Bunkered Sales — volume only, not value |
| Bunkering | 4100, 4101, 4102 | 4101 volume parsed from `details` column |
| Shop | 4008–4038, 4400–4454 | |
| Fuel Purchase | 5000–5004 | Cost side |
| Labour | 7000–7005 | |

---

## Fuel Volume Parsing Rules

- **4000–4004:** parsed from `details` column using `/` separator  
  Format: `SITENAME-FuelType-Month'YY/volume`
- **4101:** special parser `parse4101VolumeFromDetails()`  
  - `/` format: `Ast-Accrual for UK Fuel-Jan'26/551.30` → **+551.30**  
  - `-` format: `Ast-Rev.Accrual for UK Fuel-Dec'25-4251.51` → **−4251.51** (Rev = reversal, subtract)
- 2025 data: pulled from `HSRL_volumne_2025` table
- 2026+ data: parsed from `details` column of `HSRL_sage_audit_journal`

---

## Change Audit Rule

After every substantive edit, append an entry to **`CHANGE_LOG.md`** at the repo root.

**Always log:** multi-file edits, logic changes, new features, API shape changes, security changes.

Entry format:
```
---
**Timestamp:** YYYY-MM-DDTHH:MM:SSZ
**Summary:** One-line description.
**Files:**
- relative/path/to/file.ext
**Details:** What changed and why.
**Undo / Rollback:** git restore <file> or git revert <sha>
```

---

## Documentation Folder

All project documentation lives in `Documentation/`. Update the relevant doc whenever you change behaviour.

| File | Purpose |
|---|---|
| `Documentation/ARCHITECTURE.md` | System overview, data flow |
| `Documentation/NOMINAL_CODES.md` | Complete nominal code reference |
| `Documentation/VOLUME_LOGIC.md` | Fuel volume calculation rules |
| `Documentation/API.md` | Backend API endpoints |
| `Documentation/FRONTEND.md` | Component map and data flow |
| `Documentation/CHANGES_INDEX.md` | Human-readable index of all changes |

---

## Dev Notes

- Do **not** add 4101 to fuel sales (£ value) — volume only.
- Gross Profit Breakdown modal shows **3 rows only**: Fuel (combined), Shop, Coffee & Valet.
- `sageDashboard.js` is the all-sites aggregation helper; `petrolDataSage.js` is the full route file.
- Port 8080 = frontend (Vite). Backend runs on a separate port (check `backend/.env`).
