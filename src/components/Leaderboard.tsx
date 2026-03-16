import { Trophy } from "lucide-react";

interface LeaderboardProps {
  leaderboard: { name: string; wins: number }[];
  onSelectPlayer: (name: string | null) => void;
  highlightOwner: string | null;
}

export function Leaderboard({ leaderboard, onSelectPlayer, highlightOwner }: LeaderboardProps) {
  return (
    <div className="w-full lg:w-56 border-t lg:border-t-0 lg:border-l border-foreground/10 bg-background/50 p-3">
      <h2 className="font-mono-display text-sm uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <Trophy className="w-4 h-4" />
        Leaderboard
      </h2>
      <div className="space-y-1">
        {leaderboard.length === 0 && (
          <p className="text-xs text-muted-foreground">No wins yet.</p>
        )}
        {leaderboard.map((entry, i) => (
          <button
            key={entry.name}
            onClick={() => onSelectPlayer(highlightOwner === entry.name ? null : entry.name)}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-sm text-sm transition-all
              ${highlightOwner === entry.name
                ? "bg-accent/10 ring-1 ring-accent/40 gold-glow"
                : "hover:bg-foreground/5"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono-display text-xs text-muted-foreground w-5">{i + 1}.</span>
              <span className="text-foreground">{entry.name}</span>
            </div>
            <span className="font-mono-display text-xs text-primary font-semibold">
              {entry.wins} {entry.wins === 1 ? "win" : "wins"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
