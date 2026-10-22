---
name: IINICIA Academic System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#44474f'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#747780'
  outline-variant: '#c4c6d0'
  surface-tint: '#455e91'
  primary: '#00163a'
  on-primary: '#ffffff'
  primary-container: '#0b2a5b'
  on-primary-container: '#7a93ca'
  inverse-primary: '#aec6ff'
  secondary: '#235eac'
  on-secondary: '#ffffff'
  secondary-container: '#7aacff'
  on-secondary-container: '#003e80'
  tertiary: '#231500'
  on-tertiary: '#ffffff'
  tertiary-container: '#3d2800'
  on-tertiary-container: '#c48800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#2c4678'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#aac7ff'
  on-secondary-fixed: '#001b3e'
  on-secondary-fixed-variant: '#00458d'
  tertiary-fixed: '#ffdead'
  tertiary-fixed-dim: '#ffba3b'
  on-tertiary-fixed: '#281900'
  on-tertiary-fixed-variant: '#604100'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 3.5rem
    fontWeight: '800'
    lineHeight: 4.25rem
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.5rem
    fontWeight: '800'
    lineHeight: 3rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  title:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.625rem
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.9375rem
    fontWeight: '600'
    lineHeight: 1.375rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: '600'
    lineHeight: 1.125rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '700'
    lineHeight: 1rem
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-desktop: 2rem
  gutter-mobile: 1rem
  margin: 1.5rem
  margin-desktop: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

The design system projects academic prestige, scientific rigor, and forward-looking digital education. Tailored for Mexican and Latin American adult learners, undergraduate candidates, and postgraduate researchers, the visual narrative balances institutional authority with accessible, human warmth.

### Visual Aesthetic: Institutional Modernism
- **Clarity over ornamentation:** Structural clarity, clean white space, and purposeful typographic scale communicate credibility and accreditation.
- **Accessible dynamicism:** High-contrast actions grounded in a navy foundation, paired with vibrant amber conversion points, evoke high academic standards while inviting participation.
- **Tactile trust:** Subtle borders and nuanced dual-layer atmospheric shadows replace heavy gradients or skeuomorphism, delivering an interface that feels dependable, contemporary, and engineered for sustained focus.

## Colors

The color palette is calibrated for institutional authority and full WCAG 2.2 AA accessibility across desktop, tablet, and mobile displays.

### Role Tokens & Color Distribution
- **Primary (`#0B2A5B`):** Deep institutional navy. Applied to top-level navigation headers, primary display typography, footers, and institutional badge surfaces.
- **Secondary (`#1E5AA8`):** Vibrant cobalt blue. Applied to interactive navigation elements, links, secondary buttons, active selection tabs, and progress indicators.
- **Tertiary / Accent (`#F2A900`):** Warm golden amber. Reserved for conversion anchors, application admission deadlines, important alerts, and key Call-to-Action (CTA) elements. Text paired with this amber background must use `#0B2A5B` or `#1E293B` to ensure a minimum contrast ratio of 4.5:1.
- **Neutral Core (`#1E293B`):** Deep slate charcoal for primary reading copy, data tables, and high-legibility headings.
- **Neutral Muted (`#475569`):** Subtitles, meta-information, breadcrumbs, and helper text.
- **Border Subtle (`#E2E8F0`):** Structural card outlines, divider rules, and input container boundaries.
- **Surfaces:**
  - `surface-canvas`: `#FFFFFF` (pure white default canvas).
  - `surface-subtle`: `#F5F7FA` (section alternating bands, table headers).
  - `surface-neutral`: `#EDF2F7` (sidebar trays, inactive states, metric badges).

## Typography

The type system blends structural geometric precision with reading comfort.

- **Headlines and Labels:** Rendered in **Plus Jakarta Sans** with tightened letter tracking and confident weights (600, 700, 800) to project structural clarity and academic modernity.
- **Body and Data Interfaces:** Rendered in **Inter** with generous line heights (1.5 to 1.625 ratio) to support sustained technical reading across syllabi, digital coursework, and admissions documentation.
- **Numbers and Academic Data:** Standard tabular figures (`tnum`) must be active on tables, course credits, tuition calculators, and grade indicators.

## Layout & Spacing

A structured 12-column responsive grid ensures predictable document scanning and layout rhythm across academic portals.

### Grid & Breakpoints
- **Desktop (>= 1280px):** 12-column layout, max-width `1280px` or `1440px`, with `margin-desktop` (3rem) and `gutter-desktop` (2rem). Content flows through 3-column academic course cards, 4-column feature highlights, or 8+4 editorial split panes.
- **Tablet (768px – 1279px):** 8-column fluid layout with `margin` (1.5rem) and `gutter` (1.5rem). Multi-column grids compress to 2 columns; sticky academic filters convert to sliding modal sheets.
- **Mobile (< 768px):** 4-column layout with `margin-mobile` (1.25rem) and `gutter-mobile` (1rem). Dynamic stacks compress cards and interactive blocks to single full-width containers.

