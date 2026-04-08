import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Sign-in state
  const [email, setEmail] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign-up state
  const [showSignup, setShowSignup] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupBoxes, setSignupBoxes] = useState("1");
  const [signingUp, setSigningUp] = useState(false);

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    const name = signupName.trim();
    const em = signupEmail.toLowerCase().trim();
    const boxes = parseInt(signupBoxes, 10);

    if (!name || !em) {
      toast.error("Name and email are required.");
      return;
    }

    setSigningUp(true);

    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (!activeSeason) {
      toast.error("No active season found. Contact the admin.");
      setSigningUp(false);
      return;
    }

    const { error: insertErr } = await supabase.from("entrants").insert({
      season_id: activeSeason.id,
      name,
      email: em,
      boxes_requested: boxes,
    });

    setSigningUp(false);

    if (insertErr) {
      if (insertErr.code === "23505") {
        toast.error("This email is already registered for the current season.");
      } else {
        toast.error("Signup failed: " + insertErr.message);
      }
      return;
    }

    toast.success("You're signed up! You can now sign in with your email.");
    setShowSignup(false);
    setEmail(em);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <h1 className="font-mono-display text-2xl font-bold text-foreground tracking-tight mb-8">
        MARCH MADNESS <span className="text-primary">SQUARES</span>
      </h1>

      {!showSignup ? (
        <Card className="w-full max-w-sm bg-card border-foreground/10">
          <CardHeader>
            <CardTitle className="font-mono-display text-base flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background border-foreground/10 text-foreground"
                autoFocus
                required
              />
              {error && (
                <p className="text-xs text-destructive font-mono-display">{error}</p>
              )}
              <Button type="submit" disabled={signingIn} className="w-full">
                {signingIn ? "Checking..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSignup(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono-display underline underline-offset-4"
              >
                New here? Sign up for the pool
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-sm bg-card border-foreground/10">
          <CardHeader>
            <CardTitle className="font-mono-display text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Sign Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                placeholder="Your name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                className="bg-background border-foreground/10 text-foreground"
                autoFocus
                required
              />
              <Input
                type="email"
                placeholder="Your email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="bg-background border-foreground/10 text-foreground"
                required
              />
              <div>
                <label className="text-xs font-mono-display text-muted-foreground mb-1 block">
                  How many boxes? (max 3)
                </label>
                <Select value={signupBoxes} onValueChange={setSignupBoxes}>
                  <SelectTrigger className="bg-background border-foreground/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 box</SelectItem>
                    <SelectItem value="2">2 boxes</SelectItem>
                    <SelectItem value="3">3 boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={signingUp} className="w-full">
                {signingUp ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSignup(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono-display underline underline-offset-4"
              >
                Already registered? Sign in
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
