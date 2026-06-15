import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authAPI } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing token. Open the link from your verification email.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await authAPI.verifyEmailGet(token);
        if (!cancelled) {
          setStatus("ok");
          setMessage(data.message || "Email verified.");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMessage(e.message || "Verification failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
          <CardDescription>
            {status === "loading" && "Confirming your email…"}
            {status === "ok" && "Success"}
            {status === "error" && "Could not verify"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              Go to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
