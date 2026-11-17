// Architectural Sheet Annotations: bilingual Arabic + English room names,
// dimension strings (Reference A1 & A2 modes), door swing arcs, floor tile grids,
// dressing hanger ticks, border, and title block.

import * as THREE from 'three';
import { INK, PAPER, ROOMS, EXTRA_LABELS, BALCONIES, DOORS, GROUND_Y, PROJECT, CONFIG } from './plan.js';

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const SERIF = '"Instrument Serif", "Cormorant Garamond", Georgia, serif';
const ARABIC = '"Cairo", "Noto Sans Arabic", Tahoma, sans-serif';
const CAP = 0.72;
const PXM = 135;

export function buildSheet({ frame, portrait, labelScale = 1, anisotropy = 8, planesFor, dimensionsMode = CONFIG.dimensionsMode }) {
  const group = new THREE.Group();
  const lines = {};
  const seg = (key, x0, n0, x1, n1, y) => (lines[key] ??= []).push(x0, y, -n0, x1, y, -n1);
  const FLOOR = 0.005;
  const OUT = GROUND_Y + 0.005;
  const disposables = [];

  function textBlock(rows, { room = 'corridor', x, n, y = FLOOR, rot = 0, align = 'center' }) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const specs = rows.map((r) => {
      const cap = r.cap * labelScale;
      const px = (cap / CAP) * PXM;
      const fontFamily = r.arabic ? ARABIC : (r.font ?? MONO);
      return {
        ...r,
        px,
        font: `${r.weight ?? 500} ${px}px ${fontFamily}`,
        track: r.arabic ? 0 : (r.track ?? 0.06) * px,
        lead: cap * PXM * (r.lead ?? 1.55),
      };
    });
    let w = 0, h = 0;
    for (const s of specs) {
      g.font = s.font;
      if ('letterSpacing' in g) g.letterSpacing = s.track + 'px';
      s.w = g.measureText(s.t).width;
      w = Math.max(w, s.w);
      h += s.lead;
    }
    const pad = 10;
    c.width = Math.max(16, Math.ceil(w + pad * 2));
    c.height = Math.max(16, Math.ceil(h + pad * 2));
    let yy = pad;
    g.fillStyle = INK;
    g.textBaseline = 'alphabetic';
    for (const s of specs) {
      g.font = s.font;
      if ('letterSpacing' in g) g.letterSpacing = s.track + 'px';
      g.globalAlpha = s.alpha ?? 1;
      const tx = align === 'center' ? (c.width - s.w) / 2 : pad;
      g.fillText(s.t, tx, yy + s.lead * 0.5 + s.px * CAP * 0.48);
      yy += s.lead;
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, toneMapped: false, fog: true, clippingPlanes: planesFor(room),
    });
    const geo = new THREE.PlaneGeometry(c.width / PXM, c.height / PXM);
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, y, -n);
    m.renderOrder = 2;
    group.add(m);
    disposables.push(tex, mat, geo);
    return m;
  }

  // ---- Room Labels (Arabic primary + English subtitle + dimensions) ----
  const isA1 = dimensionsMode === 'A1';
  for (const r of ROOMS) {
    const dim = isA1 ? r.dimA1 : r.dimA2;
    const [lx, ln] = r.labelAt;
    const rows = [
      { t: r.ar, cap: r.small ? 0.20 : 0.28, weight: 700, arabic: true, lead: 1.42 },
      { t: r.name, cap: r.small ? 0.105 : 0.13, weight: 500, track: 0.06, alpha: 0.72, lead: 1.32 },
    ];
    if (dim) rows.push({ t: dim, cap: r.small ? 0.115 : 0.145, weight: 400, alpha: 0.85, lead: 1.32 });
    textBlock(rows, { room: r.key, x: lx, n: ln });
  }
  for (const ex of EXTRA_LABELS) {
    textBlock(
      [
        { t: ex.ar, cap: ex.small ? 0.19 : 0.26, weight: 700, arabic: true, lead: 1.38 },
        { t: ex.name, cap: 0.11, weight: 500, alpha: 0.65, lead: 1.28 },
      ],
      { room: ex.room, x: ex.x, n: ex.n }
    );
  }

  // ---- Dimension Strings (Reference A2 or A1) ----
  function dimString(along, at, ticks, labels, { from, side = -1 } = {}) {
    const T = 0.16;
    const a0 = ticks[0], a1 = ticks[ticks.length - 1];
    if (along === 'n') {
      seg('anno|corridor', at, a0 - 0.3, at, a1 + 0.3, OUT);
      for (const t of ticks) {
        seg('anno|corridor', at - T, t - T, at + T, t + T, OUT);
        if (from !== undefined) seg('thin|corridor', from, t, at + side * 0.2, t, OUT);
      }
      for (let i = 0; i < ticks.length - 1; i++) {
        textBlock([{ t: labels[i], cap: 0.22, lead: 1.4 }], {
          room: 'corridor', x: at + side * 0.36, n: (ticks[i] + ticks[i + 1]) / 2, y: OUT, rot: Math.PI / 2,
        });
      }
    } else {
      seg('anno|corridor', a0 - 0.3, at, a1 + 0.3, at, OUT);
      for (const t of ticks) {
        seg('anno|corridor', t - T, at - T, t + T, at + T, OUT);
        if (from !== undefined) seg('thin|corridor', t, from, t, at - side * 0.2, OUT);
      }
      for (let i = 0; i < ticks.length - 1; i++) {
        textBlock([{ t: labels[i], cap: 0.22, lead: 1.4 }], {
          room: 'corridor', x: (ticks[i] + ticks[i + 1]) / 2, n: at - side * 0.36, y: OUT,
        });
      }
    }
  }

  // North column widths & overall width (unified 10.00 m: 3.50 | 3.00 | 3.50)
  const colLabels = ['3.50', '3.00', '3.50'];
  const totalWLabel = ['10.00'];
  dimString('x', 15.35, [-5.00, -1.50, 1.50, 5.00], colLabels, { from: 14.85, side: -1 });
  dimString('x', 16.25, [-5.00, 5.00], totalWLabel, { from: 15.55, side: -1 });

  // West bay depths & overall depth (unified 17.00 m: 5.80 | 1.50 | 4.20 | 5.50)
  dimString('n', -5.65, [-2.55, 3.72, 5.34, 9.66, 14.55], ['5.80', '1.50', '4.20', '5.50'], { from: -5.10, side: -1 });
  dimString('n', -6.55, [-2.55, 14.55], ['17.00'], { from: -5.85, side: -1 });

  // ---- Door Swings & Sliding Tracks ----
  const arc = (key, cx, cn, r, a0, a1, y) => {
    const N = 16;
    for (let i = 0; i < N; i++) {
      const t0 = ((a0 + ((a1 - a0) * i) / N) * Math.PI) / 180;
      const t1 = ((a0 + ((a1 - a0) * (i + 1)) / N) * Math.PI) / 180;
      seg(key, cx + Math.cos(t0) * r, cn + Math.sin(t0) * r, cx + Math.cos(t1) * r, cn + Math.sin(t1) * r, y);
    }
  };
  for (const d of DOORS) {
    if (d.type === 'sliding') {
      seg(`thin|${d.room}`, d.x, d.n - 0.04, d.x + d.w, d.n - 0.04, FLOOR);
      seg(`thin|${d.room}`, d.x, d.n + 0.04, d.x + d.w, d.n + 0.04, FLOOR);
    } else {
      arc(`thin|${d.room}`, d.x, d.n, d.w, d.open, d.closed, FLOOR);
      const oa = (d.open * Math.PI) / 180;
      seg(`thin|${d.room}`, d.x, d.n, d.x + Math.cos(oa) * d.w, d.n + Math.sin(oa) * d.w, FLOOR);
    }
  }

  // ---- Architectural Floor Tile & Plan Hatch Lines ----
  const grid = (key, x0, n0, x1, n1, stepX, stepN, y) => {
    for (let x = x0 + stepX; x < x1 - 0.02; x += stepX) seg(key, x, n0, x, n1, y);
    for (let n = n0 + stepN; n < n1 - 0.02; n += stepN) seg(key, x0, n, x1, n, y);
  };
  grid('hatch|reception', -4.75, 0.22, 1.42, 3.68, 0.85, 0.85, FLOOR);
  grid('hatch|kitchen', -4.75, 5.48, -2.20, 9.64, 0.6, 0.6, FLOOR);
  grid('hatch|guestBath', -4.75, 3.86, -2.26, 5.30, 0.45, 0.45, FLOOR);
  grid('hatch|masterBath', 3.20, 6.58, 4.75, 8.02, 0.45, 0.45, FLOOR);
  grid('hatch|bathUpper', -0.72, 8.95, 0.52, 10.16, 0.45, 0.45, FLOOR);

  // Balcony curved radial tile hatch lines
  for (const B of [BALCONIES.left, BALCONIES.right]) {
    for (let x = B.cx - B.rx + 0.45; x < B.cx + B.rx - 0.1; x += 0.45) {
      const t = (x - B.cx) / B.rx;
      if (Math.abs(t) >= 1) continue;
      const nEdge = B.cn - B.rn * Math.sqrt(1 - t * t);
      seg('hatch|balconies', x, B.cn, x, nEdge + 0.16, FLOOR);
    }
    for (let n = B.cn - 0.45; n > B.cn - B.rn + 0.25; n -= 0.45) {
      const t = (n - B.cn) / B.rn;
      if (Math.abs(t) >= 1) continue;
      const halfW = B.rx * Math.sqrt(1 - t * t);
      seg('hatch|balconies', B.cx - halfW + 0.16, n, B.cx + halfW - 0.16, n, FLOOR);
    }
  }

  // Dressing room closet hanger ticks (matches Reference A1)
  for (let x = 1.68; x < 2.94; x += 0.16) {
    seg('thin|dressing', x, 6.64, x + 0.06, 7.00, FLOOR + 2.38);
  }

  // Staircase (سلم) CAD step tread lines & Central Bath shower zone outlines on sheet
  const sc = CONFIG.staircase;
  if (sc?.enabled) {
    const startN = sc.n0 + 0.36;
    for (let i = 0; i <= sc.treads; i++) {
      const sn = Math.min(sc.n1, startN + i * sc.treadDepth);
      seg('thin|hallCenter', sc.x0, sn, sc.x1, sn, FLOOR + 0.02);
    }
    const sxm = (sc.x0 + sc.x1) / 2;
    seg('thin|hallCenter', sxm, startN, sxm, startN + sc.treads * sc.treadDepth, FLOOR + 0.02);
  }
  seg('thin|hallCenter', -0.06, 5.04, -0.06, 7.22, FLOOR);
  seg('thin|hallCenter', -0.06, 5.72, 0.54, 5.72, FLOOR);
  seg('thin|hallCenter', -0.06, 6.52, 0.54, 6.52, FLOOR);

  // ---- Architectural Sheet Border & Title Block ----
  const inset = 0.85;
  const side = portrait ? -4 : inset;
  const bx0 = frame.cx - frame.w / 2 + side;
  const bx1 = frame.cx + frame.w / 2 - side;
  const bn0 = frame.cn - frame.h / 2 + inset;
  const bn1 = frame.cn + frame.h / 2 - inset;
  for (const k of [0, 0.14]) {
    seg('anno|corridor', bx0 + k, bn0 + k, bx1 - k, bn0 + k, OUT);
    seg('anno|corridor', bx1 - k, bn0 + k, bx1 - k, bn1 - k, OUT);
    seg('anno|corridor', bx1 - k, bn1 - k, bx0 + k, bn1 - k, OUT);
    seg('anno|corridor', bx0 + k, bn1 - k, bx0 + k, bn0 + k, OUT);
  }

  const TW = portrait ? Math.min(frame.w - 1.6, 13.5) : 11.2;
  const TH = portrait ? 4.4 : 4.8;
  const tb = titleBlock(TW, TH, portrait ? 1.1 : 1, dimensionsMode);
  tb.texture.anisotropy = anisotropy;
  const tbm = new THREE.Mesh(
    new THREE.PlaneGeometry(TW, TH),
    new THREE.MeshBasicMaterial({ map: tb.texture, transparent: true, depthWrite: false, toneMapped: false, fog: true })
  );
  tbm.rotation.x = -Math.PI / 2;
  tbm.position.set(portrait ? frame.cx : bx1 - 0.16 - TW / 2, OUT, -(bn0 + 0.16 + TH / 2));
  tbm.renderOrder = 2;
  group.add(tbm);
  disposables.push(tb.texture, tbm.material, tbm.geometry);

  return { group, lines, dispose: () => disposables.forEach((d) => d.dispose()) };
}

