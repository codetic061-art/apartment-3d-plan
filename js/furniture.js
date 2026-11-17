// Detailed Multi-Part 3D Furniture, Sanitary Fixtures, Kitchen Appliances & سلم Staircase
// Uses ExtrudeGeometry, LatheGeometry, TubeGeometry & beveled multi-part assemblies
// to replace placeholder boxes while registering AABB collision footprints cleanly.

import * as THREE from 'three';
import { CONFIG } from './plan.js';

export const placeGeo = (g, x, y, n, ry = 0, sx = 1, sy = 1, sz = 1) => {
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, -n),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
      new THREE.Vector3(sx, sy, sz)
    )
  );
  return g;
};

function roundedRectShape(w, d, r = 0.03) {
  const hw = w / 2, hd = d / 2;
  const cr = Math.min(r, hw * 0.45, hd * 0.45);
  const s = new THREE.Shape();
  s.moveTo(-hw + cr, -hd);
  s.lineTo(hw - cr, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + cr);
  s.lineTo(hw, hd - cr);
  s.quadraticCurveTo(hw, hd, hw - cr, hd);
  s.lineTo(-hw + cr, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - cr);
  s.lineTo(-hw, -hd + cr);
  s.quadraticCurveTo(-hw, -hd, -hw + cr, -hd);
  return s;
}

