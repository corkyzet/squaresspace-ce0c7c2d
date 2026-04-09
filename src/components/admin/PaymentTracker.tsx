import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";

interface PaymentTrackerProps {
  seasonId: string;
}

interface Payment {
  id: string;
  amount_cents: number;
  status: string;
  notes: string | null;
  created_at: string;
  entrant_id: string;
}

interface Entrant {
  id: string;
  name: string;
  email: string;
}

export function PaymentTracker({ seasonId }: PaymentTrackerProps) {
  const { data: payments = [] } = useQuery({
    queryKey: ["payments", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("season_id", seasonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });

  const { data: entrants = [] } = useQuery({
    queryKey: ["entrants", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entrants").select("id, name, email").eq("season_id", seasonId);
      if (error) throw error;
      return data as Entrant[];
    },
  });

  function entrantName(id: string) {
    return entrants.find((e) => e.id === id)?.name ?? "Unknown";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4" /> Payments
        </h3>
        <span className="text-xs font-medium text-muted-foreground">
          {payments.length} records
        </span>
      </div>

      <div className="border border-[hsl(215_30%_16%)] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/[0.03] text-left">
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Entrant</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No payment records yet. This section will be expanded later.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-[hsl(215_30%_14%)] hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2 text-foreground">{entrantName(p.entrant_id)}</td>
                <td className="px-3 py-2 text-right font-mono-display">${(p.amount_cents / 100).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                    p.status === "paid" ? "bg-accent/15 text-accent" :
                    p.status === "refunded" ? "bg-destructive/20 text-destructive" :
                    "bg-white/[0.06] text-muted-foreground"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-foreground/70">{p.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