function titleBlock(TW, TH, k = 1, dimensionsMode = 'A2') {
  const P = 84;
  const c = document.createElement('canvas');
  c.width = Math.round(TW * P);
  c.height = Math.round(TH * P);
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = INK;
  g.fillStyle = INK;
  g.lineWidth = 3;
  g.strokeRect(2, 2, W - 4, H - 4);
  const yA = Math.round(H * 0.45), yB = Math.round(H * 0.72);
  const line = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
  g.lineWidth = 1.8;
  line(0, yA, W, yA);
  line(0, yB, W, yB);
  const xSheet = Math.round(W * 0.68);
  line(xSheet, yA, xSheet, yB);
  const cells = [0.18, 0.46, 0.68, 0.84].map((f) => Math.round(f * W));
  for (const x of cells) line(x, yB, x, H);

  const m = P * 0.24;
  const label = (t, x, y) => {
    g.font = `500 ${P * 0.22 * k}px ${MONO}`;
    g.globalAlpha = 0.62;
    g.fillText(t, x + m, y + m + P * 0.18 * k);
    g.globalAlpha = 1;
  };
  const value = (t, x, yBottom, size = 0.35, arabic = false) => {
    g.font = `500 ${P * size * k}px ${arabic ? ARABIC : MONO}`;
    g.fillText(t, x + m, yBottom - m * 0.8);
  };

  label('PROJECT', 0, 0);
  g.font = `600 ${Math.min(yA * 0.32, W * 0.058)}px ${ARABIC}`;
  g.fillText('شقة سكنية · Apartment', m, yA - m * 0.9);
  g.textAlign = 'right';
  value('10.00 × 17.00 m', W - m, yA, 0.28);
  g.textAlign = 'left';

  label('DRAWING', 0, yA);
  value('Floor Plan · المسقط الأفقي', 0, yB, 0.28, true);
  label('SHEET', xSheet, yA);
  value(PROJECT.sheet, xSheet, yB, 0.44);

  // North arrow
  const ch = H - yB;
  const ax = cells[0] * 0.5, ay = yB + ch * 0.54, r = Math.min(ch * 0.3, cells[0] * 0.3);
  g.lineWidth = 2;
  g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 2); g.stroke();
  line(ax, ay + r * 1.15, ax, ay - r * 1.15);
  g.beginPath(); g.moveTo(ax, ay - r * 1.15); g.lineTo(ax - r * 0.4, ay); g.lineTo(ax, ay); g.closePath(); g.fill();
  g.font = `500 ${P * 0.28 * k}px ${MONO}`;
  g.fillText('N', ax + r * 0.5, ay - r * 0.65);

  // Scale bar
  const u = P * 0.55;
  const barM = 3;
  const sx = cells[0] + m, sy = H - m - P * 0.14;
  label('METRES', cells[0], yB);
  g.lineWidth = 1.6;
  g.strokeRect(sx, sy, barM * u, P * 0.14);
  for (let i = 0; i < barM; i += 2) g.fillRect(sx + i * u, sy, u, P * 0.14);
  g.font = `400 ${P * 0.22 * k}px ${MONO}`;
  g.fillText('0', sx - P * 0.06, sy - P * 0.09);
  g.fillText(String(barM), sx + barM * u - P * 0.08, sy - P * 0.09);

  label('CUT AT', cells[1], yB);
  value('+1.20 m', cells[1], H, 0.32);
  label('SCALE', cells[2], yB);
  value(PROJECT.scale, cells[2], H, 0.32);
  label('WALL H*', cells[3], yB);
  value(`${CONFIG.wallHeight.toFixed(2)} m*`, cells[3], H, 0.32);

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture };
}
