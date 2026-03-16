import { type Game } from "@/hooks/useSquares";
import { RefreshCw } from "lucide-react";

const TEAM_ABBREVS: Record<string, string> = {
  "Alabama": "ALA", "Arizona": "ARIZ", "Arkansas": "ARK", "Auburn": "AUB",
  "Baylor": "BAY", "BYU": "BYU", "Clemson": "CLEM", "Colorado": "COL",
  "Colorado St": "CSU", "Connecticut": "CONN", "Creighton": "CREI", "Davidson": "DAV",
  "Drake": "DRKE", "Duke": "DUKE", "Florida": "FLA", "Florida St": "FSU",
  "Gonzaga": "GONZ", "Grand Canyon": "GCU", "High Point": "HP", "Houston": "HOU",
  "Illinois": "ILL", "Indiana": "IND", "Iowa": "IOWA", "Iowa St": "ISU",
  "Kansas": "KU", "Kentucky": "UK", "Louisville": "LOU", "LSU": "LSU",
  "Marquette": "MARQ", "Maryland": "MD", "McNeese": "MCN", "Memphis": "MEM",
  "Michigan": "MICH", "Michigan St": "MSU", "Mississippi St": "MSST", "Missouri": "MIZ",
  "Montana": "MONT", "NC State": "NCST", "Nebraska": "NEB", "New Mexico": "UNM",
  "North Carolina": "UNC", "Northwestern": "NW", "Notre Dame": "ND", "Ohio St": "OSU",
  "Oklahoma": "OU", "Ole Miss": "MISS", "Oregon": "ORE", "Penn St": "PSU",
  "Pittsburgh": "PITT", "Purdue": "PUR", "San Diego St": "SDSU", "South Carolina": "SC",
  "St. John's": "SJU", "St. Mary's": "SMC", "Stanford": "STAN", "Syracuse": "SYR",
  "TCU": "TCU", "Tennessee": "TENN", "Texas": "TEX", "Texas A&M": "TAMU",
  "Texas Tech": "TTU", "Troy": "TROY", "Tulane": "TUL", "UAB": "UAB",
  "UCLA": "UCLA", "UConn": "CONN", "Vanderbilt": "VAN", "Villanova": "NOVA",
  "Virginia": "UVA", "VCU": "VCU", "Wake Forest": "WAKE", "West Virginia": "WVU",
  "Wisconsin": "WISC", "Xavier": "XAV", "Yale": "YALE", "Liberty": "LIB",
  "Lipscomb": "LIP", "Robert Morris": "RMU", "Akron": "AKR", "Omaha": "OMA",
  "SIU Edwardsville": "SIUE", "UC San Diego": "UCSD", "Norfolk St": "NSU",
  "Wofford": "WOF", "Stetson": "STET", "Vermont": "UVM",
};

function abbrev(team: string): string {
  return TEAM_ABBREVS[team] || team.slice(0, 4).toUpperCase();
}

function seedLabel(seed: number | null): string {
  return seed ? `(${seed})` : "";
}

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
  const mainGames = games.filter((g) =>
    g.round?.toLowerCase() !== "first four" &&
    g.home_team !== "TBD" && g.away_team !== "TBD"
  );

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

  let tickerGames: Game[];
  if (liveGames.length > 0 || scheduledToday.length > 0) {
    tickerGames = [...liveGames, ...scheduledToday, ...finalGames.slice(-4)];
  } else if (scheduledUpcoming.length > 0) {
    tickerGames = [...scheduledUpcoming, ...finalGames.slice(-4)];
  } else {
    tickerGames = [...finalGames];
  }

  const upcomingDate = scheduledUpcoming.length > 0 && liveGames.length === 0 && scheduledToday.length === 0
    ? formatGameDate(scheduledUpcoming[0].start_time)
    : null;

  return (
    <div className="w-full bg-background/80 backdrop-blur-md border-b border-foreground/10">
      <div className="flex items-center h-10 px-3 gap-2">
        <div className="flex items-center gap-1.5 shrink-0 border-r border-foreground/10 pr-2">
          <span className="font-mono-display text-[10px] uppercase tracking-widest text-muted-foreground">
            {upcomingDate ? upcomingDate : "Scores"}
          </span>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-0.5 rounded-sm hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          {liveGames.length > 0 && (
            <span className="text-[9px] font-mono-display bg-destructive/20 text-destructive px-1 py-0.5 rounded-sm">
              {liveGames.length} LIVE
            </span>
          )}
        </div>

        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 min-w-max py-1">
            {tickerGames.length === 0 && (
              <span className="text-[10px] text-muted-foreground">No games scheduled. Auto-refresh every 60s.</span>
            )}
            {tickerGames.map((game) => (
              <div key={game.id} className="flex items-center gap-1 shrink-0">
                {game.status === "Live" && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{seedLabel(game.home_seed)}</span>
                  <span className="text-[10px] font-semibold text-foreground/80">{abbrev(game.home_team)}</span>
                  {game.status === "Scheduled" ? (
                    <span className="font-mono-display text-[9px] text-muted-foreground px-0.5">
                      {formatGameTime(game.start_time)}
                    </span>
                  ) : (
                    <>
                      <span className="font-mono-display text-[11px] font-bold text-foreground">{game.home_score}</span>
                      <span className="text-muted-foreground text-[9px]">-</span>
                      <span className="font-mono-display text-[11px] font-bold text-foreground">{game.away_score}</span>
                    </>
                  )}
                  <span className="text-[10px] font-semibold text-foreground/80">{abbrev(game.away_team)}</span>
                  <span className="text-[10px] text-muted-foreground">{seedLabel(game.away_seed)}</span>
                </div>
                <span
                  className={`text-[8px] font-mono-display uppercase tracking-wider px-1 py-0.5 rounded-sm ${
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