function bevelPad(w, h, d, radius = 0.03, bevel = 0.014) {
  const ih = Math.max(0.004, h - bevel * 2);
  const g = new THREE.ExtrudeGeometry(roundedRectShape(Math.max(0.02, w - bevel * 2), Math.max(0.02, d - bevel * 2), radius), {
    depth: ih,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
}

const dirYaw = (dir) => ({ N: 0, S: Math.PI, E: -Math.PI / 2, W: Math.PI / 2 }[dir] ?? 0);

function emitLocal(K, room, mat, geo, cx, y0, cn, dir = 'N', edgeAngle = 35) {
  K.geo(room, mat, placeGeo(geo, cx, y0, cn, dirYaw(dir)), edgeAngle);
}

// ---------- Seating & Tables ----------

export function addSofa(K, obs, room, x0, n0, x1, n1, backSide) {
  const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2;
  const spanX = Math.abs(x1 - x0), spanN = Math.abs(n1 - n0);
  const ew = backSide === 'N' || backSide === 'S';
  const length = ew ? spanX : spanN;
  const depth = ew ? spanN : spanX;
  obs(x0, n0, x1, n1, 0.85);

  const armW = 0.14;
  const innerLen = Math.max(0.6, length - armW * 2);
  const backD = 0.16;
  const seatD = Math.max(0.42, depth - backD);
  const backZ = -depth / 2 + backD / 2;
  const seatZ = backZ + backD / 2 + seatD / 2 - 0.01;

  // Tapered timber/bronze feet
  for (const lx of [-length / 2 + 0.08, length / 2 - 0.08]) {
    for (const lz of [-depth / 2 + 0.08, depth / 2 - 0.08]) {
      const leg = new THREE.CylinderGeometry(0.022, 0.014, 0.12, 10);
      leg.translate(lx, 0.06, lz);
      emitLocal(K, room, 'bronze', leg, cx, 0, cn, backSide, 45);
    }
  }

  // Timber plinth & deck
  const plinth = bevelPad(length - 0.04, 0.08, depth - 0.04, 0.03, 0.01);
  emitLocal(K, room, 'oak', plinth, cx, 0.12, cn, backSide, 35);

  // Upholstered lower base frame
  const deck = bevelPad(length - 0.02, 0.10, depth - 0.02, 0.04, 0.014);
  emitLocal(K, room, 'fabricSofa', deck, cx, 0.20, cn, backSide, 40);

  // Armrests
  for (const side of [-1, 1]) {
    const arm = bevelPad(armW, 0.38, depth - 0.04, 0.04, 0.018);
    arm.translate(side * (length / 2 - armW / 2), 0.28, 0.01);
    emitLocal(K, room, 'fabricSofa', arm, cx, 0, cn, backSide, 42);
  }

  // Sculpted backrest + segmented seat & back cushions + accent pillows
  const count = length > 1.75 ? 3 : 2;
  const cw = (innerLen - 0.02 * (count + 1)) / count;
  const backFrame = bevelPad(innerLen + 0.06, 0.48, backD, 0.04, 0.016);
  backFrame.translate(0, 0.28, backZ);
  emitLocal(K, room, 'fabricSofa', backFrame, cx, 0, cn, backSide, 42);

  for (let i = 0; i < count; i++) {
    const ox = -innerLen / 2 + 0.02 + cw / 2 + i * (cw + 0.02);
    const seat = bevelPad(cw, 0.14, seatD - 0.02, 0.04, 0.02);
    seat.translate(ox, 0.30, seatZ);
    emitLocal(K, room, 'fabricSofa', seat, cx, 0, cn, backSide, 45);

    const bc = bevelPad(cw * 0.96, 0.34, 0.14, 0.04, 0.022);
    bc.rotateX(-0.14);
    bc.translate(ox, 0.42, backZ + backD / 2 + 0.08);
    emitLocal(K, room, 'fabricSofa', bc, cx, 0, cn, backSide, 48);
  }

  // Contrast throw pillows at both corners
  for (const side of [-1, 1]) {
    const p = bevelPad(0.32, 0.28, 0.10, 0.05, 0.022);
    p.rotateX(-0.18);
    p.rotateY(side * -0.25);
    p.translate(side * (innerLen / 2 - 0.18), 0.46, seatZ - seatD * 0.14);
    emitLocal(K, room, 'fabricAccent', p, cx, 0, cn, backSide, 45);
  }
}

export function addCoffeeTable(K, obs, room, x0, n0, x1, n1, height = 0.42) {
  const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2;
  const w = Math.abs(x1 - x0), d = Math.abs(n1 - n0);
  obs(x0, n0, x1, n1, height);

  const legH = height - 0.05;
  for (const lx of [-w / 2 + 0.08, w / 2 - 0.08]) {
    for (const lz of [-d / 2 + 0.08, d / 2 - 0.08]) {
      const leg = new THREE.CylinderGeometry(0.018, 0.014, legH, 10);
      leg.translate(lx, legH / 2, lz);
      K.geo(room, 'bronze', placeGeo(leg, cx, 0, cn), 45);
    }
  }
  const shelf = bevelPad(w - 0.14, 0.022, d - 0.14, 0.03, 0.005);
  K.geo(room, 'oak', placeGeo(shelf, cx, 0.12, cn), 35);
  const top = bevelPad(w, 0.042, d, 0.045, 0.012);
  K.geo(room, 'stone', placeGeo(top, cx, legH, cn), 35);
}

function addDiningChair(K, room, cx, cn, dir = 'N') {
  const seatH = 0.46;
  for (const [lx, lz, h] of [[-0.17, -0.17, 0.84], [0.17, -0.17, 0.84], [-0.17, 0.17, seatH], [0.17, 0.17, seatH]]) {
    const leg = new THREE.CylinderGeometry(0.015, 0.011, h, 8);
    leg.translate(lx, h / 2, lz);
    emitLocal(K, room, 'oak', leg, cx, 0, cn, dir, 45);
  }
  const seat = bevelPad(0.41, 0.055, 0.40, 0.045, 0.014);
  seat.translate(0, seatH, 0.01);
  emitLocal(K, room, 'leather', seat, cx, 0, cn, dir, 42);

  const back = bevelPad(0.38, 0.34, 0.055, 0.05, 0.015);
  back.rotateX(-0.08);
  back.translate(0, seatH + 0.06, -0.17);
  emitLocal(K, room, 'leather', back, cx, 0, cn, dir, 45);
}

export function addDiningSet(K, obs, room, cx, cn, w = 1.04, d = 2.24) {
  obs(cx - w / 2 - 0.18, cn - d / 2 - 0.18, cx + w / 2 + 0.18, cn + d / 2 + 0.18, 0.78);
  // Twin architectural sculptural plinths
  for (const nz of [cn - d * 0.28, cn + d * 0.28]) {
    const ped = bevelPad(w * 0.56, 0.72, 0.26, 0.05, 0.015);
    K.geo(room, 'oakLong', placeGeo(ped, cx, 0, nz), 38);
  }
  // Chamfered stone slab top
  const top = bevelPad(w, 0.055, d, 0.06, 0.015);
  K.geo(room, 'stone', placeGeo(top, cx, 0.72, cn), 35);

  // 8 dining chairs: 3 West + 3 East + 1 North + 1 South (exact match to Reference A1)
  for (const offset of [-0.68, 0, 0.68]) {
    addDiningChair(K, room, cx - w / 2 - 0.24, cn + offset, 'E');
    addDiningChair(K, room, cx + w / 2 + 0.24, cn + offset, 'W');
  }
  addDiningChair(K, room, cx, cn - d / 2 - 0.24, 'N');
  addDiningChair(K, room, cx, cn + d / 2 + 0.24, 'S');
}

// ---------- Bedrooms & Wardrobes ----------

export function addBedSuite(K, obs, room, x0, n0, x1, n1, headDir = 'N', { showNightstands = true } = {}) {
  const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2;
  const spanX = Math.abs(x1 - x0), spanN = Math.abs(n1 - n0);
  const ew = headDir === 'N' || headDir === 'S';
  const width = ew ? spanX : spanN;
  const length = ew ? spanN : spanX;
  obs(x0, n0, x1, n1, 0.58);

  const headZ = -length / 2 + 0.06;

  // Recessed bronze bed feet
  for (const lx of [-width / 2 + 0.10, width / 2 - 0.10]) {
    for (const lz of [-length / 2 + 0.10, length / 2 - 0.10]) {
      const f = new THREE.CylinderGeometry(0.025, 0.018, 0.11, 10);
      f.translate(lx, 0.055, lz);
      emitLocal(K, room, 'bronze', f, cx, 0, cn, headDir, 45);
    }
  }

  // Timber platform base
  const frame = bevelPad(width, 0.18, length - 0.06, 0.03, 0.012);
  frame.translate(0, 0.11, 0.03);
  emitLocal(K, room, 'oakLong', frame, cx, 0, cn, headDir, 35);

  // Upholstered headboard with warm bronze inlay trim
  const hb = bevelPad(width + 0.08, 1.06, 0.11, 0.03, 0.015);
  hb.translate(0, 0.08, headZ);
  emitLocal(K, room, 'oak', hb, cx, 0, cn, headDir, 35);
  const hbPad = bevelPad(width - 0.08, 0.72, 0.06, 0.04, 0.018);
  hbPad.translate(0, 0.34, headZ + 0.055);
  emitLocal(K, room, 'fabricAccent', hbPad, cx, 0, cn, headDir, 45);

  // Contoured mattress
  const matH = 0.24;
  const mattress = bevelPad(width - 0.10, matH, length - 0.18, 0.05, 0.022);
  mattress.translate(0, 0.28, 0.05);
  emitLocal(K, room, 'fabricBed', mattress, cx, 0, cn, headDir, 42);

  // Draped folded duvet & runner covering lower 65%
  const duvet = bevelPad(width - 0.04, 0.08, (length - 0.18) * 0.66, 0.05, 0.024);
  duvet.translate(0, 0.28 + matH - 0.01, length * 0.16);
  emitLocal(K, room, 'fabricAccent', duvet, cx, 0, cn, headDir, 45);

  // Plush angled pillows (single or double)
  const cols = width >= 1.35 ? 2 : 1;
  const pw = cols === 2 ? Math.min(0.58, (width - 0.36) / 2) : Math.min(0.62, width - 0.24);
  const pxOffs = cols === 2 ? [-pw / 2 - 0.06, pw / 2 + 0.06] : [0];
  for (const ox of pxOffs) {
    const pBack = bevelPad(pw, 0.14, 0.36, 0.06, 0.028);
    pBack.rotateX(0.32);
    pBack.translate(ox, 0.54, headZ + 0.26);
    emitLocal(K, room, 'fabricBed', pBack, cx, 0, cn, headDir, 48);

    const pFront = bevelPad(pw * 0.78, 0.12, 0.26, 0.05, 0.024);
    pFront.rotateX(0.22);
    pFront.translate(ox, 0.51, headZ + 0.44);
    emitLocal(K, room, 'fabricAccent', pFront, cx, 0, cn, headDir, 48);
  }

  // Nightstands + turned LatheGeometry bedside lamps when space permits
  if (showNightstands && width >= 1.40) {
    for (const side of [-1, 1]) {
      const nxOff = side * (width / 2 + 0.26);
      const ns = bevelPad(0.40, 0.48, 0.36, 0.025, 0.01);
      ns.translate(nxOff, 0.04, headZ + 0.16);
      emitLocal(K, room, 'oak', ns, cx, 0, cn, headDir, 35);

      const handle = bevelPad(0.14, 0.016, 0.02, 0.005, 0.004);
      handle.translate(nxOff, 0.34, headZ + 0.35);
      emitLocal(K, room, 'bronze', handle, cx, 0, cn, headDir, 40);

      // Lathe ceramic/bronze base + translucent shade
      const basePts = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.065, 0.0),
        new THREE.Vector2(0.058, 0.025),
        new THREE.Vector2(0.022, 0.08),
        new THREE.Vector2(0.046, 0.15),
        new THREE.Vector2(0.018, 0.22),
      ];
      const baseGeo = new THREE.LatheGeometry(basePts, 14);
      baseGeo.translate(nxOff, 0.52, headZ + 0.16);
      emitLocal(K, room, 'bronze', baseGeo, cx, 0, cn, headDir, 45);

      const shade = new THREE.CylinderGeometry(0.085, 0.115, 0.15, 16, 1, false);
      shade.translate(nxOff, 0.77, headZ + 0.16);
      emitLocal(K, room, 'lamp', shade, cx, 0, cn, headDir, 45);
    }
  }
}

