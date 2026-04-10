import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    const result = await login(email);
    setSigningIn(false);
    if (result.success) {
      navigate("/");
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
