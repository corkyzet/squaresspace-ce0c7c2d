import { type Game } from "@/hooks/useSquares";
import { RefreshCw } from "lucide-react";

interface GameTickerProps {
  games: Game[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function GameTicker({ games, onRefresh, isRefreshing }: GameTickerProps) {
  // Filter out First Four games
  const mainGames = games.filter((g) => g.round?.toLowerCase() !== "first four");
  const liveGames = mainGames.filter((g) => g.status === "Live");
  const finalGames = mainGames.filter((g) => g.status === "Final");
  const scheduledGames = mainGames.filter((g) => g.status === "Scheduled");
  const sortedGames = [...liveGames, ...finalGames, ...scheduledGames];

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b border-foreground/10">
      <div className="flex items-center h-12 px-4 gap-3">
        <div className="flex items-center gap-2 shrink-0 border-r border-foreground/10 pr-3">
          <span className="font-mono-display text-[10px] uppercase tracking-widest text-muted-foreground">
            Scores
          </span>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 rounded-sm hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          {liveGames.length > 0 && (
            <span className="text-[10px] font-mono-display bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-sm">
              {liveGames.length} LIVE
            </span>
          )}
        </div>

        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-6 min-w-max py-2">
            {sortedGames.length === 0 && (
              <span className="text-xs text-muted-foreground">No tournament games found. Scores auto-refresh every 60s.</span>
            )}
            {sortedGames.map((game) => (
              <div key={game.id} className="flex items-center gap-2 shrink-0">
                {game.status === "Live" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-foreground/80 w-16 text-right truncate">{game.home_team}</span>
                  <span className="font-mono-display text-xs font-semibold text-foreground">{game.home_score}</span>
                  <span className="text-muted-foreground text-[10px]">-</span>
                  <span className="font-mono-display text-xs font-semibold text-foreground">{game.away_score}</span>
                  <span className="text-[11px] text-foreground/80 w-16 truncate">{game.away_team}</span>
                </div>
                <span
                  className={`text-[9px] font-mono-display uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
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
      </div>
    </div>
  );
}
