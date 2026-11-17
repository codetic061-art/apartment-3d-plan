# Apartment Floor Plan — Interactive 3D Architectural Visualization

An interactive, scroll-driven & first-person-walkable 3D architectural reconstruction of the user's exact apartment floor plan, built atop the `casa-larga` Three.js 0.170 + GSAP 3.12.5 + ScrollTrigger + Lenis 1.1.14 rendering pipeline.

## Architectural & Material Sources
- **Floor Plan Geometry (`assets/references/`)**:
  - [`reference-a1-detailed-plan.jpg`](assets/references/reference-a1-detailed-plan.jpg) (`10.00 × 17.00 m*` outer envelope)
  - [`reference-a2-room-dimensions.jpg`](assets/references/reference-a2-room-dimensions.jpg) (`9.00 × 14.50 m` modular room grid)
  - [`reference-bathroom-closeup.jpg`](assets/references/reference-bathroom-closeup.jpg) (continuous Central Bathroom with vanity, WC, and frameless glass shower screen — no internal dividing masonry wall)
- **Building Entrance Finishes (`assets/references/`)**:
  - [`reference-b-entrance-interior.jpg`](assets/references/reference-b-entrance-interior.jpg) (polished speckled stone/cream marble, dark Galaxy Black granite trim/borders, warm off-white plaster, dark-rimmed recessed downlights, rich walnut paneled door)
  - [`reference-c-entrance-exterior.jpg`](assets/references/reference-c-entrance-exterior.jpg) (warm golden-ochre rusticated facade stucco, dressed Hashmi limestone trim, dark granite plinth, wrought-iron dark bronze metalwork)
- **AI Material Reference Renders (`assets/references/generated/`)**: 4 material-only visualization studies (`01-reception-balconies.jpg`, `02-kitchen-corridor.jpg`, `03-master-dressing.jpg`, `04-central-bathroom.jpg`) used strictly to calibrate PBR surface roughness, warmth, and lighting.
- **PBR Texture Maps (`assets/textures/`)**: 12 CC0 scans from [Poly Haven](https://polyhaven.com) (`marble_01`, `plastered_wall`, `white_oak_veneer`, `brown_leather`) combined with procedural architectural tile-joint, dark granite, and rusticated stucco maps.

## Implemented Features
- **Viewing Modes**: `Sheet`, `Scroll Tour` (smooth bidirectional forward & reverse GSAP/Lenis sync), `Isometric`, `3D Orbit`, `Top Plan`, and **`First Person`**.
- **First-Person Walkthrough (`js/walk.js`)**:
  - Configurable human eye height (`1.60 m*`).
  - Desktop `WASD` / Arrow movement + Pointer Lock (double-click canvas, `ESC` to exit) + click-drag look fallback.
  - Mobile on-screen virtual joystick (`#fp-joystick`) + touch-drag look controls.
  - Sub-stepped circle-vs-AABB collision detection (`CollisionWorld`) with smooth wall sliding, walkable doorway cutouts, curved balcony containment, and furniture/fixture collision.
- **Room-Bounded Inspection**: Selecting a room focuses inside that room and constrains `3D Orbit` rotation and target inside the room's actual bounds (no escaping through walls).
- **Interactive Wall Measurement Tool (`js/measure.js`)**: Toggle `Measure` and click any wall to render 3D green dimension arrows (horizontal length + vertical height `3.00 m*` + thickness) and inspect verified vs modeled vs assumed* values.
- **Preloaded Materials & Shaders**: All textures load with progress bar (`#loading-bar`) and GPU shader pre-compilation before interactive navigation starts.

## Configurable Assumptions (`CONFIG` in `js/plan.js`)
Unverified vertical and wall thickness values are clearly marked with `*`:
- `eyeHeight: 1.60 m*`, `wallHeight: 3.00 m*`, `ceilingThickness: 0.24 m*`, `extWallT: 0.20 m*`, `intWallT: 0.12 m*`, `doorHeight: 2.20 m*`.

## Local Preview
Plain static ES modules (no build step required):
```bash
python -m http.server 8231
```
Then open `http://localhost:8231`.
