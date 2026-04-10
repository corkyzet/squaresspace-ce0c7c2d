import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X, Loader2 } from "lucide-react";

interface TotpVerifyModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
}

export function TotpVerifyModal({ open, onClose, onVerified, title }: TotpVerifyModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Enter a 6-digit code.");
      return;
    }

    setLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke("verify-totp", {
      body: { code },
    });
    setLoading(false);

    if (fnError || !data?.valid) {
      setError("Invalid code. Please try again.");
      setCode("");
      return;
    }

    onVerified();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[hsl(220_35%_8%)] border border-[hsl(215_30%_16%)] rounded-xl p-6 w-full max-w-xs shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              {title ?? "Verify 2FA"}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
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
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full fd-btn-primary text-white font-semibold rounded-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </Button>
        </form>
      </div>
    </div>
  );
}
