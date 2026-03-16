import { type Game } from "@/hooks/useSquares";

interface GameTickerProps {
  games: Game[];
}

export function GameTicker({ games }: GameTickerProps) {
  return (
    <div className="h-16 w-full bg-background/80 backdrop-blur-md border-b border-foreground/10 flex items-center overflow-x-auto scrollbar-hide">
      <div className="flex gap-8 px-6 min-w-max">
        {games.map((game) => (
          <div key={game.id} className="flex items-center gap-3 shrink-0">
            {game.status === "Live" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
              </span>
            )}
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{game.home_team}</span>
              <span className="font-mono-display text-sm font-semibold text-foreground">{game.home_score}</span>
            </div>
            <span className="text-muted-foreground text-xs">vs</span>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{game.away_team}</span>
              <span className="font-mono-display text-sm font-semibold text-foreground">{game.away_score}</span>
            </div>
            <span
              className={`text-[10px] font-mono-display uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                game.status === "Final"
                  ? "bg-primary/20 text-primary"
                  : game.status === "Live"
                  ? "bg-destructive/20 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {game.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
