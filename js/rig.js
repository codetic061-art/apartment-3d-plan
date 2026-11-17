// Scroll-Driven Camera Trajectory (s: 0 -> 1)
//
// C0-continuous Red (human-height walk through open doors), Blue (smooth CAD
// overhead lift/drop transition with cutaway reveal), and Green (Bedroom 2 CTA) route:
//   0.00 - 0.05   01 Architectural Sheet (+1.20 m cut, 2 deg telephoto)
//   0.05 - 0.16   02 Lift & Approach to Front Center Terrace Doors
//   0.16 - 0.28   [RED] Enter Front Sliding Doors -> Reception -> Guest Bath
//   0.28 - 0.34   [BLUE #1] Guest Bath -> Kitchen
//   0.34 - 0.45   [RED] Kitchen -> West Corridor -> Services
//   0.45 - 0.51   [BLUE #2] Services -> Bedroom 1
//   0.51 - 0.65   [RED] Bedroom 1 -> طرقة -> Upper Bath -> منور -> سلم & Central Bath -> Vestibule
//   0.65 - 0.74   [BLUE #3 + RED] Core Vestibule -> Reception Hall -> Front-Right Bedroom
//   0.74 - 0.80   [BLUE #4] Front-Right Bedroom -> Master Bedroom
//   0.80 - 0.87   [RED] Master -> Dressing -> Master Bath
//   0.87 - 0.92   [BLUE #5] Master Bath -> Bedroom 3
//   0.92 - 1.00   [RED -> GREEN CTA] Bedroom 3 -> East Corridor -> Bedroom 2 (Go To First Person)

import { CUT_PLAN, CUT_OPEN, CONFIG } from './plan.js';

const io = (t) => t * t * (3 - 2 * t);
const io5 = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lin = (t) => t;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const rad = Math.PI / 180;

function track(keys) {
  return (s) => {
    if (s <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        const t = (s - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
        const e = (keys[i][2] ?? lin)(t);
        return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * e;
      }
    }
    return keys[keys.length - 1][1];
  };
}

