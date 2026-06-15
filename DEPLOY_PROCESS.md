# HSRL Dashboard — Deploy & Operations Guide

**Single reference for all deployment, redeploy, and operations tasks.**

---

## Table of Contents

1. [Quick Deploy (one command)](#1-quick-deploy-one-command)
2. [How it works](#2-how-it-works)
3. [Prerequisites](#3-prerequisites)
4. [Environment variables](#4-environment-variables)
5. [deploy.ps1 reference](#5-deployps1-reference)
6. [Redeploy / update](#6-redeploy--update)
7. [Firewall & port setup](#7-firewall--port-setup)
8. [Troubleshooting](#8-troubleshooting)
9. [Docker commands on server](#9-docker-commands-on-server)
10. [Production checklist](#10-production-checklist)

---

## 1. Quick Deploy (one command)

From the repo root in **PowerShell**:

```powershell
.\deploy.ps1
```

When done, open: `http://103.72.170.138:9000`

---

## 2. How it works

```
Your PC (Windows)
  └── deploy.ps1
        ├── Reads backend\.env for DEPLOY_* credentials
        ├── Uploads project files via SCP (pscp)
        │     ├── Dockerfile, nginx.conf, supervisord.conf, docker-compose.yml
        │     ├── backend/ (skips node_modules, exports, test)
        │     └── frontend/ (skips node_modules, dist)
        └── SSH into server (plink)
              ├── docker compose build --no-cache
              └── docker compose up -d
```

**Inside Docker (single container):**

```
Port 8080 (nginx)
  ├── /api/*  → proxy → Node.js backend (port 2000)
  └── /*      → React frontend (static files from Vite build)
```

**Stack:**
- Frontend: React + Vite → built to static files → served by nginx
- Backend: Node.js (Express) → port 2000 inside container
- Database: PostgreSQL on `164.52.192.205` (external, not in Docker)
- Container manager: nginx + supervisord (both run in one container)

---

## 3. Prerequisites

### On your PC (Windows)

- **PuTTY** installed with `plink.exe` and `pscp.exe` on PATH
  - Download: https://www.putty.org/
  - Or add to PATH: `C:\Program Files\PuTTY\`
- **PowerShell** (built-in on Windows)
- Repo cloned with `backend\.env` configured

### On the server (Linux — already set up)

- Ubuntu 20.04
- Docker Engine + Docker Compose v2 (installed via deploy process)
- User `dbadmin` in `docker` group
- Port `9000` open in firewall

---

## 4. Environment variables

All variables live in `backend\.env`. **Never commit this file.**

### Deploy variables (used by deploy.ps1)

| Variable | Value | Description |
|----------|-------|-------------|
| `DEPLOY_HOST` | `103.72.170.138` | Server IP |
| `DEPLOY_PORT` | `9000` | HTTP port (browser port) |
| `DEPLOY_SSH_PORT` | `2025` | SSH port |
| `DEPLOY_USERNAME` | `dbadmin` | Linux SSH user |
| `DEPLOY_PASSWORD` | `...` | SSH password |

### App variables (used at runtime inside Docker)

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Auth token signing key (keep secret, 32+ chars) |
| `JWT_EXPIRES_IN` | Token expiry e.g. `7d` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Admin login credentials |
| `FRONTEND_URL` | Public URL users open (no trailing slash) |
| `DEV_TUNNEL_HOST` | Cloudflare tunnel URL (update when tunnel restarts) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email for verification/reset |
| `PORT` | Backend port inside container (default `2000`) |
| `NODE_ENV` | `production` for live server |

> **Important:** Update `FRONTEND_URL` and `DEV_TUNNEL_HOST` in `.env` every time the Cloudflare tunnel URL changes. Then run `.\deploy.ps1 -EnvOnly` to apply.

---

## 5. deploy.ps1 reference

### Parameters

| Parameter | Description |
|-----------|-------------|
| _(none)_ | Full deploy: upload files + build Docker image + start container |
| `-SkipDocker` | Upload files only, do not run docker compose |
| `-EnvOnly` | Upload `.env` only and restart container (no rebuild needed) |

### Examples

```powershell
# Full fresh deploy
.\deploy.ps1

# Files only (no docker build)
.\deploy.ps1 -SkipDocker

# Update .env and restart (e.g. new Cloudflare tunnel URL)
.\deploy.ps1 -EnvOnly
```

---

## 6. Redeploy / update

### Code changed (frontend or backend)

```powershell
.\deploy.ps1
```

### Only .env changed (e.g. new tunnel URL, new password)

```powershell
.\deploy.ps1 -EnvOnly
```

### From the server directly (if files already there)

```bash
cd ~/hsrl_ui
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs --tail 50
```

---

## 7. Firewall & port setup

### Check open ports on server

```bash
ss -tlnp | grep 9000
sudo ufw status
```

### Open port if needed

```bash
sudo ufw allow 9000/tcp
sudo ufw reload
```

### Verify from server

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9000/
```

### Verify from your PC

```powershell
Test-NetConnection 103.72.170.138 -Port 9000
```

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ERR_CONNECTION_REFUSED` in browser | Container not running or port blocked | `sudo docker compose ps`, check firewall |
| Container keeps restarting | App crash on startup | `sudo docker compose logs --tail 100` |
| `plink: command not found` | PuTTY not on PATH | Add PuTTY folder to Windows PATH |
| `Cannot confirm host key` | First SSH connection | Already handled — hostkey is hardcoded in script |
| White screen / 404 on frontend | nginx not serving static files | Check Docker build completed, `sudo docker compose logs` |
| API calls failing (401) | JWT_SECRET missing or wrong | Check `backend/.env` has `JWT_SECRET`, run `.\deploy.ps1 -EnvOnly` |
| DB connection error | Wrong DB_HOST or firewall | Verify `DB_HOST=164.52.192.205` is reachable from server |
| `FRONTEND_URL` mismatch | Cloudflare tunnel URL changed | Update `.env` → `.\deploy.ps1 -EnvOnly` |

### Useful log commands on server

```bash
# All container logs
sudo docker compose logs --tail 100

# Follow live logs
sudo docker compose logs -f

# Check running containers
sudo docker compose ps

# Check nginx inside container
sudo docker exec hsrl-dashboard nginx -t
```

---

## 9. Docker commands on server

```bash
# Start
sudo docker compose up -d

# Stop
sudo docker compose down

# Rebuild from scratch
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d

# Restart without rebuild (e.g. after .env change)
sudo docker compose up -d --force-recreate

# View logs
sudo docker compose logs --tail 50
sudo docker compose logs -f

# Check status
sudo docker compose ps

# Remove old images (free disk space)
sudo docker image prune -f
```

---

## 10. Production checklist

- [ ] `NODE_ENV=production` in `backend/.env`
- [ ] `JWT_SECRET` is long and random (32+ chars)
- [ ] `ADMIN_PASSWORD` changed from default
- [ ] `FRONTEND_URL` matches actual public URL
- [ ] `backend/.env` not committed to git
- [ ] Port `9000` open in server firewall
- [ ] Database (`164.52.192.205`) accessible from server `103.72.170.138`
- [ ] SMTP credentials working (test password reset email)

---

*Update this file when deploy steps or server details change.*
