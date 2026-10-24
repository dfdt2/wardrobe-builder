-- Already applied in Supabase: temperature_only_garment_fields
ALTER TABLE public.garments
 DROP COLUMN IF EXISTS warmth_rating,
 DROP COLUMN IF EXISTS warmth_source,
 DROP COLUMN IF EXISTS wind_resistance,
 DROP COLUMN IF EXISTS water_resistance,
 DROP COLUMN IF EXISTS wet_weather_sensitivity,
 DROP COLUMN IF EXISTS traction_rating,
 DROP COLUMN IF EXISTS layering_role,
 DROP COLUMN IF EXISTS coverage_regions;