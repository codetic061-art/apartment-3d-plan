# Apartment Floor Plan — Interactive 3D Architectural Visualization

An interactive, scroll-driven & first-person-walkable 3D architectural reconstruction of the user's exact apartment floor plan, built atop the `casa-larga` Three.js 0.170 + GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.14 rendering pipeline.

## Architectural & Material Sources
- **Unified Floor Plan Geometry (`assets/references/`)**:
  - [`reference-a1-detailed-plan.jpg`](assets/references/reference-a1-detailed-plan.jpg) (**`10.00 × 17.00 m`** overall architectural plan: `3.50 | 3.00 | 3.50 m` horizontal columns; `5.80 | 1.50 | 4.20 | 5.50 m` wing bays; North bay windows on Services & Bedroom 2; `1.50 m` Guest Bath depth with `0.50 m` window; `2.90 m` kitchen width; curved front balconies with potted plants only)
  - [`reference-staircase-closeup.png`](assets/references/reference-staircase-closeup.png) & [`reference-annotations-arabic.jpg`](assets/references/reference-annotations-arabic.jpg) (`سلم` staircase strip beside continuous Central Bath, `منور` lightwell with East door, Upper Bath with **North** door & **West** WC)
  - [`reference-scroll-route.jpg`](assets/references/reference-scroll-route.jpg) (12-stage Red human-height walkthrough + Blue CAD overhead transfers + Green `GO TO FIRST PERSON` Bedroom 2 CTA)
  - [`reference-bathroom-closeup.jpg`](assets/references/reference-bathroom-closeup.jpg) (continuous Central Bathroom with vanity, WC, and frameless glass shower screen)
- **Building Entrance Finishes (`assets/references/`)**:
  - [`reference-b-entrance-interior.jpg`](assets/references/reference-b-entrance-interior.jpg) (polished speckled stone/cream marble, dark Galaxy Black granite trim/risers, warm off-white plaster, dark-rimmed recessed downlights, rich walnut paneled doors)
  - [`reference-c-entrance-exterior.jpg`](assets/references/reference-c-entrance-exterior.jpg) (warm golden-ochre rusticated facade stucco, dressed Hashmi limestone trim, dark granite plinth, wrought-iron dark bronze metalwork)
- **AI Material Reference Renders (`assets/references/generated/`)**: 4 material-only visualization studies (`01-reception-balconies.jpg`, `02-kitchen-corridor.jpg`, `03-master-dressing.jpg`, `04-central-bathroom.jpg`) used strictly to calibrate PBR surface roughness, warmth, and lighting.
- **PBR Texture Maps (`assets/textures/`)**: 12 CC0 scans from [Poly Haven](https://polyhaven.com) (`marble_01`, `plastered_wall`, `white_oak_veneer`, `brown_leather`) combined with procedural architectural tile-joint, dark granite, and rusticated stucco maps.

## Implemented Features
- **Viewing Modes**: `Sheet`, `Scroll Tour` (smooth bidirectional forward & reverse GSAP/Lenis sync), `Isometric`, `3D Orbit`, `Top Plan`, and **`First Person`**.
- **Guided Red / Blue / Green Scroll Tour (`js/rig.js`)**:
  - Enters from front center terrace through glazed sliding entrance doors (`front-slide-left` / `front-slide-right`).
  - Red eye-level (`1.60 m*`) walkthrough segments through Reception, Guest Bath, Kitchen, West Corridor, Services, Bedroom 1, `طرقة`, Upper Bath (North door), `منور`, `سلم` & Central Bath, Front Bedroom, Master -> Dressing -> Master Bath, Bedroom 3, and Bedroom 2.
  - Blue overhead CAD lift transitions (`2.65 m` cutaway reveal) across non-adjacent wing transfers (`Guest Bath -> Kitchen`, `Services -> Bedroom 1`, `Vestibule -> East Hall`, `Front Bedroom -> Master`, `Master Bath -> Bedroom 3`).
  - Ends in Bedroom 2 (`نوم ٢`) with the emerald **`GO TO FIRST PERSON`** CTA (`#cta-fp`) for instant camera ownership transfer into Free First-Person Mode.
- **Interactive Animated Doors (`js/doors.js`)**: Hinged walnut doors, glazed French terrace doors, and front sliding glass entrance doors auto-open on approach (`Scroll Tour` / `First Person`), toggle on click, and sync live collision boxes with `CollisionWorld`.
- **Upgraded 3D Furniture, Fixtures & `سلم` Staircase (`js/furniture.js`)**: Bevelled multi-part sofas/cushions/tables, 8 dining chairs, paneled beds/pillows/lamps, U-shaped shaker kitchen cabinetry + sink/gooseneck faucet + twin 4-burner cooktops, `LatheGeometry` toilets & vessel basins, frameless glass shower, and the 9-tread marble + bronze `سلم` staircase.
- **Interactive Wall Measurement Tool (`js/measure.js`)**: Toggle `Measure` and click any wall to render 3D green dimension arrows (horizontal length + vertical height `3.00 m*` + thickness) and inspect verified vs modeled vs assumed* values.
- **Preloaded Materials & Shaders**: All textures load with progress bar (`#loading-bar`) and GPU shader pre-compilation before interactive navigation starts.

## Configurable Assumptions (`CONFIG` in `js/plan.js`)
Unverified vertical, thickness, and staircase parameters are marked explicitly with `*`:
- `eyeHeight: 1.60 m*`, `wallHeight: 3.00 m*`, `ceilingThickness: 0.24 m*`, `extWallT: 0.20 m*`, `intWallT: 0.12 m*`, `doorHeight: 2.20 m*`.
- `staircase` (`سلم`): `treads: 9*`, `treadDepth: 0.20 m*`, `riserHeight: 0.16 m*`, `handrailHeight: 0.90 m*`, `connectUpperFloor: false*` (single-floor visualization).

## Local Preview
Plain static ES modules (no build step required):
```bash
python -m http.server 8231
```
Then open `http://localhost:8231`.
