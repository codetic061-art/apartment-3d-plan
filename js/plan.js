// Apartment Architectural Specification — Single Source of Truth
//
// Unified coordinate system matched to Reference A1 (10.00 x 17.00 m outer envelope):
//   x runs West-to-East (-5.00 to +5.00 m -> 10.00 m total: 3.50 | 3.00 | 3.50 m columns).
//   n runs South-to-North:
//     -2.55 to 0.00 m: curved front balconies
//      0.00 to 14.45 m: main apartment envelope (+ North bay windows to 14.75 m)
//     Total footprint span from balcony tip (-2.55 m) to North main wall (+14.45 m) = 17.00 m.
// In Three.js world space: (x, y up, z = -n).
// Unverified vertical/thickness/staircase assumptions are marked (*) in CONFIG.

export const PAPER = '#f1eee6';
export const INK = '#17171a';

export const GROUND_Y = -0.16;
export const BASE_Y = -0.15;
export const CUT_PLAN = 1.2;
export const CUT_OPEN = 5.4;
export const EYE = 1.60;

// Configurable architectural defaults (assumed values, not verified on 2D plan)
export const CONFIG = {
  eyeHeight: 1.60,          // Assumed human walkthrough eye height (m)*
  wallHeight: 3.00,         // Assumed clear floor-to-ceiling height (m)*
  ceilingThickness: 0.24,   // Assumed slab thickness (m)*
  extWallT: 0.20,           // Assumed exterior wall thickness (m)*
  intWallT: 0.12,           // Assumed interior partition thickness (m)*
  doorHeight: 2.20,         // Assumed interior door leaf height (m)*
  winSill: 0.90,            // Assumed standard window sill height (m)*
  winTop: 2.35,             // Assumed standard window head height (m)*
  bathWinSill: 1.45,        // Assumed bathroom window sill height (m)*
  bathWinTop: 2.25,         // Assumed bathroom window head height (m)*
  balconyParapetH: 0.42,    // Assumed masonry curb under curved railing (m)*
  balconyRailH: 1.05,       // Assumed metal balustrade height (m)*
  dimensionsMode: 'A1',     // Unified 10.00 x 17.00 m Reference A1 specification
  staircase: {
    enabled: true,
    direction: 'N',         // Flight ascends northward along West Core strip*
    x0: -0.74,
    x1: -0.14,
    n0: 5.05,
    n1: 7.28,
    treads: 9,              // 9 treads x 0.20 m = 1.80 m flight + bottom landing*
    treadDepth: 0.20,
    riserHeight: 0.16,      // Assumed step rise (m)*
    handrailHeight: 0.90,   // Assumed bronze handrail height (m)*
    connectUpperFloor: false, // Closed architectural landing box at top (single-floor visualization)*
  },
};

