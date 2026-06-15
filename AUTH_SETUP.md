# Dashboard authentication

## 1. Database migration

From `HSRL_ui/backend`:

```bash
npm run migrate-auth
```

Creates `dashboard_admins`, `dashboard_users`, and `auth_tokens`.

**Push admin from `.env` into the database** (any time you change `ADMIN_USERNAME` / `ADMIN_PASSWORD`):

```bash
cd HSRL_ui/backend
npm run sync-admin
```

This hashes the password with bcrypt and **updates** the row if that username already exists, or **inserts** if needed. Same as what runs automatically when the API server starts — useful without restarting the server or for scripts/CI.

## 2. Environment

Copy `backend/.env.example` into `backend/.env` and set at least:

- `JWT_SECRET` — long random string (32+ characters).
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — admin sign-in for `/admin/login`.  
  On **every backend start**: if a row with that **username** already exists, its **password hash is updated** from `ADMIN_PASSWORD` (so changing `.env` and restarting fixes login).  
  If no row has that username yet, a new admin row is inserted (even when other admins already exist).  
  Legacy: `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` if `ADMIN_*` are not set.
- `FRONTEND_URL` — must match the Vite dev server URL (no trailing slash), e.g. `http://localhost:8080` or `http://localhost:9090`, so links in emails open your app.

**Email verification before login:** **On by default.** Admin-created users cannot sign in at `/login` until they open the verification link (or use the dev link from the admin UI). To allow login without verification (local dev only), set `AUTH_REQUIRE_EMAIL_VERIFIED=0` in `backend/.env`.

### Email (verification + password reset)

**Without real SMTP, no email is delivered.** The API still creates users/tokens; in **development** (`NODE_ENV` not `production`) the JSON response can include `verificationUrl` so you can copy the link from the admin UI toast.

Add to `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=your.address@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your.address@gmail.com
```

**Gmail:** use a [Google App Password](https://support.google.com/accounts/answer/185833) (2FA must be on). Normal Gmail passwords usually fail.

**Other providers:** use their SMTP host/port (e.g. SendGrid, Outlook `smtp-mail.outlook.com`).

`EMAIL_DEV_RETURN_LINK=1` — include `verificationUrl` in API responses even in production (debug only; remove afterward).

### Cloudflare quick tunnel (`trycloudflare.com`)

Each time you run `cloudflared tunnel --url http://localhost:8080`, you get a **new** HTTPS URL. Put that URL in **`backend/.env`** so verification/reset **emails** and dev links open the app on the public URL (not `localhost`):

```env
# Public URL of your Vite app (no trailing slash)
FRONTEND_URL=https://YOUR-FRONTEND-SUBDOMAIN.trycloudflare.com

# Optional: same URL — adds it explicitly to CORS (dev already allows any *.trycloudflare.com)
DEV_TUNNEL_HOST=https://YOUR-FRONTEND-SUBDOMAIN.trycloudflare.com
```

Restart the **backend** after changing `.env`.

**Sharing the API over the tunnel (phone / another PC):** `localhost:2000` in the browser only works on your machine. Run a **second** tunnel to the API and point the frontend at it:

```bash
cloudflared tunnel --url http://localhost:2000
```

Create `HSRL_ui/frontend/.env.local`:

```env
VITE_API_URL=https://YOUR-BACKEND-SUBDOMAIN.trycloudflare.com
```

Restart the **frontend** dev server. Quick-tunnel URLs change on every run — update `FRONTEND_URL`, `DEV_TUNNEL_HOST`, and `VITE_API_URL` when they do.

**“CORS” error on login but backend is fine:** Often the **API tunnel URL is wrong or stopped**. The browser may still call an **old** `VITE_API_URL` (from before you edited `frontend/.env`) until you **restart the frontend dev server** — Vite bakes `VITE_API_URL` at startup. If the tunnel is dead, Cloudflare returns an error page **without** `Access-Control-Allow-Origin`, so Chrome reports a CORS failure. Fix: run `cloudflared tunnel --url http://localhost:2000`, copy the new URL into `frontend/.env`, restart `npm run dev`, hard-refresh the app (`Ctrl+Shift+R`). Use **no spaces** around `=` in `.env` (e.g. `FRONTEND_URL=https://...` not `FRONTEND_URL= https://...`).

## 3. Run

**Both apps at once** (from `HSRL_ui/`):

```bash
cd HSRL_ui
npm install
npm run dev
```

This runs **backend** and **frontend** together. Both use **nodemon** where it helps:

- **Backend** (`HSRL_ui/backend`): auto-restarts when `server.js`, `routes/`, `config/`, `middleware/`, `lib/`, etc. change (`nodemon.json`).
- **Frontend** (`HSRL_ui/frontend`): **Vite** handles hot reload for `src/`; **nodemon** restarts the Vite process when `vite.config.mjs`, Tailwind/PostCSS config, or `index.html` change. To run plain Vite only: `npm run dev:vite` inside `frontend/`.

Separate terminals:

- Backend: `cd HSRL_ui/backend && npm run dev`
- Frontend: `cd HSRL_ui/frontend && npm run dev` (set `VITE_API_URL` if the API is not `http://localhost:2000`)

Production backend: `npm start` (no nodemon).

## 4. URLs

| URL | Purpose |
|-----|--------|
| `/login` | Dashboard user sign-in |
| `/forgot-password` | Request password reset email |
| `/reset-password?token=...` | Set new password from email |
| `/verify-email?token=...` | Confirm email |
| `/admin/login` | Admin sign-in |
| `/admin` | Create/delete users, resend verification, **Verify** (admin marks email verified without link). **View dashboard** opens the main app using the same admin session (no separate user login). |

Admin can **create** and **delete** users only. Users change passwords **only** via the email reset flow.
