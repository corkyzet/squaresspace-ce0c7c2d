import { type Game } from "@/hooks/useSquares";
import { type Square } from "@/hooks/useSquares";
import { Trophy } from "lucide-react";

interface BracketProps {
  games: Game[];
  findOwner: (w: number, l: number) => string | null;
}

type RoundConfig = {
  key: string;
  label: string;
  prize: number;
  matchFn: (round: string) => boolean;
};

const ROUNDS: RoundConfig[] = [
  {
    key: "r64",
    label: "Round of 64",
    prize: 50,
    matchFn: (r) => r.includes("1st round") || (r.includes("round") && !r.includes("2nd") && !r.includes("second") && !r.includes("32") && !r.includes("sweet") && !r.includes("elite") && !r.includes("final") && !r.includes("championship") && !r.includes("semifinal")),
  },
  {
    key: "r32",
    label: "Round of 32",
    prize: 100,
    matchFn: (r) => r.includes("2nd round") || r.includes("second round") || r.includes("round of 32"),
  },
  {
    key: "s16",
    label: "Sweet 16",
    prize: 200,
    matchFn: (r) => r.includes("sweet 16") || r.includes("sweet sixteen") || r.includes("regional semifinal"),
  },
  {
    key: "e8",
    label: "Elite 8",
    prize: 400,
    matchFn: (r) => r.includes("elite eight") || r.includes("elite 8") || r.includes("regional final"),
  },
  {
    key: "f4",
    label: "Final Four",
    prize: 800,
    matchFn: (r) => (r.includes("final four") || r.includes("semifinal")) && !r.includes("regional"),
  },
  {
    key: "champ",
    label: "Championship",
    prize: 1500,
    matchFn: (r) => r.includes("championship") || r.includes("national"),
  },
];

function classifyRound(round: string | null): RoundConfig | null {
  if (!round) return ROUNDS[0]; // default to R64
  const r = round.toLowerCase();
  if (r.includes("first four")) return null;
  for (const rc of [...ROUNDS].reverse()) {
    if (rc.matchFn(r)) return rc;
  }
  return ROUNDS[0];
}

function getRegion(round: string | null): string {
  if (!round) return "Unknown";
  const r = round.toLowerCase();
  if (r.includes("east")) return "East";
  if (r.includes("west")) return "West";
  if (r.includes("south")) return "South";
  if (r.includes("midwest")) return "Midwest";
  if (r.includes("championship") || r.includes("national") || r.includes("final four") || r.includes("semifinal"))
    return "Final Four";
  return "Unknown";
}

function BracketGame({ game, findOwner }: { game: Game; findOwner: (w: number, l: number) => string | null }) {
  const isFinal = game.status === "Final";
  const winDigit = isFinal ? Math.max(game.home_score, game.away_score) % 10 : null;
  const loseDigit = isFinal ? Math.min(game.home_score, game.away_score) % 10 : null;
  const squareOwner = winDigit !== null && loseDigit !== null ? findOwner(winDigit, loseDigit) : null;

  const homeWon = isFinal && game.home_score > game.away_score;
  const awayWon = isFinal && game.away_score > game.home_score;

  const rc = classifyRound(game.round);

  return (
    <div className="ring-1 ring-inset ring-foreground/10 rounded-sm bg-foreground/5 overflow-hidden text-[11px] w-full">
      {/* Home team */}
      <div className={`flex items-center gap-1.5 px-2 py-1 ${homeWon ? "bg-primary/10" : ""}`}>
        {game.home_seed && (
          <span className="font-mono-display text-[9px] text-muted-foreground w-4 shrink-0">{game.home_seed}</span>
        )}
        <span className={`flex-1 truncate ${homeWon ? "text-foreground font-medium" : "text-foreground/70"}`}>
          {game.home_team}
        </span>
        {isFinal && (
          <span className={`font-mono-display text-[10px] font-semibold ${homeWon ? "text-primary" : "text-muted-foreground"}`}>
            {game.home_score}
          </span>
        )}
      </div>
      {/* Divider */}
      <div className="h-px bg-foreground/5" />
      {/* Away team */}
      <div className={`flex items-center gap-1.5 px-2 py-1 ${awayWon ? "bg-primary/10" : ""}`}>
        {game.away_seed && (
          <span className="font-mono-display text-[9px] text-muted-foreground w-4 shrink-0">{game.away_seed}</span>
        )}
        <span className={`flex-1 truncate ${awayWon ? "text-foreground font-medium" : "text-foreground/70"}`}>
          {game.away_team}
        </span>
        {isFinal && (
          <span className={`font-mono-display text-[10px] font-semibold ${awayWon ? "text-primary" : "text-muted-foreground"}`}>
            {game.away_score}
          </span>
        )}
      </div>
      {/* Square winner */}
      {isFinal && (
        <div className="border-t border-foreground/10 px-2 py-0.5 flex items-center gap-1 bg-accent/5">
          <Trophy className="w-2.5 h-2.5 text-accent" />
          <span className="text-[9px] text-accent font-medium truncate">
            {squareOwner || "Unclaimed"} [{winDigit},{loseDigit}]
          </span>
          {rc && (
            <span className="text-[8px] text-muted-foreground ml-auto shrink-0">${rc.prize}</span>
          )}
        </div>
      )}
      {!isFinal && game.status === "Live" && (
        <div className="border-t border-foreground/10 px-2 py-0.5 flex items-center gap-1 bg-destructive/5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-destructive" />
          </span>
          <span className="text-[9px] text-destructive">
            {game.home_score} - {game.away_score}
          </span>
        </div>
      )}
    </div>
  );
}