### Component Spacing Discipline
- `space-xs` (4px) and `space-sm` (8px) define tight inline relationships (badge icons, chip labels, button paddings).
- `space-md` (16px) establishes standard card interior padding, input field insets, and form stack gaps.
- `space-lg` (24px) establishes section interior spacing, card header separation, and card grids.
- `space-xl` (40px) manages block module separations and section break markers.

## Elevation & Depth

Visual hierarchy leverages dual-layer ambient shadows tinted with `#0B2A5B` (deep navy) rather than flat grey, preserving clean, scholarly surfaces without graphic clutter.

### Elevation Hierarchy
- **Level 0 (Flat / Canvas):** Surface white `#FFFFFF` or support grey `#F5F7FA` with a subtle `1px` border in `#E2E8F0`. Standard state for static content sections, table containers, and inactive field panels.
- **Level 1 (Cards & Low Elevation):** 
  - `box-shadow: 0 1px 3px 0 rgba(11, 42, 91, 0.04), 0 4px 6px -1px rgba(11, 42, 91, 0.06);`
  - Paired with a delicate `#E2E8F0` border. Applied to course cards, profile surfaces, and metric tiles.
- **Level 2 (Hover & Active Contexts):** 
  - `box-shadow: 0 4px 6px -2px rgba(11, 42, 91, 0.05), 0 10px 15px -3px rgba(11, 42, 91, 0.08);`
  - Triggered during card focus/hover, dropdown menus, and date pickers.
- **Level 3 (Modals & Navigation Drawers):** 
  - `box-shadow: 0 10px 25px -5px rgba(11, 42, 91, 0.12), 0 20px 25px -5px rgba(11, 42, 91, 0.08);`
  - Applied to application forms, syllabus preview dialogs, and sticky primary headers.

## Shapes

The interface balances welcoming accessibility with institutional precision through standard rounded radii.

### Radius System
- **Core Radius (`rounded-md` - 8px / 0.5rem):** Applied to form inputs, small chips, dropdown items, and table action buttons.
- **Container Radius (`rounded-lg` - 12px / 0.75rem - 1rem):** Standard radius for standard content cards, modal windows, and callout notification containers.
- **Hero & Large Surface Radius (`rounded-xl` - 16px / 1rem - 1.5rem):** Applied to admissions hero banners, interactive curriculum overview cards, and media modules.
- **Capsule / Pill (`rounded-full`):** Strictly reserved for status chips, enrollment status badges (e.g., "Inscripciones Abiertas"), and small avatar frames.

## Components

### Buttons
- **Primary Action (Admissions / CTAs):** 
  - Background `#F2A900`, text `#0B2A5B` (font weight 700). High contrast, 12px (`rounded-lg`) border radius, height 48px, horizontal padding `space-lg`. Hover: brightness filter 95% with slight Level 2 elevation.
- **Institutional Primary:** 
  - Background `#0B2A5B`, text `#FFFFFF`. Used for portal logins, document downloads, and form confirmations. Hover: `#1E5AA8`.
- **Secondary / Outline:** 
  - Background transparent, border `1.5px solid #1E5AA8`, text `#1E5AA8` (font weight 600). Hover: background `#F5F7FA`.
- **Ghost:** 
  - Text `#1E5AA8`, background transparent. Hover: background `#EDF2F7`.

### Cards (Academic Degree & Course Modules)
- Built on `#FFFFFF` with a `1px solid #E2E8F0` border and `16px` border radius (`rounded-xl`).
- Padding: `24px` (`space-lg`).
- Transitions: Cards elevate smoothly to Level 2 with a `border-color: #1E5AA8/40` on mouse enter.
- Contains modular header, badge tags, degree title (`headline-sm`), credit breakdown, and direct CTA footer.

### Form Inputs & Selectors
- Background `#FFFFFF`, height `48px`, border `1px solid #E2E8F0`, radius `8px` (`rounded-md`).
- Typography: `body-md` (`#1E293B`). Placeholder: `#94A3B8`.
- Focus State: Border color `#1E5AA8`, ring `3px rgba(30, 90, 168, 0.15)`, zero outline.
- Error State: Border color `#DC2626`, helper text in `#DC2626` (`body-sm`).

### Badges & Status Chips
- Height `28px`, padding `0 12px`, radius `rounded-full`, typography `label-sm` uppercase.
- Variants:
  - *Academic / Accredited:* Background `#0B2A5B`/10, text `#0B2A5B`.
  - *Admission Open:* Background `#F2A900`/20, text `#8A5F00` (WCAG AAA compliant dark gold).
  - *Active / Online:* Background `#DCFCE7`, text `#166534`.

### Checkboxes & Radio Controls
- Base: 20px x 20px, border `1.5px solid #CBD5E1`, radius `4px` (checkboxes) or `rounded-full` (radios).
- Checked State: Fill `#1E5AA8` with a crisp white icon checkmark or internal radio dot. Focus ring: `3px rgba(30, 90, 168, 0.2)`.

### Lists & Academic Curricula Tables
- Row height: 56px minimum for accessible touch targets.
- Zebra striping uses alternating rows of `#FFFFFF` and `#F5F7FA`.
- Border-bottom: `1px solid #E2E8F0`. Title column uses `Plus Jakarta Sans` 600 weight; metadata uses `Inter` 400 with tabular numbers.