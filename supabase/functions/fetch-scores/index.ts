import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional query params
    const url = new URL(req.url);
    const dates = url.searchParams.get("dates") || "";
    
    // Fetch NCAA tournament games (groups=100 = NCAA tournament, seasontype=3 = postseason)
    const params = new URLSearchParams({
      seasontype: "3",
      groups: "100",
      limit: "100",
    });
    if (dates) params.set("dates", dates);

    const espnUrl = `${ESPN_SCOREBOARD_URL}?${params}`;
    console.log("Fetching ESPN scores:", espnUrl);

    const espnRes = await fetch(espnUrl);
    if (!espnRes.ok) {
      const text = await espnRes.text();
      throw new Error(`ESPN API error ${espnRes.status}: ${text}`);
    }

    const espnData = await espnRes.json();
    const events = espnData.events || [];
    console.log(`Found ${events.length} events`);

    const games = events.map((event: any) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];
      
      const home = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
      const away = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

      const homeTeam = home?.team?.shortDisplayName || home?.team?.displayName || "TBD";
      const awayTeam = away?.team?.shortDisplayName || away?.team?.displayName || "TBD";
      const homeScore = parseInt(home?.score || "0", 10);
      const awayScore = parseInt(away?.score || "0", 10);

      const statusType = competition?.status?.type?.name || event.status?.type?.name;
      let status = "Scheduled";
      if (statusType === "STATUS_FINAL") status = "Final";
      else if (statusType === "STATUS_IN_PROGRESS" || statusType === "STATUS_HALFTIME") status = "Live";
      else if (statusType === "STATUS_END_PERIOD") status = "Live";

      // Extract round from notes or type description
      const notesHeadline = competition?.notes?.[0]?.headline || "";
      const typeDetail = competition?.type?.abbreviation || "";
      let round = notesHeadline || typeDetail || "";
      
      // Detect First Four: ESPN labels them in notes or they're played in Dayton
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
        status,
        round,
      };
    });

    // Upsert games into database
    if (games.length > 0) {
      const { error: upsertError } = await supabase
        .from("games")
        .upsert(games, { onConflict: "espn_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }
    }

    // Return the games for immediate display
    const { data: allGames, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: true });

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
