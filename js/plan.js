// Apartment Architectural Specification — Single Source of Truth
//
// Plan coordinates: x runs West-to-East (-4.50 to +4.50 m),
// n runs South-to-North (0.00 at front balcony facade to 14.50 at rear facade).
// In three.js world space: (x, y up, z = -n).
//
// Proportions are derived directly from Reference A1 (10.00 x 17.00 m envelope)
// and Reference A2 (9.00 x 14.50 m modular grid).

export const PAPER = '#f1eee6';
export const INK = '#17171a';

export const GROUND_Y = -0.16;
export const BASE_Y = -0.15;
export const CUT_PLAN = 1.2;
export const CUT_OPEN = 5.4;
export const EYE = 1.6;

// Configurable architectural defaults (not explicitly dimensioned on the 2D drawing)
export const CONFIG = {
  wallHeight: 3.0,          // Assumed clear floor-to-ceiling height (m)
  ceilingThickness: 0.24,   // Assumed slab thickness (m)
  extWallT: 0.20,           // Assumed exterior wall thickness (m)
  intWallT: 0.12,           // Assumed interior partition thickness (m)
  doorHeight: 2.20,         // Assumed interior door leaf height (m)
  winSill: 0.90,            // Assumed standard window sill height (m)
  winTop: 2.35,             // Assumed standard window head height (m)
  bathWinSill: 1.45,        // Assumed bathroom window sill height (m)
  bathWinTop: 2.25,         // Assumed bathroom window head height (m)
  balconyParapetH: 0.42,    // Solid masonry curb under curved railing (m)
  balconyRailH: 1.05,       // Curved metal balustrade height (m)
  dimensionsMode: 'A2',     // 'A2' (9.00 x 14.50 m) or 'A1' (10.00 x 17.00 m)
};

