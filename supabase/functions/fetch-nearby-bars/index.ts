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

    // Query OpenStreetMap Overpass API for bars, pubs, and nightclubs
    const overpassQuery = `
      [out:json][timeout:25];
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

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) {
      console.error('Overpass API error:', response.status);
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.elements?.length || 0} bars from OpenStreetMap`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process and store bars
    const bars = (data.elements || [])
      .filter((el: OSMElement) => el.tags?.name)
      .map((el: OSMElement) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        
        // Calculate distance using Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const φ1 = latitude * Math.PI / 180;
        const φ2 = lat! * Math.PI / 180;
        const Δφ = (lat! - latitude) * Math.PI / 180;
        const Δλ = (lon! - longitude) * Math.PI / 180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Map amenity type to friendly name
        const typeMap: Record<string, string> = {
          bar: 'Bar',
          pub: 'Pub',
          nightclub: 'Nightclub',
          biergarten: 'Beer Garden',
        };

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
          distance, // Not stored, just for response
        };
      });

    // Upsert bars to database (ignoring conflicts on osm_id)
    if (bars.length > 0) {
      const barsToStore = bars.map(({ distance, ...bar }: { distance: number; osm_id: number; name: string; type: string; latitude: number; longitude: number; address: string | null; opening_hours: string | null; website: string | null; phone: string | null }) => bar);
      
      const { error: upsertError } = await supabase
        .from('bars')
        .upsert(barsToStore, { onConflict: 'osm_id', ignoreDuplicates: true });

      if (upsertError) {
        console.error('Error storing bars:', upsertError);
      } else {
        console.log(`Stored/updated ${barsToStore.length} bars in database`);
      }
    }

    // Sort by distance and return
    const sortedBars = bars.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

    return new Response(
      JSON.stringify({ bars: sortedBars, count: sortedBars.length }),
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
