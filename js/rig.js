// Scroll-Driven Camera Trajectory (s: 0 -> 1)
//
// C0-continuous across all 5 architectural stops for smooth forward & reverse scroll:
//   01 Sheet             0.00 - 0.06   Flat 2 deg telephoto plan cut at +1.20 m
//   02 The Lift          0.06 - 0.28   Walls rise, camera tilts to isometric view
//   03 Balconies & Rec.  0.28 - 0.55   Approach curved balconies & enter Reception
//   04 Kitchen & Hall    0.55 - 0.78   Walk West corridor past Kitchen & Central Core
//   05 Bedrooms & Suite  0.78 - 1.00   Enter upper corridor (طرقة) & Bedroom Wing

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

export const STOPS = { sheetEnd: 0.06, liftEnd: 0.28, landed: 0.44, walkEnd: 1.0 };

export function makeRig(aspect) {
  const portrait = aspect < 0.9;
  const fovWalk = portrait ? 74 : aspect < 1.5 ? 60 : 54;

  const F0 = portrait ? 36.5 : 23.5;
  const cn = portrait ? 9.2 : 6.0;
  const cx = portrait ? -0.4 : -0.22 * ((F0 * aspect) / 2);
  const frame = { cx, cn, w: F0 * aspect, h: F0 };

  const L = Math.log;
  const T = (deg) => Math.tan((deg * rad) / 2);
  const LAND_Z = 5.4;
  const TARGET_Z = 0.0;
  const LAND_ELEV = 4;
  const EYE_Y = CONFIG.eyeHeight;
  const landDist = LAND_Z - TARGET_Z;
  const landFrame = 2 * landDist * T(fovWalk);
  const tyAtLand = EYE_Y - landDist * Math.sin(LAND_ELEV * rad);
  const zAtLand = TARGET_Z + landDist * Math.cos(LAND_ELEV * rad);

  const { sheetEnd: s1, liftEnd: s2, landed: s3 } = STOPS;

  const early = (t) => 0.5 * io(t) + 0.5 * (1 - (1 - t) * (1 - t));
  const elev = track([[0, 90], [s1, 90], [s2, 36, early], [s3, LAND_ELEV, io]]);
  const fovL = track([[0, L(T(2))], [s1, L(T(2))], [s2, L(T(6)), io], [s3, L(T(fovWalk)), io5]]);
  const frmL = track([[0, L(F0)], [s1, L(F0)], [s2, L(portrait ? 26 : 19), io], [s3, L(landFrame), io5]]);
  const tx = track([[0, cx], [s1, cx], [s2, 0.0, io], [s3, -1.35, io]]);
  const ty = track([[0, 0], [s1, 0], [s2, 1.0, io], [s3, tyAtLand, io]]);
  const tz = track([[0, -cn], [s1, -cn], [s2, -5.5, io], [s3, TARGET_Z, io]]);

  const cut = track([
    [0, CUT_PLAN],
    [s1 + 0.01, CUT_PLAN],
    [s2, CONFIG.wallHeight - 0.04, io],
    [0.39, CONFIG.wallHeight + 0.02, lin],
    [s3, CUT_OPEN, io],
  ]);

  const fogN = track([[0, L(4000)], [s2, L(4000)], [s3, L(24), io]]);
  const fogF = track([[0, L(9000)], [s2, L(9000)], [s3, L(85), io]]);

  // Continuous walk path matching s3 boundary exactly
  const px = glide([
    [s3, -1.35],
    [0.52, -1.40],
    [0.64, -1.38],
    [0.76, -1.76],
    [0.86, -0.95],
    [1.00, 0.45],
  ]);
  const pz = glide([
    [s3, zAtLand],
    [0.52, 0.2],
    [0.64, -5.2],
    [0.76, -9.6],
    [0.86, -10.75],
    [1.00, -10.68],
  ]);
  const pyaw = glide([
    [s3, 0.0],
    [0.52, 0.05],
    [0.64, 0.10],
    [0.76, 0.04],
    [0.86, -0.68],
    [1.00, -1.15],
  ]);
  const ppitch = glide([
    [s3, -LAND_ELEV * rad],
    [0.54, -4 * rad],
    [0.75, -3 * rad],
    [1.00, -4 * rad],
  ]);

  const span = (s, a, b) => io(clamp01((s - a) / (b - a)));

  function at(sIn) {
    const s = clamp01(sIn);
    const o = { s };
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
      o.y = EYE_Y;
      o.z = pz(s);
      o.yaw = pyaw(s);
      o.pitch = ppitch(s);
      o.dist = 6;
    }

    o.reveals = {
      balconies: span(s, 0.28, 0.44),
      reception: span(s, 0.34, 0.54),
      guestRoom: span(s, 0.40, 0.56),
      guestBath: span(s, 0.50, 0.64),
      kitchen: span(s, 0.54, 0.74),
      corridor: span(s, 0.52, 0.78),
      hallCenter: span(s, 0.56, 0.76),
      bathUpper: span(s, 0.66, 0.80),
      master: span(s, 0.70, 0.88),
      dressing: span(s, 0.74, 0.90),
      masterBath: span(s, 0.76, 0.92),
      bedroom3: span(s, 0.78, 0.94),
      services: span(s, 0.76, 0.94),
      bedroom1: span(s, 0.82, 0.98),
      bedroom2: span(s, 0.84, 0.99),
    };

    o.near = Math.max(0.08, (o.y - 7) * 0.6);
    o.far = o.y > 60 ? o.y * 1.6 + 500 : 700;
    return o;
  }

  return { at, frame, portrait, fovWalk };
}
