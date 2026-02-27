# 🚀 Quick Start - Deploy to Nginx

## What You Have Now

I've created a complete deployment setup for your Petroleum Dashboard. Here's what's included:

### 📁 Files Created

1. **`nginx.conf`** - Complete nginx configuration
2. **`setup-server.sh`** - Server setup script (installs dependencies)
3. **`deploy-to-server.sh`** - Complete deployment automation
4. **`backend/petroleum-backend.service`** - Systemd service file
5. **`backend/.env.example`** - Environment template
6. **`DEPLOYMENT.md`** - Detailed manual guide
7. **`QUICK_DEPLOY.md`** - Quick reference
8. **`README_DEPLOYMENT.md`** - Complete deployment docs

## 🎯 Two-Step Deployment

### Step 1: Initial Server Setup (One Time)

On your Ubuntu/Debian server:

```bash
# Upload your project to the server, then:
cd /path/to/ui-enhancement-studio

# Make scripts executable
chmod +x setup-server.sh deploy-to-server.sh

# Run server setup (installs Node.js, nginx, PM2, etc.)
sudo ./setup-server.sh
```

### Step 2: Deploy Application

```bash
# Run deployment script (builds, copies files, configures nginx)
./deploy-to-server.sh
```

That's it! Your application will be live.

## 📋 What the Scripts Do

### `setup-server.sh`
- ✅ Updates system packages
- ✅ Installs Node.js 18+
- ✅ Installs nginx
- ✅ Installs PostgreSQL (optional)
- ✅ Installs PM2
- ✅ Configures firewall
- ✅ Creates application directory

### `deploy-to-server.sh`
- ✅ Builds frontend for production
- ✅ Creates `.env.production` with API URL
- ✅ Copies frontend build to `/var/www/petroleum-dashboard/frontend`
- ✅ Copies backend to `/var/www/petroleum-dashboard/backend`
- ✅ Installs backend dependencies
- ✅ Configures nginx (updates domain, paths)
- ✅ Sets up systemd service
- ✅ Starts backend with PM2
- ✅ Reloads nginx
- ✅ Runs health checks

## 🔧 Manual Configuration Needed

After deployment, you need to:

1. **Configure Database** (in `/var/www/petroleum-dashboard/backend/.env`):
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   PORT=3001
   NODE_ENV=production
   ```

2. **Test Database Connection**:
   ```bash
   cd /var/www/petroleum-dashboard/backend
   npm run test-db
   ```

3. **Update Domain in Nginx** (if needed):
   ```bash
   sudo nano /etc/nginx/sites-available/petroleum-dashboard
   # Change server_name to your domain
   sudo nginx -t && sudo systemctl reload nginx
   ```

## 🌐 Access Your Application

- **Frontend**: `http://your-server-ip` or `http://your-domain.com`
- **API**: `http://your-server-ip/api` or `http://your-domain.com/api`

## 📊 Check Status

```bash
# Nginx status
sudo systemctl status nginx

# Backend status (PM2)
pm2 status
pm2 logs petroleum-backend

# Backend status (systemd)
sudo systemctl status petroleum-backend
sudo journalctl -u petroleum-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/petroleum-dashboard-error.log
```

## 🔒 Add SSL (HTTPS)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔄 Update Application

```bash
# 1. Pull latest code
git pull  # or upload new files

# 2. Rebuild frontend
cd frontend
npm run build

# 3. Copy new build
sudo cp -r dist/* /var/www/petroleum-dashboard/frontend/

# 4. Restart backend
pm2 restart petroleum-backend

# 5. Reload nginx
sudo systemctl reload nginx
```

## ❓ Troubleshooting

### Backend not starting?
```bash
# Check logs
pm2 logs petroleum-backend

# Check .env file
cat /var/www/petroleum-dashboard/backend/.env

# Test database
cd /var/www/petroleum-dashboard/backend
npm run test-db
```

### Frontend not loading?
```bash
# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check files exist
ls -la /var/www/petroleum-dashboard/frontend/
```

### 502 Bad Gateway?
- Backend not running: `pm2 status`
- Check backend logs: `pm2 logs petroleum-backend`
- Verify port 3001 is accessible

## 📚 More Documentation

- **Detailed Guide**: See `DEPLOYMENT.md`
- **Quick Reference**: See `QUICK_DEPLOY.md`
- **Complete Docs**: See `README_DEPLOYMENT.md`

## ✅ Deployment Checklist

- [ ] Server has Node.js 18+ installed
- [ ] Server has nginx installed
- [ ] PostgreSQL database is set up
- [ ] Database credentials are ready
- [ ] Domain/IP address is known
- [ ] Firewall allows ports 80, 443, 3001
- [ ] Run `setup-server.sh` (first time)
- [ ] Run `deploy-to-server.sh`
- [ ] Configure `.env` file with database credentials
- [ ] Test database connection
- [ ] Verify application loads in browser
- [ ] Set up SSL certificate (optional but recommended)

---

**Ready to deploy?** Run the two scripts above and you're done! 🎉

