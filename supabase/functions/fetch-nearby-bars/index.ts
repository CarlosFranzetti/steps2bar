import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
    addr_street?: string;
    addr_housenumber?: string;
    addr_city?: string;
    opening_hours?: string;
    website?: string;
    phone?: string;
    [key: string]: string | undefined;
  };
}

// Calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Retry fetch with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || i === maxRetries) {
        return response;
      }
      // Wait before retry: 1s, 2s
      await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
    } catch (error) {
      if (i === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
    }
  }
  throw new Error('Max retries reached');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, radius = 2000 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching bars near ${latitude}, ${longitude} within ${radius}m`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let bars: any[] = [];
    let fromCache = false;

    // Query OpenStreetMap Overpass API for bars, pubs, and nightclubs
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"="bar"](around:${radius},${latitude},${longitude});
        node["amenity"="pub"](around:${radius},${latitude},${longitude});
        node["amenity"="nightclub"](around:${radius},${latitude},${longitude});
        node["amenity"="biergarten"](around:${radius},${latitude},${longitude});
        way["amenity"="bar"](around:${radius},${latitude},${longitude});
        way["amenity"="pub"](around:${radius},${latitude},${longitude});
        way["amenity"="nightclub"](around:${radius},${latitude},${longitude});
        way["amenity"="biergarten"](around:${radius},${latitude},${longitude});
      );
      out center;
    `;

    try {
      const overpassUrl = 'https://overpass-api.de/api/interpreter';
      const response = await fetchWithRetry(overpassUrl, {
        method: 'POST',
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, 1);

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Found ${data.elements?.length || 0} bars from OpenStreetMap`);

      // Map amenity type to friendly name
      const typeMap: Record<string, string> = {
        bar: 'Bar',
        pub: 'Pub',
        nightclub: 'Nightclub',
        biergarten: 'Beer Garden',
      };

      // Process bars from API
      bars = (data.elements || [])
        .filter((el: OSMElement) => el.tags?.name)
        .map((el: OSMElement) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          const distance = calculateDistance(latitude, longitude, lat!, lon!);

          return {
            osm_id: el.id,
            name: el.tags!.name!,
            type: typeMap[el.tags!.amenity || 'bar'] || 'Bar',
            latitude: lat,
            longitude: lon,
            address: [el.tags?.addr_housenumber, el.tags?.addr_street, el.tags?.addr_city]
              .filter(Boolean).join(', ') || null,
            opening_hours: el.tags?.opening_hours || null,
            website: el.tags?.website || null,
            phone: el.tags?.phone || null,
            distance,
          };
        });

      // Upsert bars to database
      if (bars.length > 0) {
        const barsToStore = bars.map(({ distance, ...bar }) => bar);
        
        const { error: upsertError } = await supabase
          .from('bars')
          .upsert(barsToStore, { onConflict: 'osm_id', ignoreDuplicates: true });

        if (upsertError) {
          console.error('Error storing bars:', upsertError);
        } else {
          console.log(`Stored/updated ${barsToStore.length} bars in database`);
        }
      }

    } catch (apiError) {
      console.warn('Overpass API failed, falling back to database cache:', apiError);
      fromCache = true;

      // Fallback: Query cached bars from database within approximate bounding box
      const latDelta = radius / 111000; // ~111km per degree latitude
      const lonDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180));

      const { data: cachedBars, error: dbError } = await supabase
        .from('bars')
        .select('*')
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lonDelta)
        .lte('longitude', longitude + lonDelta);

      if (dbError) {
        console.error('Database fallback error:', dbError);
        throw new Error('Failed to fetch bars from API and database');
      }

      console.log(`Found ${cachedBars?.length || 0} bars from database cache`);

      // Calculate distances for cached bars
      bars = (cachedBars || []).map((bar) => ({
        ...bar,
        distance: calculateDistance(latitude, longitude, bar.latitude, bar.longitude),
      })).filter((bar) => bar.distance <= radius);
    }

    // Sort by distance and return
    const sortedBars = bars.sort((a, b) => a.distance - b.distance);

    return new Response(
      JSON.stringify({ bars: sortedBars, count: sortedBars.length, fromCache }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching bars:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
