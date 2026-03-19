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
  home_seed: number | null;
  away_seed: number | null;
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

  // Prize amount per round
  const getRoundPrize = (round: string | null): number => {
    if (!round) return 50;
    const r = round.toLowerCase();
    // Check most specific first — "championship" alone could match the tournament name
    if (r.includes("national championship") || (r.includes("championship") && !r.includes("region") && !r.includes("round"))) return 1500;
    if (r.includes("final four") || r.includes("semifinal")) return 800;
    if (r.includes("elite eight") || r.includes("elite 8") || r.includes("regional final")) return 400;
    if (r.includes("sweet 16") || r.includes("sweet sixteen") || r.includes("regional semifinal")) return 200;
    if (r.includes("2nd round") || r.includes("second round") || r.includes("3rd round") || r.includes("round of 32")) return 100;
    // Default: 1st round
    return 50;
  };

  // Compute winning games (excluding First Four)
  const winningGames = games
    .filter((g) => g.status === "Final" && g.round?.toLowerCase() !== "first four");

  const winningDigits = winningGames.map((g) => ({
    w: Math.max(g.home_score, g.away_score) % 10,
    l: Math.min(g.home_score, g.away_score) % 10,
    prize: getRoundPrize(g.round),
  }));

  const getWinCount = (winDigit: number, loseDigit: number) =>
    winningDigits.filter((d) => d.w === winDigit && d.l === loseDigit).length;

  const getWinnings = (winDigit: number, loseDigit: number) =>
    winningDigits.filter((d) => d.w === winDigit && d.l === loseDigit).reduce((sum, d) => sum + d.prize, 0);

  const findOwner = (winDigit: number, loseDigit: number) =>
    squares.find((s) => s.win_digit === winDigit && s.lose_digit === loseDigit)?.owner_name ?? null;

  // Leaderboard with wins and money
  const leaderboard = squares
    .filter((s) => s.owner_name)
    .map((s) => ({
      name: s.owner_name!,
      wins: getWinCount(s.win_digit, s.lose_digit),
      money: getWinnings(s.win_digit, s.lose_digit),
    }))
    .reduce((acc, { name, wins, money }) => {
      const existing = acc.find((a) => a.name === name);
      if (existing) { existing.wins += wins; existing.money += money; }
      else acc.push({ name, wins, money });
      return acc;
    }, [] as { name: string; wins: number; money: number }[])
    .sort((a, b) => b.money - a.money || b.wins - a.wins);

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
