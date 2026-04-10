import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, QrCode, CheckCircle2, Loader2 } from "lucide-react";

export function TwoFactorSetup() {
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "done">("idle");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("setup-totp");
    setLoading(false);

    if (error || !data?.secret) {
      toast.error(error?.message ?? "Failed to set up 2FA.");
      return;
    }

    setSecret(data.secret);
    setOtpauthUrl(data.otpauth_url);
    setStep("setup");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("verify-totp", {
      body: { code },
    });
    setLoading(false);

    if (error || !data?.valid) {
      toast.error("Invalid code. Please try again.");
      setCode("");
      return;
    }

    toast.success("2FA enabled successfully!");
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle2 className="w-12 h-12 text-accent" />
        <h3 className="text-sm font-bold text-foreground">2FA is Enabled</h3>
        <p className="text-xs text-muted-foreground text-center max-w-sm">
          Your authenticator app is linked. You'll be prompted for a code
          when initiating Venmo API transactions.
        </p>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="space-y-6 max-w-sm mx-auto py-4">
        <div className="text-center space-y-2">
          <QrCode className="w-8 h-8 text-primary mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Scan with Authenticator App</h3>
          <p className="text-xs text-muted-foreground">
            Open Google Authenticator, Authy, or any TOTP app and scan the QR code,
            or enter the secret manually.
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 flex items-center justify-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`}
            alt="2FA QR Code"
            className="w-48 h-48"
          />
        </div>

        <div className="bg-white/[0.03] border border-[hsl(215_30%_16%)] rounded-lg p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Manual entry secret
          </p>
          <code className="text-xs text-primary break-all select-all">{secret}</code>
        </div>

        <form onSubmit={handleVerify} className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground block">
            Enter the 6-digit code from your app to confirm
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="bg-background/50 border-[hsl(215_30%_20%)] text-foreground rounded-lg text-center text-lg tracking-[0.3em] font-mono"
            autoFocus
          />
          <Button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full fd-btn-primary text-white font-semibold rounded-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Enable"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <ShieldCheck className="w-10 h-10 text-muted-foreground" />
      <h3 className="text-sm font-bold text-foreground">Two-Factor Authentication</h3>
      <p className="text-xs text-muted-foreground text-center max-w-sm">
        Set up 2FA to secure Venmo API transactions. You'll use an authenticator
        app (Google Authenticator, Authy, etc.) to generate verification codes.
      </p>
      <Button
        onClick={handleSetup}
        disabled={loading}
        className="fd-btn-primary text-white font-semibold rounded-lg gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        Set Up 2FA
      </Button>
    </div>
  );
}