// All apartment rooms / zones.
// NOTE: Nested inner zones (bathUpper, lightwell, hallCenter) MUST appear before `corridor`
// so the fragment shader's roomOf() resolves nested reveals cleanly.
export const ROOMS = [
  {
    key: 'balconies',
    ar: 'خدمات / تراس',
    name: 'FRONT BALCONIES',
    dimA1: '2.90',
    dimA2: '2.90',
    x0: -5.10, x1: 5.10, n0: -2.85, n1: 0.05,
    ceil: 30, walk: true, dir: [0, 1],
    labelAt: [-3.05, -1.30],
    small: true,
    bounds: { x0: -4.65, x1: 4.65, n0: -2.25, n1: -0.12 },
    spawn: [-3.05, -1.15, 0.0],
    focus: { pos: [-4.35, 2.15, 2.18], target: [-2.45, 0.65, 0.75] },
  },
  {
    key: 'reception',
    ar: 'استقبال',
    name: 'RECEPTION',
    dimA1: '6.30 × 3.70',
    dimA2: '6.30 × 3.70',
    x0: -5.00, x1: 1.50, n0: 0.0, n1: 3.78,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-0.95, 1.85],
    bounds: { x0: -4.65, x1: 1.38, n0: 0.24, n1: 3.66 },
    spawn: [0.0, 0.95, 0.0],
    focus: { pos: [1.05, 1.95, -3.35], target: [-2.45, 0.78, -1.75] },
  },
  {
    key: 'guestRoom',
    ar: 'ضيوف',
    name: 'FRONT BEDROOM',
    dimA1: '3.50 × 3.70',
    dimA2: '3.50 × 3.70',
    x0: 1.50, x1: 5.00, n0: 0.0, n1: 3.78,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [2.65, 0.78],
    small: true,
    bounds: { x0: 1.62, x1: 4.68, n0: 0.24, n1: 3.66 },
    spawn: [2.45, 1.40, -0.70],
    focus: { pos: [1.95, 1.90, -0.55], target: [3.65, 0.75, -2.05] },
  },
  {
    key: 'guestBath',
    ar: 'حمام',
    name: 'GUEST BATH',
    dimA1: '1.50 × 2.50',
    dimA2: '1.50 × 2.50',
    x0: -5.00, x1: -2.18, n0: 3.78, n1: 5.40,
    ceil: CONFIG.wallHeight, walk: true, dir: [-1, 0],
    labelAt: [-3.40, 4.65],
    small: true,
    bounds: { x0: -4.68, x1: -2.30, n0: 3.90, n1: 5.28 },
    spawn: [-2.85, 4.55, 1.55],
    focus: { pos: [-2.55, 1.90, -4.95], target: [-4.05, 0.85, -4.55] },
  },
  {
    key: 'kitchen',
    ar: 'مطبخ',
    name: 'KITCHEN',
    dimA1: '2.90 × 4.20',
    dimA2: '2.90 × 4.20',
    x0: -5.00, x1: -2.06, n0: 5.40, n1: 9.72,
    ceil: CONFIG.wallHeight, walk: true, dir: [-1, 0],
    labelAt: [-3.25, 7.60],
    bounds: { x0: -4.68, x1: -2.20, n0: 5.52, n1: 9.60 },
    spawn: [-3.05, 6.75, 0.15],
    focus: { pos: [-2.55, 1.95, -6.20], target: [-4.15, 0.90, -8.40] },
  },
  {
    key: 'bathUpper',
    ar: 'حمام',
    name: 'UPPER BATH',
    dimA1: '1.40 × 1.35',
    dimA2: '1.40 × 1.35',
    x0: -0.82, x1: 0.66, n0: 8.85, n1: 10.30,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.12, 9.52],
    small: true,
    bounds: { x0: -0.72, x1: 0.54, n0: 8.95, n1: 10.18 },
    spawn: [-0.08, 9.65, 0.0],
    focus: { pos: [0.35, 1.95, -9.95], target: [-0.35, 0.75, -9.35] },
  },
  {
    key: 'lightwell',
    ar: 'منور',
    name: 'LIGHTWELL',
    dimA1: '1.40 × 1.45',
    dimA2: '1.40 × 1.45',
    x0: -0.82, x1: 0.66, n0: 7.30, n1: 8.85,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-0.08, 8.08],
    small: true,
    bounds: { x0: -0.72, x1: 0.54, n0: 7.42, n1: 8.75 },
    spawn: [-0.08, 8.08, 0.0],
    focus: { pos: [-0.08, 1.95, -7.55], target: [-0.08, 0.95, -8.55] },
  },
  {
    key: 'hallCenter',
    ar: 'سلم / حمام',
    name: 'STAIR & CENTRAL BATH',
    dimA1: '1.40 × 3.40',
    dimA2: '1.40 × 3.40',
    x0: -0.82, x1: 0.66, n0: 3.78, n1: 7.30,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.15, 4.35],
    small: true,
    bounds: { x0: -0.72, x1: 0.54, n0: 3.90, n1: 7.20 },
    spawn: [-0.10, 5.40, 0.0],
    focus: { pos: [-0.42, 2.10, -4.65], target: [0.05, 0.75, -6.45] },
  },
  {
    key: 'corridor',
    ar: 'طرقة',
    name: 'CORRIDORS',
    dimA1: '0.95 × 5.80',
    dimA2: '0.95 × 5.80',
    x0: -2.18, x1: 1.50, n0: 3.78, n1: 11.35,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-0.15, 10.80],
    small: true,
    bounds: { x0: -2.04, x1: 1.38, n0: 3.90, n1: 11.24 },
    spawn: [-1.45, 6.20, 0.0],
    focus: { pos: [-1.45, 1.90, -4.60], target: [-1.45, 1.00, -10.50] },
  },
  {
    key: 'master',
    ar: 'ماستر',
    name: 'MASTER BEDROOM',
    dimA1: '3.50 × 2.80',
    dimA2: '3.50 × 2.80',
    x0: 1.50, x1: 5.00, n0: 3.78, n1: 6.50,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [3.25, 5.85],
    bounds: { x0: 1.62, x1: 4.68, n0: 3.90, n1: 6.38 },
    spawn: [2.75, 5.20, 0.0],
    focus: { pos: [2.05, 1.95, -6.10], target: [3.55, 0.78, -4.65] },
  },
  {
    key: 'dressing',
    ar: 'دريسنج',
    name: 'DRESSING',
    dimA1: '1.60 × 1.55',
    dimA2: '1.60 × 1.55',
    x0: 1.50, x1: 3.12, n0: 6.50, n1: 8.10,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [2.30, 7.50],
    small: true,
    bounds: { x0: 1.62, x1: 3.00, n0: 6.62, n1: 7.98 },
    spawn: [2.25, 7.45, -Math.PI / 2],
    focus: { pos: [2.75, 1.95, -7.80], target: [2.15, 0.90, -6.80] },
  },
  {
    key: 'masterBath',
    ar: 'حمام الماستر',
    name: 'MASTER BATH',
    dimA1: '1.80 × 1.55',
    dimA2: '1.80 × 1.55',
    x0: 3.12, x1: 5.00, n0: 6.50, n1: 8.10,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [3.80, 7.48],
    small: true,
    bounds: { x0: 3.22, x1: 4.68, n0: 6.62, n1: 7.98 },
    spawn: [3.75, 7.35, -Math.PI / 2],
    focus: { pos: [3.35, 1.95, -7.80], target: [4.25, 0.75, -6.90] },
  },
  {
    key: 'bedroom3',
    ar: 'نوم ٣',
    name: 'BEDROOM 3',
    dimA1: '3.50 × 2.15',
    dimA2: '3.50 × 2.15',
    x0: 1.50, x1: 5.00, n0: 8.10, n1: 10.25,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [2.90, 9.25],
    bounds: { x0: 1.62, x1: 4.68, n0: 8.22, n1: 10.12 },
    spawn: [2.95, 9.25, -Math.PI / 2],
    focus: { pos: [1.95, 1.95, -9.90], target: [4.10, 0.75, -9.05] },
  },
  {
    key: 'services',
    ar: 'خدمات',
    name: 'SERVICES',
    dimA1: '3.50 × 5.50',
    dimA2: '3.50 × 5.50',
    x0: -5.00, x1: -1.50, n0: 9.72, n1: 14.55,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-3.20, 12.80],
    bounds: { x0: -4.68, x1: -1.62, n0: 9.84, n1: 14.20 },
    spawn: [-3.05, 12.10, 0.0],
    focus: { pos: [-2.10, 1.95, -10.40], target: [-3.40, 0.95, -13.60] },
  },
  {
    key: 'bedroom1',
    ar: 'نوم ١',
    name: 'BEDROOM 1',
    dimA1: '3.00 × 3.00',
    dimA2: '3.00 × 3.00',
    x0: -1.50, x1: 1.50, n0: 11.35, n1: 14.55,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.48, 12.05],
    bounds: { x0: -1.38, x1: 1.38, n0: 11.46, n1: 14.20 },
    spawn: [0.40, 12.50, 0.55],
    focus: { pos: [1.15, 1.95, -11.80], target: [-0.55, 0.75, -13.15] },
  },
  {
    key: 'bedroom2',
    ar: 'نوم ٢',
    name: 'BEDROOM 2',
    dimA1: '3.50 × 4.00',
    dimA2: '3.50 × 4.00',
    x0: 1.50, x1: 5.00, n0: 10.25, n1: 14.55,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [3.25, 13.70],
    bounds: { x0: 1.62, x1: 4.68, n0: 10.38, n1: 14.20 },
    spawn: [2.95, 12.40, -0.35],
    focus: { pos: [1.95, 1.95, -10.80], target: [3.65, 0.75, -12.80] },
  },
];

