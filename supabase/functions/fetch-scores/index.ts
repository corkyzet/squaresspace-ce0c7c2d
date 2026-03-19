import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function fetchGamesForDate(dateStr: string) {
  const params = new URLSearchParams({
    seasontype: "3",
    groups: "100",
    limit: "100",
    dates: dateStr,
  });

  const espnUrl = `${ESPN_SCOREBOARD_URL}?${params}`;
  console.log("Fetching ESPN scores:", espnUrl);

  const espnRes = await fetch(espnUrl);
  if (!espnRes.ok) {
    const text = await espnRes.text();
    throw new Error(`ESPN API error ${espnRes.status}: ${text}`);
  }

  const espnData = await espnRes.json();
  return espnData.events || [];
}

function parseEvent(event: any) {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];

  const home = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
  const away = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

  const homeTeam = home?.team?.shortDisplayName || home?.team?.displayName || "TBD";
  const awayTeam = away?.team?.shortDisplayName || away?.team?.displayName || "TBD";
  const homeScore = parseInt(home?.score || "0", 10);
  const awayScore = parseInt(away?.score || "0", 10);
  const homeSeed = home?.curatedRank?.current ?? home?.seed ?? null;
  const awaySeed = away?.curatedRank?.current ?? away?.seed ?? null;

  const statusType = competition?.status?.type?.name || event.status?.type?.name;
  let status = "Scheduled";
  if (statusType === "STATUS_FINAL") status = "Final";
  else if (statusType === "STATUS_IN_PROGRESS" || statusType === "STATUS_HALFTIME") status = "Live";
  else if (statusType === "STATUS_END_PERIOD") status = "Live";

  const notesHeadline = competition?.notes?.[0]?.headline || "";
  const typeDetail = competition?.type?.abbreviation || "";
  let round = notesHeadline || typeDetail || "";

  const venue = competition?.venue?.fullName || "";
  const isFirstFour = round.toLowerCase().includes("first four") ||
    notesHeadline.toLowerCase().includes("first four") ||
    (venue.toLowerCase().includes("dayton") && !round);
  if (isFirstFour) round = "First Four";

  // Extract start time from ESPN date field
  const startTime = event.date || competition?.date || null;

  return {
    espn_id: event.id,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    home_seed: homeSeed,
    away_seed: awaySeed,
    status,
    round,
    start_time: startTime,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const year = today.getFullYear();

    const { count: existingGamesCount, error: countError } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw new Error(`Game count fetch failed: ${countError.message}`);
    }

    const hasBootstrappedTournament = (existingGamesCount ?? 0) >= 40;

    // Bootstrap once with full range, then use a light rolling window for refreshes.
    const allEvents = hasBootstrappedTournament
      ? await fetchGamesForDate(`${formatDate(addDays(today, -1))}-${formatDate(addDays(today, 7))}`)
      : await fetchGamesForDate(`${year}0317-${year}0408`);

    console.log(
      `Found ${allEvents.length} events (${hasBootstrappedTournament ? "rolling window" : "full bootstrap"})`
    );

    const games = allEvents.map(parseEvent);

    // Upsert only changed games to reduce DB load and response latency.
    if (games.length > 0) {
      const espnIds = games.map((g) => g.espn_id).filter(Boolean) as string[];
      let gamesToUpsert = games;

      if (espnIds.length > 0) {
        const { data: existingGames, error: existingError } = await supabase
          .from("games")
          .select("espn_id, home_team, away_team, home_score, away_score, home_seed, away_seed, status, round, start_time")
          .in("espn_id", espnIds);

        if (existingError) {
          throw new Error(`Existing games fetch failed: ${existingError.message}`);
        }

        const existingById = new Map((existingGames ?? []).map((g: any) => [g.espn_id, g]));

        gamesToUpsert = games.filter((game) => {
          const existing = existingById.get(game.espn_id);
          if (!existing) return true;

          return (
            existing.home_team !== game.home_team ||
            existing.away_team !== game.away_team ||
            existing.home_score !== game.home_score ||
            existing.away_score !== game.away_score ||
            existing.home_seed !== game.home_seed ||
            existing.away_seed !== game.away_seed ||
            existing.status !== game.status ||
            existing.round !== game.round ||
            existing.start_time !== game.start_time
          );
        });
      }

      console.log(`Skipping ${games.length - gamesToUpsert.length} unchanged games, upserting ${gamesToUpsert.length}`);

      if (gamesToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("games")
          .upsert(gamesToUpsert, { onConflict: "espn_id" });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
          throw new Error(`Database upsert failed: ${upsertError.message}`);
        }
      }
    }

    // Return all games from DB
    const { data: allGames, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .order("start_time", { ascending: true, nullsFirst: false });

    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

    return new Response(
      JSON.stringify({ success: true, count: games.length, games: allGames }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
