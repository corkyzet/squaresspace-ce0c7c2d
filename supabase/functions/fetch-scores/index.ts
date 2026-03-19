import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

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
  else if (statusType === "STATUS_IN_PROGRESS" || statusType === "STATUS_HALFTIME" || statusType === "STATUS_END_PERIOD") status = "Live";

  const notesHeadline = competition?.notes?.[0]?.headline || "";
  const typeDetail = competition?.type?.abbreviation || "";
  let round = notesHeadline || typeDetail || "";

  const venue = competition?.venue?.fullName || "";
  const isFirstFour = round.toLowerCase().includes("first four") ||
    notesHeadline.toLowerCase().includes("first four") ||
    (venue.toLowerCase().includes("dayton") && !round);
  if (isFirstFour) round = "First Four";

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
    start_time: event.date || competition?.date || null,
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

    // Single ESPN fetch for tournament date range
    const year = new Date().getFullYear();
    const params = new URLSearchParams({
      seasontype: "3",
      groups: "100",
      limit: "100",
      dates: `${year}0317-${year}0408`,
    });
    const espnRes = await fetch(`${ESPN_SCOREBOARD_URL}?${params}`);
    if (!espnRes.ok) throw new Error(`ESPN API error ${espnRes.status}`);
    const espnData = await espnRes.json();
    const allEvents = espnData.events || [];

    console.log(`Found ${allEvents.length} events`);
    const games = allEvents.map(parseEvent);

    // Upsert one at a time — each is a tiny fast operation
    let ok = 0;
    for (const game of games) {
      const { error } = await supabase
        .from("games")
        .upsert([game], { onConflict: "espn_id", ignoreDuplicates: false });
      if (error) console.error(`Fail ${game.espn_id}: ${error.message}`);
      else ok++;
    }
    console.log(`Upserted ${ok}/${games.length}`);

    const { data: allGames } = await supabase
      .from("games").select("*").order("start_time", { ascending: true, nullsFirst: false });

    return new Response(
      JSON.stringify({ success: true, count: ok, games: allGames }),
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
