// Apartment 3D Architectural Model
// Constructed directly from Reference A1/A2 in plan coordinates (x east, n north -> z = -n).

import * as THREE from 'three';
import { RectSolid, pushBox, bucketToGeometry } from './solid.js';
import { ROOMS, BASE_Y, CONFIG, BALCONIES, PLANTS, DOORS } from './plan.js';

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

const place = (g, x, y, n, ry = 0, sx = 1, sy = 1, sz = 1) => {
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, -n),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
      new THREE.Vector3(sx, sy, sz)
    )
  );
  return g;
};

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

// Build a semicircular/elliptical balcony deck slab (top + bottom + outer rim)
function buildEllipticalDeck(K, room, topMat, sideMat, cx, cn, rx, rn, a0, a1, y0, y1, segs = 36) {
  const Btop = K.bucket(room, topMat);
  const Bside = K.bucket(room, sideMat);
  const E = K.edges(room);

  const pt = (a, rScale = 1) => [cx + rx * rScale * Math.cos(a), cn + rn * rScale * Math.sin(a)];
  const center = [cx, cn];

  for (let i = 0; i < segs; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segs;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segs;
    const [x0, n0] = pt(t0);
    const [x1, n1] = pt(t1);
    const z0 = -n0, z1 = -n1, zc = -center[1];

    // Top triangle fan quad (degenerate triangle via repeated center)
    const baseTop = Btop.p.length / 3;
    for (const [vx, vy, vz] of [[center[0], y1, zc], [x0, y1, z0], [x1, y1, z1]]) {
      Btop.p.push(vx, vy, vz);
      Btop.n.push(0, 1, 0);
      Btop.uv.push(vx, vz);
    }
    Btop.idx.push(baseTop, baseTop + 1, baseTop + 2);

    // Bottom triangle
    const baseBot = Bside.p.length / 3;
    for (const [vx, vy, vz] of [[center[0], y0, zc], [x1, y0, z1], [x0, y0, z0]]) {
      Bside.p.push(vx, vy, vz);
      Bside.n.push(0, -1, 0);
      Bside.uv.push(vx, vz);
    }
    Bside.idx.push(baseBot, baseBot + 1, baseBot + 2);

    // Outer perimeter side quad
    const nx = Math.cos((t0 + t1) / 2);
    const nz = -Math.sin((t0 + t1) / 2);
    pushQuad(Bside, [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [nx, 0, nz]);

    // Architectural rim lines
    E.push(x0, y1, z0, x1, y1, z1);
    E.push(x0, y0, z0, x1, y0, z1);
  }
}

// Build a curved balustrade / parapet ring segment
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
  // 1. Apartment Structural Shell (Floor Slab + Exterior & Interior Walls)
  // ------------------------------------------------------------------
  const S = new RectSolid();
  const A = (x0, n0, x1, n1, y0, y1) => S.add(x0, y0, -n0, x1, y1, -n1);
  const C = (x0, n0, x1, n1, y0, y1) => S.sub(x0, y0, -n0, x1, y1, -n1);

  // Main structural floor slab
  A(-4.55, -0.05, 4.55, 14.55, BASE_Y, 0);

  // Exterior perimeter walls
  A(-4.55, -0.05, -4.35, 14.55, 0, H); // West exterior
  A(4.35, -0.05, 4.55, 14.55, 0, H);   // East exterior
  A(-4.55, 14.35, 4.55, 14.55, 0, H);  // North exterior
  A(-4.55, -0.05, 4.55, 0.15, 0, H);   // South balcony facade

  // North facade subtle bay projections (Services & Bedroom 2) visible in Reference A1
  A(-3.65, 14.55, -2.15, 14.70, 0, H);
  A(2.20, 14.55, 3.65, 14.70, 0, H);

  // North wing partitions
  A(-1.44, 11.24, -1.32, 14.35, 0, H); // Bedroom 1 West
  A(-1.44, 11.24, 1.48, 11.36, 0, H);  // Bedroom 1 South
  A(1.42, 0.15, 1.54, 14.35, 0, H);    // East Wing main spine wall

  // East wing room partitions
  A(1.54, 10.18, 4.35, 10.30, 0, H);   // Bedroom 2 / Bedroom 3
  A(1.54, 7.95, 4.35, 8.07, 0, H);     // Bedroom 3 / Dressing & Master Bath
  A(2.90, 6.34, 3.02, 7.95, 0, H);     // Dressing / Master Bath
  A(1.54, 6.28, 4.35, 6.40, 0, H);     // Master Bedroom / Dressing & Master Bath
  A(1.54, 3.68, 4.35, 3.80, 0, H);     // Master Bedroom / Front-Right Bedroom

  // West wing partitions (Services / Kitchen / Guest Bath)
  A(-4.35, 9.72, -2.14, 9.84, 0, H);   // Kitchen North
  A(-1.44, 9.72, -1.32, 10.34, 0, H);  // Corridor entry pier opposite core
  A(-2.26, 5.02, -2.14, 9.84, 0, H);   // Kitchen East
  A(-4.35, 5.02, -2.14, 5.14, 0, H);   // Kitchen / Guest Bath
  A(-2.42, 3.68, -2.30, 5.02, 0, H);   // Guest Bath East
  A(-4.35, 3.68, -2.30, 3.80, 0, H);   // Guest Bath / Reception

  // Central Core (صالة + Central Bath + Upper Bath)
  A(-0.78, 3.68, -0.66, 10.34, 0, H);  // Core West wall
  A(0.66, 3.68, 0.78, 10.34, 0, H);    // Core East wall
  A(-0.78, 3.68, 0.78, 3.80, 0, H);    // Core South wall
  A(-0.78, 10.22, 0.78, 10.34, 0, H);  // Core North wall
  A(-0.66, 8.89, 0.66, 9.01, 0, H);    // Upper Bath South wall
  A(-0.66, 7.29, 0.66, 7.41, 0, H);    // Central Hall middle divider
  A(-0.08, 4.86, 0.66, 4.98, 0, H);    // Central Bath South wall
  A(-0.08, 4.92, 0.04, 7.29, 0, H);    // Central Bath West wall

  // ---- Interior Door Openings ----
  C(0.60, 11.20, 1.38, 11.40, 0, DH);  // Bedroom 1 door
  C(1.38, 10.42, 1.58, 11.20, 0, DH);  // Bedroom 2 door
  C(1.38, 9.35, 1.58, 10.15, 0, DH);   // Bedroom 3 door
  C(2.08, 6.24, 2.84, 6.44, 0, DH);    // Master -> Dressing opening
  C(2.86, 7.25, 3.06, 7.95, 0, DH);    // Dressing -> Master Bath door
  C(1.38, 5.50, 1.58, 6.28, 0, DH);    // Master Bedroom door
  C(1.38, 2.82, 1.58, 3.60, 0, DH);    // Front-Right Bedroom door
  C(-2.30, 6.18, -2.10, 6.94, 0, DH);  // Kitchen door
  C(-2.46, 4.14, -2.26, 4.82, 0, DH);  // Guest Bath door
  C(-0.82, 4.10, -0.62, 4.82, 0, DH);  // Central Hall West entry door
  C(-0.12, 5.65, 0.08, 6.31, 0, DH);   // Central Bath door
  C(0.62, 7.35, 0.82, 8.07, 0, DH);    // Central Hall East door
  C(-0.82, 9.05, -0.62, 9.71, 0, DH);  // Upper Bath door
  C(-0.26, 7.25, 0.26, 7.45, 0, DH);   // Central Hall internal arch
  C(-0.26, 8.85, 0.26, 9.05, 0, DH);   // Upper Bath / Hall internal pass-through

  // ---- Exterior Windows & Balcony Openings ----
  // North facade
  C(-3.52, 14.30, -2.28, 14.75, CONFIG.winSill, CONFIG.winTop); // Services North bay window
  C(-0.60, 14.30, 0.60, 14.60, CONFIG.winSill, CONFIG.winTop);  // Bedroom 1 North window
  C(2.32, 14.30, 3.52, 14.75, CONFIG.winSill, CONFIG.winTop);   // Bedroom 2 North bay window
  // West facade
  C(-4.60, 7.10, -4.30, 8.35, 1.05, CONFIG.winTop);             // Kitchen West window
  C(-4.60, 4.05, -4.30, 4.75, CONFIG.bathWinSill, CONFIG.bathWinTop); // Guest Bath window
  // East facade
  C(4.30, 8.45, 4.60, 9.55, CONFIG.winSill, CONFIG.winTop);     // Bedroom 3 East window
  C(4.30, 6.85, 4.60, 7.60, CONFIG.bathWinSill, CONFIG.bathWinTop); // Master Bath window
  C(4.30, 4.15, 4.60, 5.25, CONFIG.winSill, CONFIG.winTop);     // Master Bedroom East window
  // South front balcony facade
  C(-3.65, -0.10, -2.95, 0.20, CONFIG.winSill, CONFIG.winTop);  // Reception West window
  C(-2.80, -0.10, -1.96, 0.20, 0, 2.35);                        // Left Balcony French door
  C(-0.98, -0.10, 1.15, 0.20, 0.25, 2.35);                      // Reception center terrace glazing
  C(2.30, -0.10, 3.14, 0.20, 0, 2.35);                          // Right Balcony French door
  C(3.26, -0.10, 3.74, 0.20, CONFIG.winSill, CONFIG.winTop);    // Front-Right Bedroom window

  const shell = S.build(
    (cx, cy, cz, nx, ny) => {
      const n = -cz;
      if (ny > 0.5 && Math.abs(cy) < 1e-3) {
        const rm = roomAt(cx, n, cy);
        if (rm === 'bedroom1' || rm === 'bedroom2' || rm === 'bedroom3' || rm === 'master' || rm === 'guestRoom' || rm === 'dressing') {
          return 'woodFloor';
        }
        if (rm === 'kitchen' || rm === 'services') return 'tileKitchen';
        if (rm === 'guestBath' || rm === 'masterBath' || rm === 'bathUpper' || (rm === 'hallCenter' && cx > -0.04 && n > 4.9 && n < 7.35)) {
          return 'tileBath';
        }
        return 'floor';
      }
      // Bathroom ceramic wall tiles
      const rm = roomAt(cx + nx * 0.05, n, cy);
      if (cy > 0 && cy < H - 0.1 && (rm === 'guestBath' || rm === 'masterBath' || rm === 'bathUpper' || (rm === 'hallCenter' && cx > -0.04 && n > 4.9 && n < 7.35))) {
        return 'tileBath';
      }
      return 'plaster';
    },
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 2. Ceilings (toggleable solid roof slab over interior rooms)
  // ------------------------------------------------------------------
  const Rf = new RectSolid();
  Rf.add(-4.55, H, -14.55, 4.55, H + CT, 0.05);
  // Keep North bay projections topped cleanly
  Rf.add(-3.65, H, -14.70, -2.15, H + CT, -14.55);
  Rf.add(2.20, H, -14.70, 3.65, H + CT, -14.55);

  const roof = Rf.build(
    (cx, cy, cz, nx, ny) => (ny < -0.5 ? 'ceiling' : 'plaster'),
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 3. Curved Front Balconies, Doors, Windows & Interior Furnishings
  // ------------------------------------------------------------------
  const K = new Kit();
  const G = 'generic';

  // ---- Curved Balconies (خدمات / تراس) ----
  const { left: BL, center: BC, right: BR } = BALCONIES;

  // Center terrace slab & low stone rim
  buildEllipticalDeck(K, 'balconies', 'tileBalcony', 'plaster', BC.cx, BC.cn, BC.rx, BC.rn, Math.PI * 1.12, Math.PI * 1.88, BASE_Y, -0.004, 24);
  buildEllipticalRing(K, 'balconies', 'stone', BC.cx, BC.cn, BC.rx - 0.12, BC.rn - 0.12, BC.rx, BC.rn, Math.PI * 1.12, Math.PI * 1.88, 0, 0.34, 24);

  for (const B of [BL, BR]) {
    // Main semicircular floor slab
    buildEllipticalDeck(K, 'balconies', 'tileBalcony', 'plaster', B.cx, B.cn, B.rx, B.rn, B.a0, B.a1, BASE_Y, 0, 36);
    // Double-walled masonry parapet curb + stone coping
    buildEllipticalRing(K, 'balconies', 'plaster', B.cx, B.cn, B.rx - 0.18, B.rn - 0.18, B.rx, B.rn, B.a0, B.a1, 0, CONFIG.balconyParapetH, 36);
    buildEllipticalRing(K, 'balconies', 'stone', B.cx, B.cn, B.rx - 0.21, B.rn - 0.21, B.rx + 0.03, B.rn + 0.03, B.a0, B.a1, CONFIG.balconyParapetH, CONFIG.balconyParapetH + 0.06, 36);
    // Curved dark bronze top handrail
    buildEllipticalRing(K, 'balconies', 'bronze', B.cx, B.cn, B.rx - 0.12, B.rn - 0.12, B.rx - 0.06, B.rn - 0.06, B.a0, B.a1, CONFIG.balconyRailH - 0.05, CONFIG.balconyRailH, 36);
    // Vertical balusters
    const numPosts = 22;
    for (let i = 0; i <= numPosts; i++) {
      const a = B.a0 + ((B.a1 - B.a0) * i) / numPosts;
      const px = B.cx + (B.rx - 0.09) * Math.cos(a);
      const pn = B.cn + (B.rn - 0.09) * Math.sin(a);
      K.box('balconies', 'bronze', px - 0.018, pn - 0.018, px + 0.018, pn + 0.018, CONFIG.balconyParapetH + 0.06, CONFIG.balconyRailH - 0.05, false);
    }
  }

  // Potted balcony palms (4 architectural plants matching Reference A)
  for (const p of PLANTS) {
    const pot = new THREE.CylinderGeometry(0.18, 0.13, 0.34, 12);
    K.geo('balconies', 'terracotta', place(pot, p.x, 0.17, p.n), 40);
    // Radial palm fronds
    for (let f = 0; f < 10; f++) {
      const ang = (f * Math.PI * 2) / 10;
      const frond = new THREE.ConeGeometry(0.065, p.r * 1.15, 4);
      frond.translate(0, p.r * 0.55, 0);
      frond.rotateX(1.05);
      frond.rotateY(ang);
      K.geo('balconies', 'foliage', place(frond, p.x, 0.34, p.n), 30);
    }
  }

  // ---- Windows & Glazing ----
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

  addWindow('services', -3.52, 14.52, -2.28, 14.62, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('bedroom1', -0.60, 14.42, 0.60, 14.50, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('bedroom2', 2.32, 14.52, 3.52, 14.62, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('kitchen', -4.50, 7.10, -4.42, 8.35, 1.05, CONFIG.winTop, 2);
  addWindow('guestBath', -4.50, 4.05, -4.42, 4.75, CONFIG.bathWinSill, CONFIG.bathWinTop, 1);
  addWindow('bedroom3', 4.42, 8.45, 4.50, 9.55, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('masterBath', 4.42, 6.85, 4.50, 7.60, CONFIG.bathWinSill, CONFIG.bathWinTop, 1);
  addWindow('master', 4.42, 4.15, 4.50, 5.25, CONFIG.winSill, CONFIG.winTop, 2);
  addWindow('reception', -3.65, 0.02, -2.95, 0.08, CONFIG.winSill, CONFIG.winTop, 1);
  addWindow('reception', -0.98, 0.02, 1.15, 0.08, 0.25, 2.35, 3);
  addWindow('guestRoom', 3.26, 0.02, 3.74, 0.08, CONFIG.winSill, CONFIG.winTop, 1);
  // Balcony door frames
  addWindow('balconies', -2.80, 0.02, -1.96, 0.08, 2.15, 2.35, 1);
  addWindow('balconies', 2.30, 0.02, 3.14, 0.08, 2.15, 2.35, 1);

  // ---- Doors (oak leaves positioned cleanly in their open angle from Reference A) ----
  for (const d of DOORS) {
    const a = (d.open * Math.PI) / 180;
    const dx = Math.cos(a) * d.w;
    const dn = Math.sin(a) * d.w;
    const thick = 0.04;
    if (Math.abs(Math.cos(a)) > 0.5) {
      K.box(d.room, 'oakDoor', d.x, d.n - thick / 2, d.x + dx, d.n + thick / 2, 0.01, DH - 0.02);
    } else {
      K.box(d.room, 'oakDoor', d.x - thick / 2, d.n, d.x + thick / 2, d.n + dn, 0.01, DH - 0.02);
    }
  }

  // ---- Reception Living & Dining (استقبال) ----
  // Area rug
  K.box('reception', 'rug', -4.15, 0.45, -1.35, 3.30, 0.002, 0.018, false);
  // Coffee table
  K.box('reception', 'oakLong', -3.05, 1.35, -2.45, 2.35, 0.32, 0.38);
  K.box('reception', 'bronze', -2.98, 1.42, -2.52, 2.28, 0, 0.32, false);
  // West 3-seater sofa
  const sofa = (x0, n0, x1, n1, backSide) => {
    K.box('reception', 'oakLong', x0, n0, x1, n1, 0, 0.14, false);
    K.box('reception', 'fabricSofa', x0, n0, x1, n1, 0.14, 0.42);
    const bt = 0.22;
    if (backSide === 'W') K.box('reception', 'fabricSofa', x0, n0, x0 + bt, n1, 0.42, 0.78);
    if (backSide === 'E') K.box('reception', 'fabricSofa', x1 - bt, n0, x1, n1, 0.42, 0.78);
    if (backSide === 'N') K.box('reception', 'fabricSofa', x0, n1 - bt, x1, n1, 0.42, 0.78);
    if (backSide === 'S') K.box('reception', 'fabricSofa', x0, n0, x1, n0 + bt, 0.42, 0.78);
  };
  sofa(-4.22, 0.90, -3.45, 2.78, 'W'); // West sofa
  sofa(-2.05, 0.95, -1.32, 2.75, 'E'); // East sofa
  sofa(-3.35, 2.86, -2.10, 3.55, 'N'); // North sofa
  sofa(-3.35, 0.18, -2.10, 0.85, 'S'); // South sofa
  // Corner side tables
  K.box('reception', 'stone', -4.22, 2.90, -3.55, 3.50, 0, 0.52);
  K.box('reception', 'stone', -4.22, 0.22, -3.55, 0.80, 0, 0.52);

  // Dining table for 8 (East half of Reception)
  K.box('reception', 'oakLong', -0.15, 0.75, 0.55, 2.85, 0.72, 0.77);
  for (const [lx, ln] of [[-0.08, 0.85], [0.44, 0.85], [-0.08, 2.72], [0.44, 2.72]]) {
    K.box('reception', 'oakLong', lx, ln, lx + 0.06, ln + 0.06, 0, 0.72, false);
  }
  const diningChair = (x0, n0, x1, n1, backSide) => {
    K.box('reception', 'leather', x0, n0, x1, n1, 0.42, 0.47);
    K.box('reception', 'oakLong', x0 + 0.04, n0 + 0.04, x1 - 0.04, n1 - 0.04, 0, 0.42, false);
    if (backSide === 'W') K.box('reception', 'leather', x0, n0, x0 + 0.06, n1, 0.47, 0.84);
    if (backSide === 'E') K.box('reception', 'leather', x1 - 0.06, n0, x1, n1, 0.47, 0.84);
    if (backSide === 'N') K.box('reception', 'leather', x0, n1 - 0.06, x1, n1, 0.47, 0.84);
    if (backSide === 'S') K.box('reception', 'leather', x0, n0, x1, n0 + 0.06, 0.47, 0.84);
  };
  for (let i = 0; i < 3; i++) {
    const cn = 0.96 + i * 0.65;
    diningChair(-0.56, cn, -0.18, cn + 0.42, 'W');
    diningChair(0.58, cn, 0.96, cn + 0.42, 'E');
  }
  diningChair(0.0, 2.90, 0.42, 3.26, 'N');
  diningChair(0.0, 0.34, 0.42, 0.70, 'S');

  // ---- Bed Builder Helper ----
  const addBed = (room, x0, n0, x1, n1, headSide) => {
    K.box(room, 'oakLong', x0, n0, x1, n1, 0, 0.24);
    K.box(room, 'fabricBed', x0 + 0.03, n0 + 0.03, x1 - 0.03, n1 - 0.03, 0.24, 0.48);
    if (headSide === 'E') {
      K.box(room, 'oakLong', x1 - 0.08, n0, x1, n1, 0.48, 1.04);
      const mid = (n0 + n1) / 2;
      K.box(room, 'fabricAccent', x1 - 0.48, n0 + 0.12, x1 - 0.12, mid - 0.05, 0.48, 0.60);
      K.box(room, 'fabricAccent', x1 - 0.48, mid + 0.05, x1 - 0.12, n1 - 0.12, 0.48, 0.60);
      K.box(room, 'oakLong', x1 - 0.44, n0 - 0.48, x1 - 0.02, n0 - 0.06, 0, 0.48);
      K.box(room, 'oakLong', x1 - 0.44, n1 + 0.06, x1 - 0.02, n1 + 0.48, 0, 0.48);
    } else if (headSide === 'W') {
      K.box(room, 'oakLong', x0, n0, x0 + 0.08, n1, 0.48, 1.04);
      const mid = (n0 + n1) / 2;
      K.box(room, 'fabricAccent', x0 + 0.12, n0 + 0.12, x0 + 0.48, mid - 0.05, 0.48, 0.60);
      K.box(room, 'fabricAccent', x0 + 0.12, mid + 0.05, x0 + 0.48, n1 - 0.12, 0.48, 0.60);
      K.box(room, 'oakLong', x0 + 0.02, n0 - 0.48, x0 + 0.44, n0 - 0.06, 0, 0.48);
      K.box(room, 'oakLong', x0 + 0.02, n1 + 0.06, x0 + 0.44, n1 + 0.48, 0, 0.48);
    } else if (headSide === 'S') {
      K.box(room, 'oakLong', x0, n0, x1, n0 + 0.08, 0.48, 1.04);
      const mid = (x0 + x1) / 2;
      K.box(room, 'fabricAccent', x0 + 0.12, n0 + 0.12, mid - 0.05, n0 + 0.48, 0.48, 0.60);
      K.box(room, 'fabricAccent', mid + 0.05, n0 + 0.12, x1 - 0.12, n0 + 0.48, 0.48, 0.60);
      K.box(room, 'oakLong', x0 - 0.48, n0 + 0.02, x0 - 0.06, n0 + 0.44, 0, 0.48);
      K.box(room, 'oakLong', x1 + 0.06, n0 + 0.02, x1 + 0.48, n0 + 0.44, 0, 0.48);
    }
  };

  // ---- Front-Right Bedroom (غرفة ضيوف) ----
  addBed('guestRoom', 2.75, 1.35, 4.30, 2.85, 'E');
  K.box('guestRoom', 'oakLong', 1.56, 1.15, 1.94, 2.65, 0, 0.56); // Media console
  // Corner armchair (SE)
  const chairGeo = new THREE.BoxGeometry(0.68, 0.44, 0.68);
  K.geo('guestRoom', 'leather', place(chairGeo, 3.85, 0.22, 0.58, Math.PI / 4), 30);

  // ---- Guest Bathroom (حمام الضيوف) ----
  K.box('guestBath', 'sanitary', -4.32, 4.40, -3.76, 4.78, 0, 0.40); // Toilet bowl
  K.box('guestBath', 'sanitary', -4.32, 4.42, -4.16, 4.76, 0.40, 0.76); // Tank
  K.box('guestBath', 'stone', -3.50, 3.82, -2.75, 4.24, 0.74, 0.82); // Vanity
  K.geo('guestBath', 'sanitary', place(new THREE.CylinderGeometry(0.20, 0.14, 0.14, 16), -3.12, 0.85, 4.02), 35);
  K.box('guestBath', 'chrome', -3.14, 3.88, -3.10, 3.96, 0.82, 0.96, false);

  // ---- Kitchen (مطبخ) ----
  // U-shaped base cabinetry & dark granite worktop
  K.box('kitchen', 'oak', -4.35, 5.15, -2.90, 5.75, 0, 0.86);     // South cabinets
  K.box('kitchen', 'countertop', -4.35, 5.15, -2.90, 5.75, 0.86, 0.91);
  K.box('kitchen', 'oak', -4.35, 5.75, -3.75, 9.72, 0, 0.86);     // West cabinets
  K.box('kitchen', 'countertop', -4.35, 5.75, -3.75, 9.72, 0.86, 0.91);
  K.box('kitchen', 'oak', -3.75, 9.12, -2.80, 9.72, 0, 0.86);     // North cabinets
  K.box('kitchen', 'countertop', -3.75, 9.12, -2.80, 9.72, 0.86, 0.91);
  K.box('kitchen', 'appliance', -2.88, 5.16, -2.28, 5.76, 0, 2.05); // Fridge
  K.box('kitchen', 'oak', -2.78, 9.12, -2.28, 9.70, 0, 2.05);       // Tall pantry
  // Double kitchen sink (South counter)
  K.box('kitchen', 'chrome', -3.95, 5.26, -3.20, 5.64, 0.88, 0.92);
  K.box('kitchen', 'chrome', -3.60, 5.20, -3.56, 5.34, 0.92, 1.15, false);
  // West 4-burner stove
  K.box('kitchen', 'stoveTop', -4.28, 7.22, -3.80, 7.82, 0.91, 0.93);
  for (const [bx, bn] of [[-4.14, 7.36], [-3.94, 7.36], [-4.14, 7.66], [-3.94, 7.66]]) {
    K.geo('kitchen', 'chrome', place(new THREE.CylinderGeometry(0.065, 0.065, 0.015, 16), bx, 0.94, bn), 40);
  }
  // North 4-burner hob
  K.box('kitchen', 'stoveTop', -3.55, 9.18, -2.95, 9.66, 0.91, 0.93);
  for (const [bx, bn] of [[-3.40, 9.32], [-3.12, 9.32], [-3.40, 9.52], [-3.12, 9.52]]) {
    K.geo('kitchen', 'chrome', place(new THREE.CylinderGeometry(0.065, 0.065, 0.015, 16), bx, 0.94, bn), 40);
  }

  // ---- Central Core Bathrooms (صالة / حمام مركزي / حمام علوي) ----
  // Central Bath (x: 0.04..0.66, n: 4.98..7.29)
  K.box('hallCenter', 'stone', 0.14, 5.02, 0.62, 5.45, 0.74, 0.82); // Vanity
  K.geo('hallCenter', 'sanitary', place(new THREE.CylinderGeometry(0.16, 0.12, 0.12, 14), 0.38, 0.85, 5.24), 35);
  K.box('hallCenter', 'sanitary', 0.18, 5.92, 0.62, 6.28, 0, 0.40); // Toilet
  K.box('hallCenter', 'sanitary', 0.46, 5.94, 0.62, 6.26, 0.40, 0.76);
  K.box('hallCenter', 'sanitary', 0.06, 6.60, 0.64, 7.26, 0, 0.06); // Shower tray
  K.box('hallCenter', 'glass', 0.06, 6.58, 0.64, 6.60, 0.06, 2.05); // Shower glass screen
  // Upper Bath (x: -0.66..0.66, n: 9.01..10.22)
  K.box('bathUpper', 'sanitary', -0.62, 9.14, -0.14, 9.52, 0, 0.40); // Toilet
  K.box('bathUpper', 'sanitary', -0.62, 9.16, -0.46, 9.50, 0.40, 0.76);
  K.box('bathUpper', 'stone', 0.12, 9.80, 0.62, 10.18, 0.74, 0.82); // Sink

  // ---- Master Bedroom (ماستر) ----
  addBed('master', 2.48, 3.82, 4.02, 5.36, 'S');
  K.box('master', 'oak', 1.56, 4.10, 2.06, 5.48, 0, 2.35); // West wardrobe

  // ---- Dressing Room (دريسنج) ----
  K.box('dressing', 'oak', 1.56, 6.42, 2.88, 6.86, 0, 2.35); // Built-in closet cabinets

  // ---- Master En-Suite Bath (حمام الماستر) ----
  K.box('masterBath', 'sanitary', 3.82, 7.45, 4.32, 7.82, 0, 0.40); // Toilet
  K.box('masterBath', 'sanitary', 4.16, 7.47, 4.32, 7.80, 0.40, 0.76);
  K.box('masterBath', 'stone', 3.12, 6.42, 3.82, 6.84, 0.74, 0.82); // Vanity
  K.geo('masterBath', 'sanitary', place(new THREE.CylinderGeometry(0.18, 0.12, 0.12, 14), 3.47, 0.85, 6.63), 35);
  K.box('masterBath', 'sanitary', 3.86, 6.42, 4.33, 7.05, 0, 0.06); // Corner shower

  // ---- Bedroom 3 (نوم ٣) ----
  K.box('bedroom3', 'oak', 1.56, 8.12, 2.04, 9.15, 0, 2.35); // Wardrobe
  K.box('bedroom3', 'oakLong', 3.55, 8.12, 4.32, 9.95, 0, 0.24); // Single bed / daybed
  K.box('bedroom3', 'fabricBed', 3.58, 8.15, 4.30, 9.92, 0.24, 0.46);
  K.box('bedroom3', 'fabricAccent', 3.70, 9.48, 4.25, 9.88, 0.46, 0.58);

  // ---- Bedroom 1 (نوم ١) ----
  addBed('bedroom1', -1.30, 12.15, 0.12, 13.45, 'W');
  K.box('bedroom1', 'oak', 0.90, 13.20, 1.40, 14.32, 0, 2.35); // NE Wardrobe

  // ---- Bedroom 2 (نوم ٢) ----
  addBed('bedroom2', 2.65, 11.75, 4.32, 13.22, 'E');
  K.box('bedroom2', 'oak', 1.56, 13.20, 2.06, 14.32, 0, 2.35); // NW Wardrobe
  K.box('bedroom2', 'oakLong', 3.10, 10.32, 4.28, 10.72, 0, 0.78); // South dresser

  // ---- Recessed Architectural Ceiling Downlights ----
  const lights = [
    ['reception', -2.7, 1.85],
    ['reception', 0.2, 1.85],
    ['guestRoom', 3.0, 1.85],
    ['kitchen', -3.2, 7.4],
    ['corridor', -1.45, 7.2],
    ['corridor', 0.0, 10.8],
    ['master', 3.1, 5.0],
    ['bedroom3', 2.9, 9.1],
    ['bedroom1', 0.05, 12.8],
    ['bedroom2', 3.0, 12.4],
    ['services', -2.9, 12.2],
  ];
  for (const [rm, lx, ln] of lights) {
    const d = new THREE.CylinderGeometry(0.05, 0.05, 0.012, 18);
    K.geo(rm, 'lamp', place(d, lx, H - 0.008, ln), 35);
  }

  return { shell, roof, kit: K, bucketToGeometry };
}
