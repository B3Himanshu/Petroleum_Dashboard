# HSRL Petroleum Dashboard — Project handbook & Flutter port guide

**Wireframe source:** Dashboard logic and nominal codes follow **`wireframe.csv`** in the repository root (`HSRLDatabase/wireframe.csv`). Do not use `HSRL_ui/PRL Logic Bar csv.csv`. See `WIREFRAME_SOURCE.md` at the repo root for the spec.

This document describes the **HSRL_ui** web app (React + Node API) so you can build a **Flutter** client that talks to the **same backend and PostgreSQL database** without changing server contracts. It is written as a **full deep-dive**: backend helpers, every petrol-data route, nominal groups, frontend guards and API wiring, data pipeline, and cross-references to source files. **Source code remains canonical** if behaviour drifts—update the code first, then this README.

---

## 1. What this project is

- **Backend** (`backend/`): Express.js REST API, **PostgreSQL** via `pg`, JWT auth for dashboard users and admins.
- **Frontend** (`frontend/`): Vite + React 18, React Router, TanStack Query, **shadcn/ui** (Radix) + Tailwind CSS, Chart.js / Recharts / Plotly for charts.
- **Data:** Operational metrics come from **Sage** journal data loaded into Postgres (see sibling folder `HSRLDATABASEcomplete` and `sage_to_postgres.py` in the parent repo). The Node app queries views/tables in the configured database; it does not connect to Sage directly.

---

## 2. Repository layout (`HSRL_ui/`)

| Path | Role |
|------|------|
| `backend/server.js` | Express entry: CORS, JSON body, `/health`, route mounts |
| `backend/config/database.js` | Postgres pool (`DATABASE_URL` or `DB_*`), optional `DB_SEARCH_PATH`, SSL for Cloud SQL |
| `backend/config/loadEnv.js` | Env loading (imported first from `server.js`) |
| `backend/routes/auth.js` | Public user auth: login, verify-email, forgot/reset password |
| `backend/routes/admin.js` | Admin login (public); user CRUD + verification (JWT admin) |
| `backend/routes/sites.js` | Sites list / by city / cities (JWT user or admin) |
| `backend/routes/dashboard.js` | Legacy/summary dashboard + **duplicate** `/petrol-data/*` handlers (see routing note below) |
| `backend/routes/petrolDataSage.js` | **Primary** Sage-based petrol metrics under `/api/dashboard/petrol-data/*` |
| `backend/data/nominalCodeNames.js` | Display labels for nominal codes (used in JSON breakdowns) |
| `backend/utils/sageDashboard.js` | Shared Sage/query helpers |
| `backend/middleware/auth.js` | JWT verify: `requireUser`, `requireUserOrAdmin`, `requireAdmin` |
| `backend/migrations/001_auth_tables.sql` | `dashboard_users`, `dashboard_admins`, `auth_tokens` |
| `frontend/src/App.jsx` | Routes: login, admin, protected dashboard pages |
| `frontend/src/services/api.js` | **Single source of truth for HTTP paths** the web UI calls |
| `frontend/src/contexts/AuthContext.jsx` | User JWT in storage, login/logout |
| `frontend/src/constants/sites.js` | HSRL department IDs, filters (closed sites, comparison exclusions) |
| `frontend/src/contexts/ThemeContext.jsx` | Light/dark class on `<html>`; default dark |
| `frontend/src/components/auth/ProtectedRoute.jsx` | JWT expiry check; user or admin token for app routes |
| `frontend/src/components/auth/AdminProtectedRoute.jsx` | Admin JWT for `/admin` |

**Backend logic (boot order, JWT, auth, SQL patterns, petrol helpers, full route catalogue):** see **§3** (especially **§3.15–§3.17**).

**Routing note:** In `server.js`, `/api/dashboard/petrol-data` is mounted **before** `/api/dashboard`. For any path **defined** in `petrolDataSage.js`, that router handles the request. Paths **not** defined there may fall through to `dashboard.js` if Express continues the middleware chain—verify with network tools when porting rare endpoints.

---

## 3. Backend architecture and code logic

How the Node server behaves end-to-end (so Flutter or any client can match expectations without reading every route file).

### 3.1 Boot sequence (`server.js`)

1. **`import './config/loadEnv.js'`** — loads `backend/.env` with **override: true** so file values win over empty OS environment variables (notably on Windows).
2. **Express** — `cors` with a custom `origin` callback: fixed localhost origins, `getFrontendBaseUrl()`, `DEV_TUNNEL_HOST`, and (in non-production or when allowed) `*.trycloudflare.com`; **`credentials: true`**.
3. **`express.json()` / `urlencoded`** — JSON and form bodies for POST/PATCH.
4. **Request logging middleware** — logs each request; wraps `res.send` to log status, duration, and approximate payload size.
5. **Route mounts** — `/health`; public `/api/auth`, `/api/admin` (only login is unauthenticated on admin router); JWT-protected `/api/sites`, `/api/dashboard/petrol-data`, `/api/dashboard` via **`requireUserOrAdmin`**.
6. **`bootstrapAdminIfNeeded()`** (before `listen`) — syncs admin user from env (§3.10).
7. **Signals** — `SIGTERM` / `SIGINT` → **`pool.end()`** then exit.

### 3.2 Database layer (`config/database.js`)

- Default export: **`pool`** (`pg.Pool`). Named exports: **`query`**, **`getPool`**, **`closePool`**.
- Builds a **`pg.Pool`**: prefer **`DATABASE_URL`** (with SSL options for Google Cloud SQL) or **`DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD`**.
- **Pool size** `max: 40`, extended idle/connection timeouts — tuned because the UI issues many parallel dashboard requests.
- Optional **`DB_SEARCH_PATH`**: on each **`connect`**, runs `SET search_path TO …` for the client.
- Exported **`query(text, params)`**: delegates to `pool.query`, trims query logging in production, **always logs errors**; **`pool.on('error')`** calls **`process.exit(-1)`** on unexpected idle-client errors.

### 3.3 Environment loading (`config/loadEnv.js`)

- Resolves `backend/.env` next to `config/` and runs **`dotenv.config({ path, override: true })`** so `.env` overrides empty env vars.

### 3.4 JWT middleware (`middleware/auth.js`)

- **`decodeBearer(req)`** — parses `Authorization: Bearer …`, **`jwt.verify`** against **`JWT_SECRET`**.
- **`requireUser`** — requires payload **`typ === 'user'`** and **`role === 'user'`**; sets **`req.auth = { userId, role: 'user' }`**.
- **`requireUserOrAdmin`** — accepts **user** or **admin** JWT so an admin session can call dashboard APIs; sets **`req.auth`** with **`userId`** or **`adminId`**.
- **`requireAdmin`** — admin JWT only.

### 3.5 Opaque tokens (`lib/authTokens.js`)

- **`generateRawToken()`** — 32 random bytes as hex (sent in email links).
- **`hashToken(raw)`** — SHA-256; DB stores **only** the hash in **`auth_tokens`**.

### 3.6 Frontend base URL (`lib/frontendUrl.js`)

- **`getFrontendBaseUrl()`** — reads **`FRONTEND_URL`** at **call time** (not at module load), strips trailing slash; default **`http://localhost:9090`** if unset (your Vite dev server may be `8080` — keep `.env` consistent).

### 3.7 Email (`services/email.js`)

- No **`SMTP_HOST`** → transport is null → returns **`{ sent: false, reason: 'no_smtp' }`**, logs the plaintext body (dev convenience).
- Otherwise **nodemailer** with **`SMTP_PORT`**, **`SMTP_SECURE`**, optional auth, **`SMTP_FROM`**.

### 3.8 User auth (`routes/auth.js`) — behaviour

