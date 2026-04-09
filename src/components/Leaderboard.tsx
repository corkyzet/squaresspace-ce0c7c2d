import React from "react";
import { Trophy } from "lucide-react";

interface LeaderboardProps {
  leaderboard: { name: string; wins: number; money: number }[];
  onSelectPlayer: (name: string | null) => void;
  highlightOwners: string[];
}

export const Leaderboard = React.memo(function Leaderboard({ leaderboard, onSelectPlayer, highlightOwners }: LeaderboardProps) {
  return (
    <div className="w-full md:w-60 border-t md:border-t-0 md:border-l border-[hsl(215_30%_16%)] bg-[hsl(220_30%_7%)] p-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
        <Trophy className="w-3.5 h-3.5" />
        Leaderboard
      </h2>

      <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-[hsl(215_30%_16%)]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Player</span>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground w-6 text-center">W</span>
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground w-12 text-right">Earned</span>
        </div>
      </div>

      <div className="space-y-0.5">
        {leaderboard.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No wins yet.</p>
        )}
        {leaderboard.map((entry, i) => (
          <button
            key={entry.name}
            onClick={() => onSelectPlayer(entry.name)}
            className={`
              w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all
              ${highlightOwners.includes(entry.name)
                ? "bg-primary/15 ring-1 ring-primary/40"
                : "hover:bg-white/5"
              }
            `}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono-display text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
              <span className="text-foreground font-medium truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono-display text-[10px] text-primary font-bold w-6 text-center">
                {entry.wins}
              </span>
              <span className="font-mono-display text-[10px] text-accent font-bold w-12 text-right">
                {entry.money > 0 ? `$${entry.money.toLocaleString()}` : "—"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
