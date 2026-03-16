import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useCallback } from "react";

export type Square = {
  id: string;
  win_digit: number;
  lose_digit: number;
  owner_name: string | null;
};

export type Game = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: string;
  is_processed: boolean;
  espn_id: string | null;
  round: string | null;
  start_time: string | null;
};

export function useSquares() {
  const queryClient = useQueryClient();

  const { data: squares = [], ...squaresQuery } = useQuery({
    queryKey: ["squares"],
    queryFn: async () => {
      const { data, error } = await supabase.from("squares").select("*");
      if (error) throw error;
      return data as Square[];
    },
  });

  const { data: games = [], ...gamesQuery } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase.from("games").select("*");
      if (error) throw error;
      return data as Game[];
    },
  });

  // Fetch live scores from ESPN via edge function
  const fetchScores = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-scores");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
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
        queryClient.invalidateQueries({ queryKey: ["games"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-refresh scores every 60 seconds
  useEffect(() => {
    fetchScores.mutate();
    const interval = setInterval(() => fetchScores.mutate(), 60000);
    return () => clearInterval(interval);
  }, []);

  const updateSquare = useMutation({
    mutationFn: async ({ win_digit, lose_digit, owner_name }: { win_digit: number; lose_digit: number; owner_name: string }) => {
      const { error } = await supabase
        .from("squares")
        .update({ owner_name })
        .eq("win_digit", win_digit)
        .eq("lose_digit", lose_digit);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["squares"] }),
  });

  // Compute winning squares from final games
  // Exclude First Four games from win calculations
  const winningDigits = games
    .filter((g) => g.status === "Final" && g.round?.toLowerCase() !== "first four")
    .map((g) => ({
      w: Math.max(g.home_score, g.away_score) % 10,
      l: Math.min(g.home_score, g.away_score) % 10,
    }));

  const getWinCount = (winDigit: number, loseDigit: number) =>
    winningDigits.filter((d) => d.w === winDigit && d.l === loseDigit).length;

  const findOwner = (winDigit: number, loseDigit: number) =>
    squares.find((s) => s.win_digit === winDigit && s.lose_digit === loseDigit)?.owner_name ?? null;

  // Leaderboard
  const leaderboard = squares
    .filter((s) => s.owner_name)
    .map((s) => ({
      name: s.owner_name!,
      wins: getWinCount(s.win_digit, s.lose_digit),
    }))
    .reduce((acc, { name, wins }) => {
      const existing = acc.find((a) => a.name === name);
      if (existing) existing.wins += wins;
      else acc.push({ name, wins });
      return acc;
    }, [] as { name: string; wins: number }[])
    .sort((a, b) => b.wins - a.wins);

  return {
    squares,
    games,
    squaresLoading: squaresQuery.isLoading,
    gamesLoading: gamesQuery.isLoading,
    updateSquare,
    fetchScores,
    getWinCount,
    findOwner,
    leaderboard,
  };
}