// Secondary annotation labels rendered on the floor plan sheet
export const EXTRA_LABELS = [
  { ar: 'لفتح', name: 'OPEN', x: -2.85, n: 11.40, room: 'services' },
  { ar: 'تراس', name: 'TERRACE', x: 3.05, n: -1.30, room: 'balconies', small: true },
  { ar: 'سلم', name: 'STAIRS*', x: -0.44, n: 6.10, room: 'hallCenter', small: true },
];

// Curved front balcony geometric parameters (matched to 10.00 x 17.00 m A1 silhouette)
export const BALCONIES = {
  left: { cx: -3.05, cn: -0.02, rx: 1.95, rn: 2.53, a0: Math.PI, a1: 2 * Math.PI },
  center: { cx: 0.0, cn: 0.0, rx: 1.18, rn: 1.48, a0: Math.PI, a1: 2 * Math.PI },
  right: { cx: 3.05, cn: -0.02, rx: 1.95, rn: 2.53, a0: Math.PI, a1: 2 * Math.PI },
};

// Potted plants visible on the two curved front balconies (NO chairs on balconies per reference)
export const PLANTS = [
  { x: -4.25, n: -0.58, r: 0.42 },
  { x: -1.85, n: -0.58, r: 0.42 },
  { x: 1.85, n: -0.58, r: 0.42 },
  { x: 4.25, n: -0.58, r: 0.42 },
];

