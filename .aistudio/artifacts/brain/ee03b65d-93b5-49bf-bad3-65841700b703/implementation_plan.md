# CHICKCHAU Anti-Slop Refinement (UI, Mobile Layout, Contrast & Copywriting)

This plan applies the Anti-Slop standards (`antislop-ui`, `antislop-layoutmobile`, `antislop-human`, and specific product copywriting) to the existing CHICKCHAU storefront and checkout experience while preserving the CHICKCHAU burgundy-and-cream reference visual identity and leaving environment variables untouched for manual entry later.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions incorporate your confirmed preferences from our clarification step and govern the upcoming execution.

- **Confirmed Scope**: Focus execution on **UI Anti-Slop**, **Mobile Layout & Touch Targets**, and **Human Contrast Accessibility**, paired with concrete product and Bali service copywriting.
- **Confirmed Visual Identity**: Preserve the CHICKCHAU reference visual direction (warm cream `#FFF7F0` canvas, deep burgundy `#710014` accents, organic curved shapes, and transparent product cutouts) while eliminating AI-slop artifacts.
- **Confirmed Copywriting Direction**: Replace vague promotional clichés with specific, factual descriptions of **Cappuccino Cincau (Capcin 250 ml, Rp7.000)**, **Shihlin Taiwanese-Style Crispy Chicken (Rp30.000)**, and **Sistem Pre-Order (Minimal H-1)** for **Tabanan & Denpasar, Bali**, with zero em-dashes (`—`).
- **Confirmed Environment Variable Handling**: Leave environment variables untouched for manual configuration later; all client and server integrations continue to degrade gracefully when optional keys are not yet populated.

---

### 1. Overview & Core Concept

- **What It Does**: Elevates the CHICKCHAU storefront and WhatsApp pre-order checkout to pass the strict Anti-Slop Delivery Gate across UI restraint, mobile ergonomics, WCAG AA contrast mathematics, and factual copywriting.
- **Target Audience / Persona**: Customers in Tabanan and Denpasar, Bali ordering Cappuccino Cincau and Shihlin crispy chicken on mobile or desktop for H-1 pre-order delivery.
- **Key Value**: Removes generic AI visual tells (such as sparkle icons, redundant pill badges, under-sized stepper buttons, and low-contrast muted text) so every element feels intentionally crafted, legible in bright sunlight, and effortless to tap on a phone screen.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Landing & Menu Browsing**: Visitors land on the hero showcase featuring the transparent Capcin bottle and Shihlin paper bag over the organic burgundy shape, read clear H-1 Pre-Order terms for Tabanan & Denpasar, and adjust quantities using full `44×44px` touch steppers.
  2. **Cart & Bali Map Checkout**: Customers review their itemized order and distance-based shipping promo (`Rp2.000/km` dicoret menjadi `Rp0 · Discount 100% Special Offer`), select or paste their Tabanan/Denpasar delivery point, and hand off the validated order to WhatsApp (`0811-2199-334`).
  3. **Bottom Safe-Area Clearance**: On mobile viewports, reserved scroll padding at the bottom of the page guarantees the floating cart button never obscures footer links or checkout actions.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Expressive culinary editorial design (`ENERGY 3 / RHYTHM 2 / MOTION 2`) anchored by organic burgundy curves and authentic product packaging.
  - *Color Palette & WCAG AA Contrast*:
    - Primary Canvas: Warm Cream (`#FFF7F0`) and Card Surface (`#FDF8F4`).
    - Primary Brand Accent: Deep Burgundy (`#710014`, contrast `10.1:1` on cream) and Dark Espresso Ink (`#28191B`, contrast `15.4:1` on cream).
    - Accessible Muted Text: Upgraded from `#735D5C` (`4.38:1`, which narrowly missed AA) to Deep Warm Taupe `#594345` (`6.4:1` on `#FFF7F0` and `6.1:1` on `#FDF8F4`), guaranteeing strict WCAG AA (`≥ 4.5:1`) legibility everywhere.
    - Non-Text Control Boundaries: Interactive input borders and quantity steppers upgraded to `≥ 3:1` contrast against adjacent surfaces (WCAG 1.4.11).
  - *Typography & Hierarchy*: Heavy uppercase display headlines (`font-display`) with `text-wrap: balance`, paired with clean humanist sans body prose and `tabular-nums` on all prices, quantities, and kilometer calculations.
  - *Anti-Slop UI Restraint*:
    - Complete removal of `Sparkles` icons (`R-04`) across cost summaries and map distance bars.
    - Removal of redundant stacked capsule badges (`R-09`) in favor of clean typographic separators (`·`) and inline strikethrough pricing.
