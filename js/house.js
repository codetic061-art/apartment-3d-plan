// Apartment 3D Architectural Model (Unified 10.00 x 17.00 m A1 Specification)
// Built with exact RectSolid CSG cuts, continuous central bath & سلم staircase,
// curved front balconies, recessed bay windows, and multi-part geometry via furniture.js.

import * as THREE from 'three';
import { RectSolid, pushBox, bucketToGeometry } from './solid.js';
import { ROOMS, BASE_Y, CONFIG, BALCONIES, PLANTS } from './plan.js';
import {
  placeGeo,
  addSofa,
  addCoffeeTable,
  addDiningSet,
  addBedSuite,
  addWardrobe,
  addKitchenSuite,
  addToilet,
  addVanityBasin,
  addShowerAssembly,
  addStaircase,
} from './furniture.js';

const roomAt = (x, n, y = 0) => {
  for (const r of ROOMS) {
    if (x > r.x0 && x < r.x1 && n > r.n0 && n < r.n1 && y < r.ceil + 0.1) return r.key;
  }
  return 'corridor';
};

class Kit {
  constructor() {
    this.b = {};
    this.e = {};
  }
  bucket(room, mat) {
    return (this.b[room + '|' + mat] ??= { p: [], n: [], uv: [], idx: [] });
  }
  edges(room) {
    return (this.e[room] ??= []);
  }
  box(room, mat, x0, n0, x1, n1, y0, y1, edges = true) {
    pushBox(
      this.bucket(room, mat),
      edges ? this.edges(room) : null,
      Math.min(x0, x1),
      Math.min(y0, y1),
      -Math.max(n0, n1),
      Math.max(x0, x1),
      Math.max(y0, y1),
      -Math.min(n0, n1)
    );
  }
  geo(room, mat, g, edgeAngle = 30) {
    const B = this.bucket(room, mat);
    const src = g.index ? g.toNonIndexed() : g;
    const p = src.attributes.position;
    const nrm = src.attributes.normal;
    const uv = src.attributes.uv;
    const base = B.p.length / 3;
    for (let i = 0; i < p.count; i++) {
      B.p.push(p.getX(i), p.getY(i), p.getZ(i));
      B.n.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      B.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      B.idx.push(base + i);
    }
    if (edgeAngle !== null) {
      const eg = new THREE.EdgesGeometry(g, edgeAngle);
      const E = this.edges(room);
      const ep = eg.attributes.position;
      for (let i = 0; i < ep.count; i++) E.push(ep.getX(i), ep.getY(i), ep.getZ(i));
    }
  }
}

