# 🧹 Tunnel Tools Cleanup Guide

This guide helps you remove any globally installed tunnel tools from your system.

## 🔍 Check What's Installed

### Check for LocalTunnel (npm global)
```powershell
npm list -g localtunnel
```

### Check for Cloudflared
```powershell
# Windows
Get-Command cloudflared -ErrorAction SilentlyContinue

# Or check if it's installed via winget
winget list Cloudflare.cloudflared
```

## 🗑️ Uninstall Instructions

### Uninstall LocalTunnel (if installed globally)

**PowerShell:**
```powershell
npm uninstall -g localtunnel
```

**Verify removal:**
```powershell
npm list -g localtunnel
# Should show: empty
```

### Uninstall Cloudflared (if installed)

**Windows (via winget):**
```powershell
winget uninstall Cloudflare.cloudflared
```

**Or manually remove:**
1. Check installation location:
   ```powershell
   Get-ChildItem -Path "$env:ProgramFiles\Cloudflare" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue
   ```
2. If found, you can manually delete the Cloudflare folder or use:
   ```powershell
   Remove-Item -Path "$env:ProgramFiles\Cloudflare" -Recurse -Force -ErrorAction SilentlyContinue
   ```

3. Remove from PATH (if manually added):
   - Open System Properties → Environment Variables
   - Edit "Path" in User variables
   - Remove any Cloudflare-related paths
   - Restart PowerShell

**Verify removal:**
```powershell
Get-Command cloudflared -ErrorAction SilentlyContinue
# Should return nothing
```

## ✅ Verification

After cleanup, verify nothing is installed:

```powershell
# Check LocalTunnel
npm list -g localtunnel

# Check Cloudflared
Get-Command cloudflared -ErrorAction SilentlyContinue
winget list Cloudflare.cloudflared
```

## 📝 Note

- These tools were only used for exposing local servers to the internet
- They are not required for local development
- Your project works perfectly fine without them using `http://localhost:3001` (backend) and `http://localhost:8080` (frontend)