export function addWardrobe(K, obs, room, x0, n0, x1, n1, frontDir = 'E') {
  const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2;
  const spanX = Math.abs(x1 - x0), spanN = Math.abs(n1 - n0);
  const ew = frontDir === 'N' || frontDir === 'S';
  const w = ew ? spanX : spanN;
  const d = ew ? spanN : spanX;
  obs(x0, n0, x1, n1, 2.38);

  const body = bevelPad(w, 2.36, d - 0.04, 0.015, 0.006);
  body.translate(0, 0, -0.02);
  emitLocal(K, room, 'oak', body, cx, 0, cn, frontDir, 32);

  // Recessed articulated wardrobe doors & vertical bronze pulls
  const doors = Math.max(2, Math.round(w / 0.55));
  const dw = (w - 0.03 * (doors + 1)) / doors;
  for (let i = 0; i < doors; i++) {
    const dx = -w / 2 + 0.03 + dw / 2 + i * (dw + 0.03);
    const leaf = bevelPad(dw, 2.22, 0.028, 0.01, 0.005);
    leaf.translate(dx, 0.09, d / 2 - 0.014);
    emitLocal(K, room, 'oakLong', leaf, cx, 0, cn, frontDir, 35);

    const hSide = i % 2 === 0 ? 1 : -1;
    const pull = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 8);
    pull.translate(dx + hSide * (dw / 2 - 0.05), 1.15, d / 2 + 0.016);
    emitLocal(K, room, 'bronze', pull, cx, 0, cn, frontDir, 45);
  }
}