| Endpoint | Logic |
|----------|--------|
| **GET `/status`** | `COUNT(*)` on **`dashboard_users`**; on failure, **503** with hint to run **`npm run migrate-auth`**. |
| **POST `/login`** | Lowercase email; load user; **bcrypt** verify; if **`AUTH_REQUIRE_EMAIL_VERIFIED`** (default on) and **`email_verified_at`** is null → **403**; else JWT via **`jwt.sign`** (`sub`, `role`, `typ`, `email`). |
| **GET `/verify-email`** | Hash `token` query param; load **`auth_tokens`** row `email_verify`, unused, not expired; transaction: set **`email_verified_at`**, mark token used. |
| **POST `/forgot-password`** | Generic success message always (no account enumeration); if user exists, insert **`password_reset`** token (1 hour), email link to **`/reset-password?token=`**. |
| **POST `/reset-password`** | Validate token + **`newPassword`** length ≥ **8**; bcrypt hash; transaction: update password, mark reset token(s) used. |

### 3.9 Admin (`routes/admin.js`) — behaviour

| Method | Path | Auth | Behaviour |
|--------|------|------|------------|
| **POST** | `/api/admin/login` | None | **`dashboard_admins`** + bcrypt → **admin JWT** (`typ`/`role` **admin**). |
| **GET** | `/api/admin/users` | Admin JWT | List users (`id`, `email`, `email_verified_at`, `created_at`). |
| **POST** | `/api/admin/users` | Admin JWT | Body **`{ email, password }`** (min 8 chars); bcrypt cost **12**; insert user + **email_verify** token + send mail; **409** if email exists. |
| **DELETE** | `/api/admin/users/:id` | Admin JWT | Delete user by id; **404** if missing. |
| **POST** | `/api/admin/users/:id/resend-verification` | Admin JWT | Delete pending verify tokens; new verification email; **400** if already verified. |
| **POST** | `/api/admin/users/:id/verify` | Admin JWT | Set **`email_verified_at = NOW()`** without email link; invalidate unused verify tokens; **400** if already verified. |

All routes after **`router.use(requireAdmin)`** require **`Authorization: Bearer`** with admin JWT. User passwords use **bcrypt** with cost factor **12** on create (same as reset-password in `auth.js`).

### 3.10 Admin bootstrap (`lib/bootstrapAuth.js`)

- Reads **`ADMIN_USERNAME` / `ADMIN_PASSWORD`** (or legacy **`BOOTSTRAP_ADMIN_*`**).
- **`syncAdminFromEnv`**: if username exists → **UPDATE** `password_hash`; else if zero admins → **INSERT**; else **INSERT** another row (see file for exact branch).
- **`bootstrapAdminIfNeeded`**: runs on startup, logs only, **never throws** (migration missing → error log).

### 3.11 Sites API (`routes/sites.js`)

- Tries **`hsrl_departments`** → `dept_number`, `dept_name`, maps with **`mapSiteToFrontend`** + **`utils/cityMapping.js`** (`getCityFromPostcode` for `city` / `cityDisplay`; postcodes often empty from DB).
- On any query error → **`SITE_FALLBACK`** (hardcoded 0–19) so the API still returns **`success: true`**.
- Route order: **`/city/:cityId`**, **`/cities/list`** before **`/:id`** to avoid `"city"` being parsed as an id.

### 3.12 Legacy dashboard (`routes/dashboard.js` + `utils/sageDashboard.js`)

- **Table:** **`sage_audit_journal`** (constant in router; overridable pattern).
- **`/metrics`**: parses **`siteId`**, **`month`/`months`**, **`year`/`years`**; **`siteId === 'all'`** → **`getMetricsFromSageAllSites`**; else per-dept **`getMetricsFromSage`**.

**`sageDashboard.js` (summary):**

- **`buildMonthYearFilter`**: `EXTRACT(MONTH/YEAR FROM sage_date)` with parameterized month/year lists.
- **Metrics**: separate SQL sums for **revenue** codes, **cost** codes, fuel sales/purchases, labour, overheads; derives fuel profit, net profit, avg PPL, labour %; **fuel volume** from amount column and/or **`parseDetailsToVolumeSegments(details)`** (`label/volume` chunks split by `|`, `;`, newlines — aligned with petrol parsing).
- Charts / totals: **`getMonthlyPerformanceFromSage`**, **`getSalesDistributionFromSage`**, **`getDateWiseFromSage`**, **`getTotalSalesFromSage`**, etc., same journal + dept model.

**Duplicate `/petrol-data/*` inside `dashboard.js`:** if **`petrolDataSage.js`** already defines the same path on the **first** `app.use`, that implementation wins; undefined paths may still be handled by **`dashboard.js`** when Express falls through.

### 3.13 Petrol / Sage API (`routes/petrolDataSage.js`) — behaviour

- **Source table:** **`sage_audit_journal`**.
- **Columns:** **`DB_AMOUNT_COLUMN`** (default **`amount`**) and **`DB_DATE_COLUMN`** (default **`sage_date`**) — validated as safe identifiers; amounts and dates are cast from text to numeric/date in SQL fragments **`AMOUNT_EXPR`**, **`DATE_EXPR`**.
- **Site filter:** query **`siteIds=1,6,18`** → **`parseSiteIds`** + **`buildDeptFilter`** → `AND dept_number IN (...)`.
- **Nominal logic:** large in-file constants — e.g. **`FUEL_SALES_CODES`**, **`REVENUE_CODES`**, **`COST_CODES`**, **`LABOUR_CODES`**, **`OVERHEADS_CODES`**, **`FUEL_PROFIT_NOMINAL_CODES`**, **`NET_PROFIT_*`**, **`EBITA_CODES`**, **`ROI_INVESTMENT_CODES`**, bunkering **`4100–4102`**, **`CODES_DB_POSITIVE_AS_NEGATIVE`** for purchase sign convention. Names from **`data/nominalCodeNames.js`**. Dept labels: **`DEPT_TO_SITE_NAME`**, **`PREFIX_ALIASES`** for parsing **details** lines into canonical sites.
- **Handlers:** each route validates **`startDate`/`endDate`**, runs focused SQL/helpers, returns JSON for the React client. **EBITA**, **total net profit**, **ROI** use the narrowed code sets documented in **`API_DOCUMENTATION.md`**.
- **Nominal code lists (copy-paste friendly tables):** **§6.4**.

### 3.14 Health and errors

- **`GET /health`**: `SELECT NOW()`, `version()` — proves DB connectivity.
- **404 handler**: JSON not found.
- **Error middleware**: **`err.status`** or 500; stack in development only.

### 3.15 Shared petrol helpers (`petrolDataSage.js` internals)

These functions sit **above** individual route handlers and define shared business logic.

| Helper | Purpose |
|--------|---------|
| **`validateDateRange(req, res)`** | Requires **`startDate`** and **`endDate`** query params (`YYYY-MM-DD`); validates parseable dates and **`start ≤ end`**; returns `{ startDate, endDate }` or sends **400** and returns `null`. |
| **`parseSiteIds(req)`** | Reads **`siteIds`** (comma-separated integers). Empty/missing ⇒ **no** dept filter (all sites). |
| **`buildDeptFilter(baseParams, siteIds)`** | Appends SQL `AND (NULLIF(TRIM(dept_number::text), '')::int) IN ($n…)` and extends param array so **`dept_number`** matches whether the column is text or int. |
| **`getFuelProfit14Sums(start, end, siteIds)`** | Sums each of the **14** **`FUEL_PROFIT_NOMINAL_CODES`** lines; returns **`breakdown`**, **`totalRevenue`** (sales subset), **`totalCost`** (purchase subset), **`totalProfit`** (sum of all 14 raw amounts). |
| **`getGrossProfit`** | **Fuel** = **`NET_PROFIT_REVENUE_SQL`** vs **`NET_PROFIT_COST_SQL`** (abs-based); **shop** and **valet** = sales − cost per **`SHOP_*`** / **`VALET_*`** SQL; **`grossProfit`** = fuel + shop + valet (see implementation for `Math.abs` usage). |
| **`getNetProfitRevenueCost`** | Narrow **fuel-only** net profit card: revenue/cost from **`NET_PROFIT_*_CODES`**; **`netProfit = totalRevenue + totalCostRaw`** (costs often negative in Sage); if **`amount`** column sums to zero, **retries with `net`** column; builds per-code **`breakdown`**. |
| **`getTotalFuelVolumeFromDetails`** | Walks **`details`** on fuel sales rows, parses **`parseDetailsToVolumeSegments`** (same segment rules as `sageDashboard.js`), returns total litres + row counts. |

