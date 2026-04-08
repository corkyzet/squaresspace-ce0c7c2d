import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { randomizeGrid, randomizeDigitOrder, type EntrantSlot } from "@/lib/gridPlacement";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shuffle, Eye, Loader2 } from "lucide-react";

interface GridManagerProps {
  seasonId: string;
}

interface Season {
  id: string;
  year: number;
  is_published: boolean;
  win_order: number[];
  lose_order: number[];
}

interface Square {
  id: string;
  win_digit: number;
  lose_digit: number;
  owner_name: string | null;
  season_id: string;
}

interface Entrant {
  id: string;
  name: string;
  email: string;
  boxes_requested: number;
}

export function GridManager({ seasonId }: GridManagerProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const { data: season } = useQuery({
    queryKey: ["season", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("seasons").select("*").eq("id", seasonId).single();
      if (error) throw error;
      return data as Season;
    },
  });

  const { data: squares = [] } = useQuery({
    queryKey: ["admin-squares", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("squares").select("*").eq("season_id", seasonId);
      if (error) throw error;
      return data as Square[];
    },
  });

  const { data: entrants = [] } = useQuery({
    queryKey: ["entrants", seasonId],
    queryFn: async () => {
      const { data, error } = await supabase.from("entrants").select("*").eq("season_id", seasonId);
      if (error) throw error;
      return data as Entrant[];
    },
  });

  const winOrder = season?.win_order ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const loseOrder = season?.lose_order ?? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const filledCount = squares.filter((s) => s.owner_name).length;
  const totalBoxes = entrants.reduce((sum, e) => sum + e.boxes_requested, 0);
  const isFullyFilled = filledCount >= totalBoxes && totalBoxes > 0;

  function getOwner(winDigit: number, loseDigit: number) {
    return squares.find((s) => s.win_digit === winDigit && s.lose_digit === loseDigit)?.owner_name ?? null;
  }

  async function handleRandomizeGrid() {
    if (entrants.length === 0) {
      toast.error("Add entrants first before randomizing.");
      return;
    }

    const slots: EntrantSlot[] = entrants.map((e) => ({
      name: e.name,
      email: e.email,
      count: e.boxes_requested,
    }));

    let placed;
    try {
      placed = randomizeGrid(slots);
    } catch (err: any) {
      toast.error(err.message);
      return;
    }

    setSaving(true);

    // Delete existing squares for this season and insert new ones
    const { error: delErr } = await supabase.from("squares").delete().eq("season_id", seasonId);
    if (delErr) {
      toast.error("Failed to clear grid: " + delErr.message);
      setSaving(false);
      return;
    }

    const rows = placed.map((p) => ({
      season_id: seasonId,
      win_digit: p.win_digit,
      lose_digit: p.lose_digit,
      owner_name: p.owner_name,
    }));

    const { error: insErr } = await supabase.from("squares").insert(rows);
    setSaving(false);

    if (insErr) {
      toast.error("Failed to save grid: " + insErr.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["admin-squares", seasonId] });
    queryClient.invalidateQueries({ queryKey: ["squares"] });
    toast.success("Grid randomized with placement constraints.");
  }

  async function handleRandomizeDigits() {
    const newWin = randomizeDigitOrder();
    const newLose = randomizeDigitOrder();

    const { error } = await supabase
      .from("seasons")
      .update({ win_order: newWin, lose_order: newLose })
      .eq("id", seasonId);

    if (error) {
      toast.error("Failed to randomize digits: " + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["season", seasonId] });
    queryClient.invalidateQueries({ queryKey: ["active-season"] });
    toast.success("Digit order randomized.");
  }

  async function handlePublish() {
    setPublishing(true);
    const { error } = await supabase
      .from("seasons")
      .update({ is_published: true })
      .eq("id", seasonId);
    setPublishing(false);

    if (error) {
      toast.error("Failed to publish: " + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["season", seasonId] });
    queryClient.invalidateQueries({ queryKey: ["active-season"] });
    toast.success("Grid published! It's now visible to all users.");
  }

  async function handleUnpublish() {
    const { error } = await supabase
      .from("seasons")
      .update({ is_published: false })
      .eq("id", seasonId);

    if (error) {
      toast.error("Failed to unpublish: " + error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["season", seasonId] });
    queryClient.invalidateQueries({ queryKey: ["active-season"] });
    toast.success("Grid unpublished.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="font-mono-display text-sm uppercase tracking-wider text-foreground">Grid</h3>
          <span className="text-xs font-mono-display text-muted-foreground">
            {filledCount}/100 filled &middot; {totalBoxes} boxes requested
          </span>
          {season?.is_published && (
            <span className="text-[9px] font-mono-display bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm">PUBLISHED</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRandomizeDigits} className="gap-1 text-xs">
            <Shuffle className="w-3 h-3" /> Digits
          </Button>
          <Button size="sm" variant="outline" onClick={handleRandomizeGrid} disabled={saving} className="gap-1 text-xs">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shuffle className="w-3 h-3" />}
            Grid
          </Button>
          {season?.is_published ? (
            <Button size="sm" variant="ghost" onClick={handleUnpublish} className="gap-1 text-xs text-muted-foreground">
              Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!isFullyFilled || publishing}
              className="gap-1 text-xs"
              title={!isFullyFilled ? "Fill all entrant boxes before publishing" : ""}
            >
              {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Mini grid preview */}
      <div className="overflow-auto scrollbar-hide">
        <div className="min-w-[420px] p-2">
          <div className="grid grid-cols-11 gap-px">
            {/* Header corner */}
            <div className="flex items-center justify-center text-[8px] font-mono-display text-muted-foreground p-1">
              L\W
            </div>
            {/* Column headers */}
            {winOrder.map((d) => (
              <div key={`h-${d}`} className="text-center font-mono-display text-[10px] text-primary py-1 font-semibold">
                {d}
              </div>
            ))}
            {/* Rows */}
            {loseOrder.map((row) => (
              <>
                <div key={`r-${row}`} className="flex items-center justify-center font-mono-display text-[10px] text-secondary font-semibold">
                  {row}
                </div>
                {winOrder.map((col) => {
                  const owner = getOwner(col, row);
                  return (
                    <div
                      key={`${col}-${row}`}
                      className={`aspect-square flex items-center justify-center rounded-sm text-[6px] leading-tight text-center ring-1 ring-inset p-0.5 ${
                        owner
                          ? "bg-foreground/10 ring-foreground/20 text-foreground/80"
                          : "bg-foreground/5 ring-foreground/5 text-muted-foreground/40"
                      }`}
                      title={owner ?? "Empty"}
                    >
                      {owner ? owner.split(" ").map((w) => w[0]).join("") : ""}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
