import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef } from "react";

const SQUARES_CACHE_KEY = "squares-cache-v1";
const GAMES_CACHE_KEY = "games-cache-v1";

function readCachedData<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore cache write failures (private mode / storage limits)
  }
}

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
  const isSyncingScores = useRef(false);

  const { data: squares = [], ...squaresQuery } = useQuery({
    queryKey: ["squares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squares")
        .select("id, win_digit, lose_digit, owner_name");
      if (error) throw error;
      return data as Square[];
    },
    initialData: () => readCachedData<Square[]>(SQUARES_CACHE_KEY),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: games = [], ...gamesQuery } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, home_team, away_team, home_score, away_score, status, is_processed, espn_id, round, start_time, home_seed, away_seed");
      if (error) throw error;
      return data as Game[];
    },
    initialData: () => readCachedData<Game[]>(GAMES_CACHE_KEY),
    staleTime: 180000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (squares.length > 0) writeCachedData(SQUARES_CACHE_KEY, squares);
  }, [squares]);

  useEffect(() => {
    if (games.length > 0) writeCachedData(GAMES_CACHE_KEY, games);
  }, [games]);

  // Fetch live scores from ESPN via edge function
  const fetchScores = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-scores");
      if (error) throw error;
      return data;
    },
    onMutate: () => {
      isSyncingScores.current = true;
    },
    onSuccess: (data) => {
      if (Array.isArray(data?.games)) {
        queryClient.setQueryData(["games"], data.games as Game[]);
      }
    },
    onSettled: () => {
      isSyncingScores.current = false;
    },
  });

  // Realtime subscription (squares only). Games are refreshed by fetchScores to avoid request storms.
  useEffect(() => {
    const channel = supabase
      .channel("realtime-squares")
      .on("postgres_changes", { event: "*", schema: "public", table: "squares" }, () => {
        queryClient.invalidateQueries({ queryKey: ["squares"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Start score sync only after initial data is rendered
  const isInitialDataReady = !squaresQuery.isLoading && !gamesQuery.isLoading;

  useEffect(() => {
    if (!isInitialDataReady) return;

    const connection =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
        : undefined;

    const isConstrainedConnection = Boolean(
      connection?.saveData ||
        connection?.effectiveType?.includes("2g") ||
        connection?.effectiveType?.includes("3g")
    );

    const runScoreSync = () => {
      if (isSyncingScores.current) return;
      fetchScores.mutate();
    };

    const initialDelayMs = isConstrainedConnection ? 20000 : 10000;
    const initialTimeout = setTimeout(runScoreSync, initialDelayMs);
    const interval = setInterval(runScoreSync, 180000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isInitialDataReady, fetchScores.mutate]);

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
