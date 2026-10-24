-- Already applied to Supabase as standardize_wardrobe_categories.
UPDATE public.garments SET subcategory = CASE WHEN category='Pants' AND subcategory='Athletic shorts' THEN 'Shorts' WHEN category='Shoes' AND subcategory IN ('Sneakers > Platform','Sneakers > Running') THEN 'Sneakers' WHEN category='Outerwear' AND subcategory='Trench Coat' THEN 'Trench coat' ELSE subcategory END WHERE (category='Pants' AND subcategory='Athletic shorts') OR (category='Shoes' AND subcategory IN ('Sneakers > Platform','Sneakers > Running')) OR (category='Outerwear' AND subcategory='Trench Coat');
ALTER TABLE public.garments ADD CONSTRAINT garment_category_subcategory_valid CHECK ((category = 'Tops' AND subcategory IN ('T-shirt', 'Tank top', 'Shirt', 'Sweatshirt', 'Sweater'))
 OR (category = 'Dresses' AND subcategory IN ('Nightgown', 'Fancy', 'Casual'))
 OR (category = 'Pants' AND subcategory IN ('Shorts', 'Jeans', 'Trousers', 'Track pants', 'Leggings', 'Pajama pants'))
 OR (category = 'Skirts' AND subcategory IN ('Mini', 'Midi', 'Maxi'))
 OR (category = 'Outerwear' AND subcategory IN ('Trench coat', 'Fur coat', 'Jacket', 'Cardigan', 'Sports jacket', 'Puffer jacket'))
 OR (category = 'Shoes' AND subcategory IN ('Sneakers', 'Loafers', 'Flats', 'Heels', 'Sandals', 'Sandal heels', 'Boots'))
 OR (category = 'Bags' AND subcategory IN ('Tote bag', 'Shoulder bag', 'Crossbody', 'Waist', 'Canvas'))
 OR (category = 'Other' AND subcategory IN ('Hats', 'Jewelry', 'Underwear', 'Lingerie', 'Beachwear', 'Hair accessories', 'Scarves', 'Gloves', 'Belts')));
