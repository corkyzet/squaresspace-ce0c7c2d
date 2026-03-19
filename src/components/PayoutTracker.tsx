import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSquares } from "@/hooks/useSquares";
import { Check, Clock, Banknote } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo } from "react";

type Payout = {
  id: string;
  game_id: string | null;
  participant_name: string;
  amount: number;
  round: string | null;
  is_paid: boolean;
  paid_date: string | null;
  notes: string | null;
};

export function PayoutTracker() {
  const queryClient = useQueryClient();
  const { games, squares, findOwner } = useSquares();

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["payouts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payouts").select("*");
      if (error) throw error;
      return data as Payout[];
    },
  });

  // Prize amount per round (mirrors useSquares logic)
  const getRoundPrize = (round: string | null): number => {
    if (!round) return 50;
    const r = round.toLowerCase();
    if (r.includes("national championship") || (r.includes("championship") && !r.includes("region") && !r.includes("round"))) return 1500;
    if (r.includes("final four") || r.includes("semifinal")) return 800;
    if (r.includes("elite eight") || r.includes("elite 8") || r.includes("regional final")) return 400;
    if (r.includes("sweet 16") || r.includes("sweet sixteen") || r.includes("regional semifinal")) return 200;
    if (r.includes("2nd round") || r.includes("second round") || r.includes("3rd round") || r.includes("round of 32")) return 100;
    return 50;
  };

  // Compute owed payouts from completed games
  const owedPayouts = useMemo(() => {
    const finalGames = games.filter(
      (g) => g.status === "Final" && g.round?.toLowerCase() !== "first four"
    );

    return finalGames.map((g) => {
      const winDigit = Math.max(g.home_score, g.away_score) % 10;
      const loseDigit = Math.min(g.home_score, g.away_score) % 10;
      const owner = findOwner(winDigit, loseDigit);
      const prize = getRoundPrize(g.round);
      const winner = g.home_score > g.away_score ? g.home_team : g.away_team;
      const loser = g.home_score > g.away_score ? g.away_team : g.home_team;
      const existingPayout = payouts.find((p) => p.game_id === g.id);

      return {
        gameId: g.id,
        matchup: `${winner} vs ${loser}`,
        winScore: Math.max(g.home_score, g.away_score),
        loseScore: Math.min(g.home_score, g.away_score),
        winDigit,
        loseDigit,
        round: g.round,
        prize,
        owner,
        isPaid: existingPayout?.is_paid ?? false,
        payoutId: existingPayout?.id ?? null,
        paidDate: existingPayout?.paid_date ?? null,
      };
    });
  }, [games, squares, payouts, findOwner]);

  const togglePaid = useMutation({
    mutationFn: async ({
      gameId,
      payoutId,
      owner,
      amount,
      round,
      isPaid,
    }: {
      gameId: string;
      payoutId: string | null;
      owner: string;
      amount: number;
      round: string | null;
      isPaid: boolean;
    }) => {
      if (payoutId) {
        const { error } = await supabase
          .from("payouts")
          .update({
            is_paid: !isPaid,
            paid_date: !isPaid ? new Date().toISOString() : null,
          })
          .eq("id", payoutId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payouts").insert({
          game_id: gameId,
          participant_name: owner,
          amount,
          round,
          is_paid: true,
          paid_date: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      toast.success("Payout status updated");
    },
    onError: () => toast.error("Failed to update payout"),
  });

  // Realtime subscription for payouts
  useEffect(() => {
    const channel = supabase
      .channel("payouts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["payouts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const totalOwed = owedPayouts.reduce((s, p) => s + p.prize, 0);
  const totalPaid = owedPayouts.filter((p) => p.isPaid).reduce((s, p) => s + p.prize, 0);
  const totalUnpaid = totalOwed - totalPaid;

  if (isLoading) {
    return (
      <div className="p-4">
        <span className="font-mono-display text-sm text-muted-foreground animate-pulse">Loading payouts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Banknote className="w-4 h-4 text-primary" />
        <h2 className="font-mono-display text-sm font-bold text-foreground uppercase tracking-wider">
          Payout Tracker
        </h2>
        <div className="ml-auto flex gap-3 font-mono-display text-xs">
          <span className="text-accent font-semibold">Owed: ${totalOwed.toLocaleString()}</span>
          <span className="text-primary font-semibold">Paid: ${totalPaid.toLocaleString()}</span>
          {totalUnpaid > 0 && (
            <span className="text-destructive font-semibold">Remaining: ${totalUnpaid.toLocaleString()}</span>
          )}
        </div>
      </div>

      {owedPayouts.length === 0 ? (
        <p className="text-xs text-muted-foreground font-mono-display">No completed games with payouts yet.</p>
      ) : (
        <div className="border border-foreground/10 rounded-sm overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 bg-foreground/5 text-[10px] font-mono-display uppercase tracking-wider text-muted-foreground border-b border-foreground/10">
            <span>Game</span>
            <span className="w-16 text-center">Round</span>
            <span className="w-16 text-center">Square</span>
            <span className="w-20 text-right">Prize</span>
            <span className="w-20 text-center">Status</span>
          </div>

          <div className="divide-y divide-foreground/5">
            {owedPayouts.map((p) => (
              <div
                key={p.gameId}
                className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 items-center text-xs transition-colors ${
                  p.isPaid ? "bg-primary/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="text-foreground truncate">{p.matchup}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {p.winScore}–{p.loseScore} → {p.owner || "Unassigned"}
                  </div>
                </div>
                <span className="w-16 text-center text-[10px] font-mono-display text-muted-foreground truncate">
                  {p.round || "—"}
                </span>
                <span className="w-16 text-center font-mono-display text-[10px] text-muted-foreground">
                  [{p.winDigit},{p.loseDigit}]
                </span>
                <span className="w-20 text-right font-mono-display text-accent font-semibold">
                  ${p.prize}
                </span>
                <div className="w-20 flex justify-center">
                  {p.owner ? (
                    <button
                      onClick={() =>
                        togglePaid.mutate({
                          gameId: p.gameId,
                          payoutId: p.payoutId,
                          owner: p.owner!,
                          amount: p.prize,
                          round: p.round,
                          isPaid: p.isPaid,
                        })
                      }
                      className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-mono-display uppercase tracking-wider transition-all ${
                        p.isPaid
                          ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                          : "bg-destructive/10 text-destructive ring-1 ring-destructive/30 hover:bg-destructive/20"
                      }`}
                    >
                      {p.isPaid ? (
                        <>
                          <Check className="w-3 h-3" /> Paid
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Unpaid
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono-display">N/A</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
