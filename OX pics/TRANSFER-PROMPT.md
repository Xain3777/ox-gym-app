# OX GYM — Full Context Transfer Prompt

Copy everything below this line and paste it into any AI conversation to give it full context.

---

## WHO WE ARE

OX GYM is a premium hardcore fitness brand. The brand identity is built around a muscular bull (ox) mascot inside a hexagonal frame. The tagline is "Unleash Your Inner Beast." The gym's physical interior is designed with a dark industrial aesthetic — black matte surfaces, LED strip lighting on ceilings, yellow/gold accents on columns and walls, motivational typography painted directly on walls, and distinct station labels (CHEST, LEGS, BACK, CARDIO). The staircase has calorie markers on each step. The overall feeling is aggressive, premium, and industrial — like walking into a bunker crossed with a high-end training facility.

## THE APP

We are building a gym management web app (Next.js 14, TypeScript, Tailwind CSS, Supabase backend) that serves two audiences:

### Admin Side (gym owner/staff):
- **Dashboard**: Stats cards (active members, expiring soon, expired, plans sent), alerts for expiring members, recent member list
- **Members**: Full CRUD — add members with subscription plans (monthly/quarterly/semi-annual/annual), auto-calculated end dates, view individual member profiles with subscription history and plan send logs
- **Workout Plans**: Create plans with multiple days, each day has multiple exercises (name, sets, reps, rest time, notes). Plans have fitness level, duration, creator name
- **Send Plans**: 3-step wizard — select member, select plan, confirm and send
- **Subscriptions**: Table view of all subscriptions with status sorting and days-remaining calculation
- **Reminders**: Automated email reminders (7-day warning, 3-day warning, expired notice) via cron job. Email log table showing send history and status
- **Settings**: Placeholder for gym configuration

### Client Portal (gym members):
- **Home**: Quick links to workout, meals, profile
- **My Workout**: View assigned workout plan
- **My Meals**: View assigned meal plan
- **Profile**: Personal info display

### Tech Stack:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (custom design system)
- Supabase (database + auth + storage)
- Resend (email delivery)
- Zod (validation)
- Deployed on Vercel
- Bilingual: English + Arabic with RTL support

## BRAND DESIGN SYSTEM (already implemented in code)

### Colors:
- **Void**: #0A0A0A (deepest black)
- **Charcoal**: #1A1A1A (primary background)
- **Iron**: #2A2A2A (card backgrounds)
- **Gunmetal**: #3A3A3A (elevated surfaces)
- **Steel**: #4A4A4A (borders, dividers)
- **Slate**: #6B6B6B (muted text)
- **Silver**: #9CA3AF (secondary text)
- **Cloud**: #D1D5DB (light text)
- **Offwhite**: #F0EDE6 (primary text)
- **Gold**: #F5C100 (primary accent — used for highlights, active states, borders, headings)
- **Danger/Red**: #D42B2B (error states, destructive actions — ALSO the 10% accent color per 60-30-10 rule)
- **Success**: #5CC45C (positive states)

### Typography:
- **Display**: Bebas Neue — used for page titles, hero text, stat numbers
- **Body**: DM Sans — used for all body text, labels, descriptions
- **Mono**: DM Mono — used for metadata, timestamps, small labels

### Design Elements:
- **Zero border-radius**: Everything is sharp-edged. No rounded corners. Only 2px radius for small badges
- **Corner cuts**: CSS clip-path creates diagonal corner cuts (small, medium, large, double) — signature OX element
- **Hexagon clips**: Used for avatars and logo frames (matching the hexagonal logo shape)
- **Chevron patterns**: 45-degree repeating arrow stripes used as subtle background patterns
- **Hazard stripes**: Gold and black diagonal warning stripes used as section dividers
- **Gold glow**: Box shadows with gold tint for hover/focus states
- **Grunge aesthetic**: The physical gym uses scratched, weathered textures — the app should feel industrial but clean/digital

