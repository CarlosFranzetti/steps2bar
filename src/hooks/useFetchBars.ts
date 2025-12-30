import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Bar {
  id: string;
  osm_id?: number;
  name: string;
  distance: number;
  type: string;
  latitude: number;
  longitude: number;
  address?: string;
  opening_hours?: string;
  website?: string;
  phone?: string;
}

export const useFetchBars = () => {
  const [bars, setBars] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBars = async (latitude: number, longitude: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-nearby-bars', {
        body: { latitude, longitude, radius: 2000 }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const barsWithId = data.bars.map((bar: Omit<Bar, 'id'> & { osm_id?: number }, index: number) => ({
        ...bar,
        id: bar.osm_id?.toString() || `bar-${index}`,
      }));

      setBars(barsWithId);
      return barsWithId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch bars';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { bars, isLoading, error, fetchBars };
};
