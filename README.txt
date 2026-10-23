WARDROBE BUILDER — Starter Supabase / GitHub Pages app

This contains 10 starter garments, an Acloset-style catalog, item details, three eligible compatibility pair types (Tops–Bottoms, Bottoms–Shoes, Bottoms–Outerwear), and network view. The schema stores garment attributes and weather properties together.

SETUP
1. Create a Supabase project at https://supabase.com/dashboard.
2. In Supabase SQL Editor run wardrobe_supabase_schema.sql.
3. In Storage create a PRIVATE bucket named garment-images.
4. In SQL Editor run wardrobe_storage_policies.sql.
5. In Supabase Authentication settings enable email/password sign-in.
6. Upload all contents of this folder (index.html, cloud.js, seed.js, images/ etc.) to the ROOT of a GitHub repository.
7. In GitHub repository Settings > Pages, Deploy from branch: main, folder / (root). Open published URL.
8. In the app choose ... > Settings; enter your Supabase Project URL and PUBLISHABLE key from dashboard (never service_role/secret). Save.
9. Create your account and sign in. Confirm email if required.
10. Export a JSON backup, then press Upload this wardrobe. Verify via Load cloud data.

CAVEATS
- This is a STARTER build, not production ready. Sync is MANUAL: local edits remain local until Upload; Load replaces local state. Avoid editing from multiple devices.
- Screenshots can have truncated attributes; review imported garment metadata.
- A data-loss-safe cloud sync, user-upload image handling, and role-specific outfit semantics require additional work.
- Never publish private keys or personal data directly into repository source. Public GitHub Pages source files are visible.
