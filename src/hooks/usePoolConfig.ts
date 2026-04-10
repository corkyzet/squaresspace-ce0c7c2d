import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenmoHandle {
  name: string;
  value: string;
  handle: string;
}

export interface Collector {
  value: string;
  label: string;
}

export interface PrizeStructure {
  R1: number;
  R2: number;
  SS: number;
  EE: number;
  FF: number;
  F: number;
  Rev: number;
}

export interface PoolConfig {
  venmoHandles: VenmoHandle[];
  collectors: Collector[];
  pricePerBoxCents: number;
  prizeStructure: PrizeStructure;
}

const FALLBACK: PoolConfig = {
  venmoHandles: [
    { name: "Corey", value: "corey", handle: "@corey-zettler" },
    { name: "Joe", value: "joe", handle: "@joe-liebeskind" },
    { name: "Coop", value: "coop", handle: "@David-Cooper-1" },
  ],
  collectors: [
    { value: "corey", label: "Corey" },
    { value: "joe", label: "Joe" },
    { value: "coop", label: "Coop" },
  ],
  pricePerBoxCents: 10000,
  prizeStructure: { R1: 5000, R2: 10000, SS: 20000, EE: 40000, FF: 80000, F: 150000, Rev: 50000 },
};

export function usePoolConfig(): PoolConfig {
  const { data } = useQuery({
    queryKey: ["pool-config"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("pool_config")
        .select("key, value");

      if (error || !rows || rows.length === 0) return FALLBACK;

      const map: Record<string, unknown> = {};
      for (const row of rows) map[row.key] = row.value;

      return {
        venmoHandles: (map["venmo_handles"] as VenmoHandle[]) ?? FALLBACK.venmoHandles,
        collectors: (map["collectors"] as Collector[]) ?? FALLBACK.collectors,
        pricePerBoxCents: (map["price_per_box_cents"] as number) ?? FALLBACK.pricePerBoxCents,
        prizeStructure: (map["prize_structure"] as PrizeStructure) ?? FALLBACK.prizeStructure,
      } satisfies PoolConfig;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return data ?? FALLBACK;
}
