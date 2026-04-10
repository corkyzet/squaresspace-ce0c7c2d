import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          navigate("/login", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center fd-gradient">
      <span className="text-sm text-muted-foreground animate-pulse font-medium">
        Signing you in...
      </span>
    </div>
  );
}
