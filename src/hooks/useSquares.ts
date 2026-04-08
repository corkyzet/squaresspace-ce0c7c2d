import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef } from "react";

export type Square = {
  id: string;
  win_digit: number;
  lose_digit: number;
  owner_name: string | null;
  season_id: string;
};

export type Game = {
  id?: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: string;
  is_processed?: boolean;
  espn_id: string | null;
  round: string | null;
  start_time: string | null;
  home_seed: number | null;
  away_seed: number | null;
};

export type Season = {
  id: string;
  year: number;
  is_active: boolean;
  is_published: boolean;
  win_order: number[];
  lose_order: number[];
};

const DEFAULT_WIN_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const DEFAULT_LOSE_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const REFRESH_INTERVAL_MS = 60_000;
const MUTATION_GUARD_MS = 5_000;

function getRoundPrize(round: string | null): number {
  if (!round) return 50;
  const r = round.toLowerCase();
  if (r.includes("final four") || r.includes("semifinal")) return 800;
  if (r.includes("national championship") || (r.includes("championship") && !r.includes("region") && !r.includes("round") && !r.includes("final four"))) return 1500;
  if (r.includes("elite eight") || r.includes("elite 8") || r.includes("regional final")) return 400;
  if (r.includes("sweet 16") || r.includes("sweet sixteen") || r.includes("regional semifinal")) return 200;
  if (r.includes("2nd round") || r.includes("second round") || r.includes("3rd round") || r.includes("round of 32")) return 100;
  return 50;
}

function isChampionship(round: string | null): boolean {
  if (!round) return false;
  const r = round.toLowerCase();
  return r.includes("national championship") || (r.includes("championship") && !r.includes("region") && !r.includes("round") && !r.includes("final four"));
}

export function useSquares() {
  const queryClient = useQueryClient();
  const lastMutationTime = useRef(0);

  // Fetch the active season
  const { data: activeSeason } = useQuery({
    queryKey: ["active-season"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Season | null;
    },
    staleTime: 60000,
  });

  const seasonId = activeSeason?.id;
  const winOrder = activeSeason?.win_order ?? DEFAULT_WIN_ORDER;
  const loseOrder = activeSeason?.lose_order ?? DEFAULT_LOSE_ORDER;

  const { data: squares = [], ...squaresQuery } = useQuery({
    queryKey: ["squares", seasonId],
    queryFn: async () => {
      if (!seasonId) return [];
      const { data, error } = await supabase.from("squares").select("*").eq("season_id", seasonId);
      if (error) throw error;
      return data as Square[];
    },
    enabled: !!seasonId,
    retry: 3,
    retryDelay: 5000,
    staleTime: 60000,
  });

  const { data: games = [], ...gamesQuery } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("games").select("*");
        if (error) throw error;
        if (data.length > 0) return data as Game[];
      } catch {
        // DB unavailable
      }
      const { data, error } = await supabase.functions.invoke("fetch-scores");
      if (error) throw error;
      return (data?.games ?? []) as Game[];
    },
    retry: 2,
    retryDelay: 3000,
    staleTime: 60000,
  });

  const fetchScores = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-scores");
      if (error) throw error;
      if (data?.games) {
        queryClient.setQueryData(["games"], data.games);
      }
      if (data?.squares && seasonId) {
        queryClient.setQueryData(["squares", seasonId], data.squares);
      }
      lastMutationTime.current = Date.now();
      return data;
    },
  });

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("realtime-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "squares" }, () => {
        queryClient.invalidateQueries({ queryKey: ["squares"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, () => {
        if (Date.now() - lastMutationTime.current > MUTATION_GUARD_MS) {
          queryClient.invalidateQueries({ queryKey: ["games"] });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-refresh scores every 60 seconds
  useEffect(() => {
    if (games.length === 0 && !gamesQuery.isLoading) {
      fetchScores.mutate();
    }
    const interval = setInterval(() => fetchScores.mutate(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length === 0, gamesQuery.isLoading]);

  // Memoize all derived data
  const { findOwner, getWinCount, leaderboard } = useMemo(() => {
    const winningGames = games.filter(
      (g) => g.status === "Final" && g.round?.toLowerCase() !== "first four"
    );

    const digits: { w: number; l: number; prize: number }[] = [];
    winningGames.forEach((g) => {
      const wDigit = Math.max(g.home_score, g.away_score) % 10;
      const lDigit = Math.min(g.home_score, g.away_score) % 10;
      digits.push({ w: wDigit, l: lDigit, prize: getRoundPrize(g.round) });
      if (isChampionship(g.round)) {
        digits.push({ w: lDigit, l: wDigit, prize: 500 });
      }
    });

    const _getWinCount = (winDigit: number, loseDigit: number) =>
      digits.filter((d) => d.w === winDigit && d.l === loseDigit).length;

    const _getWinnings = (winDigit: number, loseDigit: number) =>
      digits.filter((d) => d.w === winDigit && d.l === loseDigit).reduce((sum, d) => sum + d.prize, 0);

    const _findOwner = (winDigit: number, loseDigit: number) =>
      squares.find((s) => s.win_digit === winDigit && s.lose_digit === loseDigit)?.owner_name ?? null;

    const _leaderboard = squares
      .filter((s) => s.owner_name)
      .map((s) => ({
        name: s.owner_name!,
        wins: _getWinCount(s.win_digit, s.lose_digit),
        money: _getWinnings(s.win_digit, s.lose_digit),
      }))
      .reduce((acc, { name, wins, money }) => {
        const existing = acc.find((a) => a.name === name);
        if (existing) { existing.wins += wins; existing.money += money; }
        else acc.push({ name, wins, money });
        return acc;
      }, [] as { name: string; wins: number; money: number }[])
      .sort((a, b) => b.money - a.money || b.wins - a.wins);

    return {
      findOwner: _findOwner,
      getWinCount: _getWinCount,
      leaderboard: _leaderboard,
    };
  }, [games, squares]);

  return {
    squares,
    games,
    squaresLoading: squaresQuery.isLoading,
    gamesLoading: gamesQuery.isLoading,
    fetchScores,
    getWinCount,
    findOwner,
    leaderboard,
    winOrder,
    loseOrder,
    activeSeason,
  };
}
