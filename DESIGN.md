# DESIGN.md: CHICKCHAU Visual & Product Direction

## Design Read
Reading this as: Urban street-food direct ordering web app for Indonesian food lovers, in a bold editorial poster-menu language, dial `ENERGY 3 / RHYTHM 3 / MOTION 1`.

Dial: ENERGY 3 / RHYTHM 3 / MOTION 1

## Brand Identity & Personality
- **Brand Name**: CHICKCHAU
- **Tagline**: Crispy Bites, Creamy Sips.
- **Character**: Bold, urban, editorial, direct, and appetite-driven. Built around two signature items: **Shihlin (Taiwanese-style crispy chicken)** and **Cappuccino Cincau (Capcin)**.

## Color System & Contrast Verification (R-01, R-25, R-29)
- **Soft Pearl (`#F2F1ED`)**: Primary canvas (60% allocation) chosen to evoke warm printed menu paper and prevent harsh white glare on mobile screens.
- **Crisp White (`#FFFFFF`)**: Foreground surface for product boards and form containers to separate interactive workspaces from the page canvas.
- **Deep Ink (`#21191A`)**: Primary typography and structural contrast block (15.05:1 contrast on `#F2F1ED`, 17.42:1 on `#FFFFFF`).
- **Warm Charcoal (`#524346`)**: Secondary metadata and helper text color (7.48:1 contrast on `#F2F1ED`, 8.65:1 on `#FFFFFF`), ensuring all supporting copy passes WCAG AA 4.5:1.
- **Primary Crimson (`#710014`)**: Single high-intent accent color (10% allocation) reserved for primary action buttons, active cart counters, and map delivery pins (9.24:1 contrast with `#FFFFFF` text).
- **Muted Rose (`#D9B8BC`)**: Secondary typographic accent used strictly on dark `#21191A` surfaces (9.27:1 contrast on `#21191A`).

## Typography & Hierarchy (R-06)
- **Display Face (`Anton`)**: Condensed, heavy sans-serif chosen to give section headers the visual weight of urban street-food signage.
- **Body & UI Face (`Plus Jakarta Sans`)**: Clean geometric sans-serif with `tabular-nums` selected for clear Rupiah price scanning and form legibility on mobile viewports.

## One-Line Decision Log (R-31)
- **Why this color palette**: Derived directly from the CHICKCHAU brand profile using a 60-30-10 split with zero decorative gradients or glows.
- **Why this layout (RHYTHM 3)**: Each section changes composition (asymmetric poster hero -> full-width dark manifesto strip -> 2-column architectural menu ledger -> interactive map checkout) to match its specific content role.
- **Why this typography**: Condensed display headings create immediate street-food poster impact while geometric body text keeps prices and checkout inputs effortless to read.
- **Why this spacing**: Fluid section spacing (`py-8` on mobile, `py-12` on tablet, `py-16` on desktop) prevents vertical dead space on phones while maintaining editorial breathing room on wide screens.
- **Why use bordered menu boards**: Solid `1px` borders (`border-[#21191A]/20`) group product artwork, price, and quantity steppers into scannable purchase modules without floating shadows.
- **Why bespoke SVG food illustrations**: Custom vector illustrations of Shihlin chicken cuts and layered Cappuccino Cincau represent the exact two products without risking unverified stock photos or broken external image URLs.
- **Why functional icons only**: Icons are restricted to interactive affordances (cart bag, quantity plus/minus, item delete, map pin, settings dialog) paired with clear text labels.
- **Why MOTION 1**: Instant `150ms` state transitions and tactile button press feedback keep ordering fast and distraction-free without continuous looping animations.
