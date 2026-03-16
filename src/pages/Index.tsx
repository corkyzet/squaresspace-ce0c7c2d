import { useState } from "react";
import { useSquares } from "@/hooks/useSquares";
import { GameTicker } from "@/components/GameTicker";
import { SquaresGrid } from "@/components/SquaresGrid";
import { Bracket } from "@/components/Bracket";
import { Leaderboard } from "@/components/Leaderboard";
import { AdminModal } from "@/components/AdminModal";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { games, findOwner, getWinCount, leaderboard, updateSquare, fetchScores, squaresLoading } = useSquares();
  const [isAdmin, setIsAdmin] = useState(false);
  const [highlightOwner, setHighlightOwner] = useState<string | null>(null);
  const [editCell, setEditCell] = useState<{ w: number; l: number } | null>(null);

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
        <h1 className="font-mono-display text-lg font-bold text-foreground tracking-tight">
          MARCH MADNESS <span className="text-primary">SQUARES</span>
        </h1>
        <button
          onClick={() => setIsAdmin(!isAdmin)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-mono-display uppercase tracking-wider transition-all ${
            isAdmin
              ? "bg-primary/20 text-primary ring-1 ring-primary/40"
              : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
          }`}
        >
          {isAdmin ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
          {isAdmin ? "Exit Admin" : "Admin"}
        </button>
      </header>

      {/* Ticker */}
      <GameTicker
        games={games}
        onRefresh={() => fetchScores.mutate()}
        isRefreshing={fetchScores.isPending}
      />

      {/* Main content */}
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
                isAdmin={isAdmin}
                onCellClick={handleCellClick}
                highlightOwner={highlightOwner}
              />
              <div className="border-t border-foreground/10 mt-4">
                <Bracket games={games} findOwner={findOwner} />
              </div>
            </>
          )}
        </div>

        <Leaderboard
          leaderboard={leaderboard}
          onSelectPlayer={setHighlightOwner}
          highlightOwner={highlightOwner}
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
};

export default Index;
