// Apartment Architectural Specification — Single Source of Truth
//
// Plan coordinates: x runs West-to-East (-4.50 to +4.50 m),
// n runs South-to-North (0.00 at front balcony facade to 14.50 at rear facade).
// In three.js world space: (x, y up, z = -n).
//
// Proportions are derived from Reference A1 (10.00 x 17.00 m outer envelope)
// and Reference A2 (9.00 x 14.50 m modular grid). Because these two supplied
// sheets carry differing overall figures and omit vertical elevations, unverified
// vertical/thickness defaults are marked and documented explicitly in CONFIG.

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
  dimensionsMode: 'A2',     // 'A2' (9.00 x 14.50 m modular) or 'A1' (10.00 x 17.00 m*)
};

// All apartment rooms / zones.
// NOTE: Nested inner rooms (bathUpper, hallCenter) MUST appear before `corridor`
// because the fragment shader's roomOf() returns the first matching box.
export const ROOMS = [
  {
    key: 'balconies',
    ar: 'خدمات / تراس',
    name: 'FRONT BALCONIES',
    dimA2: '1.50 × 3.00',
    dimA1: '2.90',
    x0: -4.70, x1: 4.70, n0: -2.85, n1: 0.0,
    ceil: 30, walk: true, dir: [0, 1],
    labelAt: [-2.75, -1.35],
    small: true,
    bounds: { x0: -4.35, x1: 4.35, n0: -2.05, n1: -0.15 },
    spawn: [-2.70, -1.15, 0.0],
    focus: { pos: [-3.85, 1.85, 1.75], target: [-2.45, 0.85, 0.65] },
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
    bounds: { x0: -4.30, x1: 1.38, n0: 0.22, n1: 3.62 },
    spawn: [-1.25, 1.15, 0.25],
    focus: { pos: [0.95, 1.85, -3.25], target: [-2.35, 0.78, -1.65] },
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
    bounds: { x0: 1.58, x1: 4.30, n0: 0.22, n1: 3.62 },
    spawn: [2.20, 1.30, -0.75],
    focus: { pos: [1.85, 1.85, -0.55], target: [3.35, 0.75, -2.05] },
  },
  {
    key: 'guestBath',
    ar: 'حمام',
    name: 'GUEST BATH',
    dimA2: '1.40 × 1.80',
    dimA1: '1.50 × 2.10',
    x0: -4.60, x1: -2.32, n0: 3.74, n1: 5.08,
    ceil: CONFIG.wallHeight, walk: true, dir: [-1, 0],
    labelAt: [-3.20, 4.58],
    small: true,
    bounds: { x0: -4.30, x1: -2.44, n0: 3.84, n1: 4.98 },
    spawn: [-2.85, 4.50, 1.55],
    focus: { pos: [-2.65, 1.85, -4.82], target: [-3.75, 0.85, -4.32] },
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
    bounds: { x0: -4.30, x1: -2.28, n0: 5.18, n1: 9.68 },
    spawn: [-2.75, 6.60, 0.35],
    focus: { pos: [-2.55, 1.90, -6.35], target: [-3.85, 0.88, -8.25] },
  },
  {
    key: 'bathUpper',
    ar: 'حمام',
    name: 'UPPER BATH',
    dimA2: '1.40 × 2.40',
    dimA1: '1.40 × 2.40',
    x0: -0.72, x1: 0.72, n0: 8.95, n1: 10.30,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.16, 9.52],
    small: true,
    bounds: { x0: -0.62, x1: 0.62, n0: 9.04, n1: 10.18 },
    spawn: [0.05, 9.60, 1.2],
    focus: { pos: [0.45, 1.95, -9.22], target: [-0.25, 0.75, -9.70] },
  },
  {
    key: 'hallCenter',
    ar: 'صالة / حمام',
    name: 'CENTRAL BATH & HALL',
    dimA2: '1.40 × 5.50',
    dimA1: '1.40 × 5.50',
    x0: -0.72, x1: 0.72, n0: 3.74, n1: 8.95,
    ceil: CONFIG.wallHeight, walk: true, dir: [0, 1],
    labelAt: [0.0, 4.35],
    small: true,
    bounds: { x0: -0.62, x1: 0.62, n0: 3.84, n1: 8.85 },
    spawn: [-0.30, 5.45, -0.32],
    focus: { pos: [-0.45, 1.85, -5.18], target: [0.35, 0.85, -6.55] },
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
    bounds: { x0: -2.10, x1: 1.38, n0: 3.84, n1: 11.18 },
    spawn: [-1.45, 5.80, 0.0],
    focus: { pos: [-1.45, 1.85, -4.40], target: [-1.45, 1.00, -10.20] },
  },
  {
    key: 'master',
    ar: 'ماستر',
    name: 'MASTER BEDROOM',
    dimA2: '3.00 × 4.00',
    dimA1: '3.50 × 4.00',
    x0: 1.48, x1: 4.60, n0: 3.74, n1: 6.34,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [3.15, 5.80],
    bounds: { x0: 1.58, x1: 4.30, n0: 3.84, n1: 6.24 },
    spawn: [2.35, 5.75, -0.80],
    focus: { pos: [1.85, 1.90, -5.95], target: [3.35, 0.75, -4.65] },
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
    bounds: { x0: 1.58, x1: 2.86, n0: 6.44, n1: 7.92 },
    spawn: [2.25, 7.35, 2.80],
    focus: { pos: [2.65, 1.95, -7.72], target: [2.15, 0.90, -6.65] },
  },
  {
    key: 'masterBath',
    ar: 'حمام الماستر',
    name: 'MASTER BATH',
    dimA2: '1.40 × 2.00',
    dimA1: '1.50 × 1.80',
    x0: 2.96, x1: 4.60, n0: 6.34, n1: 8.01,
    ceil: CONFIG.wallHeight, walk: true, dir: [1, 0],
    labelAt: [3.55, 7.42],
    small: true,
    bounds: { x0: 3.04, x1: 4.30, n0: 6.44, n1: 7.92 },
    spawn: [3.35, 7.50, -2.50],
    focus: { pos: [3.20, 1.95, -7.72], target: [3.85, 0.75, -6.75] },
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
    bounds: { x0: 1.58, x1: 4.30, n0: 8.10, n1: 10.14 },
    spawn: [2.55, 9.55, -0.80],
    focus: { pos: [1.85, 1.90, -9.95], target: [3.70, 0.75, -8.85] },
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
    bounds: { x0: -4.30, x1: -1.48, n0: 9.88, n1: 14.30 },
    spawn: [-2.90, 11.40, 0.10],
    focus: { pos: [-2.00, 1.95, -10.50], target: [-3.20, 0.95, -13.50] },
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
    bounds: { x0: -1.28, x1: 1.38, n0: 11.40, n1: 14.30 },
    spawn: [0.85, 12.10, 0.65],
    focus: { pos: [1.10, 1.90, -11.75], target: [-0.45, 0.75, -13.05] },
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
    bounds: { x0: 1.58, x1: 4.30, n0: 10.34, n1: 14.30 },
    spawn: [2.30, 11.15, -0.65],
    focus: { pos: [1.85, 1.95, -10.85], target: [3.45, 0.75, -12.65] },
  },
];

