# WE SWIM Partner Card

## Asset Storage

- Storage: Supabase Storage.
- Bucket: `partner-assets`.
- Recommended object path: `we-swim/logo.png`.
- Public URL format:
  `https://<project-ref>.supabase.co/storage/v1/object/public/partner-assets/we-swim/logo.png`

## Database Fields

- Table: `public.partner_cards`.
- Row key: `slug = 'we-swim'`.
- Logo field: `logo_url`.
- Owner fields: `owner_title`, `owner_name`.
- Contact fields: `supervisor_name`, `supervisor_phone`, `center_phone`, `center_phone_2`, `contact_phone`.

## Update Example

```sql
UPDATE public.partner_cards
SET
  logo_url = 'https://<project-ref>.supabase.co/storage/v1/object/public/partner-assets/we-swim/logo.png',
  owner_title = 'المالك',
  owner_name = 'كوتش أدهم زيدان',
  supervisor_name = 'هلا',
  supervisor_phone = '0930688165',
  center_phone = '0937727442',
  center_phone_2 = '0968593100'
WHERE slug = 'we-swim';
```

## Files

- Migration: `supabase/migrations/022_partner_cards_we_swim.sql`.
- Contact update migration: `supabase/migrations/023_we_swim_contact_numbers.sql`.
- Owner/manager wording migration: `supabase/migrations/024_we_swim_owner_manager_labels.sql`.
- API: `src/app/api/portal/partners/route.ts`.
- UI: `src/app/portal/gym-info/page.tsx`.
