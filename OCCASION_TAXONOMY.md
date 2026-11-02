# Wardrobe occasion taxonomy — canonical specification

Occasions are MULTI-SELECT TAGS on garments, not garment categories. A garment can have multiple occasions. The Stylist only considers garments with every selected activity tag. Labels are case-sensitive in stored canonical data.

## Canonical occasion tags (9)
- Daily — everyday wear
- Work — ordinary workplace clothing
- Date — date outfits
- Business — professional, business-formal or office dress codes
- Home — loungewear and at-home clothing
- Party — social parties and nightlife
- Sport — sports and athletic use (singular, not Sports)
- Dressy — weddings, galas, cocktail events, special-event outfits
- Specialty — activity- or destination-specific items outside the normal wardrobe: hiking boots, ski equipment, vacation-only clothing, costumes

## Migration and aliases
- Legacy **Formal** → **Business**, NEVER Dressy.
- Legacy **Special** → **Dressy**, NEVER Specialty.
- **Specialty** is a NEW category tag and must not be assigned to existing Special garments automatically.
- Normalize aliases on import, local storage, cloud load, and before cloud save.
- Deduplicate mapped tags and preserve all other tags.
- Do not map Business to Dressy or Party to Dressy.
- 'Sport' remains spelled Sport (singular).

## Applies to
- Add Item and Edit Item occasion checkboxes
- Stylist schedule/activity dropdown
- Compatibility-related occasion restrictions (Home-only logic remains unchanged)
- Saved Supabase garment occasions
- Imported or older browser-local wardrobe data

No existing pairwise compatibility votes should be deleted or reset by a tag migration.

## Specialty compatibility policy
- Any garment tagged **Specialty** is excluded from the Compatibility Trainer, even when it also has Daily, Work, Date, or other occasion tags.
- Do not offer any pair involving a Specialty garment for voting, and do not include these pairs in trainer progress counts.
- The Stylist must not require approval for Specialty-involving pairs, since they cannot be trained. An explicit preexisting rejection may still be honored.
- Switching off Specialty restores normal compatibility eligibility. Existing votes are retained; do not delete them.