// All apartment rooms / zones.
// NOTE: Nested inner rooms (bathUpper, hallCenter) MUST appear before `corridor`
// because the fragment shader's roomOf() returns the first matching box.
export const ROOMS = [
  {
    key: 'balconies',
    ar: 'خدمات / تراس',
    name: 'BALCONIES',
    dimA2: '1.50 × 3.00',
    dimA1: '2.90',
    x0: -4.70, x1: 4.70, n0: -2.85, n1: 0.0,
    ceil: 30, walk: true, dir: [0, 1],
    labelAt: [-2.75, -1.35],
    small: true,
    focus: { pos: [-3.2, 4.2, 5.4], target: [0.0, 0.8, 0.8] },
  },
  {
    key: 'reception',
    ar: 'استقبال',
    name: 'RECEPTION',
    dimA2: '4.00 × 4.00',
    dimA1: '6.00 × 4.00',
    x0: -4.60, x1: 1.48, n0: 0.0, n1: 3.74,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-0.95, 1.85],
    focus: { pos: [-1.3, 2.2, 2.2], target: [-1.5, 0.9, -2.6] },
  },
  {
    key: 'guestRoom',
    ar: 'ضيوف',
    name: 'GUEST ROOM',
    dimA2: '3.00 × 4.00',
    dimA1: '3.50 × 4.00',
    x0: 1.48, x1: 4.60, n0: 0.0, n1: 3.74,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [2.45, 0.72],
    small: true,
    focus: { pos: [2.1, 2.0, -0.4], target: [3.4, 0.8, -2.3] },
  },
  {
    key: 'guestBath',
    ar: 'حمام',
    name: 'BATH',
    dimA2: '1.40 × 1.80',
    dimA1: '1.50 × 2.10',
    x0: -4.60, x1: -2.32, n0: 3.74, n1: 5.08,
    ceil: CONFIG.wallHeight, walk: true, dir: [-1, 0],
    labelAt: [-3.20, 4.58],
    small: true,
    focus: { pos: [-1.6, 2.1, -4.4], target: [-3.6, 0.9, -4.4] },
  },
  {
    key: 'kitchen',
    ar: 'مطبخ',
    name: 'KITCHEN',
    dimA2: '3.00 × 3.50',
    dimA1: '2.90 × 4.20',
    x0: -4.60, x1: -2.18, n0: 5.08, n1: 9.78,
    ceil: CONFIG.wallHeight, walk: true, dir: [-1, 0],
    labelAt: [-2.98, 7.45],
    focus: { pos: [-2.4, 2.7, -5.8], target: [-3.6, 0.9, -8.2] },
  },
  {
    key: 'bathUpper',
    ar: 'حمام',
    name: 'BATH',
    dimA2: '1.40 × 2.40',
    dimA1: '1.40 × 2.40',
    x0: -0.72, x1: 0.72, n0: 8.95, n1: 10.30,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.16, 9.52],
    small: true,
    focus: { pos: [-1.5, 2.2, -9.6], target: [0.0, 0.9, -9.6] },
  },
  {
    key: 'hallCenter',
    ar: 'صالة',
    name: 'HALL',
    dimA2: '1.40 × 5.50',
    dimA1: '1.40 × 5.50',
    x0: -0.72, x1: 0.72, n0: 3.74, n1: 8.95,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.0, 4.35],
    small: true,
    focus: { pos: [0.0, 4.5, -5.8], target: [0.0, 0.8, -6.4] },
  },
  {
    key: 'corridor',
    ar: 'طرقة',
    name: 'CORRIDOR',
    dimA2: '1.20 × 4.80',
    dimA1: '1.20 × 4.80',
    x0: -2.32, x1: 1.48, n0: 3.74, n1: 11.30,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-0.20, 10.82],
    small: true,
    focus: { pos: [-1.4, 1.8, -4.5], target: [-1.2, 1.4, -10.5] },
  },
  {
    key: 'master',
    ar: 'ماستر',
    name: 'MASTER',
    dimA2: '3.00 × 4.00',
    dimA1: '3.50 × 4.00',
    x0: 1.48, x1: 4.60, n0: 3.74, n1: 6.34,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [3.15, 5.80],
    focus: { pos: [1.6, 2.2, -5.4], target: [3.2, 0.9, -4.9] },
  },
  {
    key: 'dressing',
    ar: 'دريسنج',
    name: 'DRESSING',
    dimA2: '1.40 × 2.00',
    dimA1: '1.50 × 1.80',
    x0: 1.48, x1: 2.96, n0: 6.34, n1: 8.01,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [2.22, 7.45],
    small: true,
    focus: { pos: [2.2, 2.4, -6.2], target: [2.2, 1.0, -7.2] },
  },
  {
    key: 'masterBath',
    ar: 'حمام',
    name: 'BATH',
    dimA2: '1.40 × 2.00',
    dimA1: '1.50 × 1.80',
    x0: 2.96, x1: 4.60, n0: 6.34, n1: 8.01,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [3.55, 7.42],
    small: true,
    focus: { pos: [2.4, 2.5, -7.2], target: [3.8, 0.9, -7.2] },
  },
  {
    key: 'bedroom3',
    ar: 'نوم ٣',
    name: 'BEDROOM 3',
    dimA2: '3.00 × 3.00',
    dimA1: '3.50 × 2.50',
    x0: 1.48, x1: 4.60, n0: 8.01, n1: 10.24,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [2.72, 9.15],
    focus: { pos: [1.5, 2.2, -9.2], target: [3.3, 0.9, -9.1] },
  },
  {
    key: 'services',
    ar: 'خدمات',
    name: 'SERVICES',
    dimA2: '3.00 × 4.00',
    dimA1: '3.50 × 5.50',
    x0: -4.60, x1: -1.38, n0: 9.78, n1: 14.60,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [-2.95, 13.05],
    focus: { pos: [-2.1, 2.2, -10.5], target: [-3.2, 1.0, -13.4] },
  },
  {
    key: 'bedroom1',
    ar: 'نوم ١',
    name: 'BEDROOM 1',
    dimA2: '3.00 × 3.00',
    dimA1: '3.00 × 3.20',
    x0: -1.38, x1: 1.48, n0: 11.30, n1: 14.60,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.55, 12.45],
    focus: { pos: [0.9, 2.2, -11.3], target: [-0.3, 0.9, -13.1] },
  },
  {
    key: 'bedroom2',
    ar: 'نوم ٢',
    name: 'BEDROOM 2',
    dimA2: '3.00 × 4.00',
    dimA1: '3.50 × 4.20',
    x0: 1.48, x1: 4.60, n0: 10.24, n1: 14.60,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [3.05, 13.82],
    focus: { pos: [1.8, 2.2, -10.8], target: [3.3, 0.9, -12.7] },
  },
];

