import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, CheckCircle2, ExternalLink } from "lucide-react";

const VENMO_HANDLES = [
  { name: "Corey", value: "corey", handle: "@corey-zettler" },
  { name: "Joe", value: "joe", handle: "@joe-liebeskind" },
  { name: "Coop", value: "coop", handle: "@David-Cooper-1" },
];

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [boxes, setBoxes] = useState("1");
  const [whoPay, setWhoPay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.toLowerCase().trim();
    const boxCount = parseInt(boxes, 10);

    if (!trimmedName || !trimmedEmail || !whoPay) {
      setError("All fields are required.");
      return;
    }

    setSubmitting(true);

    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (!activeSeason) {
      setError("No active season found. Contact the admin.");
      setSubmitting(false);
      return;
    }

    const { data: currentEntrants } = await supabase
      .from("entrants")
      .select("boxes_requested")
      .eq("season_id", activeSeason.id);

    const totalBoxes = (currentEntrants ?? []).reduce((sum, e) => sum + e.boxes_requested, 0);
    if (totalBoxes + boxCount > 100) {
      setError(`Only ${100 - totalBoxes} boxes remain. Please adjust your request.`);
      setSubmitting(false);
      return;
    }

    const { error: insertErr } = await supabase.from("entrants").insert({
      season_id: activeSeason.id,
      name: trimmedName,
      email: trimmedEmail,
      boxes_requested: boxCount,
      who_will_pay: whoPay,
    });

    setSubmitting(false);

    if (insertErr) {
      if (insertErr.code === "23505") {
        setError("This email is already registered for the current season.");
      } else {
        setError("Signup failed: " + insertErr.message);
      }
      return;
    }

    setSuccess(true);
    toast.success("You're signed up!");
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center fd-gradient px-4">
        <Card className="w-full max-w-md fd-card text-center">
          <CardContent className="pt-8 pb-8 space-y-5">
            <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
            <h2 className="text-xl font-extrabold text-foreground">You're In!</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your submission was successful, but you are <span className="text-foreground font-semibold">not locked in until you submit payment</span>.
              Send your entry fee via Venmo to complete your registration.
            </p>

            <a
              href="https://www.venmo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#008CFF" }}
            >
              <VenmoLogo />
              Open Venmo
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="text-left bg-white/[0.03] border border-[hsl(215_30%_16%)] rounded-lg p-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Venmo Handles</p>
              {VENMO_HANDLES.map((v) => (
                <div key={v.value} className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{v.name}</span>
                  <span className="font-mono-display text-primary">{v.handle}</span>
                </div>
              ))}
            </div>

            <Link
              to="/login"
              className="inline-block text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Already paid? Sign in here
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center fd-gradient px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          MARCH MADNESS
        </h1>
        <p className="text-primary text-lg font-bold tracking-wide mt-1">SQUARES POOL</p>
      </div>

      <Card className="w-full max-w-md fd-card">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Sign Up for the Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <Input
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background/50 border-[hsl(215_30%_20%)] text-foreground rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-[hsl(215_30%_20%)] text-foreground rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                How many boxes? (max 3) — $100 per box
              </label>
              <Select value={boxes} onValueChange={setBoxes}>
                <SelectTrigger className="bg-background/50 border-[hsl(215_30%_20%)] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 box — $100</SelectItem>
                  <SelectItem value="2">2 boxes — $200</SelectItem>
                  <SelectItem value="3">3 boxes — $300</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Who will you pay?
              </label>
              <Select value={whoPay} onValueChange={setWhoPay}>
                <SelectTrigger className="bg-background/50 border-[hsl(215_30%_20%)] rounded-lg">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {VENMO_HANDLES.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-white/[0.03] border border-[hsl(215_30%_16%)] rounded-lg p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Venmo Handles</p>
              {VENMO_HANDLES.map((v) => (
                <div key={v.value} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{v.name}</span>
                  <span className="font-mono-display text-primary">{v.handle}</span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full fd-btn-primary text-white font-semibold rounded-lg">
              {submitting ? "Submitting..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              Already registered? Sign in
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