- **Interactive Feedback & Motion**:
  - Fast `150ms–200ms` compositor-only transitions (`transform`, `opacity`) with explicit `:active` tap states on mobile and high-contrast `:focus-visible` outlines (`2px solid #710014`) on every interactive control.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Upgrading Touch Targets to Strict 44×44px Minimums (`antislop-layoutmobile` / `R-03`)**
  - *Chosen Approach*: Expand all quantity stepper buttons (`-` / `+`) in the product showcase and cart, as well as admin order status controls, from `36×36px` to a full `44×44px` hit area with explicit gap spacing (`gap-2`).
  - *Why*: Eliminates mis-taps on mobile screens and satisfies the mandatory `antislop-layoutmobile` checklist without altering the pill silhouette of the quantity control.
  - *Alternatives Considered*: Keeping `36px` buttons on desktop and scaling up only on mobile; rejected because consistent `44px` targets improve ergonomics across touch laptops and tablets as well.
- **Decision 2: Replacing Cliché Copywriting with Concrete Product & Bali Operational Facts (`antislop-copywriting` / `R-02`, `R-16`)**
  - *Chosen Approach*: Replace vague filler lines (*"Satu gigitan, sejuta kebahagiaan"*, *"pengalaman kuliner terbaik!"*) with specific descriptions of crispy chicken breast fillet seasoned Taiwanese-style, chilled 250 ml cappuccino with black grass jelly, and H-1 scheduled delivery across Tabanan & Denpasar.
  - *Why*: Specific culinary and operational details build immediate buyer trust and comply with `antislop-copywriting`.
  - *Alternatives Considered*: Leaving generic taglines in place; rejected per your confirmation to use specific product and Bali service copywriting.
- **Decision 3: Mathematical WCAG AA Contrast Hardening (`antislop-human` / `R-25`)**
  - *Chosen Approach*: Darken secondary text tokens to `#594345` (`> 6.0:1`) and strengthen form input/control borders so every text and non-text pairing passes automated contrast verification.
  - *Why*: Prevents the "light-grey-on-cream" legibility drop in outdoor mobile viewing while keeping the warm CHICKCHAU palette intact.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     CHICKCHAU Storefront & Checkout                      │
│       (Warm Cream #FFF7F0 · Burgundy #710014 · WCAG AA Verified)         │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
│   Navigation &      │   │  Home Storefront    │   │   Cart & Bali Map    │
│   Floating Chrome   │   │  (Hero, BrandIntro, │   │   Checkout Flow      │
│  - 44x44px Targets  │   │   ProductSection,   │   │  - No Sparkle Icons  │
│  - Safe-Area Bottom │   │   ClosingCTA)       │   │  - 44x44px Steppers  │
│    Padding Reserve  │   │  - Specific Bali &  │   │  - Rp2.000/km -> Rp0 │
│  - Keyboard Focus   │   │    Product Copy     │   │    Strikethrough     │
└─────────────────────┘   └──────────┬──────────┘   └──────────┬───────────┘
                                     │                         │
                                     └────────────┬────────────┘
                                                  ▼
                                  ┌───────────────────────────────┐
                                  │  Cart State & Order Handoff   │
                                  │  - Server Order Validation    │
                                  │  - Haversine Distance Calc    │
                                  │  - WhatsApp 0811-2199-334     │
                                  └───────────────────────────────┘
```

- **Data Model & State**:
  - Preserves existing product catalog (`capcin` at `Rp7.000`, `shihlin` at `Rp30.000`), H-1 pre-order schedule, Bali center coordinates (`-8.6095, 115.1745`), and distance-based shipping strikethrough calculation (`Rp2.000/km` → `Rp0` with `100%` discount).
- **Interactive Component & State Mapping**:
  - **Product & Cart Quantity Steppers**: `44×44px` buttons mutate cart quantity state with immediate tabular subtotal updates and `:active` scale feedback.
  - **Bali Delivery Map & Manual Fallback**: Supports interactive map pin selection, Places autocomplete when `VITE_GOOGLE_MAPS_API_KEY` is present, and a clean one-tap external Google Maps fallback when environment variables are not yet entered.
  - **Admin Modal**: Keyboard-accessible (`Escape` closes, `44×44px` action buttons) for server catalog price and order status updates.