function glide(keys) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d = [];
  const m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  return (s) => {
    if (s <= xs[0]) return ys[0];
    if (s >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (s > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (s - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export const STOPS = { sheetEnd: 0.05, liftEnd: 0.11, landed: 0.16, walkEnd: 1.0 };

export function makeRig(aspect) {
  const portrait = aspect < 0.9;
  const fovWalk = portrait ? 74 : aspect < 1.5 ? 60 : 54;

  const F0 = portrait ? 38.0 : 25.0;
  const cn = portrait ? 6.2 : 6.0;
  const cx = portrait ? -0.4 : -0.22 * ((F0 * aspect) / 2);
  const frame = { cx, cn, w: F0 * aspect, h: F0 };

  const L = Math.log;
  const T = (deg) => Math.tan((deg * rad) / 2);
  const LAND_Z = 3.40; // n = -3.40 outside front center glazed sliding doors
  const TARGET_Z = 0.0;
  const LAND_ELEV = 4;
  const EYE_Y = CONFIG.eyeHeight;
  const landDist = LAND_Z - TARGET_Z;
  const landFrame = 2 * landDist * T(fovWalk);
  const tyAtLand = EYE_Y - landDist * Math.sin(LAND_ELEV * rad);
  const zAtLand = TARGET_Z + landDist * Math.cos(LAND_ELEV * rad);

  const { sheetEnd: s1, liftEnd: s2, landed: s3 } = STOPS;

  const early = (t) => 0.5 * io(t) + 0.5 * (1 - (1 - t) * (1 - t));
  const elev = track([[0, 90], [s1, 90], [s2, 34, early], [s3, LAND_ELEV, io]]);
  const fovL = track([[0, L(T(2))], [s1, L(T(2))], [s2, L(T(8)), io], [s3, L(T(fovWalk)), io5]]);
  const frmL = track([[0, L(F0)], [s1, L(F0)], [s2, L(portrait ? 26 : 19), io], [s3, L(landFrame), io5]]);
  const tx = track([[0, cx], [s1, cx], [s2, 0.0, io], [s3, 0.0, io]]);
  const ty = track([[0, 0], [s1, 0], [s2, 1.0, io], [s3, tyAtLand, io]]);
  const tz = track([[0, -cn], [s1, -cn], [s2, -4.5, io], [s3, TARGET_Z, io]]);

  const cut = track([
    [0, CUT_PLAN],
    [s1 + 0.01, CUT_PLAN],
    [s2, CONFIG.wallHeight - 0.04, io],
    [0.14, CONFIG.wallHeight + 0.02, lin],
    [s3, CUT_OPEN, io],
    // Blue #1 CAD cutaway reveal (Guest Bath -> Kitchen)
    [0.28, CUT_OPEN, lin],
    [0.31, 2.65, io],
    [0.34, CUT_OPEN, io],
    // Blue #2 CAD cutaway reveal (Services -> Bedroom 1)
    [0.45, CUT_OPEN, lin],
    [0.48, 2.65, io],
    [0.51, CUT_OPEN, io],
    // Blue #3 CAD cutaway reveal (Vestibule -> East Hall)
    [0.65, CUT_OPEN, lin],
    [0.67, 2.65, io],
    [0.69, CUT_OPEN, io],
    // Blue #4 CAD cutaway reveal (Front Bedroom -> Master)
    [0.74, CUT_OPEN, lin],
    [0.77, 2.65, io],
    [0.80, CUT_OPEN, io],
    // Blue #5 CAD cutaway reveal (Master Bath -> Bedroom 3)
    [0.87, CUT_OPEN, lin],
    [0.895, 2.65, io],
    [0.92, CUT_OPEN, io],
  ]);

  const fogN = track([[0, L(4000)], [s2, L(4000)], [s3, L(28), io]]);
  const fogF = track([[0, L(9000)], [s2, L(9000)], [s3, L(92), io]]);

  // Continuous Red/Blue/Green path matching s3 boundary (x = 0, y = EYE_Y, z = +zAtLand)
  const px = track([
    [s3, 0.0],
    [0.18, 0.0, io],
    [0.20, 0.35, io],
    [0.225, -1.25, io],
    [0.25, -1.42, io],
    [0.28, -3.25, io],   // Guest Bath
    [0.31, -3.25, io],   // Blue #1 peak
    [0.34, -3.25, io],   // Kitchen South
    [0.365, -3.15, io],  // Kitchen Mid
    [0.385, -2.55, io],  // Kitchen Door approach
    [0.405, -1.45, io],  // West Corridor
    [0.43, -1.45, io],   // West Corridor North
    [0.45, -3.00, io],   // Services
    [0.48, -1.50, io],   // Blue #2 peak
    [0.51, 0.52, io],    // Bedroom 1
    [0.535, 0.85, io],   // Bedroom 1 Door approach
    [0.555, 0.85, io],   // طرقة
    [0.575, 0.05, io],   // Upper Bath North door
    [0.595, 0.08, io],   // Upper Bath interior (clears open door leaf)
    [0.615, -0.08, io],  // منور
    [0.635, -0.36, io],  // سلم bottom landing looking NE up treads & Central Bath
    [0.65, -0.40, io],   // South Vestibule
    [0.67, 0.35, io],    // Blue #3 peak
    [0.69, 1.02, io],    // East Corridor South
    [0.71, 1.02, io],    // Front-Right Bedroom Door
    [0.74, 2.45, io],    // Front-Right Bedroom
    [0.77, 2.45, io],    // Blue #4 peak
    [0.80, 2.05, io],    // Master Bedroom framing king bed, pillows & nightstands
    [0.825, 2.05, io],   // Master -> Dressing
    [0.845, 2.25, io],   // Dressing -> Master Bath door
    [0.87, 3.75, io],    // Master Bath
    [0.895, 3.20, io],   // Blue #5 peak
    [0.92, 2.85, io],    // Bedroom 3
    [0.945, 1.02, io],   // East Corridor
    [0.965, 1.02, io],   // Bedroom 2 Door approach
    [0.985, 2.15, io],   // Enter Bedroom 2
    [1.00, 2.20, io],    // Final Bedroom 2 CTA framing bed, lamps & pillows
  ]);

  const py = track([
    [s3, EYE_Y],
    [0.28, EYE_Y, lin],
    [0.31, 13.8, io5],   // Blue #1 lift
    [0.34, EYE_Y, io5],
    [0.45, EYE_Y, lin],
    [0.48, 14.5, io5],   // Blue #2 lift
    [0.51, EYE_Y, io5],
    [0.615, EYE_Y, lin],
    [0.635, 1.72, io],
    [0.65, EYE_Y, io],
    [0.67, 11.2, io5],   // Blue #3 lift
    [0.69, EYE_Y, io5],
    [0.74, EYE_Y, lin],
    [0.77, 13.8, io5],   // Blue #4 lift
    [0.80, EYE_Y, io5],
    [0.87, EYE_Y, lin],
    [0.895, 13.8, io5],  // Blue #5 lift
    [0.92, EYE_Y, io5],
    [1.00, EYE_Y, lin],
  ]);

  // Note: world z = -n
  const pz = track([
    [s3, zAtLand],
    [0.18, 1.15, io],
    [0.20, -0.85, io],
    [0.225, -1.45, io],
    [0.25, -4.55, io],
    [0.28, -4.55, io],
    [0.31, -5.40, io],
    [0.34, -6.50, io],
    [0.365, -7.45, io],
    [0.385, -6.34, io],
    [0.405, -6.34, io],
    [0.43, -9.85, io],
    [0.45, -12.60, io],
    [0.48, -12.60, io],
    [0.51, -12.55, io],
    [0.535, -11.95, io],
    [0.555, -10.75, io],
    [0.575, -10.75, io],
    [0.595, -9.85, io],
    [0.615, -8.05, io],
    [0.635, -5.15, io],
    [0.65, -4.45, io],
    [0.67, -3.70, io],
    [0.69, -3.15, io],
    [0.71, -3.05, io],
    [0.74, -1.95, io],
    [0.77, -3.60, io],
    [0.80, -5.85, io],
    [0.825, -6.55, io],
    [0.845, -7.55, io],
    [0.87, -7.42, io],
    [0.895, -8.25, io],
    [0.92, -9.35, io],
    [0.945, -9.45, io],
    [0.965, -10.80, io],
    [0.985, -11.45, io],
    [1.00, -11.65, io],
  ]);

  // Continuous unwrapped camera yaw (0 = North -Z, +PI/2 = West -X, -PI/2 = East +X, +PI = South +Z)
  const pyaw = glide([
    [s3, 0.0],
    [0.18, 0.0],
    [0.20, 0.95],
    [0.225, 0.55],
    [0.25, 1.57],
    [0.28, 1.57],
    [0.31, 0.0],
    [0.34, -0.35],
    [0.365, 0.65],
    [0.385, -1.57],
    [0.405, 0.05],
    [0.43, 0.35],
    [0.45, 0.0],
    [0.48, 0.0],
    [0.51, 0.85],
    [0.535, 3.14],
    [0.555, 1.57],
    [0.575, 3.14],
    [0.595, 3.25],
    [0.615, 3.14],
    [0.635, -0.28],
    [0.65, 1.57],
    [0.67, 0.0],
    [0.69, -1.57],
    [0.71, -1.57],
    [0.74, -1.25],
    [0.77, -1.55],
    [0.80, -2.35],
    [0.825, -0.15],
    [0.845, -1.57],
    [0.87, -2.15],
    [0.895, 0.0],
    [0.92, 1.57],
    [0.945, 0.0],
    [0.965, -1.57],
    [0.985, -0.82],
    [1.00, -0.88],
  ]);

  const ppitch = track([
    [s3, -LAND_ELEV * rad],
    [0.28, -5 * rad, lin],
    [0.31, -80 * rad, io],
    [0.34, -5 * rad, io],
    [0.45, -4 * rad, lin],
    [0.48, -80 * rad, io],
    [0.51, -5 * rad, io],
    [0.615, -5 * rad, lin],
    [0.635, -10 * rad, io],
    [0.65, -5 * rad, io],
    [0.67, -76 * rad, io],
    [0.69, -4 * rad, io],
    [0.74, -4 * rad, lin],
    [0.77, -80 * rad, io],
    [0.80, -7 * rad, io],
    [0.87, -5 * rad, lin],
    [0.895, -80 * rad, io],
    [0.92, -4 * rad, io],
    [1.00, -7 * rad, io],
  ]);

  function stageInfo(s) {
    if (s <= s1) return { kind: 'sheet', label: '01 Architectural Sheet' };
    if (s <= s3) return { kind: 'lift', label: '02 Front Entrance Approach' };
    if ((s > 0.28 && s < 0.34) || (s > 0.45 && s < 0.51) || (s > 0.65 && s < 0.69) || (s > 0.74 && s < 0.80) || (s > 0.87 && s < 0.92)) {
      return { kind: 'blue', label: 'Overhead CAD Room Transfer' };
    }
    if (s >= 0.96) return { kind: 'green', label: 'Bedroom 2 · First Person Ready' };
    return { kind: 'red', label: 'Interior Walkthrough' };
  }

  function at(sIn) {
    const s = clamp01(sIn);
    const o = { s, stage: stageInfo(s) };
    o.cut = cut(s);
    o.fogNear = Math.exp(fogN(s));
    o.fogFar = Math.exp(fogF(s));

    if (s <= s3) {
      const e = elev(s) * rad;
      const tanHalf = Math.exp(fovL(s));
      const dist = Math.exp(frmL(s)) / (2 * tanHalf);
      o.fov = (2 * Math.atan(tanHalf)) / rad;
      o.pitch = -e;
      o.yaw = 0;
      o.x = tx(s);
      o.y = ty(s) + dist * Math.sin(e);
      o.z = tz(s) + dist * Math.cos(e);
      o.dist = dist;
    } else {
      o.fov = fovWalk;
      o.x = px(s);
      o.y = py(s);
      o.z = pz(s);
      o.yaw = pyaw(s);
      o.pitch = ppitch(s);
      o.dist = Math.max(4, o.y + 4);
    }

    // All rooms stay revealed once apartment has lifted cleanly (s >= 0.14)
    const span = (a, b) => io(clamp01((s - a) / (b - a)));
    const mainR = span(0.08, 0.16);
    o.reveals = {
      balconies: mainR,
      reception: mainR,
      guestRoom: mainR,
      guestBath: mainR,
      kitchen: mainR,
      corridor: mainR,
      hallCenter: mainR,
      lightwell: mainR,
      bathUpper: mainR,
      master: mainR,
      dressing: mainR,
      masterBath: mainR,
      bedroom3: mainR,
      services: mainR,
      bedroom1: mainR,
      bedroom2: mainR,
    };

    o.near = Math.max(0.08, (o.y - 7) * 0.6);
    o.far = o.y > 60 ? o.y * 1.6 + 500 : 700;
    return o;
  }

  return { at, frame, portrait, fovWalk };
}
