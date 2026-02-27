# 🖥️ Running the Project - 2 Terminals Setup

## Quick Start

Run the startup script to open both terminals automatically:

```powershell
.\start-all.ps1
```

Or follow the manual steps below.

---

## Terminal 1: Backend Server

```powershell
cd "C:\Users\Gaurav Kumar\OneDrive\Desktop\company\newPetroleum\ui-enhancement-studio\backend"
npm run dev
```

**Status:** ✅ Should show "Server running on port 3001"

**Backend API:** `http://localhost:3001`

---

## Terminal 2: Frontend Server

```powershell
cd "C:\Users\Gaurav Kumar\OneDrive\Desktop\company\newPetroleum\ui-enhancement-studio\frontend"
npm run dev
```

**Status:** ✅ Should show "Local: http://localhost:8080"

**Frontend App:** `http://localhost:8080`

---

## 📋 Quick Copy-Paste Commands

### Terminal 1 (Backend Server):
```powershell
cd "C:\Users\Gaurav Kumar\OneDrive\Desktop\company\newPetroleum\ui-enhancement-studio\backend" && npm run dev
```

### Terminal 2 (Frontend Server):
```powershell
cd "C:\Users\Gaurav Kumar\OneDrive\Desktop\company\newPetroleum\ui-enhancement-studio\frontend" && npm run dev
```

---

## 🌐 Access Your Application

- **Frontend:** `http://localhost:8080`
- **Backend API:** `http://localhost:3001`

Visit `http://localhost:8080` in your browser to access the application!

---

## ⚠️ Important Notes

1. **Keep both terminals open** - Closing any terminal will stop that service
2. **Start in order:** Terminal 1 (Backend) → Terminal 2 (Frontend)
3. **Backend must be running first** - Frontend needs the backend API to work
4. **Default configuration uses localhost** - No additional setup needed!

---

## 🔄 Restart Order (if needed)

1. Stop both terminals (Ctrl+C)
2. Start Terminal 1 (Backend Server)
3. Start Terminal 2 (Frontend Server)

---

## 🔧 Environment Variables

The project uses default localhost URLs. No environment file configuration is needed for local development:

- **Backend:** Uses `FRONTEND_URL=http://localhost:8080` by default
- **Frontend:** Uses `VITE_API_URL=http://localhost:3001` by default

If you need to customize these, you can create:

**`backend/.env`:**
```env
FRONTEND_URL=http://localhost:8080
PORT=3001
NODE_ENV=development
# Add your database configuration here
```

**`frontend/.env.local`:**
```env
VITE_API_URL=http://localhost:3001
```

**Note:** Restart servers after updating environment files.

---

## 🐛 Troubleshooting

### Backend won't start
- Check that your database connection in `backend/.env` is correct
- Verify PostgreSQL is accessible
- Check that port 3001 is not in use

### Frontend won't start
- Make sure backend is running first
- Check that port 8080 is not in use
- Try `npm install` again if there are dependency errors

### Can't connect to backend
- Verify backend is running on port 3001
- Check browser console (F12) for errors
- Ensure CORS is properly configured in backend

---

## 📝 Project Structure

```
ui-enhancement-studio/
├── backend/          # Backend server (port 3001)
├── frontend/         # Frontend app (port 8080)
└── start-all.ps1    # Startup script
```
