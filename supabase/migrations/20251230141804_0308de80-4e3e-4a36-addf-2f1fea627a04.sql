-- Create updated_at function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create bars table to store discovered bars
CREATE TABLE public.bars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  osm_id BIGINT UNIQUE,
  name TEXT NOT NULL,
  type TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  opening_hours TEXT,
  website TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;

-- Bars are publicly readable (they're public venues)
CREATE POLICY "Bars are publicly readable"
ON public.bars
FOR SELECT
USING (true);

-- Anyone can insert bars (public data)
CREATE POLICY "Anyone can insert bars"
ON public.bars
FOR INSERT
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_bars_updated_at
BEFORE UPDATE ON public.bars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for geospatial queries
CREATE INDEX idx_bars_location ON public.bars (latitude, longitude);