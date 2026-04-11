import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, ExternalLink } from "lucide-react";
import { usePoolConfig } from "@/hooks/usePoolConfig";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const config = usePoolConfig();

  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnpaid, setShowUnpaid] = useState(false);

  const venmoHandles = config.venmoHandles ?? [];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowUnpaid(false);
    setSigningIn(true);
    const result = await login(email);
    setSigningIn(false);
    if (result.success) {
      navigate("/");
    } else if (result.error === "UNPAID") {
      setShowUnpaid(true);
    } else {
      setError(result.error ?? "Login failed.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center fd-gradient px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          MARCH MADNESS
        </h1>
        <p className="text-primary text-lg font-bold tracking-wide mt-1">SQUARES POOL</p>
      </div>

      <Card className="w-full max-w-sm fd-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <LogIn className="w-4 h-4 text-primary" /> Sign In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/50 border-[hsl(215_30%_20%)] text-foreground rounded-lg"
              autoFocus
              required
            />
            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}
            {showUnpaid && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-foreground font-semibold">
                  Once you pay, you will unlock access.
                </p>
                <a
                  href="https://www.venmo.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: "#008CFF" }}
                >
                  <VenmoLogo />
                  Open Venmo
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {venmoHandles.length > 0 && (
                  <div className="text-left bg-white/[0.03] border border-[hsl(215_30%_16%)] rounded-lg p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Venmo Handles</p>
                    {venmoHandles.map((v) => (
                      <div key={v.name} className="flex items-center justify-between text-xs">
                        <span className="text-foreground">{v.name}</span>
                        <span className="font-mono-display text-primary">{v.handle}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Button type="submit" disabled={signingIn} className="w-full fd-btn-primary text-white font-semibold rounded-lg">
              {signingIn ? "Checking..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link
              to="/signup"
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              New here? Sign up for the pool
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VenmoLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.5 2C20.3 3.4 20.7 4.8 20.7 6.6C20.7 11.4 16.8 17.5 13.6 22H5.8L3.3 3.6L10.1 3L11.3 15.2C13 12.2 15.1 7.8 15.1 5.2C15.1 3.8 14.8 2.8 14.4 2H19.5Z"
        fill="white"
      />
    </svg>
  );
}
