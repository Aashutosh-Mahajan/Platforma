# The Design System Document

## 1. Overview & Creative North Star
**Creative North Star: The Digital Curator**

This design system moves away from the "utility-first" appearance of standard booking platforms toward a high-end, editorial experience. It treats event listings not as database entries, but as curated gallery pieces. The aesthetic is defined by **Soft Minimalism**—an approach that prioritizes negative space, breathable layouts, and a sophisticated interplay of light and shadow. 

By leveraging intentional asymmetry and a rigid "No-Line" rule, we ensure the UI feels expansive and premium. The interface acts as a silent, elegant stage, allowing the vibrant, high-impact event posters to serve as the primary source of color and energy.

---

## 2. Colors
Our palette is rooted in tonal depth rather than high-contrast separation. We use a sophisticated spectrum of purples and grays to create a "living" interface.

*   **Primary Accent (`#5426e4`):** Use this sparingly for key actions and brand moments.
*   **Surface Foundation:** The base of the application is `surface` (`#fbf8fe`). 

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning or container definition. Boundaries must be defined solely through background color shifts.
*   *Example:* A `surface-container-low` section sitting directly on a `background` provides all the separation the eye needs.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of fine paper.
*   **Level 0 (Base):** `surface` (`#fbf8fe`)
*   **Level 1 (Sections):** `surface-container-low` (`#f5f3f9`)
*   **Level 2 (Cards/Containers):** `surface-container-lowest` (`#ffffff`)

### The "Glass & Gradient" Rule
To elevate the experience, use **Glassmorphism** for floating elements (like navigation bars or sticky filters). Utilize `surface-variant` with a 60% opacity and a `20px` backdrop blur. For main CTAs, use a signature gradient: `linear-gradient(135deg, #5426e4 0%, #6d49fd 100%)`. This adds a "soul" to the UI that flat colors lack.

---

## 3. Typography
Typography is our primary tool for authority. We pair the functional clarity of **Inter** with the rhythmic elegance of **Be Vietnam Pro**.

*   **Display & Headlines (Inter):** Bold, tight tracking (-2%), and significant scale. Use `display-lg` for hero moments to create an editorial, magazine-like impact.
*   **Titles & Body (Inter):** High legibility. Use `title-lg` for event names to ensure they command attention without overwhelming the imagery.
*   **Labels (Be Vietnam Pro):** Reserved for metadata and micro-copy. The slightly more organic curves of Be Vietnam Pro in `label-md` provide a subtle "designer" feel to functional text.

---

## 4. Elevation & Depth
In this system, depth is a feeling, not a feature. We achieve hierarchy through **Tonal Layering** and ambient light physics.

### The Layering Principle
Hierarchy is achieved by "stacking" the surface tiers. A `surface-container-lowest` card placed on a `surface-container-low` section creates a soft, natural lift that feels architectural rather than digital.

### Ambient Shadows
Shadows must mimic natural light.
*   **Value:** 0px 12px 32px 0px.
*   **Color:** Use a tinted version of `on-surface` at 4%–6% opacity. Never use pure black or dark gray; the shadow should feel like a soft purple-tinted mist beneath the card.

### The "Ghost Border" Fallback
If accessibility requires a container boundary, use a **Ghost Border**: `outline-variant` at 15% opacity. It should be felt more than seen.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `xl` (24px) rounded corners. Text is `on-primary`.
*   **Secondary:** `surface-container-highest` background with `on-surface` text. No border.
*   **States:** On hover, primary buttons should scale slightly (1.02x) rather than just changing color.

### Event Cards (The Hero Component)
*   **Structure:** No dividers. Use `xl` (1.5rem / 24px) corner radius for the container.
*   **Imagery:** Aspect ratios should be intentional (e.g., 4:5 for movies, 1:1 for artists). 
*   **Depth:** Use the "Layering Principle"—white card on a light gray section.

### Category Chips
*   **Style:** Pill-shaped (`full` roundedness).
*   **Default:** `surface-container-high` background, `on-surface-variant` text.
*   **Active:** `primary` background, `on-primary` text.

### Layout & Spacing
*   **Grid:** Use a 12-column fluid grid with generous gutters (32px).
*   **Asymmetry:** In horizontal scrolls (e.g., "Trending Movies"), allow the last card to bleed off the edge of the screen to signal more content without using an arrow.
*   **Verticality:** Forbid the use of divider lines between sections. Use vertical white space (64px to 120px) to separate "Movies" from "Sports."

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme white space to create a "luxury" feel.
*   **Do** lean into the "surface-on-surface" nesting for depth.
*   **Do** ensure event posters are high-resolution; the system relies on them for visual "flavor."
*   **Do** use `Be Vietnam Pro` for all secondary metadata (dates, prices) to create a clear stylistic distinction from titles.

### Don't
*   **Don't** use 1px solid borders. Ever.
*   **Don't** use high-contrast, black drop shadows.
*   **Don't** cram content. If a section feels busy, increase the background-color padding.
*   **Don't** use "default" system colors. Always stick to the defined Material Design tokens provided.