**Label → site parsing** for volume/reports: **`getSitePrefixFromLabel`**, **`normalizeToCanonicalSite`**, **`DEPT_TO_SITE_NAME`**, **`PREFIX_ALIASES`** map Sage text to department **0–19**.

### 3.16 Petrol-data GET handlers — behaviour catalogue

All paths are under **`GET /api/dashboard/petrol-data/…`** and require **`Authorization`** unless noted. Almost all use **`validateDateRange`** + optional **`siteIds`** except where stated.

| Path | Query params | What it computes (logic summary) |
|------|----------------|-------------------------------------|
| **`fuel-volume-diagnostic`** | — | Dev: counts rows with **`details`** for fuel volume N/Cs (**`4000`–`4004`**); min/max date, sample rows. **Still requires JWT** (same mount as other petrol routes)—only omits **date/site** query filters. |
| **`fuel-volume`** | `startDate`, `endDate`, `siteIds?` | Total litres from **`details`** on **`FUEL_SALES_SQL`** rows (`4000`–`4004`). |
| **`fuel-grade-breakdown`** | `startDate`, `endDate`, `siteIds?` | Aggregates volume by grade (Petrol/Diesel/Super/AdBlue) from parsed details. |
| **`fuel-volume-breakdown`** | `startDate`, `endDate`, `siteIds?` | Per nominal / line breakdown for fuel volume. |
| **`fuel-volume-transition-breakdown`** | `startDate`, `endDate`, `siteIds?` | Parses alternate **details** formats (transition labels). |
| **`net-sales`** | `startDate`, `endDate`, `siteIds?` | **Total Site Revenue** = raw **`SUM`** over **`TOTAL_SITE_REVENUE_CODES`** (fuel + bunkering + shop + valet lines per wireframe). |
| **`net-sales-breakdown`** | same | Grouped breakdown for those revenue codes. |
| **`shop-profit`** | same | **`SHOP_SALES`** sum − **`SHOP_COST`** sum; returns margin + per-code breakdowns. |
| **`valet-profit`** | same | **`VALET_SALES`** − **`VALET_COST`**; breakdowns. |
| **`profit`** | same | **`getNetProfitRevenueCost`** → **`totalProfit`**, **`totalRevenue`**, **`totalCost`** (narrow fuel net profit definition in comments). |
| **`profit-breakdown`** | same | Same as profit + **`otherIncomeBreakdown`** from **`NET_PROFIT_ALL_CODES`** rows; **`totalPositives` / `totalNegatives`** split. |
| **`avg-ppl`** | same | **`fuelProfit`** from **`getGrossProfit`** ÷ (**volume** if positive else **fuel sales**); returns **`avgPPL`**, components. |
| **`actual-ppl`** | same | Overheads = **`EBITA_OVERHEADS_SQL`** sum (fallback **`net`** column if amount zero); denominator: volume → fuel sales → total revenue; **`pplAfterOverheads`** = (fuel profit − \|overheads\|) / denominator × 100; **`actualPPL`** field = overhead pence per unit (see response shape in code). |
| **`actual-ppl-breakdown`** | same | Full overhead nominal list for UI (not the EBITA-trimmed bucket alone). |
| **`wages-for-overheads`** | same | Sum over **`WAGES_FOR_OVERHEADS_CODES`**; fallback **`net`** if **`amount`** zero. |
| **`labour-cost`** | same | **`LABOUR_CODES`** sum; labour cost % uses fuel sales in related UI. |
| **`labour-cost-breakdown`** | same | Per **`LABOUR_CODES`** line. |
| **`active-sites`** | `startDate`, `endDate`, `siteIds?` | **`COUNT(DISTINCT dept_number)`** in range (rows exist). |
| **`profit-margin`** | same | **`getFuelProfit14Sums`**: **`totalProfit / totalRevenue × 100`** (14-code basis). |
| **`ebita`** | same | **`ebita = grossProfit + miscIncome − overheads`** where **`grossProfit`** = fuel+shop+valet (see **`getGrossProfit`**-style sums in handler), **`miscIncome`** = **`MISC_INCOME_CODES`**, **`overheads`** = **`EBITA_OVERHEADS_SQL`**; response also returns **`depreciation`** and **`loanInterest`** amounts for UI. |
| **`total-net-profit`** | same | Starts from same EBITA-style components, then subtracts **depreciation**, **loan interest** (**`TOTAL_NET_PROFIT_LOAN_INTEREST_CODES`**, **`7751` excluded**), **corporation tax `9000`** — see **`computeTotalNetProfitForRange`**. |
| **`roi`** | same | **`totalNetProfit`** (same basis as card) ÷ **cumulative investment** (**`ROI_INVESTMENT_SQL`**) from **`getEarliestRoiInvestmentDate`** through **`endDate`**; clamps ROI to **±1000**. |
| **`roi-monthly-trend`** | same | **`computeRoiMonthlyTrendPayload`**: monthly P&amp;L maps × **cumulative investment** by month; optional **`bySite`**. |
| **`avg-sale-per-site`** | same | **`REVENUE_SQL`** sum ÷ **`COUNT(DISTINCT dept_number)`** in range. |
| **`total-purchases`** | same | Fuel purchase nominals **`5000`–`5004`** (see handler). |
| **`total-purchases-breakdown`** | same | Per-code **`5000`–`5004`** with txn counts. |
| **`bank-balance`** | **`endDate`** (required), `siteIds?` | Cumulative **`SUM`** for bank/chart N/Cs **`1200`–`1204`, `1211`–`1222`, `1240`, `1250`, `1251`** where **`sage_date ≤ endDate`**. |
| **`bank-balance-breakdown`** | same | Grouped by **`nominal_code`**. |
| **`bunkered-breakdown`** | `startDate`, `endDate` | **Placeholder:** returns zeros (no bunkered flag in data). |
| **`non-bunkered-breakdown`** | same | **Placeholder:** zeros. |
| **`other-income-summary`** | `startDate`, `endDate`, `siteIds?` | **`REVENUE_SQL`** sum labelled “other” in handler (see code comments—fuel 4000s context). |
| **`overhead-trends`** | same | Monthly pivot: many **`CASE WHEN nominal_code IN (…)`** buckets (labour, rent, utilities, …) — see SQL in file. |
| **`monthly-trends`** | same | Per-month volume (details), gross profit, **`avgPPL`**, **`pplAfterOH`**, etc. (comment block at route). |
| **`daily-data`** | same | Day-grain aggregates for charts. |
| **`ppl-comparison`** | same | Monthly **`avgPPL`** vs overhead-based **`actualPPL`** series for chart. |
| **`profit-by-site`** | same | Per **`dept_number`**: **`REVENUE_SQL`** vs **`COST_SQL`** ⇒ top 10 by “fuel_profit” field (see SQL). |
| **`site-rankings`** | same | Ranks sites by **14 fuel-profit N/C** sum; top 5 / bottom 5. |

