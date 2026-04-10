import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface AuthUser {
  email: string;
  name: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  unpaidEmail: string | null;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unpaidEmail, setUnpaidEmail] = useState<string | null>(null);

  async function resolveUser(email: string) {
    const em = email.toLowerCase().trim();

    const { data: adminRow } = await supabase
      .from("admin_emails")
      .select("id")
      .eq("email", em)
      .maybeSingle();

    if (adminRow) {
      setUser({ email: em, name: "Admin", isAdmin: true });
      setUnpaidEmail(null);
      setLoading(false);
      return;
    }

    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (activeSeason) {
      const { data: entrant } = await supabase
        .from("entrants")
        .select("id, name, collected_by")
        .eq("season_id", activeSeason.id)
        .eq("email", em)
        .maybeSingle();

      if (entrant) {
        if (!entrant.collected_by) {
          setUser(null);
          setUnpaidEmail(em);
          setLoading(false);
          return;
        }
        setUser({ email: em, name: entrant.name, isAdmin: false });
        setUnpaidEmail(null);
        setLoading(false);
        return;
      }
    }

    await supabase.auth.signOut();
    setUser(null);
    setUnpaidEmail(null);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        resolveUser(session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        if (session?.user?.email) {
          await resolveUser(session.user.email);
        } else {
          setUser(null);
          setUnpaidEmail(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const sendMagicLink = useCallback(async (rawEmail: string) => {
    const email = rawEmail.toLowerCase().trim();
    if (!email) return { success: false, error: "Please enter an email." };

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUnpaidEmail(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, unpaidEmail, sendMagicLink, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