function pushQuad(B, a, b, c, d, nVec) {
  const base = B.p.length / 3;
  for (const v of [a, b, c, d]) {
    B.p.push(v[0], v[1], v[2]);
    B.n.push(nVec[0], nVec[1], nVec[2]);
    if (Math.abs(nVec[1]) > 0.5) B.uv.push(v[0], v[2]);
    else B.uv.push(v[0] + v[2], v[1]);
  }
  B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function buildEllipticalDeck(K, room, topMat, sideMat, cx, cn, rx, rn, a0, a1, y0, y1, segs = 36) {
  const Btop = K.bucket(room, topMat);
  const Bside = K.bucket(room, sideMat);
  const E = K.edges(room);
  const pt = (a) => [cx + rx * Math.cos(a), cn + rn * Math.sin(a)];

  for (let i = 0; i < segs; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segs;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segs;
    const [x0, n0] = pt(t0);
    const [x1, n1] = pt(t1);
    const z0 = -n0, z1 = -n1, zc = -cn;

    const baseTop = Btop.p.length / 3;
    for (const [vx, vy, vz] of [[cx, y1, zc], [x0, y1, z0], [x1, y1, z1]]) {
      Btop.p.push(vx, vy, vz);
      Btop.n.push(0, 1, 0);
      Btop.uv.push(vx, vz);
    }
    Btop.idx.push(baseTop, baseTop + 1, baseTop + 2);

    const baseBot = Bside.p.length / 3;
    for (const [vx, vy, vz] of [[cx, y0, zc], [x1, y0, z1], [x0, y0, z0]]) {
      Bside.p.push(vx, vy, vz);
      Bside.n.push(0, -1, 0);
      Bside.uv.push(vx, vz);
    }
    Bside.idx.push(baseBot, baseBot + 1, baseBot + 2);

    const nx = Math.cos((t0 + t1) / 2);
    const nz = -Math.sin((t0 + t1) / 2);
    pushQuad(Bside, [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [nx, 0, nz]);

    E.push(x0, y1, z0, x1, y1, z1);
    E.push(x0, y0, z0, x1, y0, z1);
  }
}

function buildEllipticalRing(K, room, mat, cx, cn, rxIn, rnIn, rxOut, rnOut, a0, a1, y0, y1, segs = 36) {
  const B = K.bucket(room, mat);
  const E = K.edges(room);
  for (let i = 0; i < segs; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segs;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segs;
    const xi0 = cx + rxIn * Math.cos(t0), zi0 = -(cn + rnIn * Math.sin(t0));
    const xi1 = cx + rxIn * Math.cos(t1), zi1 = -(cn + rnIn * Math.sin(t1));
    const xo0 = cx + rxOut * Math.cos(t0), zo0 = -(cn + rnOut * Math.sin(t0));
    const xo1 = cx + rxOut * Math.cos(t1), zo1 = -(cn + rnOut * Math.sin(t1));
    const mid = (t0 + t1) / 2;
    const nx = Math.cos(mid), nz = -Math.sin(mid);

    pushQuad(B, [xi0, y1, zi0], [xo0, y1, zo0], [xo1, y1, zo1], [xi1, y1, zi1], [0, 1, 0]);
    pushQuad(B, [xi0, y0, zi0], [xi1, y0, zi1], [xo1, y0, zo1], [xo0, y0, zo0], [0, -1, 0]);
    pushQuad(B, [xo0, y0, zo0], [xo1, y0, zo1], [xo1, y1, zo1], [xo0, y1, zo0], [nx, 0, nz]);
    pushQuad(B, [xi1, y0, zi1], [xi0, y0, zi0], [xi0, y1, zi0], [xi1, y1, zi1], [-nx, 0, -nz]);

    E.push(xo0, y1, zo0, xo1, y1, zo1);
    E.push(xi0, y1, zi0, xi1, y1, zi1);
    if (i === 0) {
      pushQuad(B, [xi0, y0, zi0], [xo0, y0, zo0], [xo0, y1, zo0], [xi0, y1, zi0], [0, 0, 1]);
      E.push(xi0, y1, zi0, xo0, y1, zo0);
    }
    if (i === segs - 1) {
      pushQuad(B, [xo1, y0, zo1], [xi1, y0, zi1], [xi1, y1, zi1], [xo1, y1, zo1], [0, 0, 1]);
      E.push(xi1, y1, zi1, xo1, y1, zo1);
    }
  }
}

export function buildHouse() {
  const H = CONFIG.wallHeight;
  const DH = CONFIG.doorHeight;
  const CT = CONFIG.ceilingThickness;

  // ------------------------------------------------------------------
  // 1. Structural Shell + Wall & Opening Registry (10.00 x 17.00 m)
  // ------------------------------------------------------------------
  const S = new RectSolid();
  const wallSegments = [];
  const doorCarves = [];
  const obstacles = [];

  const A = (x0, n0, x1, n1, y0, y1) => S.add(x0, y0, -n0, x1, y1, -n1);
  const C = (x0, n0, x1, n1, y0, y1) => {
    S.sub(x0, y0, -n0, x1, y1, -n1);
    if (y0 <= 0.05) doorCarves.push([Math.min(x0, x1), Math.min(n0, n1), Math.max(x0, x1), Math.max(n0, n1)]);
  };

  const addWall = (label, room, x0, n0, x1, n1, verifiedLen = false) => {
    A(x0, n0, x1, n1, 0, H);
    const w = Math.abs(x1 - x0);
    const d = Math.abs(n1 - n0);
    wallSegments.push({
      id: `${room}_${wallSegments.length}`,
      label,
      room,
      x0: Math.min(x0, x1),
      n0: Math.min(n0, n1),
      x1: Math.max(x0, x1),
      n1: Math.max(n0, n1),
      y0: 0,
      y1: H,
      length: Math.max(w, d),
      thickness: Math.min(w, d),
      axis: w >= d ? 'x' : 'n',
      verifiedLen,
    });
  };

  // Main floor slab (-5.00..+5.00 x 0.00..14.55 m) + North bay floor aprons
  A(-5.00, 0.00, 5.00, 14.55, BASE_Y, 0);
  A(-3.80, 14.55, -2.10, 14.80, BASE_Y, 0);
  A(2.15, 14.55, 3.85, 14.80, BASE_Y, 0);

  // Exterior perimeter walls (10.00 m outer width)
  addWall('West Exterior Wall · الواجهة الغربية', 'reception', -5.00, 0.00, -4.80, 14.55, true);
  addWall('East Exterior Wall · الواجهة الشرقية', 'master', 4.80, 0.00, 5.00, 14.55, true);
  addWall('North Exterior Wall · الواجهة الشمالية', 'bedroom1', -5.00, 14.35, 5.00, 14.55, true);
  addWall('South Front Facade · الواجهة الأمامية', 'reception', -5.00, 0.00, 5.00, 0.20, true);

  // North bay window projections (Services + Bedroom 2, matching Crops 1 & 2)
  A(-3.80, 14.55, -2.10, 14.80, 0, H);
  C(-3.65, 14.30, -2.25, 14.70, 0, CONFIG.winTop);
  A(2.15, 14.55, 3.85, 14.80, 0, H);
  C(2.30, 14.30, 3.70, 14.70, 0, CONFIG.winTop);

  // North wing partitions (3.50 | 3.00 | 3.50 grid lines at x = -1.50 and x = +1.50)
  addWall('Bedroom 1 West Wall · حائط نوم ١', 'bedroom1', -1.56, 11.28, -1.44, 14.35, true);
  addWall('Bedroom 1 South Wall · مدخل نوم ١', 'bedroom1', -1.56, 11.28, 1.44, 11.40, true);
  addWall('East Wing Spine Wall · الفاصل الشرقي', 'corridor', 1.44, 0.20, 1.56, 14.35, true);

  // East wing room partitions
  addWall('Bedroom 2 / Bedroom 3 Partition', 'bedroom2', 1.56, 10.18, 4.80, 10.30, true);
  addWall('Bedroom 3 South Wall · حائط نوم ٣', 'bedroom3', 1.56, 8.04, 4.80, 8.16, true);
  addWall('Dressing / Master Bath Wall · فاصل الدريسنج', 'dressing', 3.06, 6.56, 3.18, 8.04, true);
  addWall('Master / Dressing Wall · حائط الماستر', 'master', 1.56, 6.44, 4.80, 6.56, true);
  addWall('Master / Front Bedroom Wall · فاصل الماستر', 'master', 1.56, 3.72, 4.80, 3.84, true);

  // West wing partitions (Services / Kitchen 2.90x4.20 / Guest Bath 1.50)
  addWall('Kitchen North Wall · شمال المطبخ', 'kitchen', -4.80, 9.66, -2.06, 9.78, true);
  addWall('Corridor Entry Pier · كتف الطرقة', 'corridor', -1.56, 9.50, -1.44, 10.30, false);
  addWall('Kitchen East Wall · مدخل المطبخ', 'kitchen', -2.18, 5.34, -2.06, 9.78, true);
  addWall('Kitchen / Guest Bath Wall · جنوب المطبخ', 'kitchen', -4.80, 5.34, -2.06, 5.46, true);
  addWall('Guest Bath East Wall · مدخل حمام الضيوف', 'guestBath', -2.24, 3.72, -2.12, 5.34, true);
  addWall('Guest Bath / Reception Wall · جنوب حمام الضيوف', 'guestBath', -4.80, 3.72, -2.12, 3.84, true);

  // Central Core (Vestibule -> سلم + Central Bath -> منور -> Upper Bath)
  addWall('Central Core West Wall · الحائط الغربي للكور', 'hallCenter', -0.86, 3.72, -0.74, 10.30, true);
  addWall('Central Core East Wall · الحائط الشرقي للكور', 'hallCenter', 0.54, 3.72, 0.66, 10.30, true);
  addWall('Central Core South Wall · مدخل الكور', 'hallCenter', -0.86, 3.72, 0.66, 3.84, true);
  addWall('Upper Bath North Wall · مدخل الحمام العلوي', 'bathUpper', -0.86, 10.18, 0.66, 10.30, true);
  addWall('Upper Bath / Lightwell Wall · جنوب الحمام العلوي', 'bathUpper', -0.74, 8.81, 0.54, 8.93, true);
  addWall('Lightwell / Central Bath Wall · فاصل المنور والحمام', 'lightwell', -0.74, 7.24, 0.54, 7.36, false);
  addWall('Central Bath South Vanity Stub · كتف حوض الحمام', 'hallCenter', -0.10, 4.91, 0.54, 5.03, false);

  // ---- Interior Door Openings (walkable clear apertures synced with DOORS) ----
  C(0.46, 11.20, 1.24, 11.46, 0, DH);  // Bedroom 1 door
  C(1.38, 10.42, 1.62, 11.20, 0, DH);  // Bedroom 2 door
  C(1.38, 9.07, 1.62, 9.85, 0, DH);    // Bedroom 3 door
  C(1.68, 6.40, 2.42, 6.62, 0, DH);    // Master -> Dressing opening
  C(3.00, 7.28, 3.24, 7.96, 0, DH);    // Dressing -> Master Bath door
  C(1.38, 5.40, 1.62, 6.18, 0, DH);    // Master Bedroom door
  C(1.38, 2.67, 1.62, 3.45, 0, DH);    // Front-Right Bedroom door
  C(-2.24, 5.95, -2.00, 6.73, 0, DH);  // Kitchen door
  C(-2.30, 4.22, -2.06, 4.94, 0, DH);  // Guest Bath door
  C(-0.92, 4.10, -0.68, 4.82, 0, DH);  // Central Core West entry door
  C(-0.20, 7.20, 0.36, 7.42, 0, DH);   // Central Bath -> منور passage
  C(0.48, 7.63, 0.72, 8.35, 0, DH);    // Lightwell منور East door
  C(-0.34, 10.14, 0.32, 10.36, 0, DH); // Upper Bath NORTH door (exact match to Crop 3)
  C(-0.32, 8.75, 0.32, 8.98, 0, DH);   // Upper Bath / Lightwell internal pass-through

  // ---- Exterior Windows & Front Terrace / Sliding Doors ----
  // North facade
  C(-3.65, 14.48, -2.25, 14.86, CONFIG.winSill, CONFIG.winTop);
  C(-0.65, 14.30, 0.65, 14.60, CONFIG.winSill, CONFIG.winTop);
  C(2.30, 14.48, 3.70, 14.86, CONFIG.winSill, CONFIG.winTop);
  // West facade (Kitchen window + Guest Bath 0.50m window matching Crop 4)
  C(-5.05, 7.05, -4.74, 8.40, 1.05, CONFIG.winTop);
  C(-5.05, 4.34, -4.74, 4.84, CONFIG.bathWinSill, CONFIG.bathWinTop);
  // East facade (Bedroom 3 + Master Bath + Master windows)
  C(4.74, 8.65, 5.05, 9.75, CONFIG.winSill, CONFIG.winTop);
  C(4.74, 6.95, 5.05, 7.68, CONFIG.bathWinSill, CONFIG.bathWinTop);
  C(4.74, 4.55, 5.05, 5.75, CONFIG.winSill, CONFIG.winTop);
  // South front balcony facade
  C(-4.05, -0.08, -3.54, 0.25, CONFIG.winSill, CONFIG.winTop);
  C(-3.44, -0.08, -2.66, 0.25, 0, DH);           // Left Balcony French door
  C(-1.04, -0.08, 1.04, 0.25, 0, 2.38);          // Front Center Glazed Sliding Entrance (walkable!)
  C(2.66, -0.08, 3.44, 0.25, 0, DH);             // Right Balcony French door
  C(3.56, -0.08, 4.10, 0.25, CONFIG.winSill, CONFIG.winTop);

  const shell = S.build(
    (cx, cy, cz, nx, ny, nz) => {
      const n = -cz;
      if (ny > 0.5 && Math.abs(cy) < 1e-3) {
        const rm = roomAt(cx, n, cy);
        if (rm === 'bedroom1' || rm === 'bedroom2' || rm === 'bedroom3' || rm === 'master' || rm === 'guestRoom' || rm === 'dressing') {
          return 'woodFloor';
        }
        if (rm === 'kitchen' || rm === 'services') return 'tileKitchen';
        if (rm === 'guestBath' || rm === 'masterBath' || rm === 'bathUpper' || rm === 'lightwell' || (rm === 'hallCenter' && n > 5.0 && n < 7.30)) {
          return 'tileBath';
        }
        return 'floor';
      }
      const isOuter =
        (nx < -0.5 && cx < -4.92) ||
        (nx > 0.5 && cx > 4.92) ||
        (nz < -0.5 && cz < -14.48) ||
        (nz > 0.5 && cz > -0.05);
      if (isOuter && cy > 0) return 'facadePlaster';

      const rm = roomAt(cx + nx * 0.05, n, cy);
      if (cy > 0 && cy < H - 0.1 && (rm === 'guestBath' || rm === 'masterBath' || rm === 'bathUpper' || (rm === 'hallCenter' && n > 5.0 && n < 7.30))) {
        return 'tileBath';
      }
      return 'plaster';
    },
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 2. Ceilings
  // ------------------------------------------------------------------
  const Rf = new RectSolid();
  Rf.add(-5.00, H, -14.55, 5.00, H + CT, 0.0);
  Rf.add(-3.80, H, -14.80, -2.10, H + CT, -14.55);
  Rf.add(2.15, H, -14.80, 3.85, H + CT, -14.55);

  const roof = Rf.build(
    (cx, cy, cz, nx, ny) => (ny < -0.5 ? 'ceiling' : 'facadePlaster'),
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 3. Curved Balconies, Glazing, Furniture, Fixtures & سلم Staircase
  // ------------------------------------------------------------------
  const K = new Kit();
  const obs = (x0, n0, x1, n1, maxH = 2.4) => {
    if (maxH > 0.1) obstacles.push([Math.min(x0, x1), Math.min(n0, n1), Math.max(x0, x1), Math.max(n0, n1)]);
  };

  // ---- Curved Balconies (NO chairs, only the 4 potted palms) ----
  const { left: BL, center: BC, right: BR } = BALCONIES;
  buildEllipticalDeck(K, 'balconies', 'tileBalcony', 'facadePlaster', BC.cx, BC.cn, BC.rx, BC.rn, Math.PI * 1.12, Math.PI * 1.88, BASE_Y, -0.004, 24);
  buildEllipticalRing(K, 'balconies', 'stone', BC.cx, BC.cn, BC.rx - 0.10, BC.rn - 0.10, BC.rx, BC.rn, Math.PI * 1.12, Math.PI * 1.88, -0.02, 0.01, 24);

  for (const B of [BL, BR]) {
    buildEllipticalDeck(K, 'balconies', 'tileBalcony', 'facadePlaster', B.cx, B.cn, B.rx, B.rn, B.a0, B.a1, BASE_Y, 0, 36);
    buildEllipticalRing(K, 'balconies', 'facadePlaster', B.cx, B.cn, B.rx - 0.18, B.rn - 0.18, B.rx, B.rn, B.a0, B.a1, 0, CONFIG.balconyParapetH, 36);
    buildEllipticalRing(K, 'balconies', 'stone', B.cx, B.cn, B.rx - 0.21, B.rn - 0.21, B.rx + 0.03, B.rn + 0.03, B.a0, B.a1, CONFIG.balconyParapetH, CONFIG.balconyParapetH + 0.06, 36);
    buildEllipticalRing(K, 'balconies', 'bronze', B.cx, B.cn, B.rx - 0.12, B.rn - 0.12, B.rx - 0.06, B.rn - 0.06, B.a0, B.a1, CONFIG.balconyRailH - 0.05, CONFIG.balconyRailH, 36);
    const numPosts = 22;
    for (let i = 0; i <= numPosts; i++) {
      const a = B.a0 + ((B.a1 - B.a0) * i) / numPosts;
      const px = B.cx + (B.rx - 0.09) * Math.cos(a);
      const pn = B.cn + (B.rn - 0.09) * Math.sin(a);
      K.box('balconies', 'bronze', px - 0.018, pn - 0.018, px + 0.018, pn + 0.018, CONFIG.balconyParapetH + 0.06, CONFIG.balconyRailH - 0.05, false);
    }
  }

  for (const p of PLANTS) {
    const pot = new THREE.CylinderGeometry(0.18, 0.13, 0.34, 14);
    K.geo('balconies', 'terracotta', placeGeo(pot, p.x, 0.17, p.n), 40);
    obs(p.x - 0.22, p.n - 0.22, p.x + 0.22, p.n + 0.22, 1.0);
    for (let f = 0; f < 10; f++) {
      const ang = (f * Math.PI * 2) / 10;
      const frond = new THREE.ConeGeometry(0.065, p.r * 1.15, 4);
      frond.translate(0, p.r * 0.55, 0);
      frond.rotateX(1.05);
      frond.rotateY(ang);
      K.geo('balconies', 'foliage', placeGeo(frond, p.x, 0.34, p.n), 30);
    }
  }

  // ---- Galaxy Black Granite Border Inlays & Exterior Plinth (Ref B/C) ----
  const strip = 0.12;
  K.box('reception', 'marbleDark', -4.70, 0.24, 1.36, 0.24 + strip, 0.001, 0.004, false);
  K.box('reception', 'marbleDark', -4.70, 3.60 - strip, 1.36, 3.60, 0.001, 0.004, false);
  K.box('reception', 'marbleDark', -4.70, 0.24, -4.70 + strip, 3.60, 0.001, 0.004, false);
  K.box('reception', 'marbleDark', 1.36 - strip, 0.24, 1.36, 3.60, 0.001, 0.004, false);
  K.box('reception', 'marbleDark', -5.02, -0.02, -4.99, 14.57, 0, 0.32, false);
  K.box('master', 'marbleDark', 4.99, -0.02, 5.02, 14.57, 0, 0.32, false);

  // ---- Windows & Glazing Frames (Fixed Windows; Doors live in doors.js) ----
  const addWindow = (room, x0, n0, x1, n1, y0, y1, posts = 2) => {
    const isEW = Math.abs(x1 - x0) > Math.abs(n1 - n0);
    K.box(room, 'bronze', x0, n0, x1, n1, y0, y0 + 0.04, false);
    K.box(room, 'bronze', x0, n0, x1, n1, y1 - 0.04, y1, false);
    if (isEW) {
      for (let i = 0; i <= posts; i++) {
        const px = x0 + ((x1 - x0) * i) / posts;
        K.box(room, 'bronze', px - 0.025, n0, px + 0.025, n1, y0, y1, false);
      }
      const nm = (n0 + n1) / 2;
      K.box(room, 'glass', x0 + 0.02, nm - 0.01, x1 - 0.02, nm + 0.01, y0 + 0.04, y1 - 0.04, true);
    } else {
      for (let i = 0; i <= posts; i++) {
        const pn = n0 + ((n1 - n0) * i) / posts;
        K.box(room, 'bronze', x0, pn - 0.025, x1, pn + 0.025, y0, y1, false);
      }
      const xm = (x0 + x1) / 2;
      K.box(room, 'glass', xm - 0.01, n0 + 0.02, xm + 0.01, n1 - 0.02, y0 + 0.04, y1 - 0.04, true);
    }
  };

  addWindow('services', -3.65, 14.68, -2.25, 14.78, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('bedroom1', -0.65, 14.40, 0.65, 14.48, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('bedroom2', 2.30, 14.68, 3.70, 14.78, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('kitchen', -4.94, 7.05, -4.86, 8.40, 1.05, CONFIG.winTop, 2);
  addWindow('guestBath', -4.94, 4.34, -4.86, 4.84, CONFIG.bathWinSill, CONFIG.bathWinTop, 1);
  addWindow('bedroom3', 4.86, 8.65, 4.94, 9.75, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('masterBath', 4.86, 6.95, 4.94, 7.68, CONFIG.bathWinSill, CONFIG.bathWinTop, 1);
  addWindow('master', 4.86, 4.55, 4.94, 5.75, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('reception', -4.05, 0.06, -3.54, 0.14, CONFIG.winSill, CONFIG.winTop, 1);
  addWindow('guestRoom', 3.56, 0.06, 4.10, 0.14, CONFIG.winSill, CONFIG.winTop, 1);
  // Overhead transom bars for front entrance & terrace doors
  K.box('reception', 'bronze', -1.06, 0.05, 1.06, 0.15, 2.35, 2.40, false);

  // ---- Reception Living Lounge & 8-Seat Dining (استقبال) ----
  K.box('reception', 'rug', -4.55, 0.48, -1.65, 3.38, 0.002, 0.018, false);
  addCoffeeTable(K, obs, 'reception', -3.40, 1.45, -2.75, 2.42, 0.42);
  addSofa(K, obs, 'reception', -4.60, 0.95, -3.82, 2.82, 'W');
  addSofa(K, obs, 'reception', -2.35, 1.00, -1.62, 2.80, 'E');
  addSofa(K, obs, 'reception', -3.72, 2.92, -2.42, 3.60, 'N');
  addSofa(K, obs, 'reception', -3.72, 0.25, -2.42, 0.92, 'S');
  // Marble side tables flanking the West sofa
  addCoffeeTable(K, obs, 'reception', -4.60, 2.95, -3.96, 3.55, 0.52);
  addCoffeeTable(K, obs, 'reception', -4.60, 0.28, -3.96, 0.85, 0.52);
  // Sculpted stone dining table + 8 contoured chairs
  addDiningSet(K, obs, 'reception', 0.48, 1.92, 0.96, 2.15);

  // ---- Front-Right Bedroom (ضيوف) ----
  addBedSuite(K, obs, 'guestRoom', 2.82, 0.92, 4.74, 2.55, 'E');
  addWardrobe(K, obs, 'guestRoom', 1.60, 0.55, 1.88, 2.45, 'E');

  // ---- Guest Bathroom (حمام الضيوف) ----
  addToilet(K, obs, 'guestBath', -4.50, 4.98, 'S');
  addVanityBasin(K, obs, 'guestBath', -3.55, 3.88, -2.72, 4.30, 'N');

  // ---- U-Shaped Kitchen Suite (مطبخ) ----
  addKitchenSuite(K, obs);

  // ---- Central Core: سلم Staircase + Continuous Central Bath (حمام مركزي) ----
  addStaircase(K, obs);
  addVanityBasin(K, obs, 'hallCenter', -0.02, 5.05, 0.52, 5.68, 'W');
  addToilet(K, obs, 'hallCenter', 0.24, 6.08, 'W');
  addShowerAssembly(K, obs, 'hallCenter', -0.06, 6.52, 0.52, 7.22, 'E');

  // ---- Upper Bath (حمام علوي — West WC, North door per Crop 3) ----
  addToilet(K, obs, 'bathUpper', -0.44, 9.42, 'E');
  addVanityBasin(K, obs, 'bathUpper', 0.04, 9.02, 0.52, 9.64, 'W');

  // ---- Master Suite (ماستر) + Dressing (دريسنج) + Master Bath (حمام الماستر) ----
  addBedSuite(K, obs, 'master', 2.65, 3.86, 4.25, 5.45, 'S');
  addWardrobe(K, obs, 'master', 1.60, 4.02, 2.10, 5.38, 'E');
  addWardrobe(K, obs, 'dressing', 1.60, 6.60, 2.98, 7.04, 'N');

  addToilet(K, obs, 'masterBath', 4.46, 7.66, 'W');
  addVanityBasin(K, obs, 'masterBath', 3.24, 6.60, 3.96, 7.02, 'N');
  K.box('masterBath', 'stone', 4.18, 6.60, 4.78, 7.20, 0, 0.05, true);

  // ---- Bedroom 3 (نوم ٣) ----
  addWardrobe(K, obs, 'bedroom3', 1.60, 8.20, 2.08, 9.25, 'E');
  addBedSuite(K, obs, 'bedroom3', 3.76, 8.22, 4.76, 10.10, 'E', { showNightstands: false });

  // ---- Bedroom 1 (نوم ١) ----
  addBedSuite(K, obs, 'bedroom1', -1.40, 12.15, 0.15, 13.62, 'W');
  addWardrobe(K, obs, 'bedroom1', 0.92, 13.15, 1.40, 14.30, 'W');

  // ---- Bedroom 2 (نوم ٢) ----
  addBedSuite(K, obs, 'bedroom2', 2.85, 11.78, 4.74, 13.38, 'E');
  addWardrobe(K, obs, 'bedroom2', 1.60, 13.15, 2.10, 14.30, 'E');
  addWardrobe(K, obs, 'bedroom2', 3.18, 10.34, 4.65, 10.76, 'N');

  // ---- Recessed Architectural Ceiling Downlights (Ref B) ----
  const lights = [
    ['reception', -2.95, 1.90],
    ['reception', 0.45, 1.90],
    ['guestRoom', 3.20, 1.85],
    ['kitchen', -3.45, 7.50],
    ['corridor', -1.45, 6.80],
    ['corridor', 0.0, 10.80],
    ['hallCenter', -0.10, 6.10],
    ['lightwell', -0.10, 8.05],
    ['master', 3.25, 5.10],
    ['bedroom3', 3.15, 9.15],
    ['bedroom1', 0.0, 12.80],
    ['bedroom2', 3.25, 12.40],
    ['services', -3.05, 12.20],
  ];
  for (const [rm, lx, ln] of lights) {
    const ring = new THREE.CylinderGeometry(0.072, 0.072, 0.008, 18);
    K.geo(rm, 'bronze', placeGeo(ring, lx, H - 0.005, ln), null);
    const d = new THREE.CylinderGeometry(0.048, 0.048, 0.012, 18);
    K.geo(rm, 'lamp', placeGeo(d, lx, H - 0.008, ln), 35);
  }

  return { shell, roof, kit: K, bucketToGeometry, wallSegments, doorCarves, obstacles };
}
