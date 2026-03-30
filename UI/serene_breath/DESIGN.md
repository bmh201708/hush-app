# Design System Document

## 1. Overview & Creative North Star
**Creative North Star: "The Living Breath"**

This design system rejects the clinical, rigid structures of traditional health apps. Instead, it embraces a philosophy of **Atmospheric Editorialism**. The interface should feel less like a software dashboard and more like a gentle, sun-drenched morning. We move beyond "standard" UI by prioritizing negative space, intentional asymmetry, and a tactile sense of depth.

The UI is a living organism. By utilizing the "Breathable Layout"—where elements overlap and float within a soft, translucent environment—we mirror the expansion and contraction of the lungs. This is not a flat interface; it is a multi-layered sanctuary designed to lower the user's heart rate upon first glance.

---

## 2. Colors & Surface Philosophy

The palette is rooted in the earth: sand, moss, and sunlight. These are not just decorative; they define the physical architecture of the app.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Traditional dividers create mental friction. Boundaries must be defined exclusively through:
*   **Background Shifts:** Transitioning from `surface` (#fbf9f5) to `surface_container_low` (#f5f3ef).
*   **Tonal Transitions:** Using the `surface_variant` (#e4e2de) to suggest a change in context.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, semi-transparent vellum sheets. 
*   **The Foundation:** Use `surface` as your base.
*   **The Nest:** To draw attention to a specific module, nest a `surface_container_lowest` (#ffffff) card inside a `surface_container` (#efeeea) background. This creates a natural, soft "lift" without visual noise.

### The "Glass & Gradient" Rule
To achieve the premium, bespoke feel required, utilize **Glassmorphism** for all floating elements. 
*   **Formula:** `surface_container_lowest` at 60% opacity + 24px Backdrop Blur.
*   **Signature Textures:** For primary call-to-actions, use a subtle linear gradient from `primary` (#56642b) to `primary_container` (#bfd08b) at a 135-degree angle. This adds "soul" and depth that flat fills lack.

---

## 3. Typography: The Editorial Voice

We pair the sophisticated, wide-set **Manrope** for high-level expression with the functional clarity of **Inter** for data and utility.

*   **Display & Headlines (Manrope):** Use `display-lg` (3.5rem) and `headline-md` (1.75rem) to create an authoritative, editorial look. High contrast in scale is encouraged—place a large display header near a small `label-md` to create sophisticated tension.
*   **Body & Labels (Inter):** Reserved for instructional content and data. `body-lg` (1rem) provides a comfortable reading rhythm, while `label-sm` (0.6875rem) should be used for secondary metadata in all-caps with a 0.05rem letter spacing to maintain a premium feel.

---

## 4. Elevation & Depth

### The Layering Principle
Depth is achieved through **Tonal Layering** rather than structural lines.
1.  **Level 0 (Base):** `surface`
2.  **Level 1 (Sections):** `surface_container_low`
3.  **Level 2 (Active Modules):** `surface_container_lowest`

### Ambient Shadows
When an element must "float" (like the core breathing sphere), use an **Ambient Shadow**:
*   **Color:** `on_surface` (#1b1c1a) at 4% opacity.
*   **Blur:** 40px to 60px.
*   **Offset:** Y: 8px, X: 0.
This mimics natural, diffused light rather than a digital drop shadow.

### The "Ghost Border" Fallback
If accessibility requires a container definition, use a **Ghost Border**: `outline_variant` (#d0c4bb) at 15% opacity. Never use 100% opaque outlines.

---

## 5. Components

### The Core Breathing Sphere (Signature Component)
The centerpiece of the UI.
*   **Visual:** A multi-layered gradient using `primary_fixed` (#d9eaa3) and `tertiary_fixed_dim` (#fbbc00).
*   **Effect:** Apply a `9999px` (full) roundedness. Use a 20% opacity `surface_lowest` inner glow to simulate a glass-like volume.
*   **Motion:** Use a 4000ms "ease-in-out" scale transition to mimic human breathing.

### Translucent Cards
*   **Style:** No borders. `roundedness.xl` (3rem). 
*   **Background:** `surface_container_lowest` at 70% opacity with backdrop blur.
*   **Spacing:** Internal padding should never be less than `spacing.6` (2rem) to allow the content to "breathe."

### Buttons
*   **Primary:** `roundedness.full`. Background: `primary` (#56642b). Label: `on_primary` (#ffffff).
*   **Secondary:** No fill. `outline_variant` (Ghost Border style). Label: `primary`.
*   **Tertiary/Amber Accent:** Use `tertiary` (#795900) sparingly for "gentle amber accents" such as notification dots or active state highlights.

### Input Fields & Lists
*   **Forbid Dividers:** Do not use lines to separate list items. Use `spacing.4` (1.4rem) of vertical white space or alternating backgrounds of `surface` and `surface_container_low`.
*   **Inputs:** Use a soft-pill shape (`roundedness.lg`). The background should be `surface_container_high` (#eae8e4) to provide a tactile "inset" feel.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Place a headline on the left and a small label on the far right to create a professional, editorial rhythm.
*   **Use Generous Padding:** When in doubt, increase the spacing. Use `spacing.10` (3.5rem) or `spacing.12` (4rem) for section margins.
*   **Leverage Tonal Depth:** Always stack a lighter surface on a darker surface to indicate importance.

### Don’t:
*   **No "Boxy" Layouts:** Avoid 90-degree corners. Everything should feel organic and soft (minimum `roundedness.md`).
*   **No Pure Black:** Never use #000000. Use `on_surface` (#1b1c1a) for all text to maintain the "Warm & Soothing" vibe.
*   **No Heavy Shadows:** If a shadow looks like a shadow, it’s too dark. It should look like a soft glow or a natural occlusion of light.
*   **No Grid-Rigidity:** Avoid filling every pixel. If a screen only needs three words, let those three words sit in the center of a vast, sandy `surface`.