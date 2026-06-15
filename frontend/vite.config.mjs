import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { componentTagger } from "lovable-tagger";

// Recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Read a key from backend/.env (loadEnv often skips sibling folders). */
function readBackendEnvValue(key) {
  const envPath = path.resolve(__dirname, "../backend/.env");
  try {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, "i"));
      if (!m) continue;
      let v = m[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return v;
    }
  } catch {
    /* no file */
  }
  return "";
}

function readDevTunnelHostFromBackendEnv() {
  return readBackendEnvValue("DEV_TUNNEL_HOST");
}

/** Hostnames for Cloudflare tunnel. Set DEV_TUNNEL_HOST in HSRL_ui/backend/.env. Restart dev server after changes. */
function parseTunnelHosts(raw) {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((s) => {
      const t = s.trim();
      if (!t) return null;
      try {
        if (/^https?:\/\//i.test(t)) return new URL(t).hostname;
        return t.replace(/^\/\//, "").split("/")[0].split(":")[0].trim() || null;
      } catch {
        return t;
      }
    })
    .filter(Boolean);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envFrontend = loadEnv(mode, path.resolve(__dirname, "."), "");
  const rawTunnel =
    process.env.DEV_TUNNEL_HOST ||
    readDevTunnelHostFromBackendEnv() ||
    envFrontend.DEV_TUNNEL_HOST ||
    envFrontend.VITE_DEV_TUNNEL_HOST ||
    "";
  const darkModeToggleFlag = (
    readBackendEnvValue("DARK_MODE_TOGGLE") ||
    envFrontend.VITE_DARK_MODE_TOGGLE ||
    "true"
  ).toLowerCase() !== "false";
  const tunnelHosts = parseTunnelHosts(rawTunnel);

  // ".trycloudflare.com" → Vite allows any subdomain (Quick Tunnel URL changes each run)
  const allowedHosts = [".trycloudflare.com", ...tunnelHosts];
  const uniqueHosts = [...new Set(allowedHosts)];

  /** Dev-only: same-origin /api → backend (fixes mobile + Cloudflare tunnel "Failed to fetch"). */
  const apiProxy = {
    "/api": {
      target: "http://127.0.0.1:2000",
      changeOrigin: true,
    },
  };

  return {
  define: {
    /** Initial client default before GET /api/ui-config (Docker build has no backend/.env in context). */
    "import.meta.env.VITE_DARK_MODE_TOGGLE": JSON.stringify(String(darkModeToggleFlag)),
  },
  server: {
    host: "0.0.0.0", // Allow access from network (for sharing localhost)
    port: 8080,
    strictPort: true,
    allowedHosts: uniqueHosts,
    proxy: apiProxy,
    headers: {
      // Ensure .apk files are served with the correct MIME type so browsers don't rename them to .zip
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "apk-mime",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith(".apk")) {
            res.setHeader("Content-Type", "application/vnd.android.package-archive");
            res.setHeader("Content-Disposition", `attachment; filename="${req.url.split("/").pop()}"`);
          }
          next();
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});