### 60-30-10 Color Rule:
- **60% — Black/Dark tones** (void, charcoal, iron): All backgrounds, surfaces, cards
- **30% — Gold/Yellow** (#F5C100): Borders, active nav items, headings, stat numbers, accent borders, hover glows
- **10% — Red** (#D42B2B): Call-to-action buttons, warning/danger states, notification dots, the "energy" accent — mirrors the red on the bull's horn tips in the logo

### Motion:
- Fade-up entrance animations (400ms)
- Slide-in from left (300ms)
- Gold pulse animation for attention elements
- Chevron march animation (moving arrow pattern)
- Loading sweep animation
- Easing: cubic-bezier(0.2, 0, 0, 1) — "snap" feel

### Layout Patterns:
- 8px base grid spacing
- Admin sidebar (desktop) + bottom nav (mobile)
- Client portal has its own sidebar/bottom nav
- TopBar component with eyebrow label + page title + action buttons
- Cards with gold top-border accent variant
- Tables with hover-highlight rows

## BRAND IMAGERY & VISUAL REFERENCES

The following images exist in the project under `OX pics/`:

### Logo (`logo/`):
- OX logo: Hexagonal frame containing a muscular bull head silhouette (white) with red-tipped horns. "OX" text integrated into the hexagon shape. Yellow/gold outline. Also includes "CAFE" text (the gym has an attached cafe)

### Posters (`posters/`):
- Muscular bull mascot illustrations (white on black, high contrast)
- Motivational text posters: "POWER", "HARDER BETTER FASTER STRONGER", "NO LIMIT", "DANGER", "UNLEASH YOUR INNER BEAST"
- Design patterns: Chevron arrows, hazard stripes, hexagon grids, grunge/distressed textures
- Color scheme: Exclusively black + golden yellow + white, with occasional red accents
- Typography style: Ultra-condensed, uppercase, industrial/warning aesthetic
- "Under Construction" themed graphics (chevrons, warning stripes)

### Interior Renders (`renders/`):
- Full 3D renders of the gym interior showing:
  - Dark matte tile flooring
  - Black walls with yellow motivational text painted on them
  - LED strip lighting on ceiling (white linear strips)
  - Yellow-wrapped columns as accent elements
  - Station labels: "CHEST STATION", "LEGS STATION", "BACK", "CARDIO"
  - OX GYM logo on main wall with "walk in strong" tagline
  - Hexagonal pattern decorations on walls
  - Hazard stripe borders around equipment zones
  - Staircase with calorie markers (-0.30 CAL, -0.40 CAL, etc.) on each step
  - "NEVER GIVE UP", "FIND TIME TO TRAIN HARD" wall text
  - Cafe/lounge area with high chairs, OX logo backdrop
  - Bull mascot silhouette murals on yellow accent walls
  - Perforated metal/mesh textures on some wall panels

## WHAT NEEDS TO HAPPEN NEXT

The MVP app is functional but the design can be enhanced to feel more like the physical OX GYM experience. Key improvements to consider:

1. **Red accent integration**: Add the 10% red as a "smudge" throughout — not overwhelming, but present in key interaction points (primary CTAs, notification badges, active/hover micro-accents, progress indicators)

2. **Richer visual texture**: The gym's physical space has grunge, scratches, perforated metal, and brushstroke effects. The app can incorporate subtle CSS texture overlays, noise backgrounds, or pattern variations to add depth without sacrificing usability

3. **Stronger typography hierarchy**: The gym uses massive, bold, condensed motivational text. The app's display headings should feel equally powerful — large Bebas Neue headlines, potentially with letter-spacing adjustments

4. **Hexagon motif**: The logo is hexagonal. Consider using hexagon shapes more prominently — stat cards, avatar frames, decorative elements, section dividers

5. **Chevron/arrow energy**: The posters and gym interior heavily use directional chevron arrows. These can appear as decorative elements in loading states, progress indicators, section transitions

6. **Station-like sections**: The gym labels zones (CHEST STATION, LEGS STATION). The app could adopt this labeling style for dashboard sections using the eyebrow/label typography

7. **The OX logo** should be prominently placed — sidebar header, login page, loading screens

8. **Image generation needs**: The app currently has NO images in public/. It needs:
   - A hero/banner image or background for the login/landing page
   - Possibly textured background tiles (grunge, concrete, metal)
   - The OX logo optimized for web (SVG preferred)
   - Potentially a simplified bull mascot illustration for empty states

## IMAGE GENERATION PROMPTS (for Midjourney, DALL-E, Ideogram, etc.)

Use these to generate assets for the app:

### Hero Background:
"Dark industrial gym interior, black matte surfaces, golden yellow LED accent lighting, moody dramatic lighting, hazard stripe details, premium fitness facility, ultra-wide cinematic composition, 8K, dark and atmospheric, no people, no text"

### Textured Background Tile:
"Seamless dark concrete texture with subtle scratches and wear marks, nearly black with faint gray variations, industrial floor surface, tileable pattern, matte finish, 2K resolution"

### Grunge Overlay:
"Seamless grunge texture overlay, scratches and distress marks on transparent background, subtle worn metal surface, black and white, high contrast, tileable, PNG with transparency"

### Bull Mascot (simplified for web):
"Minimalist muscular bull silhouette, front-facing aggressive stance, thick bold outlines, white on pure black background, gym mascot style, vector art aesthetic, clean edges, no background noise, symmetrical"

### Empty State Illustration:
"Minimalist line art of a barbell on the ground, thin golden yellow lines on pure black background, simple geometric style, gym equipment icon, clean modern illustration"

---

**End of transfer prompt. Copy everything above and paste into a new AI conversation for full context.**
