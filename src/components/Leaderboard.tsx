import { Trophy } from "lucide-react";

interface LeaderboardProps {
  leaderboard: { name: string; wins: number; money: number }[];
  onSelectPlayer: (name: string | null) => void;
  highlightOwner: string | null;
}

export function Leaderboard({ leaderboard, onSelectPlayer, highlightOwner }: LeaderboardProps) {
  return (
    <div className="w-full lg:w-56 border-t lg:border-t-0 lg:border-l border-foreground/10 bg-background/50 p-3">
      <h2 className="font-mono-display text-xs uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
        <Trophy className="w-3 h-3" />
        Leaderboard
      </h2>

      {/* Column headers */}
      <div className="flex items-center justify-between px-2 pb-1 mb-1 border-b border-foreground/10">
        <span className="text-[9px] font-mono-display uppercase tracking-wider text-muted-foreground">Player</span>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono-display uppercase tracking-wider text-muted-foreground w-6 text-center">W</span>
          <span className="text-[9px] font-mono-display uppercase tracking-wider text-muted-foreground w-12 text-right">$</span>
        </div>
      </div>

      <div className="space-y-0.5">
        {leaderboard.length === 0 && (
          <p className="text-xs text-muted-foreground">No wins yet.</p>
        )}
        {leaderboard.map((entry, i) => (
          <button
            key={entry.name}
            onClick={() => onSelectPlayer(highlightOwner === entry.name ? null : entry.name)}
            className={`
              w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-xs transition-all
              ${highlightOwner === entry.name
                ? "bg-accent/10 ring-1 ring-accent/40 gold-glow"
                : "hover:bg-foreground/5"
              }
            `}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono-display text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
              <span className="text-foreground truncate">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono-display text-[10px] text-primary font-semibold w-6 text-center">
                {entry.wins}
              </span>
              <span className="font-mono-display text-[10px] text-accent font-semibold w-12 text-right">
                {entry.money > 0 ? `$${entry.money.toLocaleString()}` : "—"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
