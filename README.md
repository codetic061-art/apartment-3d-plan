# Apartment Floor Plan — Interactive 3D Architectural Visualization

An interactive, scroll-driven & orbit-capable 3D architectural reconstruction of the user's exact apartment floor plan, adapted directly on top of the original `casa-larga` Three.js + GSAP + Lenis rendering pipeline.

## Architectural Source of Truth
- **Geometry & Room Layout**: Reconstructed directly from [`assets/references/reference-a1-detailed-plan.jpg`](assets/references/reference-a1-detailed-plan.jpg) (`10.00 × 17.00 m` outer envelope) and [`assets/references/reference-a2-room-dimensions.jpg`](assets/references/reference-a2-room-dimensions.jpg) (`9.00 × 14.50 m` modular grid), preserving every external wall, interior partition, door opening and swing direction, exterior window bay, central core shaft/baths (`صالة` / `حمام`), U-shaped kitchen (`مطبخ`), reception & dining (`استقبال`), master suite (`ماستر` + `دريسنج` + `حمام`), bedrooms 1–3 (`نوم ١–٣`), services (`خدمات / لفتح`), and both curved front balconies with potted palms.
- **Configurable Assumptions (`CONFIG` in `js/plan.js`)**:
  - Clear wall height: `3.00 m`
  - Ceiling slab thickness: `0.24 m`
  - Exterior wall thickness: `0.20 m`, interior partition thickness: `0.12 m`
  - Standard door leaf height: `2.20 m`
  - Standard window sill / head: `0.90 m – 2.35 m` (bathroom windows: `1.45 m – 2.25 m`)
  - Curved balcony masonry curb: `0.42 m`, bronze railing height: `1.05 m`

## Materials & Licenses
- **Poly Haven CC0 Scans (`assets/textures/`)**:
  - `marble_01` (2K diffuse/normal, 1K rough) — honed cream marble flooring in Reception/Corridors, dark granite kitchen worktops, and porcelain kitchen tiles (with procedural tile-joint normal map).
  - `plastered_wall` (1K maps) — architectural lime-plaster walls, honed travertine accents, bathroom ceramic tiles, and balcony paving.
  - `white_oak_veneer` (2K diffuse, 1K normal/rough) — bedroom & dressing oak parquet, interior doors, cabinetry, dining table, and wardrobes.
  - `brown_leather` (1K maps) — cognac leather dining chairs and lounge accent chair.
- All downloaded/bundled PBR textures from [Poly Haven](https://polyhaven.com) are **CC0 (Public Domain)**.
- Note: Building entrance photographs (References B & C) were not supplied alongside the two floor plan references, so a cohesive warm limestone-plaster, honed cream marble, natural oak veneer, and dark bronze architectural palette was selected and documented in `js/materials.js`.

## Interactive Features
- **Scroll Tour**: Seamless 2° top-down `+1.20 m` architectural blueprint transitioning into rising walls, curved balcony approach, and eye-height room-by-room PBR material reveal.
- **3D Orbit / Isometric / Top Plan**: Switch anytime via the bottom control bar, inspect individual rooms with **Room Focus**, toggle the ceiling slab (**Ceiling ON/OFF**), switch **Auto / Full PBR / Ink Plan** rendering, and toggle **9.0×14.5m / 10.0×17.0m** sheet dimensions.

## Local Preview
Plain static ES modules (no build step required):
```bash
python -m http.server 8231
```
Then open `http://localhost:8231`.
