import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntrantsList } from "@/components/admin/EntrantsList";
import { GridManager } from "@/components/admin/GridManager";
import { PaymentTracker } from "@/components/admin/PaymentTracker";
import { SeasonSelector } from "@/components/admin/SeasonSelector";
import { ArrowLeft, LogOut, Users, Grid3X3, DollarSign, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Season {
  id: string;
  year: number;
  is_active: boolean;
}

export default function Admin() {
  const { user, logout } = useAuth();

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, year, is_active")
        .order("year", { ascending: false });
      if (error) throw error;
      return data as Season[];
    },
  });

  const activeSeason = seasons.find((s) => s.is_active);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Default to active season, then fall back to first available
  const viewingSeasonId = selectedSeasonId ?? activeSeason?.id ?? seasons[0]?.id ?? null;
  const viewingSeason = seasons.find((s) => s.id === viewingSeasonId);

  return (
    <div className="min-h-screen flex flex-col fd-gradient">
      {/* Header */}
      <header className="border-b border-[hsl(215_30%_16%)] px-4 py-3 flex items-center justify-between bg-[hsl(220_35%_5%/0.8)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">
            ADMIN <span className="text-primary">DASHBOARD</span>
          </h1>
          {viewingSeason && (
            <span className="text-xs font-medium text-muted-foreground">
              — {viewingSeason.year} season
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">{user?.email}</span>
          <Button size="sm" variant="ghost" onClick={logout} className="gap-1 text-xs text-muted-foreground hover:text-primary">
            <LogOut className="w-3 h-3" /> Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {!viewingSeasonId ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">No seasons found. Create one in the Seasons tab.</p>
          </div>
        ) : (
          <Tabs defaultValue="entrants" className="space-y-4">
            <TabsList className="bg-foreground/5 border border-foreground/10">
              <TabsTrigger value="entrants" className="gap-1 text-xs font-mono-display">
                <Users className="w-3 h-3" /> Entrants
              </TabsTrigger>
              <TabsTrigger value="grid" className="gap-1 text-xs font-mono-display">
                <Grid3X3 className="w-3 h-3" /> Grid
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1 text-xs font-mono-display">
                <DollarSign className="w-3 h-3" /> Payments
              </TabsTrigger>
              <TabsTrigger value="seasons" className="gap-1 text-xs font-mono-display">
                <CalendarDays className="w-3 h-3" /> Seasons
              </TabsTrigger>
            </TabsList>

            <TabsContent value="entrants">
              <EntrantsList seasonId={viewingSeasonId} />
            </TabsContent>

            <TabsContent value="grid">
              <GridManager seasonId={viewingSeasonId} />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentTracker seasonId={viewingSeasonId} />
            </TabsContent>

            <TabsContent value="seasons">
              <SeasonSelector activeSeasonId={viewingSeasonId} onSelectSeason={setSelectedSeasonId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