**Note:** `/profit` and **`getNetProfitRevenueCost`** use the **narrow** `4000`–`4004` / `5000`–`5005` style definition in comments; **`/profit-by-site`** uses **broad** **`REVENUE_SQL`** / **`COST_SQL`** — different endpoints, different definitions **by design** (check UI which call is used).

### 3.17 Express fall-through (`dashboard.js` vs `petrolDataSage.js`)

`app.use('/api/dashboard/petrol-data', petrolDataSage)` is registered **first**, then **`app.use('/api/dashboard', dashboardRoutes)`**. If **`petrolDataSage`** does not define a path, Express may continue to **`dashboard.js`** for the same URL prefix—but in this repo a search shows **no** backend implementation for **`fuel-sales-by-site`** or **`fuel-volume-by-nominal`** (they appear only in **`frontend/src/services/api.js`**). Those calls will **`404`** until routes are added or the client is updated.

**Overlapping names:** `dashboard.js` still contains legacy **`GET .../petrol-data/...`** handlers; wherever **`petrolDataSage.js`** defines the **same** path, the **first** mounted router wins.

---

## 4. Ports, URLs, and how the web app reaches the API

| Service | Default | Notes |
|---------|---------|--------|
| Backend | `http://localhost:2000` | `PORT` in `backend/.env` |
| Frontend (Vite) | `http://localhost:8080` | `frontend/vite.config.mjs` |
| Health | `GET http://localhost:2000/health` | DB connectivity check |

**Development proxy:** Vite proxies `http://localhost:8080/api/*` → `http://127.0.0.1:2000` so the browser can use same-origin `/api` and avoid CORS. See `frontend/vite.config.mjs` (`server.proxy`).

**Production / Flutter:** The mobile app should set a **base URL** to your deployed API origin, e.g. `https://api.example.com`, and call `https://api.example.com/api/...` with `Authorization: Bearer <token>`. CORS does not apply to Flutter’s HTTP client; the server must still allow your deployment if you use a web build of Flutter.

**Web env:** `frontend/.env.example` — optional `VITE_API_URL` when the API is not same-origin (no trailing slash).

---

## 5. Environment variables (backend)