// ---------- Kitchen Cabinetry, Appliances, Sink & Stovetop ----------

function addCounterRun(K, obs, room, x0, n0, x1, n1, faceDir) {
  const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2;
  const spanX = Math.abs(x1 - x0), spanN = Math.abs(n1 - n0);
  const ew = faceDir === 'N' || faceDir === 'S';
  const w = ew ? spanX : spanN;
  const d = ew ? spanN : spanX;
  obs(x0, n0, x1, n1, 0.92);

  const cab = bevelPad(w, 0.86, d - 0.03, 0.012, 0.006);
  cab.translate(0, 0, -0.015);
  emitLocal(K, room, 'oak', cab, cx, 0, cn, faceDir, 35);

  const top = bevelPad(w + 0.02, 0.048, d + 0.02, 0.02, 0.01);
  top.translate(0, 0.86, 0.0);
  emitLocal(K, room, 'stone', top, cx, 0, cn, faceDir, 32);

  const bays = Math.max(2, Math.round(w / 0.60));
  const bw = (w - 0.03 * (bays + 1)) / bays;
  for (let i = 0; i < bays; i++) {
    const bx = -w / 2 + 0.03 + bw / 2 + i * (bw + 0.03);
    const door = bevelPad(bw, 0.68, 0.022, 0.01, 0.004);
    door.translate(bx, 0.12, d / 2 - 0.004);
    emitLocal(K, room, 'oakLong', door, cx, 0, cn, faceDir, 35);

    const pull = bevelPad(0.016, 0.14, 0.018, 0.004, 0.003);
    pull.translate(bx + bw / 2 - 0.06, 0.66, d / 2 + 0.014);
    emitLocal(K, room, 'bronze', pull, cx, 0, cn, faceDir, 40);
  }
}

