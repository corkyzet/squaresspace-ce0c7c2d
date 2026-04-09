import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, CalendarDays, Check } from "lucide-react";

interface SeasonSelectorProps {
  activeSeasonId: string | null;
  onSelectSeason: (id: string) => void;
}

interface Season {
  id: string;
  year: number;
  is_active: boolean;
  is_published: boolean;
  created_at: string;
}

export function SeasonSelector({ activeSeasonId, onSelectSeason }: SeasonSelectorProps) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState(String(new Date().getFullYear() + 1));

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seasons").select("*").order("year", { ascending: false });
      if (error) throw error;
      return data as Season[];
    },
  });

  const createSeason = useMutation({
    mutationFn: async () => {
      const year = parseInt(newYear, 10);
      if (isNaN(year) || year < 2000 || year > 2100) throw new Error("Invalid year");

      // Create the season
      const { data: newSeason, error: sErr } = await supabase
        .from("seasons")
        .insert({ year, is_active: false, is_published: false })
        .select()
        .single();
      if (sErr) throw sErr;

      // Seed 100 empty squares for the new season
      const rows = [];
      for (let w = 0; w < 10; w++) {
        for (let l = 0; l < 10; l++) {
          rows.push({ season_id: newSeason.id, win_digit: w, lose_digit: l, owner_name: null });
        }
      }
      const { error: sqErr } = await supabase.from("squares").insert(rows);
      if (sqErr) throw sqErr;

      return newSeason;
    },
    onSuccess: (newSeason) => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      setShowCreate(false);
      setNewYear(String(new Date().getFullYear() + 1));
      toast.success(`Season ${newSeason.year} created.`);
    },
    onError: (err: any) => {
      if (err?.code === "23505") toast.error("A season for that year already exists.");
      else toast.error("Failed to create season: " + err.message);
    },
  });

  const setActiveSeason = useMutation({
    mutationFn: async (id: string) => {
      // Deactivate all first, then activate the chosen one
      await supabase.from("seasons").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("seasons").update({ is_active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
      toast.success("Active season updated.");
    },
    onError: (err: any) => toast.error("Failed: " + err.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading seasons...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Seasons
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)} className="gap-1 text-xs rounded-lg">
          <Plus className="w-3 h-3" /> New Season
        </Button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => { e.preventDefault(); createSeason.mutate(); }}
          className="flex gap-2 items-end p-3 rounded-lg bg-white/[0.03] border border-[hsl(215_30%_16%)]"
        >
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Year</label>
            <Input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="h-8 text-xs w-24"
              min={2000}
              max={2100}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={createSeason.isPending} className="h-8 text-xs">Create</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)} className="h-8 text-xs">Cancel</Button>
        </form>
      )}

      <div className="space-y-1">
        {seasons.map((s) => (
          <div
            key={s.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
              activeSeasonId === s.id
                ? "bg-primary/10 ring-1 ring-primary/30"
                : "hover:bg-white/5"
            }`}
            onClick={() => onSelectSeason(s.id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{s.year}</span>
              {s.is_active && (
                <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-md">ACTIVE</span>
              )}
              {s.is_published && (
                <span className="text-[9px] font-bold bg-accent/15 text-accent px-1.5 py-0.5 rounded-md">PUBLISHED</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!s.is_active && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); setActiveSeason.mutate(s.id); }}
                >
                  <Check className="w-3 h-3 mr-1" /> Set Active
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