Copy `backend/.env.example` → `backend/.env` and fill values. **Do not commit secrets.**

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP port for Express (default **`2000`**) |
| `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL (same DB the web app uses) |
| `DB_SEARCH_PATH` | Optional Postgres `search_path` (comma-separated schemas) |
| `DB_AMOUNT_COLUMN` | Sage journal column for monetary sums (default **`amount`**); must match loaded data |
| `DB_DATE_COLUMN` | Transaction **Date** column (default **`sage_date`**); not “Posted Date” |
| `JWT_SECRET` | Signs user + admin JWTs (use a long random string in production) |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Bootstrap admin for `/api/admin/login` (`npm run sync-admin` / server bootstrap) |
| `AUTH_REQUIRE_EMAIL_VERIFIED` | Default: verified email required for user login; set `0`/`false` for local dev only |
| `SMTP_*`, `SMTP_FROM` | Email for verification and password reset |
| `FRONTEND_URL` | Used in email links (must match where users open the app) |
| `DEV_TUNNEL_HOST` | Optional; CORS + Vite `allowedHosts` for Cloudflare quick tunnels |
| `ALLOW_TRY_CLOUDFLARE_CORS` / `NODE_ENV` | CORS behaviour (see `server.js`) |

Flutter only needs the **API base URL** and stored **JWTs** on device (secure storage recommended).

---

## 6. Database and auth tables

### 6.1 Connection

The backend uses **one** Postgres database. Flutter does **not** connect to Postgres directly; it uses the REST API.

### 6.2 Auth tables (DDL)

Defined in `backend/migrations/001_auth_tables.sql`:

- **`dashboard_users`**: `id`, `email`, `password_hash`, `email_verified_at`, timestamps  
- **`dashboard_admins`**: `id`, `username`, `password_hash`  
- **`auth_tokens`**: hashed tokens for `email_verify` and `password_reset`, expiry, `used_at`

Apply once: `npm run migrate-auth` from `backend/` (or run the SQL file).

### 6.3 Business / Sage data

Journal and nominal data live in schemas/tables populated by your ETL (e.g. `sage_audit_journal`, nominal code tables). The petrol routes aggregate by **department / nominal code / date** per `petrolDataSage.js` and `wireframe.csv`. See **`backend/API_DOCUMENTATION.md`** for formulas; **§6.4** lists every nominal group used in code (including full **`COST_CODES`** / **`EBITA_CODES`**).

### 6.4 Nominal codes — authoritative lists (`petrolDataSage.js`)

**Source of truth:** repo root **`wireframe.csv`** and **`backend/routes/petrolDataSage.js`** (do **not** use `HSRL_ui/PRL Logic Bar csv.csv`). Human-readable names also come from **`backend/data/nominalCodeNames.js`** / **All Nominal code.csv** where applicable.

**SQL matching:** rows use **`TRIM(nominal_code::text) IN (...)`** (or equivalent) so text/numeric storage both work.

**Amount / date columns:** sums use **`DB_AMOUNT_COLUMN`** (default **`amount`**) cast to numeric; ranges use **`DB_DATE_COLUMN`** (default **`sage_date`** = transaction **Date**, not Posted Date).

**Purchase sign convention:** **`CODES_DB_POSITIVE_AS_NEGATIVE`** — `5000`, `5001`, `5002`, `5003`, `5004`, `5005`, `5050` are treated as stored positive in DB but interpreted as costs (logic in handlers; do not flip signs arbitrarily elsewhere).

#### Fuel sales, bunkering, and total site revenue (card / net-sales)

| Constant / use | Codes |
|----------------|--------|
| **`FUEL_SALES_CODES`** (core pump sales) | `4000`, `4001`, `4002`, `4003`, `4004` |
| **`FUEL_SALES_ADD_CODES`** (bunkering) | `4100`, `4101`, `4102` |
| **`TOTAL_SITE_REVENUE_CODES`** (Total Site Revenue line) | Fuel: `4000`–`4004`, `4100`–`4102`; Shop: `4032`, `4034`, `4036`, `4037`, `5035`; Valet / Costa: `4028`, `4029`, `4030`, `4031`, `4017` |
| **`FUEL_VOLUME_FROM_DETAILS_CODES`** (litres from `details` text) | `4000`, `4001`, `4002`, `4003`, `4004` |

#### Fuel purchases and fuel-profit bundles

| Constant / use | Codes |
|----------------|--------|
| **`FUEL_PURCHASE_CODES`** | `5000`, `5001`, `5002`, `5003`, `5004` |
| **`FUEL_PROFIT_NOMINAL_CODES`** (14 N/C fuel P&L — **raw sum, keep sign**) | `4000`, `4001`, `4002`, `4003`, `4004`, `4005`, `5000`, `5001`, `5002`, `5003`, `5004`, `5005`, `5050` |
| **`FUEL_PROFIT_SALES_CODES`** | `4000`, `4001`, `4002`, `4003`, `4004`, `4005` |
| **`FUEL_PROFIT_COST_CODES`** | `5000`, `5001`, `5002`, `5003`, `5004`, `5005`, `5050` |
| **Fuel gross profit subset (net fuel revenue vs cost)** | Revenue: **`NET_PROFIT_REVENUE_CODES`** = `4000`–`4004`, `4100`, `4101`, `4102`. Cost: **`NET_PROFIT_COST_CODES`** = `5000`–`5005`, `5041`, `5050` |

#### Shop and valet profit endpoints

| Endpoint logic | Sales codes | Cost codes |
|----------------|-------------|------------|
| **`/shop-profit`** | **`SHOP_SALES_CODES`**: `4032`, `4034`, `4036`, `4037`, `4039` | **`SHOP_COST_CODES`**: `5016`, `5032`, `5033`, `5034`, `5035`, `5036`, `5037`, `5039`, `5042` |
| **`/valet-profit`** | **`VALET_SALES_CODES`**: `4028`, `4029`, `4030`, `4031`, `4017` | **`VALET_COST_CODES`**: `5015`, `5028`, `5029`, `5030`, `5031`, `5043`, `5044` |

#### Labour, wages breakdown, and overhead buckets

| Constant / use | Codes |
|----------------|--------|
| **`LABOUR_CODES`** (labour cost %, breakdowns) | `7000`, `7001`, `7002`, `7003`, `7005` |
| **`WAGES_FOR_OVERHEADS_CODES`** (`/wages-for-overheads`) | `7000`, `7001`, `7002`, `7003`, `7005`, `7006`, `7007`, `7008`, `7010` |
| **`OVERHEADS_PLUS_WAGES_CODES`** | All **`OVERHEADS_CODES`** ∪ **`LABOUR_CODES`** ∪ `7006`, `7007`, `7008`, `7010` |
| **`OVERHEADS_CODES`** (full P&L overhead set used in `COST_CODES` / actual-ppl breakdown context) | `7100`, `7101`, `7148`, `7149`, `7150`, `7151`, `7152`, `7200`, `7201`, `7250`, `7251`, `7252`, `7300`, `7301`, `7351`, `7352`, `7353`, `7354`, `7400`, `7401`, `7402`, `7403`, `7404`, `7500`, `7501`, `7550`, `7551`, `7552`, `7553`, `7554`, `7555`, `7556`, `7600`, `7601`, `7602`, `7603`, `7604`, `7605`, `7606`, `7607`, `7608`, `7611`, `7612`, `7700`, `7701`, `7702`, `7704`, `7705`, `7750`, `7751`, `7752`, `7753`, `7800`, `7905`, `7906`, `8000`, `8001`, `8002`, `8050`, `8051`, `8052`, `8053`, `8054`, `8055`, `8100`, `8101`, `8150`, `8151`, `8152`, `8153`, `8154`, `8155`, `8156`, `8157`, `8158`, `8200`, `8201`, `8202`, `8203`, `8204`, `8206`, `8207` |

**Wireframe “classic” overhead examples** (subset called out in docs): **`7150`** Rent, **`7151`** Rates, **`7200`** Electricity, **`7600`** General Repairs, **`7906`** Credit Charges — the **live** `/actual-ppl` overhead bucket is **`EBITA_OVERHEADS_CODES`** = **`OVERHEADS_PLUS_WAGES_CODES`** minus depreciation and loan interest (next row).

| Adjustment | Codes |
|------------|--------|
| **`DEPRECIATION_CODES`** (excluded from EBITA-style overhead bucket for PPL-after-OH) | `8200`, `8201`, `8202`, `8203`, `8204`, `8206`, `8207` |
| **`LOAN_INTEREST_CODES`** (excluded from that bucket) | `7750` |
| **`EBITA_OVERHEADS_CODES`** | `OVERHEADS_PLUS_WAGES_CODES` **minus** `DEPRECIATION_CODES` **and** `LOAN_INTEREST_CODES` |

#### Full revenue and cost sets (net profit, trends, EBITA)

**`REVENUE_CODES`** (includes `4450`–`4454`; used for broad revenue / profit views):

`4000`, `4001`, `4002`, `4003`, `4004`, `4005`, `4006`, `4007`, `4008`, `4009`, `4010`, `4011`, `4012`, `4013`, `4015`, `4016`, `4017`, `4018`, `4020`, `4021`, `4022`, `4023`, `4024`, `4025`, `4026`, `4028`, `4029`, `4030`, `4031`, `4032`, `4033`, `4034`, `4035`, `4036`, `4037`, `4038`, `4100`, `4101`, `4102`, `5035`, `4400`, `4401`, `4402`, `4403`, `4404`, `4405`, `4406`, `4407`, `4408`, `4409`, `4410`, `4411`, `4412`, `4413`, `4414`, `4415`, `4416`, `4417`, `4418`, `4450`, `4451`, `4452`, `4453`, `4454`

**`SITE_REVENUE_CODES`** (same as above **except** **`4450`–`4454` omitted** — site-scoped revenue variant in code).

**`COST_CODES`** (full “total cost” set for `REVENUE_CODES` − `COST_CODES` style profit) — **exact order as in `petrolDataSage.js`:**

```
5000,5001,5002,5003,5004,5005,5006,5007,5008,5009,5010,5011,5012,5013,5014,5015,5016,5017,5018,5019,
5020,5021,5022,5023,5024,5025,5026,5028,5029,5030,5031,5032,5033,5034,5036,5037,5041,5042,5043,5044,5050,
7000,7001,7002,7003,7005,7006,7007,7008,7010,
7100,7101,7148,7149,7150,7151,7152,7200,7201,7250,7251,7252,
7300,7301,7351,7352,7353,7354,7400,7401,7402,7403,7404,
7500,7501,7550,7551,7552,7553,7554,7555,7556,
7600,7601,7602,7603,7604,7605,7606,7607,7608,7611,7612,
7700,7701,7702,7704,7705,7750,7751,7752,7753,
7905,7906,
8000,8001,8002,8050,8051,8052,8053,8054,8055,
8100,8101,8150,8151,8152,8153,8154,8155,8156,8157,8158,
8200,8201,8202,8203,8204,8206,8207,8300,
9000,9001,9998,9999
```

**`EBITA_CODES`** — **`EBITA_SQL`** / **`/ebita`**; sum of these N/Cs **without** stripping signs:

```
4000,4001,4002,4003,4004,4005,4006,4007,4008,4009,4010,4011,4012,4013,4015,4016,4017,4018,
4020,4021,4022,4023,4024,4025,4026,4028,4029,4030,4031,4032,4033,4034,4035,4036,4037,4038,
4100,4101,4102,
4400,4401,4402,4403,4404,4405,4406,4407,4408,4409,4410,4411,4412,4413,4414,4415,4416,4417,4418,
5000,5001,5002,5003,5004,5005,5006,5007,5008,5009,5010,5011,5012,5013,5014,5015,5016,5017,5018,5019,
5020,5021,5022,5023,5024,5025,5026,5028,5029,5030,5031,5032,5033,5034,5035,5036,5037,5041,5042,5043,5044,5050,
7000,7001,7002,7003,7005,7006,7007,7008,7010,
7100,7101,7148,7149,7150,7151,7152,7200,7201,7250,7251,7252,
7300,7301,7351,7352,7353,7354,7400,7401,7402,7403,7404,
7500,7501,7550,7551,7552,7553,7554,7555,7556,
7600,7601,7602,7603,7604,7605,7606,7607,7608,7611,7612,
7700,7701,7702,7704,7705,7750,7751,7752,7753,
7905,7906,
8000,8001,8002,8050,8051,8052,8053,8054,8055,
8100,8101,8150,8151,8152,8153,8154,8155,8156,8157,8158,
8200,8201,8202,8203,8204,8206,8207,8300,
9999
```

#### Miscellaneous income (`/ebita` fuel + shop + valet block)

**`MISC_INCOME_CODES`** (section 010-style revenue lines, used inside **`/ebita`** handler): `4400`, `4401`, `4402`, `4404`, `4405`, `4407`, `4410`, `4412`, `4413`, `4415`, `4416`, `4417`, `4418`

#### Bank / cash nominal codes (`/bank-balance`, `/bank-balance-breakdown`)

Cumulative balance to **`endDate`** (not a range): **`1200`, `1201`, `1202`, `1203`, `1204`, `1211`, `1212`, `1213`, `1214`, `1215`, `1216`, `1217`, `1218`, `1219`, `1220`, `1221`, `1222`, `1240`, `1250`, `1251`**.

#### Total net profit, ROI, and investment

| Metric | Logic (see handlers) | Key codes |
|--------|----------------------|-----------|
| **`/total-net-profit`** | EBITDA − depreciation − loan interest (subset) − corporation tax | Depreciation: **`TOTAL_NET_PROFIT_DEPRECIATION_CODES`** = same as **`DEPRECIATION_CODES`**. Loan interest: **`TOTAL_NET_PROFIT_LOAN_INTEREST_CODES`** = `7750`, `7705`, `7752`, `7753` (**`7751` excluded**). Tax: **`9000`**. |
| **`/roi`** | Uses same net profit basis as total-net-profit ÷ investment × 100 | **`ROI_INVESTMENT_CODES`**: `0010`, `0030`, `0034`, `0040`, `0050`, `0060`, `0070` (cumulative investment logic in route) |

#### Formulas ↔ endpoints (quick map)

| Business concept | Nominal basis | API (under `/api/dashboard/petrol-data/`) |
|------------------|---------------|-------------------------------------------|
| Avg PPL | Fuel profit (14 N/C) ÷ volume or fuel sales | `avg-ppl` |
| PPL after overheads | Fuel profit − **`EBITA_OVERHEADS_CODES`** bucket ÷ volume or sales | `actual-ppl`, `actual-ppl-breakdown` |
| Labour cost % | **`LABOUR_CODES`** ÷ fuel sales | `labour-cost`, `labour-cost-breakdown` |
| Total site revenue (card) | **`TOTAL_SITE_REVENUE_CODES`** | `net-sales`, `net-sales-breakdown` |
| Shop / valet profit | See shop/valet tables above | `shop-profit`, `valet-profit` |
| EBITA | **`EBITA_CODES`** sum | `ebita` |
| Total net profit | See row above | `total-net-profit` |
| ROI | Net profit / investment | `roi`, `roi-monthly-trend` |

If any code list changes in **`petrolDataSage.js`**, update this subsection or treat the **source file as canonical** and this README as a snapshot.

### 6.5 Legacy dashboard helper (`utils/sageDashboard.js`)

Used by **`/api/dashboard/metrics`** and related **month/year** (not date-range) endpoints. **`OVERHEADS_CODES`** here is a **smaller** set: **`7150`, `7151`, `7200`, `7800`, `7906`** — not the full **`OVERHEADS_CODES`** array from **`petrolDataSage.js`**. **`REVENUE_CODES`** / **`COST_CODES`** align closely with petrol but queries use `nominal_code IN (...)` without `TRIM(::text)` in some fragments — behaviour is per that file. For **Latest Petrol** and petrol-data routes, prefer **§6.4** and **`petrolDataSage.js`**.

---

## 7. Authentication (match this in Flutter)

### 7.1 JWT format

- **User token** (`POST /api/auth/login`): payload includes `sub` (user id), `role: 'user'`, `typ: 'user'`, `email`.
- **Admin token** (`POST /api/admin/login`): payload includes `sub` (admin id), `role: 'admin'`, `typ: 'admin'`.

Verification uses `JWT_SECRET` on the server (`middleware/auth.js`).

### 7.2 Authorization header

```
Authorization: Bearer <jwt>
```

### 7.3 Which routes need which token

| Area | Requirement |
|------|----------------|
| `GET /api/auth/status` | None (public setup helper) |
| `POST /api/auth/*` (login, forgot, reset) | None |
| `GET /api/auth/verify-email` | Query `token=` (opaque token, not JWT) |
| `POST /api/admin/login` | None |
| `GET/POST /api/admin/*` (after login) | **Admin** JWT |
| `GET /api/sites`, `GET /api/dashboard/*` | **User** JWT **or** **Admin** JWT (`requireUserOrAdmin`) |

### 7.4 Web client storage (Flutter equivalents)

| Key (web `localStorage`) | Contents |
|----------------------------|----------|
| `hsrl_jwt_user` | Dashboard user JWT |
| `hsrl_jwt_admin` | Admin JWT |

The web `api.js` sends **user JWT**, or if missing, **admin JWT**, for dashboard calls so an admin can use the dashboard after signing in as admin.

**Flutter recommendation:** Use `flutter_secure_storage` (or platform keystore) for tokens; replicate the same header rules.

### 7.5 User login responses

- **Success:** `{ success: true, token, user: { id, email, emailVerified } }`
- **Wrong credentials:** `401`, message like `Invalid email or password`
- **Unverified email:** `403` if `AUTH_REQUIRE_EMAIL_VERIFIED` is on (default)

### 7.6 Admin login response

- **Success:** `{ success: true, token, admin: { id, username } }`

### 7.7 Public helpers

- `GET /api/auth/status` — returns `{ success, dashboardUserCount }` (for setup/debug)

---

## 8. REST API reference (summary)

**Base path:** `{API_ORIGIN}/api/...`  
**Content-Type:** `application/json` for POST bodies  

Detailed shapes and formulas: **`backend/API_DOCUMENTATION.md`**.  
**Canonical path list used by the UI:** `frontend/src/services/api.js`.

### 8.1 Sites (`requireUserOrAdmin`)

| Method | Path | Query / params |
|--------|------|----------------|
| GET | `/api/sites` | — |
| GET | `/api/sites/:id` | `id` = site code |
| GET | `/api/sites/city/:cityId` | `cityId` e.g. `southampton` or `all` |
| GET | `/api/sites/cities/list` | — |

### 8.2 Legacy / summary dashboard (`requireUserOrAdmin`)

Mounted at `/api/dashboard` (see `dashboard.js`):

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/dashboard/metrics` | `siteId`, optional `month` / `year` or `months` / `years` |
| GET | `/api/dashboard/charts/monthly-performance` | `siteId`, `year` / `years` |
| GET | `/api/dashboard/charts/sales-distribution` | `siteId`, date params |
| GET | `/api/dashboard/status` | `siteId` |
| GET | `/api/dashboard/charts/date-wise` | `siteId`, date params |
| GET | `/api/dashboard/total-sales` | optional month/year filters |

### 8.3 Petrol / Sage dashboard (`requireUserOrAdmin`)

Mounted at **`/api/dashboard/petrol-data`** — implemented in **`petrolDataSage.js`**.

Common query params: **`startDate`**, **`endDate`** (typically `YYYY-MM-DD`), optional **`siteIds`** (comma-separated department/site codes; when omitted or full set, backend aggregates all).

**Endpoints** (each `GET` under `/api/dashboard/petrol-data/`):

- `fuel-volume-diagnostic`
- `fuel-volume`
- `fuel-grade-breakdown`
- `fuel-volume-breakdown`
- `fuel-volume-transition-breakdown`
- `net-sales`
- `net-sales-breakdown`
- `shop-profit`
- `valet-profit`
- `profit`
- `profit-breakdown`
- `avg-ppl`
- `actual-ppl`
- `actual-ppl-breakdown`
- `wages-for-overheads`
- `labour-cost`
- `labour-cost-breakdown`
- `active-sites`
- `profit-margin`
- `ebita`
- `total-net-profit`
- `roi`
- `roi-monthly-trend`
- `avg-sale-per-site`
- `total-purchases`
- `total-purchases-breakdown`
- `bank-balance` (uses `endDate` etc. per handler)
- `bank-balance-breakdown`
- `bunkered-breakdown`
- `non-bunkered-breakdown`
- `other-income-summary`
- `overhead-trends`
- `monthly-trends`
- `daily-data`
- `ppl-comparison`
- `profit-by-site`
- `site-rankings`

The frontend `api.js` references **`fuel-volume-by-nominal`** and **`fuel-sales-by-site`** — **there are no matching route handlers in `petrolDataSage.js` or `dashboard.js` in this repo** (expect **404**). Implement them on the server or remove/stub those calls in the client / Flutter port.

### 8.4 User auth (public)

| Method | Path |
|--------|------|
| GET | `/api/auth/status` |
| POST | `/api/auth/login` — body `{ email, password }` |
| GET | `/api/auth/verify-email?token=` |
| POST | `/api/auth/forgot-password` — body `{ email }` |
| POST | `/api/auth/reset-password` — body `{ token, newPassword }` |

### 8.5 Admin (`requireAdmin` except login)

| Method | Path |
|--------|------|
| POST | `/api/admin/login` — body `{ username, password }` |
| GET | `/api/admin/users` |
| POST | `/api/admin/users` — body `{ email, password }` |
| DELETE | `/api/admin/users/:id` |
| POST | `/api/admin/users/:id/resend-verification` |
| POST | `/api/admin/users/:id/verify` |

---

## 9. Frontend screens and navigation (mirror in Flutter)

Defined in `frontend/src/App.jsx`:

| Route | Component | Auth |
|-------|-------------|------|
| `/login` | `Login.jsx` | Public |
| `/forgot-password`, `/reset-password`, `/verify-email` | Forgot / reset / verify | Public |
| `/admin/login` | `AdminLogin.jsx` | Public |
| `/admin` | `AdminDashboard.jsx` | Admin JWT |
| `/` | Redirect → `/dashboard` | User |
| `/dashboard` | `LatestPetrol.jsx` — main **Business Performance** / Latest Petrol | User |
| `/location-dashboard` | `Index.jsx` — location dashboard | User |
| `/comparison` | `Comparison.jsx` | User |
| `/metrics-comparison` | `MetricsComparison.jsx` | User |
| `*` | `NotFound.jsx` | — |

**Shell UI:** `Header.jsx`, `Sidebar.jsx`, `FilterSection.jsx`, `DateRangePicker.jsx`.

### 9.1 Dark mode and the three main dashboard pages

The **same** global theme applies to the whole app: `App.jsx` wraps everything in `ThemeProvider` from `frontend/src/contexts/ThemeContext.jsx`.

| What | Behaviour |
|------|-----------|
| **Default** | **Dark** — if there is no saved preference, `theme` is `'dark'`. |
| **Persistence** | `localStorage` key **`theme`**, values **`light`** or **`dark`**. |
| **How it works** | On change, the provider sets class **`light`** or **`dark`** on `<html>`. Tailwind `darkMode: ['class']` and tokens in `index.css` (e.g. `.dark { --background: ... }`) drive colours. |

The **three primary dashboard routes** (sidebar: Business Performance, Site Comparison, Metrics Comparison) all use the **same layout shell** and therefore the **same** light/dark styling:

1. **`/dashboard`** — `LatestPetrol.jsx` (Business Performance / Latest Petrol)  
2. **`/comparison`** — `Comparison.jsx` (Site Comparison)  
3. **`/metrics-comparison`** — `MetricsComparison.jsx` (Metrics Comparison)  

Each imports **`Sidebar`** + **`Header`** (same nav, same `bg-card`, `border-border`, semantic colours). Charts and cards use theme tokens and `dark:` Tailwind variants where needed.

**Also the same shell:** `/location-dashboard` (`Index.jsx`) uses `Sidebar` + `Header` like the three pages above.

**Auth / admin pages** (`/login`, `/admin/login`, etc.) sit under the same `ThemeProvider`, so they follow the same `light`/`dark` tokens when components use semantic classes — they do not reuse the dashboard `Sidebar`/`Header` layout.

**Note:** `ThemeContext` exposes `toggleTheme`, but there is **no** wired light/dark control in `Header`/`Sidebar` today; mode changes if `localStorage` / `theme` is updated (e.g. devtools or future UI). The **Sonner** toast component imports `useTheme` from **`next-themes`** separately — keep in mind if toast styling ever looks out of sync.

---

## 10. Design system (for Flutter UI parity)

### 10.1 Typography

- **Primary font:** **Plus Jakarta Sans** (Google Fonts), weights 400–700.  
- Tailwind: `fontFamily.sans` in `frontend/tailwind.config.mjs`.

**Flutter:** `google_fonts` package → `GoogleFonts.plusJakartaSans()`.

### 10.2 Colours (light theme — CSS variables)

Defined in `frontend/src/index.css` as **HSL** triplets (without `hsl()`):

| Token | Light (H S L) | Usage |
|-------|----------------|--------|
| `--background` | `210 20% 98%` | Page background |
| `--foreground` | `222 47% 11%` | Main text |
| `--primary` | `217 91% 60%` | Primary blue actions |
| `--card` | `0 0% 100%` | Cards |
| `--border` | `214 32% 91%` | Borders |
| `--radius` | `0.75rem` | Corner radius (~12px) |
| `--sidebar-bg` | `210 20% 15%` | Sidebar dark |
| `--sidebar-foreground` | `210 40% 98%` | Sidebar text |
| Chart / metric accents | `--chart-*`, `--metric-*` | blues, greens, yellows, etc. |

**Dark theme:** `.dark` class overrides the same tokens (see `index.css`).

**Flutter:** Map HSL triplets with `HSLColor.fromAHSL(1, h, s, l).toColor()` (values 0–360 / 0–1 / 0–1 per Flutter’s API) or convert to `Color` once; use `ThemeMode.system` or a toggle matching `ThemeContext`.

### 10.3 Component stack (web)

- **shadcn/ui** + **Radix** primitives: buttons, dialogs, tabs, toast (Sonner), dropdowns, etc.  
- **Charts:** Chart.js, Recharts, Plotly (`react-plotly.js`).

**Flutter:** Material 3 or Cupertino + `fl_chart`, `syncfusion_flutter_charts`, or `graphic` for parity with bar/line/pie usage.

### 10.4 Layout

- Container max width ~`1400px` (`2xl` breakpoint in Tailwind).  
- Card shadow: `--shadow-card` (subtle).

---

## 11. Site constants and filters

`frontend/src/constants/sites.js`:

- **`ALL_HSRL_SITES`:** department `id` + `name` (includes HEAD OFFICE, etc.).
- **`MAIN_DASHBOARD_EXCLUDED_DEPT_IDS`:** `{ 3, 16, 17 }` — closed sites excluded from Latest Petrol picker.
- **`MAIN_DASHBOARD_SITES`:** filter for main dashboard.
- **`COMPARISON_PAGES_EXCLUDED_DEPT_IDS`:** `{ 12, 19 }` for comparison pages.
- **`filterSitesForComparisonPages`:** helper for metrics/comparison UIs.

Replicate these IDs in Flutter so **filters and modals** match the web app.

---

## 12. Flutter implementation checklist

1. **HTTP client** (`dio` / `http`): base URL, JSON, error handling for `401`/`403`/`404`.
2. **Secure storage** for `hsrl_jwt_user` and optionally `hsrl_jwt_admin`.
3. **Auth screens:** login, forgot password, reset password, email verification deep link (`/verify-email?token=`).
4. **Admin app section (optional):** admin login + user management calling `/api/admin/*`.
5. **Dashboard:** date range → `startDate`/`endDate`; parallel requests mirroring `LatestPetrol.jsx` / `api.js` for speed.
6. **Sites:** prefetch `/api/sites` and cities for filters.
7. **Charts:** map each web chart component to a Flutter chart with the same series labels where possible.
8. **Deep linking:** `FRONTEND_URL`-style links for email verification; use `app_links` / universal links.
9. **Testing:** call `GET /health` on startup; log JWT expiry (decode `exp` like `AuthContext.jsx`).

---

## 13. Further reading inside this repo

| Document | Content |
|----------|---------|
| **`README.md`** (this file) | End-to-end architecture, nominal codes, petrol route catalogue, frontend guards |
| `backend/API_DOCUMENTATION.md` | Endpoint examples, nominal codes, formula sheet, DB mapping |
| `backend/ENV_SETUP.md`, `AUTH_SETUP.md` | Environment and auth setup |
| `QUICK_START.md`, `START_HERE.md` | Onboarding |
| `DASHBOARD_DOCUMENTATION.md`, `PETROL_DATA_DOCUMENTATION.md` | Domain docs |
| `SECURITY.md` | Security notes |

---

## 14. Scripts (backend `package.json`)

- `npm run dev` — nodemon API  
- `npm start` — production node  
- `npm run migrate-auth` — apply auth migration  
- `npm run sync-admin` — sync admin user from env  

Frontend: `npm run dev` / `npm run build` in `frontend/`.

---

## 15. Data pipeline, frontend wiring, and document map

This section ties **ETL → API → React** together and lists where to read next—so nothing in the architecture is “implicit.”

### 15.1 Data pipeline (Sage → PostgreSQL → HSRL_ui)

1. **Sage Line 50** (on-prem or accessible ODBC) holds live journals.  
2. **`HSRLDATABASEcomplete/sage_to_postgres.py`** (parent repo) loads **`AUDIT_JOURNAL`** rows into Postgres (e.g. **`sage_audit_journal`**) with nominal codes, **`dept_number`**, **`sage_date`**, **`amount`**, **`details`**, etc. Incremental vs full reload is script-dependent (`--force`, date windows).  
3. **HSRL backend** never opens Sage; it only **queries Postgres** via `pg`.  
4. **Optional:** `DB_SEARCH_PATH` / schemas if journals live outside `public`.  
5. **Auth tables** (`dashboard_users`, …) are separate from Sage—created by **`001_auth_tables.sql`**.

### 15.2 Frontend HTTP layer (`frontend/src/services/api.js`)

| Mechanism | Behaviour |
|-----------|-----------|
| **Base URL** | **`VITE_API_URL`** if set; else in dev **`''`** (same-origin **`/api`**); in production build defaults to **`http://localhost:2000`**. |
| **`fetchAPI`** | Adds **`Content-Type: application/json`**; attaches **`Authorization: Bearer`** from **`hsrl_jwt_user`**, or if absent **`hsrl_jwt_admin`**, for **`authRole: 'user'`** (default). Admin-only calls use **`authRole: 'admin'`**. Public auth uses **`authRole: 'none'`**. |
| **Errors** | Non-OK → `Error` with **`status`** and **`data`** from JSON body when present. |
| **`appendSiteIdsToParams`** | If user selects a **strict subset** of departments (length &lt; **`ALL_HSRL_SITES.length`**), adds **`siteIds=…`** to petrol queries so backend filters **`dept_number`**; if **all** or **none** selected, **omits** `siteIds` ⇒ backend aggregates **all sites**. |

### 15.3 Route guards (`frontend/src/components/auth/`)

| Component | Rule |
|-----------|------|
| **`ProtectedRoute`** | Allows dashboard if **`hsrl_jwt_user`** **or** **`hsrl_jwt_admin`** exists **and** JWT **`exp`** is in the future (base64 payload decode). Else redirect **`/login`** with **`state.from`**. |
| **`AdminProtectedRoute`** | Requires **`hsrl_jwt_admin`** (no expiry check in component—only presence); else **`/admin/login`**. |

### 15.4 User session (`frontend/src/contexts/AuthContext.jsx`)

- **`login`**: POST **`/api/auth/login`** → stores token under **`USER_TOKEN_KEY`**, hydrates user from JWT payload.  
- **`logout`**: clears user token.  
- **`isAuthenticated`**: user object **and** token in storage.  
- **No refresh token** — when **`exp`** passes, user must log in again.

### 15.5 Theme and global UI

- **`ThemeProvider`**: persists **`theme`** ∈ `{ light, dark }` on **`document.documentElement`**; default **`dark`**.  
- **Sonner** toasts use **`next-themes`** separately—may not match `ThemeContext` (see §9.1).

### 15.6 Where to read source (index)

| Topic | Primary files |
|-------|----------------|
| All petrol metrics | `backend/routes/petrolDataSage.js` |
| Legacy month/year dashboard | `backend/routes/dashboard.js`, `backend/utils/sageDashboard.js` |
| Auth | `backend/routes/auth.js`, `backend/routes/admin.js` |
| JWT | `backend/middleware/auth.js` |
| Sites + cities | `backend/routes/sites.js`, `backend/utils/cityMapping.js` |
| UI API calls | `frontend/src/services/api.js` |
| Main dashboard page | `frontend/src/pages/LatestPetrol.jsx` |
| Site filters | `frontend/src/constants/sites.js` |
| Formulas & cards | `backend/API_DOCUMENTATION.md`, `wireframe.csv` |

---

## 16. Cross-check summary (maintainers)

This section records what was **verified against the codebase** when aligning the README. Re-run these checks after major refactors.

| Area | Verified |
|------|----------|
| **Server mounts** | `server.js`: `/health`; `/api/auth`; `/api/admin`; `/api/sites` + `/api/dashboard/petrol-data` + `/api/dashboard` with **`requireUserOrAdmin`** (except admin login). |
| **Auth routes** | `auth.js`: **`GET /status`**, **`POST /login`**, **`GET /verify-email`**, **`POST /forgot-password`**, **`POST /reset-password`**. |
| **Admin routes** | `admin.js`: **`POST /login`**, **`GET/POST /users`**, **`DELETE /users/:id`**, **`POST .../resend-verification`**, **`POST .../verify`**. |
| **Sites routes** | `sites.js`: **`GET /`**, **`GET /city/:cityId`**, **`GET /cities/list`**, **`GET /:id`** (order matters). |
| **Petrol routes** | `petrolDataSage.js`: **37** `router.get` handlers — all listed in **§3.16** (including placeholders bunkered/non-bunkered). |
| **Missing client paths** | **`fuel-sales-by-site`**, **`fuel-volume-by-nominal`**: **not** in backend; documented in **§8.3** and **§3.17**. |
| **Env vars** | **§5** includes **`PORT`**, **`DB_AMOUNT_COLUMN`**, **`DB_DATE_COLUMN`** (plus existing DB/JWT/SMTP/CORS). |
| **JWT storage** | **`hsrl_jwt_user`**, **`hsrl_jwt_admin`**; **`ProtectedRoute`** checks **`exp`**; **`AdminProtectedRoute`** does not. |
| **Nominal lists** | **§6.4** matches `petrolDataSage.js` constant blocks; **`MISC_INCOME_CODES`**, bank **`1200`–`1251`** documented. |

**Intentional nuances (do not “fix” without product sign-off):**

- **`/profit`** (narrow fuel net) vs **`/profit-by-site`** (broad **`REVENUE_SQL` − `COST_SQL`**) — different definitions (**§3.16** note).
- **`/ebita`** response uses explicit gross + misc − overheads in handler, not a single raw **`EBITA_CODES`** sum — see code vs **§6.4** quick map wording.
- **`fuel-volume-diagnostic`** in-code help text may mention legacy wording; filters use **`FUEL_VOLUME_FROM_DETAILS_CODES`** (**`4000`–`4004`**).

---

*This README is intended as a single deep-dive for reproducing behaviour in Flutter (or any client) while keeping the existing Node + Postgres backend and Sage ETL as sources of truth. If anything disagrees with code, trust the repository and update this file.*