export function Bracket({ games, findOwner }: BracketProps) {
  // Filter out First Four
  const tourneyGames = games.filter((g) => {
    const rc = classifyRound(g.round);
    if (rc === null) return false;
    // Hide games that haven't been set yet (still "Scheduled" with no real teams/scores)
    if (g.status === "Scheduled" && g.home_score === 0 && g.away_score === 0) return false;
    return true;
  });

  // Group by round
  const gamesByRound = ROUNDS.map((rc) => ({
    ...rc,
    games: tourneyGames
      .filter((g) => {
        const grc = classifyRound(g.round);
        return grc?.key === rc.key;
      })
      .sort((a, b) => {
        const ra = getRegion(a.round);
        const rb = getRegion(b.round);
        if (ra !== rb) return ra.localeCompare(rb);
        return (a.start_time || "").localeCompare(b.start_time || "");
      }),
  }));

  // Group R64 and R32 by region
  const regions = ["East", "West", "South", "Midwest"];

  return (
    <div className="p-4 space-y-6">
      <h2 className="font-mono-display text-sm uppercase tracking-widest text-primary flex items-center gap-2">
        <span>Tournament Bracket</span>
      </h2>

      {gamesByRound.map((roundGroup) => {
        if (roundGroup.games.length === 0 || roundGroup.key === "champ") return null;

        const showRegions = ["r64", "r32", "s16", "e8"].includes(roundGroup.key);

        return (
          <div key={roundGroup.key}>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-mono-display text-xs uppercase tracking-wider text-foreground">
                {roundGroup.label}
              </h3>
              <span className="text-[10px] font-mono-display text-accent">${roundGroup.prize}/game</span>
              <span className="text-[10px] text-muted-foreground">
                ({roundGroup.games.length} {roundGroup.games.length === 1 ? "game" : "games"})
              </span>
            </div>

            {showRegions ? (
              <div className="space-y-4">
                {regions.map((region) => {
                  const regionGames = roundGroup.games.filter((g) => getRegion(g.round) === region);
                  if (regionGames.length === 0) return null;
                  return (
                    <div key={region}>
                      <span className="text-[10px] font-mono-display uppercase tracking-widest text-secondary mb-2 block">
                        {region}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {regionGames.map((game) => (
                          <BracketGame key={game.id} game={game} findOwner={findOwner} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Unknown region */}
                {(() => {
                  const unknownGames = roundGroup.games.filter(
                    (g) => !regions.includes(getRegion(g.round)) && getRegion(g.round) !== "Final Four"
                  );
                  if (unknownGames.length === 0) return null;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {unknownGames.map((game) => (
                        <BracketGame key={game.id} game={game} findOwner={findOwner} />
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {roundGroup.games.map((game) => (
                  <BracketGame key={game.id} game={game} findOwner={findOwner} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {tourneyGames.length === 0 && (
        <p className="text-xs text-muted-foreground">No tournament games loaded yet. Games will appear once the tournament begins.</p>
      )}
    </div>
  );
}
