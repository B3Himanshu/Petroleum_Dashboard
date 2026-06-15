import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/services/api";
import { AuthSignInShell } from "@/components/auth/AuthSignInChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const cardClass =
  "w-full rounded-2xl border border-border bg-card text-card-foreground shadow-lg shadow-black/[0.06]";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Signed in");
      navigate(from, { replace: true });
    } catch (err) {
      let msg =
        err?.message ||
        (typeof err === "string" ? err : "Sign in failed. Check email and password.");

      if (err?.status === 403) {
        msg = err.message || msg;
      } else if (err?.status === 401) {
        try {
          const st = await authAPI.status();
          if (!st.success) {
            msg = st.message || msg;
          } else if (st.dashboardUserCount === 0) {
            msg =
              "No dashboard users exist yet. Sign in at Admin login → open Users → Create user with this email and password, then try again here.";
          } else {
            msg = `${msg} This page needs the dashboard user’s email (the one an admin created), not the admin username. Check spelling or use Forgot password.`;
          }
        } catch (e2) {
          if (e2?.status === 503 && e2?.message) msg = e2.message;
        }
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSignInShell>
      <Card className={cardClass}>
        <CardHeader className="space-y-2 px-6 pb-2 pt-6 sm:px-8">
          <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">
            Sign in to your account
          </CardTitle>
          <CardDescription className="text-sm">
            Use the credentials provided by your administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-6 pb-8 pt-2 sm:px-8">
          {error ? (
            <Alert variant="destructive" className="mb-0">
              <AlertTitle>Could not sign in</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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
              <Link to="/admin/login">Admin login</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthSignInShell>
  );
};

export default Login;
