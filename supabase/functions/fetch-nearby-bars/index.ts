import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now >= data.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}

// Check and update rate limit for an IP
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  cleanupRateLimitStore();
  
  const existing = rateLimitStore.get(ip);
  
  if (!existing || now >= existing.resetTime) {
    // New window - allow and set count to 1
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetIn: existing.resetTime - now };
  }
  
  // Increment count
  existing.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - existing.count, resetIn: existing.resetTime - now };
}

// Get client IP from request headers
function getClientIP(req: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  // Fallback - use a generic identifier
  return 'unknown';
}

interface OSMElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    amenity?: string;
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

  // Get client IP and check rate limit
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(clientIP);
  
  // Add rate limit headers to all responses
  const rateLimitHeaders = {
    ...corsHeaders,
    'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { 
        status: 429, 
        headers: { 
          ...rateLimitHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
        } 
      }
    );
  }

  try {
    const body = await req.json();
    
    // Type validation
    const latitude = typeof body.latitude === 'number' ? body.latitude : NaN;
    const longitude = typeof body.longitude === 'number' ? body.longitude : NaN;
    const radius = typeof body.radius === 'number' ? body.radius : 2000;

    // Validate latitude and longitude are valid numbers
    if (isNaN(latitude) || isNaN(longitude)) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude must be valid numbers' }),
        { status: 400, headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate latitude range (-90 to 90)
    if (latitude < -90 || latitude > 90) {
      return new Response(
        JSON.stringify({ error: 'Latitude must be between -90 and 90' }),
        { status: 400, headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate longitude range (-180 to 180)
    if (longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: 'Longitude must be between -180 and 180' }),
        { status: 400, headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate radius (100m to 10km)
    const validatedRadius = isNaN(radius) || radius < 100 || radius > 10000 ? 2000 : radius;

    console.log(`Fetching bars near ${latitude}, ${longitude} within ${validatedRadius}m (IP: ${clientIP})`);

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
        node["amenity"="bar"](around:${validatedRadius},${latitude},${longitude});
        node["amenity"="pub"](around:${validatedRadius},${latitude},${longitude});
        node["amenity"="nightclub"](around:${validatedRadius},${latitude},${longitude});
        node["amenity"="biergarten"](around:${validatedRadius},${latitude},${longitude});
        way["amenity"="bar"](around:${validatedRadius},${latitude},${longitude});
        way["amenity"="pub"](around:${validatedRadius},${latitude},${longitude});
        way["amenity"="nightclub"](around:${validatedRadius},${latitude},${longitude});
        way["amenity"="biergarten"](around:${validatedRadius},${latitude},${longitude});
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

          const tags = el.tags ?? {};
          const getTag = (...keys: string[]) => keys.map((k) => tags[k]).find(Boolean) ?? null;

          const fullAddr = getTag('addr:full');
          const house = getTag('addr:housenumber');
          const street = getTag('addr:street');
          const city = getTag('addr:city');
          const state = getTag('addr:state');
          const postcode = getTag('addr:postcode');

          const address =
            fullAddr ||
            [
              [house, street].filter(Boolean).join(' '),
              city,
              state,
              postcode,
            ]
              .filter(Boolean)
              .join(', ') ||
            null;

          return {
            osm_id: el.id,
            name: tags.name!,
            type: typeMap[tags.amenity || 'bar'] || 'Bar',
            latitude: lat,
            longitude: lon,
            address,
            opening_hours: getTag('opening_hours'),
            website: getTag('website', 'contact:website'),
            phone: getTag('phone', 'contact:phone', 'phone:mobile'),
            distance,
          };
        });

      // Upsert bars to database
      if (bars.length > 0) {
        const barsToStore = bars.map(({ distance, ...bar }) => bar);
        
        const { error: upsertError } = await supabase
          .from('bars')
          .upsert(barsToStore, { onConflict: 'osm_id' });

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
      const latDelta = validatedRadius / 111000; // ~111km per degree latitude
      const lonDelta = validatedRadius / (111000 * Math.cos(latitude * Math.PI / 180));

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
      })).filter((bar) => bar.distance <= validatedRadius);
    }

    // Sort by distance and return
    const sortedBars = bars.sort((a, b) => a.distance - b.distance);

    return new Response(
      JSON.stringify({ bars: sortedBars, count: sortedBars.length, fromCache }),
      { headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching bars:', error);
    // Return generic error to clients - keep detailed logging server-side only
    return new Response(
      JSON.stringify({ error: 'Unable to fetch nearby bars. Please try again later.' }),
      { status: 500, headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
