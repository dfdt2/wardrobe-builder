-- Applied through Supabase migration: simplify_garment_fields_and_occasions.
UPDATE public.garments g SET occasions=COALESCE((SELECT array_agg(DISTINCT mapped ORDER BY mapped) FROM (SELECT CASE lower(trim(x)) WHEN 'daily' THEN 'Daily' WHEN 'work' THEN 'Work' WHEN 'date' THEN 'Date' WHEN 'formal' THEN 'Business' WHEN 'business' THEN 'Business' WHEN 'home' THEN 'Home' WHEN 'party' THEN 'Party' WHEN 'sport' THEN 'Sport' WHEN 'sports' THEN 'Sport' WHEN 'special' THEN 'Special' ELSE NULL END AS mapped FROM unnest(g.occasions) AS x) q WHERE mapped IS NOT NULL), ARRAY[]::text[]);
ALTER TABLE public.garments
DROP COLUMN IF EXISTS material_percentages,
DROP COLUMN IF EXISTS neckline,
DROP COLUMN IF EXISTS fit,
DROP COLUMN IF EXISTS sleeve_length,
DROP COLUMN IF EXISTS garment_length,
DROP COLUMN IF EXISTS size_label,
DROP COLUMN IF EXISTS purchase_price,
DROP COLUMN IF EXISTS purchase_currency,
DROP COLUMN IF EXISTS image_source,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS archived;
ALTER TABLE public.garments ADD CONSTRAINT garment_occasions_allowed CHECK (occasions <@ ARRAY['Daily','Work','Date','Business','Home','Party','Sport','Special']::text[]);