// Interactive doors (hinged wooden walnut doors + front glazed sliding/French terrace doors)
// Each entry defines hinge pivot (x, n), leaf width w, angle in degrees for closed & open states,
// and swing wall axis orientation for automated collision sync.
export const DOORS = [
  // Front Center Glazed Sliding Entrance Doors (Main Tour & Terrace Entry)
  {
    id: 'front-slide-left',
    type: 'sliding',
    x: -1.04, n: 0.10, w: 1.04, slideDx: -0.82, slideDn: 0.0,
    room: 'reception', axis: 'x', autoTour: true,
  },
  {
    id: 'front-slide-right',
    type: 'sliding',
    x: 0.0, n: 0.10, w: 1.04, slideDx: 0.82, slideDn: 0.0,
    room: 'reception', axis: 'x', autoTour: true,
  },
  // Left balcony French door
  { id: 'balc-left', type: 'hinged', x: -3.44, n: -0.02, w: 0.78, closed: 0, open: -90, room: 'balconies', glazed: true },
  // Right balcony French door
  { id: 'balc-right', type: 'hinged', x: 2.66, n: -0.02, w: 0.78, closed: 0, open: -90, room: 'balconies', glazed: true },
  // Front-right bedroom door from Reception
  { id: 'front-bedroom', type: 'hinged', x: 1.50, n: 3.45, w: 0.78, closed: -90, open: 0, room: 'guestRoom' },
  // Guest bathroom door (from corridor)
  { id: 'guest-bath', type: 'hinged', x: -2.18, n: 4.22, w: 0.72, closed: 90, open: 180, room: 'guestBath' },
  // Kitchen door (from west corridor)
  { id: 'kitchen', type: 'hinged', x: -2.12, n: 5.95, w: 0.78, closed: 90, open: 180, room: 'kitchen' },
  // Central vestibule West door (from west corridor)
  { id: 'core-west', type: 'hinged', x: -0.78, n: 4.10, w: 0.72, closed: 90, open: 180, room: 'corridor' },
  // Central staircase entry door (from south vestibule into سلم)
  { id: 'stair-entry', type: 'hinged', x: -0.74, n: 4.97, w: 0.56, closed: 0, open: 90, room: 'hallCenter' },
  // Lightwell منور East door (to east corridor)
  { id: 'lightwell-east', type: 'hinged', x: 0.60, n: 8.35, w: 0.72, closed: -90, open: -180, room: 'corridor' },
  // Upper bathroom حمام NORTH door (exact match to Crop 3 reference)
  { id: 'upper-bath-north', type: 'hinged', x: -0.34, n: 10.22, w: 0.66, closed: 0, open: -90, room: 'bathUpper' },
  // West corridor divider door
  { id: 'corridor-div', type: 'hinged', x: -0.78, n: 9.52, w: 0.68, closed: 180, open: -90, room: 'corridor' },
  // Master bedroom door
  { id: 'master', type: 'hinged', x: 1.50, n: 6.18, w: 0.78, closed: -90, open: 0, room: 'master' },
  // Dressing to Master Bath door
  { id: 'master-bath', type: 'hinged', x: 3.12, n: 7.96, w: 0.68, closed: -90, open: 0, room: 'masterBath' },
  // Bedroom 3 door
  { id: 'bedroom-3', type: 'hinged', x: 1.50, n: 9.85, w: 0.78, closed: -90, open: 0, room: 'bedroom3' },
  // Bedroom 2 door
  { id: 'bedroom-2', type: 'hinged', x: 1.50, n: 10.42, w: 0.78, closed: 90, open: 0, room: 'bedroom2' },
  // Bedroom 1 door
  { id: 'bedroom-1', type: 'hinged', x: 1.24, n: 11.35, w: 0.78, closed: 180, open: 90, room: 'bedroom1' },
];

export const SUN_ELEV = 24;
export const SUN_HEADING = [0.46, -0.888];

export const PROJECT = {
  name: 'شقة سكنية · Apartment',
  place: 'Architectural Floor Plan Reconstruction',
  drawing: 'Ground Floor Plan (المسقط الأفقي)',
  sheet: 'A-101',
  scale: '1:100',
  date: '2026',
};
