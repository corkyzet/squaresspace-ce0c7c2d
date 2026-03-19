import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

// Hardcoded squares fallback (from the official grid image)
// Format: SQUARES_DATA[win_digit][lose_digit] = owner_name
const SQUARES_DATA: Record<number, Record<number, string>> = {
  5: { 4: "Elias Papalios", 3: "Brendan Smith", 0: "Brendan Shea", 6: "Kevin Murphy", 2: "Stephen Medow", 9: "Carl Forster", 7: "Peter Liebeskind", 1: "Joe Liebeskind", 8: "Dara & Jason Liebeskind", 5: "Colin Mansfield" },
  8: { 4: "Frank Scappaticci", 3: "Gary Levine", 0: "David Zion", 6: "Alex Cohen-Smith", 2: "Michael Distenfeld", 9: "Alyx Steinberg", 7: "Colin Mansfield", 1: "Brendan Shea", 8: "Jeffrey Kaplan", 5: "Josh Klosk" },
  6: { 4: "Jeff Lichtstein", 3: "Shaun Gluss", 0: "Jon Gottlieb", 6: "Colin Mansfield", 2: "Mike Brodsky", 9: "Mindy Kennedy", 7: "Mike Tully", 1: "Adam Fixelle", 8: "Hunter Tomko", 5: "Cory Dalin" },
  1: { 4: "Andrew Feldman", 3: "Marty Zettler", 0: "Michael Baldauff", 6: "Jamie Kennedy", 2: "Jenn Fuller", 9: "Brandon Resnick", 7: "Andrew Oppenheimer", 1: "Neil Sandler", 8: "Harrison Katz", 5: "Carl Forster" },
  7: { 4: "Michael Lynch", 3: "Mark Kaplowitz", 0: "John Young", 6: "Jeffrey Kaplan", 2: "Josh Klosk", 9: "Andrew Feldman", 7: "Jon Gottlieb", 1: "Bryan Bloom", 8: "Brendan Smith", 5: "Joe Liebeskind" },
  2: { 4: "Brandon Resnick", 3: "Alex Cohen-Smith", 0: "Corey Zettler", 6: "Alexa Rivadeneira", 2: "Davis Najdecki", 9: "Adam Fixelle", 7: "Jon Diamond", 1: "James Nally", 8: "Eric Woznichak", 5: "John Young" },
  4: { 4: "james Nally", 3: "Brandon Resnick", 0: "Carl Forster", 6: "Andres Patino", 2: "Andrew Oppenheimer", 9: "Pete Liebeskind", 7: "Corey Zettler", 1: "Robert (Bingo) Smith", 8: "Matthew Futterman", 5: "David Zion" },
  0: { 4: "John Zisa", 3: "Josh Klosk", 0: "Davis Najdecki", 6: "Dave Trias", 2: "Chris Kennedy", 9: "David Zion", 7: "Bryan Bloom", 1: "Jaclyn Lindsay", 8: "Mike Tully", 5: "Jon Gottlieb" },
  9: { 4: "Brendan Smith", 3: "Jenny Forster", 0: "Dave Lichtstein", 6: "Scott Yerganian", 2: "Jeffrey Kaplan", 9: "james Nally", 7: "Kevin Murphy", 1: "Arup Sen", 8: "Diane Vo", 5: "Jon Diamond" },
  3: { 4: "Shaun Gluss", 3: "Jenn Fuller", 0: "Charlie Waldburger", 6: "Adam Liebeskind", 2: "Dave Zettler", 9: "John Young", 7: "Tyler Zettler", 1: "Chrissy Lo", 8: "Cristina Young", 5: "Bryan Bloom" },
};

function getSquaresFallback() {
  const squares: any[] = [];
  for (const [w, losers] of Object.entries(SQUARES_DATA)) {
    for (const [l, name] of Object.entries(losers)) {
      squares.push({
        id: `fallback-${w}-${l}`,
        win_digit: parseInt(w),
        lose_digit: parseInt(l),
        owner_name: name,
      });
    }
  }
  return squares;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
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

    // Single API call with full tournament date range
    const today = new Date();
    const year = today.getFullYear();
    const startDate = `${year}0317`;
    const endDate = `${year}0408`;
    
    const allEvents = await fetchGamesForDate(`${startDate}-${endDate}`);
    
    console.log(`Found ${allEvents.length} total events`);

    const games = allEvents.map(parseEvent);

    // Try DB with timeout, fall back gracefully
    let dbGames = null;
    let dbSquares = null;
    const dbTimeout = <T>(promise: Promise<T>, ms = 5000): Promise<T | null> =>
      Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

    try {
      if (games.length > 0) {
        const upsertResult = await dbTimeout(
          supabase.from("games").upsert(games, { onConflict: "espn_id" })
        );
        if (upsertResult && (upsertResult as any).error) {
          console.error("Upsert error (non-fatal):", (upsertResult as any).error);
        }
      }

      const selectResult = await dbTimeout(
        supabase.from("games").select("*").order("start_time", { ascending: true, nullsFirst: false })
      );
      if (selectResult && !(selectResult as any).error) {
        dbGames = (selectResult as any).data;
      }

      const squaresResult = await dbTimeout(
        supabase.from("squares").select("*")
      );
      if (squaresResult && !(squaresResult as any).error) {
        dbSquares = (squaresResult as any).data;
      }
    } catch (dbErr) {
      console.error("DB connection error (non-fatal):", dbErr);
    }

    const returnGames = dbGames || games.sort((a: any, b: any) => 
      (a.start_time || "").localeCompare(b.start_time || "")
    );

    // Use DB squares if available, otherwise use hardcoded fallback
    const returnSquares = dbSquares || getSquaresFallback();

    return new Response(
      JSON.stringify({ success: true, count: returnGames.length, games: returnGames, squares: returnSquares }),
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
