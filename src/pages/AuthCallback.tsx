import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    async function handle() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      // Check for errors in hash (Supabase puts them there on failure)
      const hashError = url.hash.match(/error_description=([^&]*)/)?.[1]?.replace(/\+/g, " ");
      if (hashError) {
        setMessage(decodeURIComponent(hashError));
        setTimeout(() => navigate("/login", { replace: true }), 2500);
        return;
      }

      // PKCE flow: exchange code for session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          setTimeout(() => navigate("/login", { replace: true }), 2500);
          return;
        }
        navigate("/", { replace: true });
        return;
      }

      // Hash-based flow (implicit grant or email confirmation):
      // The Supabase client auto-processes tokens from the URL hash
      // during initialization. Wait for the session to settle.
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearInterval(poll);
          navigate("/", { replace: true });
        } else if (attempts > 10) {
          clearInterval(poll);
          navigate("/login", { replace: true });
        }
      }, 500);
    }

    handle();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center fd-gradient gap-3">
      <span className="text-sm text-muted-foreground animate-pulse font-medium">
        {message}
      </span>
    </div>
  );
}