function addGooseneckFaucet(K, room, cx, yBase, cn, dir = 'N') {
  const base = new THREE.CylinderGeometry(0.024, 0.028, 0.04, 14);
  base.translate(0, 0.02, 0);
  emitLocal(K, room, 'chrome', base, cx, yBase, cn, dir, 45);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, 0),
    new THREE.Vector3(0, 0.24, 0.01),
    new THREE.Vector3(0, 0.31, 0.08),
    new THREE.Vector3(0, 0.24, 0.15),
    new THREE.Vector3(0, 0.18, 0.155),
  ]);
  const spout = new THREE.TubeGeometry(curve, 16, 0.012, 10, false);
  emitLocal(K, room, 'chrome', spout, cx, yBase, cn, dir, 45);
}

function addCooktop(K, room, cx, cn, w = 0.64, d = 0.52, dir = 'E') {
  const plate = bevelPad(w, 0.022, d, 0.02, 0.006);
  emitLocal(K, room, 'stoveTop', plate, cx, 0.908, cn, dir, 35);
  const bx = w * 0.22, bz = d * 0.22;
  for (const ox of [-bx, bx]) {
    for (const oz of [-bz, bz]) {
      const cap = new THREE.CylinderGeometry(0.058, 0.064, 0.014, 18);
      cap.translate(ox, 0.935, oz);
      emitLocal(K, room, 'chrome', cap, cx, 0, cn, dir, 45);
      // Raised pan grate crossbars
      for (const ang of [0, Math.PI / 2]) {
        const bar = bevelPad(0.16, 0.012, 0.012, 0.003, 0.002);
        bar.rotateY(ang);
        bar.translate(ox, 0.942, oz);
        emitLocal(K, room, 'stoveTop', bar, cx, 0, cn, dir, 40);
      }
    }
  }
}

export function addKitchenSuite(K, obs) {
  // U-shaped base runs strictly inside Kitchen inner bounds (x: -4.80..-2.12, n: 5.46..9.66)
  // West main run
  addCounterRun(K, obs, 'kitchen', -4.78, 5.48, -4.16, 9.64, 'E');
  // South sink counter
  addCounterRun(K, obs, 'kitchen', -4.16, 5.48, -2.52, 6.08, 'S');
  // North stove & prep counter
  addCounterRun(K, obs, 'kitchen', -4.16, 9.04, -2.92, 9.64, 'S');
  // Refrigerator / tall pantry cabinet at North-East corner of kitchen
  obs(-2.86, 8.92, -2.18, 9.62, 2.18);
  const fridge = bevelPad(0.66, 2.12, 0.66, 0.025, 0.01);
  K.geo('kitchen', 'appliance', placeGeo(fridge, -2.52, 0.0, 9.27), 35);
  for (const hx of [-2.42, -2.62]) {
    const h = new THREE.CylinderGeometry(0.01, 0.01, 0.72, 10);
    K.geo('kitchen', 'chrome', placeGeo(h, hx, 1.32, 8.92), 45);
  }

  // Undermount double-bowl stainless sink on South counter + arched gooseneck mixer faucet
  for (const bx of [-3.60, -3.12]) {
    const bowl = bevelPad(0.42, 0.024, 0.42, 0.035, 0.005);
    K.geo('kitchen', 'chrome', placeGeo(bowl, bx, 0.905, 5.78), 35);
  }
  addGooseneckFaucet(K, 'kitchen', -3.36, 0.91, 5.56, 'N');

  // Twin 4-burner cooktops matching Reference A1 (West counter + North counter)
  addCooktop(K, 'kitchen', -4.46, 7.65, 0.62, 0.50, 'E');
  addCooktop(K, 'kitchen', -3.52, 9.34, 0.62, 0.50, 'S');
}

// ---------- Contoured Sanitary Fixtures ----------

