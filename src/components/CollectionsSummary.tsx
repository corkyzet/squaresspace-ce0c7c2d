import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";

type Collection = {
  id: string;
  participant_name: string;
  email: string | null;
  boxes: number;
  amount: number;
  collector: string;
};

export function CollectionsSummary() {
  const { data: collections = [], isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections" as any)
        .select("*")
        .order("collector");
      if (error) throw error;
      return data as unknown as Collection[];
    },
  });

  if (isLoading) {
    return (
      <div className="p-4">
        <span className="font-mono-display text-sm text-muted-foreground animate-pulse">Loading collections...</span>
      </div>
    );
  }

  // Group by collector
  const byCollector = collections.reduce((acc, c) => {
    if (!acc[c.collector]) acc[c.collector] = { boxes: 0, amount: 0, participants: [] as Collection[] };
    acc[c.collector].boxes += c.boxes;
    acc[c.collector].amount += c.amount;
    acc[c.collector].participants.push(c);
    return acc;
  }, {} as Record<string, { boxes: number; amount: number; participants: Collection[] }>);

  const totalBoxes = collections.reduce((s, c) => s + c.boxes, 0);
  const totalAmount = collections.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        <h2 className="font-mono-display text-sm font-bold text-foreground uppercase tracking-wider">
          Money Collected
        </h2>
        <span className="ml-auto font-mono-display text-xs text-accent font-semibold">
          {totalBoxes} boxes • ${totalAmount.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(byCollector)
          .sort(([, a], [, b]) => b.amount - a.amount)
          .map(([collector, data]) => (
            <div
              key={collector}
              className="border border-foreground/10 rounded-sm p-3 bg-foreground/[0.02]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-display text-xs font-bold text-foreground uppercase">
                  {collector}
                </span>
                <span className="font-mono-display text-xs text-accent font-semibold">
                  ${data.amount.toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono-display mb-2">
                {data.boxes} boxes collected
              </div>
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {data.participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-foreground truncate">{p.participant_name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {p.boxes} × $100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