// Secondary annotation labels rendered on the floor plan sheet
export const EXTRA_LABELS = [
  { ar: 'لفتح', name: 'OPEN', x: -2.65, n: 11.55, room: 'services' },
  { ar: 'تراس', name: 'TERRACE', x: 2.75, n: -1.35, room: 'balconies', small: true },
];

// Curved front balcony geometric parameters (verified from pixel arcs)
export const BALCONIES = {
  left: { cx: -2.72, cn: -0.02, rx: 1.80, rn: 2.35, a0: Math.PI, a1: 2 * Math.PI },
  center: { cx: 0.0, cn: 0.0, rx: 1.18, rn: 1.48, a0: Math.PI, a1: 2 * Math.PI },
  right: { cx: 2.72, cn: -0.02, rx: 1.80, rn: 2.35, a0: Math.PI, a1: 2 * Math.PI },
};

// Potted plants visible on the two curved front balconies in Reference A
export const PLANTS = [
  { x: -3.95, n: -0.58, r: 0.42 },
  { x: -1.68, n: -0.58, r: 0.42 },
  { x: 1.68, n: -0.58, r: 0.42 },
  { x: 3.95, n: -0.58, r: 0.42 },
];

// Doors extracted directly from Reference A1/A2 (hinge x, hinge n, width, openAngleDeg, closedAngleDeg, room)
export const DOORS = [
  // Left balcony French door (hinge at x=-2.05, n=0.0, swings south-west or north-east into balcony)
  { x: -2.02, n: -0.04, w: 0.78, open: -90, closed: 180, room: 'balconies' },
  // Right balcony French door
  { x: 2.35, n: -0.04, w: 0.78, open: -90, closed: 0, room: 'balconies' },
  // Front-right bedroom door from Reception
  { x: 1.48, n: 3.60, w: 0.78, open: 0, closed: -90, room: 'guestRoom' },
  // Guest bathroom door (from corridor)
  { x: -2.32, n: 4.82, w: 0.68, open: 0, closed: -90, room: 'guestBath' },
  // Kitchen door (from west corridor)
  { x: -2.18, n: 6.24, w: 0.76, open: 180, closed: 90, room: 'kitchen' },
  // Central hall entry door (from west corridor)
  { x: -0.72, n: 4.10, w: 0.72, open: 180, closed: 90, room: 'corridor' },
  // Central bathroom door (from central hall vestibule)
  { x: -0.04, n: 5.65, w: 0.66, open: 0, closed: 90, room: 'hallCenter' },
  // Central hall east door (to east corridor)
  { x: 0.72, n: 8.05, w: 0.72, open: 0, closed: -90, room: 'corridor' },
  // West corridor divider door (north end by kitchen/bath)
  { x: -0.72, n: 9.76, w: 0.68, open: -90, closed: 180, room: 'corridor' },
  // Upper bathroom door (west wall)
  { x: -0.72, n: 9.05, w: 0.66, open: 180, closed: 90, room: 'bathUpper' },
  // Master bedroom door
  { x: 1.48, n: 6.28, w: 0.78, open: 0, closed: -90, room: 'master' },
  // Dressing room to Master Bath door
  { x: 2.96, n: 7.95, w: 0.68, open: 0, closed: -90, room: 'masterBath' },
  // Bedroom 3 door
  { x: 1.48, n: 10.15, w: 0.78, open: 0, closed: -90, room: 'bedroom3' },
  // Bedroom 2 door
  { x: 1.48, n: 10.42, w: 0.78, open: 0, closed: 90, room: 'bedroom2' },
  // Bedroom 1 door
  { x: 1.38, n: 11.30, w: 0.78, open: 90, closed: 180, room: 'bedroom1' },
];

// Sun direction: warm late-afternoon daylight from south-west
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
