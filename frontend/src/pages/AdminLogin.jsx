import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { adminAuthAPI, adminProfileAPI, ADMIN_TOKEN_KEY } from "@/services/api";
import { AuthSignInShell } from "@/components/auth/AuthSignInChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const ADMIN_PROFILE_KEY = "hsrl_admin_profile";

const cardClass =
  "w-full rounded-2xl border border-border bg-card text-card-foreground shadow-lg shadow-black/[0.06]";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminAuthAPI.login(username.trim(), password);
      if (res?.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
        try {
          const profile = await adminProfileAPI.getMe();
          if (profile?.data) localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(profile.data));
        } catch {}
        toast.success("Signed in as admin");
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error(err.message || "Admin sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSignInShell>
      <Card className={cardClass}>
        <CardHeader className="space-y-2 px-6 pb-2 pt-6 sm:px-8">
          <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Admin sign in</CardTitle>
          <CardDescription className="text-sm">
            Manage dashboard users (create / delete).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-8 pt-2 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Admin username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-blue-600 text-base font-semibold text-white hover:bg-blue-700"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="bg-card px-3">OR</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-11 w-full border-primary/40 bg-background text-base font-semibold text-primary hover:bg-primary/5"
              asChild
            >
              <Link to="/login">Dashboard user sign in</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthSignInShell>
  );
};

export default AdminLogin;
