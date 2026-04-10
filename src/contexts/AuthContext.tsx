import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthUser {
  email: string;
  name: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "mm_session";

function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveSession(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadSession);
  const [loading, setLoading] = useState(true);

  // Validate the stored session on mount (email might have been removed from whitelist)
  useEffect(() => {
    let cancelled = false;

    async function validate() {
      const stored = loadSession();
      if (!stored) {
        setLoading(false);
        return;
      }

      const email = stored.email.toLowerCase().trim();

      // Check admin_emails
      const { data: adminRow } = await supabase
        .from("admin_emails")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (adminRow) {
        const validated = { ...stored, isAdmin: true };
        if (!cancelled) {
          setUser(validated);
          saveSession(validated);
          setLoading(false);
        }
        return;
      }

      // Check active-season entrants
      const { data: activeSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();

      if (activeSeason) {
        const { data: entrant } = await supabase
          .from("entrants")
          .select("id, name")
          .eq("season_id", activeSeason.id)
          .eq("email", email)
          .maybeSingle();

        if (entrant && !cancelled) {
          const validated = { email, name: entrant.name, isAdmin: false };
          setUser(validated);
          saveSession(validated);
          setLoading(false);
          return;
        }
      }

      // Session is stale — user no longer whitelisted
      if (!cancelled) {
        setUser(null);
        saveSession(null);
        setLoading(false);
      }
    }

    validate();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (rawEmail: string) => {
    const email = rawEmail.toLowerCase().trim();
    if (!email) return { success: false, error: "Please enter an email." };

    // Check admin_emails first
    const { data: adminRow } = await supabase
      .from("admin_emails")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (adminRow) {
      const u: AuthUser = { email, name: "Admin", isAdmin: true };
      setUser(u);
      saveSession(u);
      return { success: true };
    }

    // Check entrants for the active season
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (!activeSeason) {
      return { success: false, error: "No active season found." };
    }

    const { data: entrant } = await supabase
      .from("entrants")
      .select("id, name, collected_by")
      .eq("season_id", activeSeason.id)
      .eq("email", email)
      .maybeSingle();

    if (entrant) {
      if (!entrant.collected_by) {
        return { success: false, error: "UNPAID" };
      }
      const u: AuthUser = { email, name: entrant.name, isAdmin: false };
      setUser(u);
      saveSession(u);
      return { success: true };
    }

    return { success: false, error: "This email isn't on the entrant list." };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
