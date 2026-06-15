# Cloudflare quick tunnels for HSRL UI

Use this when you want to open the app from another phone/PC via `*.trycloudflare.com`.

## Prerequisites

1. **Install `cloudflared`** (Cloudflare Tunnel CLI):  
   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

2. From repo root, install and run the app as usual:
   ```powershell
   cd HSRL_ui
   npm install
   npm run dev
   ```
   Wait until:
   - Backend listens on **http://localhost:2000**
   - Frontend (Vite) on **http://localhost:8080** (or another port if 8080 is busy)

## Scripts (Windows)

| Script | What it does |
|--------|----------------|
| `start-tunnels.ps1` | Opens **two** new windows: tunnel to **8080** (frontend) and **2000** (API). |
| `start-all.ps1` | Opens **three** windows: `npm run dev` + both tunnels (optional one-shot). |

Run from **any** directory:

```powershell
powershell -ExecutionPolicy Bypass -File "c:\path\to\HSRL_ui\scripts\cloudflare\start-tunnels.ps1"
```

Or `cd` into `HSRL_ui\scripts\cloudflare` and run:

```powershell
.\start-tunnels.ps1
```

## After tunnels start

1. Copy the **frontend** URL from the `8080` window → set in `backend/.env`:
   - `FRONTEND_URL=https://....trycloudflare.com`
   - `DEV_TUNNEL_HOST` same (optional)

2. Copy the **backend** URL from the `2000` window → set in `frontend/.env`:
   - `VITE_API_URL=https://....trycloudflare.com`

3. **Restart** `npm run dev` so Vite picks up `VITE_API_URL`.

Quick tunnel URLs **change every time** you restart `cloudflared` — update `.env` again.

## Notes

- Free quick tunnels have no uptime guarantee.
- If login shows CORS / failed fetch, the API tunnel URL is wrong, stopped, or frontend wasn’t restarted after editing `VITE_API_URL`.
