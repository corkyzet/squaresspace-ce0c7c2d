import { type Game } from "@/hooks/useSquares";
import { RefreshCw } from "lucide-react";

interface GameTickerProps {
  games: Game[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

function formatGameTime(startTime: string | null): string {
  if (!startTime) return "";
  const d = new Date(startTime);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatGameDate(startTime: string | null): string {
  if (!startTime) return "";
  const d = new Date(startTime);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function GameTicker({ games, onRefresh, isRefreshing }: GameTickerProps) {
  // Filter out First Four games
  const mainGames = games.filter((g) => g.round?.toLowerCase() !== "first four");

  // Group: live first, then today's games, then upcoming, then final
  const now = new Date();
  const todayStr = now.toDateString();

  const liveGames = mainGames.filter((g) => g.status === "Live");
  const scheduledToday = mainGames.filter(
    (g) => g.status === "Scheduled" && g.start_time && new Date(g.start_time).toDateString() === todayStr
  );
  const scheduledUpcoming = mainGames.filter(
    (g) => g.status === "Scheduled" && g.start_time && new Date(g.start_time).toDateString() !== todayStr
  );
  const finalGames = mainGames.filter((g) => g.status === "Final");

  // Show: live → today scheduled → upcoming scheduled (only if no live/today) → recent finals
  let tickerGames: Game[];
  if (liveGames.length > 0 || scheduledToday.length > 0) {
    tickerGames = [...liveGames, ...scheduledToday, ...finalGames.slice(-4)];
  } else if (scheduledUpcoming.length > 0) {
    tickerGames = [...scheduledUpcoming, ...finalGames.slice(-4)];
  } else {
    tickerGames = [...finalGames];
  }

  // Determine the date label for upcoming games
  const upcomingDate = scheduledUpcoming.length > 0 && liveGames.length === 0 && scheduledToday.length === 0
    ? formatGameDate(scheduledUpcoming[0].start_time)
    : null;

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b border-foreground/10">
      <div className="flex items-center h-12 px-4 gap-3">
        <div className="flex items-center gap-2 shrink-0 border-r border-foreground/10 pr-3">
          <span className="font-mono-display text-[10px] uppercase tracking-widest text-muted-foreground">
            {upcomingDate ? upcomingDate : "Scores"}
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
            {tickerGames.length === 0 && (
              <span className="text-xs text-muted-foreground">No tournament games scheduled. Scores auto-refresh every 60s.</span>
            )}
            {tickerGames.map((game) => (
              <div key={game.id} className="flex items-center gap-2 shrink-0">
                {game.status === "Live" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-foreground/80 w-16 text-right truncate">{game.home_team}</span>
                  {game.status === "Scheduled" ? (
                    <span className="font-mono-display text-[10px] text-muted-foreground px-1">
                      {formatGameTime(game.start_time)}
                    </span>
                  ) : (
                    <>
                      <span className="font-mono-display text-xs font-semibold text-foreground">{game.home_score}</span>
                      <span className="text-muted-foreground text-[10px]">-</span>
                      <span className="font-mono-display text-xs font-semibold text-foreground">{game.away_score}</span>
                    </>
                  )}
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
                  {game.status === "Scheduled" ? formatGameDate(game.start_time) : game.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