export function addToilet(K, obs, room, cx, cn, dir = 'W') {
  obs(cx - 0.34, cn - 0.24, cx + 0.34, cn + 0.24, 0.78);
  // Sculpted Lathe ceramic pedestal + bowl
  const bowlPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.14, 0.0),
    new THREE.Vector2(0.12, 0.14),
    new THREE.Vector2(0.19, 0.31),
    new THREE.Vector2(0.205, 0.39),
    new THREE.Vector2(0.16, 0.39),
    new THREE.Vector2(0.13, 0.24),
    new THREE.Vector2(0.0, 0.20),
  ];
  const bowl = new THREE.LatheGeometry(bowlPts, 20);
  bowl.scale(0.95, 1, 1.18);
  bowl.translate(0, 0, 0.09);
  emitLocal(K, room, 'sanitary', bowl, cx, 0, cn, dir, 45);

  const seat = bevelPad(0.35, 0.032, 0.42, 0.15, 0.01);
  seat.translate(0, 0.39, 0.09);
  emitLocal(K, room, 'sanitary', seat, cx, 0, cn, dir, 45);

  const tank = bevelPad(0.38, 0.42, 0.17, 0.03, 0.012);
  tank.translate(0, 0.37, -0.19);
  emitLocal(K, room, 'sanitary', tank, cx, 0, cn, dir, 35);

  const btn = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14);
  btn.translate(0, 0.80, -0.19);
  emitLocal(K, room, 'chrome', btn, cx, 0, cn, dir, 45);
}

export function addVanityBasin(K, obs, room, x0, n0, x1, n1, frontDir = 'W') {
  const cx = (x0 + x1) / 2, cn = (n0 + n1) / 2;
  const spanX = Math.abs(x1 - x0), spanN = Math.abs(n1 - n0);
  const ew = frontDir === 'N' || frontDir === 'S';
  const w = ew ? spanX : spanN;
  const d = ew ? spanN : spanX;
  obs(x0, n0, x1, n1, 0.90);

  const cab = bevelPad(w - 0.02, 0.78, d - 0.02, 0.02, 0.008);
  emitLocal(K, room, 'oak', cab, cx, 0, cn, frontDir, 35);

  const slab = bevelPad(w + 0.02, 0.045, d + 0.02, 0.02, 0.01);
  slab.translate(0, 0.78, 0);
  emitLocal(K, room, 'stone', slab, cx, 0, cn, frontDir, 35);

  // Vessel ceramic bowl (LatheGeometry scaled ellipsoid)
  const vesselPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.11, 0.0),
    new THREE.Vector2(0.19, 0.05),
    new THREE.Vector2(0.21, 0.13),
    new THREE.Vector2(0.185, 0.13),
    new THREE.Vector2(0.14, 0.04),
    new THREE.Vector2(0.0, 0.03),
  ];
  const vessel = new THREE.LatheGeometry(vesselPts, 20);
  vessel.scale(1.1, 1, 0.92);
  vessel.translate(0, 0.825, 0.02);
  emitLocal(K, room, 'sanitary', vessel, cx, 0, cn, frontDir, 45);

  // Chrome mixer tap & slim mirror behind
  const tapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.83, -d / 2 + 0.08),
    new THREE.Vector3(0, 1.00, -d / 2 + 0.09),
    new THREE.Vector3(0, 1.02, -d / 2 + 0.17),
    new THREE.Vector3(0, 0.98, -d / 2 + 0.19),
  ]);
  const tap = new THREE.TubeGeometry(tapCurve, 12, 0.011, 8, false);
  emitLocal(K, room, 'chrome', tap, cx, 0, cn, frontDir, 45);

  const mir = bevelPad(Math.max(0.42, w * 0.84), 0.94, 0.022, 0.02, 0.005);
  mir.translate(0, 1.04, -d / 2 + 0.012);
  emitLocal(K, room, 'mirror', mir, cx, 0, cn, frontDir, 35);
}

export function addShowerAssembly(K, obs, room, x0, n0, x1, n1, wallDir = 'E') {
  // Stone shower curb + frameless tempered glass screen + rain showerhead
  K.box(room, 'stone', x0, n0, x1, n1, 0.0, 0.045, true);
  // Glass divider along South edge of walk-in shower
  obs(x0 + 0.02, n0 - 0.02, x1, n0 + 0.02, 2.04);
  K.box(room, 'glass', x0 + 0.04, n0 - 0.012, x1, n0 + 0.012, 0.045, 2.02, false);
  K.box(room, 'chrome', x0 + 0.03, n0 - 0.018, x1, n0 + 0.018, 2.02, 2.05, false);

  const wx = wallDir === 'E' ? x1 - 0.05 : x0 + 0.05;
  const wn = (n0 + n1) / 2;
  const riser = new THREE.CylinderGeometry(0.013, 0.013, 1.15, 10);
  K.geo(room, 'chrome', placeGeo(riser, wx, 1.56, wn), 45);
  const arm = new THREE.CylinderGeometry(0.012, 0.012, 0.24, 10);
  arm.rotateZ(Math.PI / 2);
  K.geo(room, 'chrome', placeGeo(arm, wx + (wallDir === 'E' ? -0.11 : 0.11), 2.13, wn), 45);
  const head = new THREE.CylinderGeometry(0.11, 0.095, 0.022, 18);
  K.geo(room, 'chrome', placeGeo(head, wx + (wallDir === 'E' ? -0.22 : 0.22), 2.11, wn), 40);
}

