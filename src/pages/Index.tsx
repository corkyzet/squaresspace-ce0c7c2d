import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSquares } from "@/hooks/useSquares";
import { useAuth } from "@/contexts/AuthContext";
import { GameTicker } from "@/components/GameTicker";
import { SquaresGrid } from "@/components/SquaresGrid";
import { Bracket } from "@/components/Bracket";
import { Leaderboard } from "@/components/Leaderboard";
import { PlayerFilter } from "@/components/PlayerFilter";
import { Shield, LogOut } from "lucide-react";

const Index = () => {
  const { user, logout } = useAuth();
  const { games, squares, findOwner, getWinCount, leaderboard, fetchScores, squaresLoading, winOrder, loseOrder } = useSquares();
  const [highlightOwners, setHighlightOwners] = useState<string[]>([]);

  const allPlayers = useMemo(() => {
    const names = new Set(squares.filter((s) => s.owner_name).map((s) => s.owner_name!));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [squares]);

  const handleRefresh = useCallback(() => {
    fetchScores.mutate();
  }, [fetchScores]);

  const handleLeaderboardSelect = useCallback((name: string | null) => {
    if (!name) {
      setHighlightOwners([]);
    } else {
      setHighlightOwners((prev) =>
        prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
        <h1 className="font-mono-display text-lg font-bold text-foreground tracking-tight">
          MARCH MADNESS <span className="text-primary">SQUARES 2026</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono-display text-muted-foreground hidden sm:inline">
            {user?.name}
          </span>
          {user?.isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono-display uppercase tracking-wider bg-primary/20 text-primary ring-1 ring-primary/40 hover:bg-primary/30 transition-all"
            >
              <Shield className="w-3 h-3" /> Admin
            </Link>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1 px-2 py-1.5 rounded-sm text-xs font-mono-display text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Ticker */}
      <GameTicker
        games={games}
        onRefresh={handleRefresh}
        isRefreshing={fetchScores.isPending}
      />

      {/* Player Filter */}
      <PlayerFilter
        players={allPlayers}
        selected={highlightOwners}
        onChange={setHighlightOwners}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 p-2 sm:p-4">
          {squaresLoading ? (
            <div className="flex items-center justify-center h-64">
              <span className="font-mono-display text-sm text-muted-foreground animate-pulse">Loading grid...</span>
            </div>
          ) : (
            <>
              <SquaresGrid
                findOwner={findOwner}
                getWinCount={getWinCount}
                highlightOwners={highlightOwners}
                winOrder={winOrder}
                loseOrder={loseOrder}
              />
              <div className="border-t border-foreground/10 mt-4">
                <Bracket games={games} findOwner={findOwner} />
              </div>
            </>
          )}
        </div>

        <Leaderboard
          leaderboard={leaderboard}
          onSelectPlayer={handleLeaderboardSelect}
          highlightOwners={highlightOwners}
        />
      </div>
    </div>
  );
};

export default Index;
