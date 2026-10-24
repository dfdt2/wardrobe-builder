-- Applied in Supabase: add_generated_warmth_contribution
-- Display-only estimated contribution in degrees Fahrenheit (heuristic factor: 25 °F/clo).
ALTER TABLE public.garments ADD COLUMN warmth_contribution_f numeric(6,2) GENERATED ALWAYS AS (round(insulation_clo_estimate * 25, 2)) STORED;