// ---------- Architectural Staircase (سلم) inside Central Core ----------

export function addStaircase(K, obs) {
  const sc = CONFIG.staircase;
  if (!sc?.enabled) return;

  const { x0, x1, n0, n1, treads, treadDepth, riserHeight, handrailHeight, connectUpperFloor } = sc;
  const landingS = 0.36;
  const flightN0 = n0 + landingS;

  // Entry bottom landing pad
  K.box('hallCenter', 'floor', x0, n0, x1, flightN0 + 0.04, 0.0, 0.025, true);

  // Ascending marble treads + dark granite risers (Reference B palette)
  for (let i = 0; i < treads; i++) {
    const sn0 = flightN0 + i * treadDepth;
    const sn1 = Math.min(n1, sn0 + treadDepth);
    const yBot = i * riserHeight;
    const yTop = (i + 1) * riserHeight;

    // Solid dark granite under-step support + riser face
    K.box('hallCenter', 'marbleDark', x0, sn0, x1, sn1, 0.0, yTop - 0.03, true);

    // Bullnose overhanging cream granite tread
    const tread = bevelPad(x1 - x0, 0.036, sn1 - sn0 + 0.022, 0.008, 0.005);
    K.geo('hallCenter', 'floor', placeGeo(tread, (x0 + x1) / 2, yTop - 0.034, (sn0 + sn1) / 2 - 0.008), 35);

    // Subtle recessed bronze step-light detail on every second riser (Ref B)
    if (i % 2 === 0 && i > 0) {
      K.box('hallCenter', 'bronze', (x0 + x1) / 2 - 0.08, sn0 - 0.006, (x0 + x1) / 2 + 0.08, sn0 + 0.002, yBot + 0.04, yBot + 0.075, false);
    }
  }

  // Top landing slab (capped cleanly if single-floor visualization)
  const topY = treads * riserHeight;
  const topN0 = flightN0 + treads * treadDepth;
  if (topN0 < n1 - 0.02) {
    K.box('hallCenter', 'marbleDark', x0, topN0, x1, n1, 0.0, topY - 0.03, true);
    K.box('hallCenter', connectUpperFloor ? 'floor' : 'floor', x0, topN0, x1, n1, topY - 0.03, topY, true);
  }

  // Sleek low curb + slim vertical bronze balusters + sloped tubular bronze handrail
  const railX = x1 - 0.015;
  const endN = Math.min(n1 - 0.04, flightN0 + treads * treadDepth);
  K.box('hallCenter', 'marbleDark', x1 - 0.03, n0, x1 + 0.01, n1, 0.0, 0.09, true);

  for (let i = 0; i <= treads; i += 2) {
    const bn = Math.min(endN, flightN0 + i * treadDepth + 0.05);
    const by = Math.min(topY, i * riserHeight);
    const post = new THREE.CylinderGeometry(0.012, 0.012, handrailHeight, 8);
    K.geo('hallCenter', 'bronze', placeGeo(post, railX, by + handrailHeight / 2, bn), 45);
  }

  const railCurve = new THREE.LineCurve3(
    new THREE.Vector3(railX, 0.06 + handrailHeight, -flightN0),
    new THREE.Vector3(railX, topY + handrailHeight, -endN)
  );
  const handrail = new THREE.TubeGeometry(railCurve, 8, 0.02, 10, false);
  K.geo('hallCenter', 'bronze', handrail, 45);

  // Register staircase upper rising core obstacle so FP walks up onto bottom landing cleanly without clipping through high risers
  obs(x0, flightN0 + 0.35, x1 + 0.02, n1, topY);
}
