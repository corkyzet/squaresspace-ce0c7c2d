import { useState, useMemo } from "react";
import { useSquares } from "@/hooks/useSquares";
import { GameTicker } from "@/components/GameTicker";
import { SquaresGrid } from "@/components/SquaresGrid";
import { Bracket } from "@/components/Bracket";
import { Leaderboard } from "@/components/Leaderboard";
import { AdminModal } from "@/components/AdminModal";
import { PlayerFilter } from "@/components/PlayerFilter";
import { CollectionsSummary } from "@/components/CollectionsSummary";
import { PayoutTracker } from "@/components/PayoutTracker";
import { Shield, ShieldOff, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ADMIN_PASSWORD = "FinSo";

const Index = () => {
  const { games, squares, findOwner, getWinCount, leaderboard, updateSquare, fetchScores, squaresLoading } = useSquares();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [highlightOwners, setHighlightOwners] = useState<string[]>([]);
  const [editCell, setEditCell] = useState<{ w: number; l: number } | null>(null);

  const allPlayers = useMemo(() => {
    const names = new Set(squares.filter((s) => s.owner_name).map((s) => s.owner_name!));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [squares]);

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      toast.success("Exited admin mode");
    } else {
      setShowPasswordPrompt(true);
      setPasswordInput("");
      setPasswordError(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowPasswordPrompt(false);
      setPasswordInput("");
      setPasswordError(false);
      toast.success("Admin mode activated");
    } else {
      setPasswordError(true);
    }
  };

  const handleCellClick = (w: number, l: number) => {
    if (!isAdmin) return;
    setEditCell({ w, l });
  };

  const handleSave = (name: string) => {
    if (!editCell) return;
    updateSquare.mutate(
      { win_digit: editCell.w, lose_digit: editCell.l, owner_name: name },
      {
        onSuccess: () => toast.success(`Assigned "${name}" to [${editCell.w}, ${editCell.l}]`),
        onError: () => toast.error("Failed to save"),
      }
    );
  };

  const handleLeaderboardSelect = (name: string | null) => {
    if (!name) {
      setHighlightOwners([]);
    } else {
      setHighlightOwners((prev) =>
        prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
      );
    }
  };

  // Password prompt screen
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-sm p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-mono-display text-lg font-bold text-foreground tracking-tight">
              ADMIN ACCESS
            </h1>
            <p className="text-xs text-muted-foreground">Enter the admin password to continue</p>
          </div>

          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              className={`bg-foreground/5 border-foreground/10 text-foreground ${passwordError ? "ring-2 ring-destructive border-destructive" : ""}`}
              autoFocus
            />
            {passwordError && (
              <p className="text-xs text-destructive font-mono-display">Incorrect password</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground"
              onClick={() => setShowPasswordPrompt(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handlePasswordSubmit}
            >
              Enter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Admin screen
  if (isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
          <h1 className="font-mono-display text-lg font-bold text-foreground tracking-tight">
            ADMIN <span className="text-primary">PANEL</span>
          </h1>
          <button
            onClick={handleAdminToggle}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono-display uppercase tracking-wider transition-all bg-primary/20 text-primary ring-1 ring-primary/40"
          >
            <LogOut className="w-3 h-3" />
            Exit Admin
          </button>
        </header>

        <GameTicker
          games={games}
          onRefresh={() => fetchScores.mutate()}
          isRefreshing={fetchScores.isPending}
        />

        <div className="flex-1 flex flex-col lg:flex-row">
          <div className="flex-1 p-2 sm:p-4">
            <p className="text-xs text-muted-foreground mb-3 font-mono-display">
              Click any square to assign or change the owner.
            </p>
            {squaresLoading ? (
              <div className="flex items-center justify-center h-64">
                <span className="font-mono-display text-sm text-muted-foreground animate-pulse">Loading grid...</span>
              </div>
            ) : (
              <SquaresGrid
                findOwner={findOwner}
                getWinCount={getWinCount}
                isAdmin={isAdmin}
                onCellClick={handleCellClick}
                highlightOwners={highlightOwners}
              />
            )}
          </div>

          <Leaderboard
            leaderboard={leaderboard}
            onSelectPlayer={handleLeaderboardSelect}
            highlightOwners={highlightOwners}
          />
        </div>

        {editCell && (
          <AdminModal
            open={!!editCell}
            onClose={() => setEditCell(null)}
            winDigit={editCell.w}
            loseDigit={editCell.l}
            currentOwner={findOwner(editCell.w, editCell.l)}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  // Public screen
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
        <h1 className="font-mono-display text-lg font-bold text-foreground tracking-tight">
          MARCH MADNESS <span className="text-primary">SQUARES 2026</span>
        </h1>
        <button
          onClick={handleAdminToggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono-display uppercase tracking-wider transition-all bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
        >
          <Shield className="w-3 h-3" />
          Admin
        </button>
      </header>

      <GameTicker
        games={games}
        onRefresh={() => fetchScores.mutate()}
        isRefreshing={fetchScores.isPending}
      />

      <PlayerFilter
        players={allPlayers}
        selected={highlightOwners}
        onChange={setHighlightOwners}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
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
                isAdmin={false}
                onCellClick={() => {}}
                highlightOwners={highlightOwners}
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