// Secondary annotation labels rendered on the floor plan sheet
export const EXTRA_LABELS = [
  { ar: 'لفتح', name: 'OPEN', x: -2.65, n: 11.55, room: 'services' },
  { ar: 'تراس', name: 'TERRACE', x: 2.75, n: -1.35, room: 'balconies', small: true },
];

// Curved front balcony geometric parameters
export const BALCONIES = {
  left: { cx: -2.72, cn: -0.02, rx: 1.80, rn: 2.35, a0: Math.PI, a1: 2 * Math.PI },
  center: { cx: 0.0, cn: 0.0, rx: 1.18, rn: 1.48, a0: Math.PI, a1: 2 * Math.PI },
  right: { cx: 2.72, cn: -0.02, rx: 1.80, rn: 2.35, a0: Math.PI, a1: 2 * Math.PI },
};

// Potted plants visible on the two curved front balconies
export const PLANTS = [
  { x: -3.95, n: -0.58, r: 0.42 },
  { x: -1.68, n: -0.58, r: 0.42 },
  { x: 1.68, n: -0.58, r: 0.42 },
  { x: 3.95, n: -0.58, r: 0.42 },
];

// Doors matching Reference A1/A2 and the close-up bathroom reference
export const DOORS = [
  // Left balcony French door
  { x: -2.02, n: -0.04, w: 0.78, open: -90, closed: 180, room: 'balconies' },
  // Right balcony French door
  { x: 2.35, n: -0.04, w: 0.78, open: -90, closed: 0, room: 'balconies' },
  // Front-right bedroom door from Reception
  { x: 1.48, n: 3.60, w: 0.78, open: 0, closed: -90, room: 'guestRoom' },
  // Guest bathroom door (from corridor)
  { x: -2.32, n: 4.82, w: 0.68, open: 0, closed: -90, room: 'guestBath' },
  // Kitchen door (from west corridor)
  { x: -2.18, n: 6.24, w: 0.76, open: 180, closed: 90, room: 'kitchen' },
  // Central hall entry door (from west corridor into south vestibule)
  { x: -0.72, n: 4.10, w: 0.72, open: 180, closed: 90, room: 'corridor' },
  // Central bathroom South door (from south vestibule into continuous bathroom)
  { x: -0.66, n: 5.02, w: 0.58, open: 90, closed: 0, room: 'hallCenter' },
  // Central bathroom North door (swings northward into middle alcove clear of shower glass)
  { x: -0.30, n: 7.35, w: 0.60, open: 90, closed: 0, room: 'hallCenter' },
  // Central hall east door (to east corridor)
  { x: 0.72, n: 8.05, w: 0.72, open: 0, closed: -90, room: 'corridor' },
  // West corridor divider door
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
