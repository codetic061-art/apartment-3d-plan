import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { PAPER, INK, GROUND_Y, CUT_PLAN, CUT_OPEN, SUN_ELEV, SUN_HEADING, ROOMS, CONFIG } from './plan.js';
import { CUT, SWEEP_PLANES, setRoomReveal, setAllRoomsReveal, makeMaterials, texturesReady, setAnisotropy, contactShadowMaterial } from './materials.js';
import { buildHouse } from './house.js';
import { buildSheet } from './sheet.js';
import { makeRig } from './rig.js';

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
const errors = (window.__errors = []);
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));

// ---------------------------------------------------------------------------
// renderer & scene
// ---------------------------------------------------------------------------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(new THREE.Color(PAPER), 4000, 9000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.34;

const camera = new THREE.PerspectiveCamera(2, window.innerWidth / window.innerHeight, 1, 5000);
camera.rotation.order = 'YXZ';

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.485;
controls.minDistance = 1.8;
controls.maxDistance = 58;
controls.target.set(0, 0.8, -6.5);
controls.enabled = false;

const paper = new THREE.Mesh(
  new THREE.PlaneGeometry(9000, 9000),
  new THREE.MeshBasicMaterial({ color: PAPER, toneMapped: false, fog: false })
);
paper.rotation.x = -Math.PI / 2;
paper.position.y = GROUND_Y;
scene.add(paper);

// ---------------------------------------------------------------------------
// architectural ink line system
// ---------------------------------------------------------------------------
const LINE = {
  structure: { w: 1.25, color: INK, cut: true },
  furniture: { w: 0.85, color: INK, cut: true },
  anno: { w: 0.8, color: INK },
  thin: { w: 0.55, color: INK },
  hatch: { w: 0.45, color: '#a8a398' },
  dash: { w: 0.6, color: INK, dashed: true },
};
const planesFor = (room, cut = false) => {
  const p = [];
  if (cut) p.push(CUT);
  if (SWEEP_PLANES[room]) p.push(SWEEP_PLANES[room]);
  return p;
};
const lineMats = [];
function lines(kind, room, positions) {
  if (!positions || positions.length === 0) return new THREE.Group();
  const k = LINE[kind];
  const g = new LineSegmentsGeometry();
  g.setPositions(positions);
  const m = new LineMaterial({
    color: new THREE.Color(k.color),
    linewidth: k.w,
    worldUnits: false,
    fog: true,
    toneMapped: false,
    dashed: !!k.dashed,
    dashSize: 0.34,
    gapSize: 0.2,
    clippingPlanes: planesFor(room, k.cut),
  });
  lineMats.push(m);
  const l = new LineSegments2(g, m);
  if (k.dashed) l.computeLineDistances();
  l.frustumCulled = false;
  l.renderOrder = 1;
  return l;
}

// ---------------------------------------------------------------------------
// apartment 3D geometry
// ---------------------------------------------------------------------------
const M = makeMaterials();
const H = buildHouse();
const house = new THREE.Group();
const roofGroup = new THREE.Group();
scene.add(house);
house.add(roofGroup);

const solid = (geo, mat, parent = house, shadows = true) => {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  parent.add(m);
  return m;
};

for (const key in H.shell.geos) solid(H.shell.geos[key], M[key], house, true);
for (const key in H.roof.geos) solid(H.roof.geos[key], key === 'ceiling' ? M.ceiling : M.plaster, roofGroup, true);
for (const key in H.kit.b) {
  const mat = key.split('|')[1];
  const mesh = solid(H.bucketToGeometry(H.kit.b[key]), M[mat], house, mat !== 'glass' && mat !== 'lamp');
  if (mat === 'glass') mesh.renderOrder = 3;
}
for (const room in H.shell.edges) house.add(lines('structure', room, H.shell.edges[room]));
for (const room in H.roof.edges) roofGroup.add(lines('structure', room, H.roof.edges[room]));
for (const room in H.kit.e) house.add(lines('furniture', room, H.kit.e[room]));

// Soft contact shadows under key furniture
const contact = (x0, n0, x1, n1, y, strength) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, n1 - n0), contactShadowMaterial(strength));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, -(n0 + n1) / 2);
  m.renderOrder = 2;
  house.add(m);
};
contact(-4.25, 0.85, -3.40, 2.82, 0.021, 0.45); // West sofa
contact(-2.10, 0.90, -1.28, 2.80, 0.021, 0.45); // East sofa
contact(-3.10, 1.30, -2.40, 2.40, 0.021, 0.42); // Coffee table
contact(-0.58, 0.35, 0.98, 3.25, 0.008, 0.38);  // Dining group
contact(2.65, 1.30, 4.35, 2.90, 0.008, 0.45);   // Front-Right bed
contact(2.40, 3.78, 4.08, 5.42, 0.008, 0.45);   // Master bed
contact(-1.35, 12.10, 0.18, 13.50, 0.008, 0.45); // Bedroom 1 bed
contact(2.60, 11.70, 4.35, 13.28, 0.008, 0.45); // Bedroom 2 bed

// ---------------------------------------------------------------------------
// lighting: late-afternoon daylight + interior architectural bounce
// ---------------------------------------------------------------------------
const el = (SUN_ELEV * Math.PI) / 180;
const sunDir = new THREE.Vector3(SUN_HEADING[0] * Math.cos(el), -Math.sin(el), SUN_HEADING[1] * Math.cos(el)).normalize();
const sun = new THREE.DirectionalLight(0xffdfb8, 7.2);
sun.target.position.set(0, 0.8, -6.5);
sun.position.copy(sun.target.position).addScaledVector(sunDir, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 14, bottom: -14, near: 10, far: 130 });
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.015;
scene.add(sun, sun.target);

scene.add(new THREE.HemisphereLight(0xf1f5fc, 0xd8ccb8, 0.95));

const interiorLights = [
  [0xffe6c4, 4.8, 10, -2.5, 2.4, -1.9],  // Reception
  [0xffe6c4, 4.2, 10, 0.3, 2.4, -1.9],   // Dining
  [0xfff0dc, 3.8, 8, 3.0, 2.4, -1.9],    // Front bedroom
  [0xf3f7ff, 4.0, 9, -3.2, 2.4, -7.4],   // Kitchen
  [0xffe6c4, 3.5, 9, -1.45, 2.4, -7.2],  // West corridor
  [0xffe6c4, 3.8, 9, 3.1, 2.4, -5.0],    // Master
  [0xf5f8ff, 3.5, 9, 0.0, 2.4, -12.8],   // Bedroom 1
  [0xf5f8ff, 3.5, 9, 3.0, 2.4, -12.4],   // Bedroom 2
  [0xf5f8ff, 3.5, 9, -2.9, 2.4, -12.2],  // Services
];
for (const [col, inten, dist, lx, ly, lz] of interiorLights) {
  const pl = new THREE.PointLight(col, inten, dist, 2);
  pl.position.set(lx, ly, lz);
  scene.add(pl);
}

// ---------------------------------------------------------------------------
// layout & architectural sheet builder
// ---------------------------------------------------------------------------
let rig, sheet, sheetGroup;
let dimensionsMode = CONFIG.dimensionsMode;

function rebuildSheet() {
  if (!rig) return;
  const h = window.innerHeight;
  if (sheetGroup) {
    scene.remove(sheetGroup);
    sheet.dispose();
    sheetGroup.traverse((o) => {
      if (o.isLineSegments2) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
  }
  const pxPerMetre = h / rig.frame.h;
  sheet = buildSheet({
    frame: rig.frame,
    portrait: rig.portrait,
    labelScale: Math.min(1.25, Math.max(0.95, 14 / pxPerMetre)),
    anisotropy: renderer.capabilities.getMaxAnisotropy(),
    planesFor: (room) => planesFor(room),
    dimensionsMode,
  });
  sheetGroup = new THREE.Group();
  sheetGroup.add(sheet.group);
  for (const key in sheet.lines) {
    const [kind, room] = key.split('|');
    sheetGroup.add(lines(kind, room, sheet.lines[key]));
  }
  scene.add(sheetGroup);
}

function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  rig = makeRig(w / h);
  rebuildSheet();
}

// ---------------------------------------------------------------------------
// state & interactive modes
// ---------------------------------------------------------------------------
let viewMode = 'tour';     // 'tour' | 'orbit' | 'iso' | 'top'
let finishMode = 'auto';   // 'auto' | 'pbr' | 'ink'
let ceilingVisible = true;
let lenis = null;

const hud = {
  lens: document.getElementById('hud-lens'),
  height: document.getElementById('hud-height'),
  cut: document.getElementById('hud-cut'),
};
const rail = [...document.querySelectorAll('#rail span')];
const grain = document.getElementById('grain');
const sp = (v) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
let last = null;

function applyFinish(oTour = null) {
  if (finishMode === 'pbr') {
    setAllRoomsReveal(1);
    grain.style.opacity = '0';
  } else if (finishMode === 'ink') {
    setAllRoomsReveal(0);
    grain.style.opacity = '0.5';
  } else {
    if (viewMode === 'tour' && oTour) {
      for (const r of ROOMS) setRoomReveal(r.key, oTour.reveals[r.key] ?? 0);
      const rec = oTour.reveals.reception ?? 0;
      grain.style.opacity = (0.5 * (1 - rec)).toFixed(3);
    } else if (viewMode === 'top') {
      setAllRoomsReveal(0);
      grain.style.opacity = '0.5';
    } else {
      setAllRoomsReveal(1);
      grain.style.opacity = '0';
    }
  }
  renderer.shadowMap.needsUpdate = true;
}

function updateHud(fov, y, cutVal) {
  hud.lens.textContent = fov.toFixed(1) + '°';
  const above = y - GROUND_Y;
  hud.height.textContent = above > 20 ? sp(above) + ' m' : above.toFixed(2) + ' m';
  hud.cut.textContent = cutVal > 5.2 ? 'none' : '+' + cutVal.toFixed(2) + ' m';
}

function drawTour(s) {
  const o = rig.at(s);
  last = o;
  camera.rotation.order = 'YXZ';
  camera.position.set(o.x, o.y, o.z);
  camera.rotation.set(o.pitch, o.yaw, 0);
  camera.fov = o.fov;
  camera.near = o.near;
  camera.far = o.far;
  camera.updateProjectionMatrix();

  CUT.constant = o.cut;
  roofGroup.visible = ceilingVisible;
  scene.fog.near = o.fogNear;
  scene.fog.far = o.fogFar;
  applyFinish(o);

  renderer.render(scene, camera);
  updateHud(o.fov, o.y, o.cut);

  for (const r of rail) r.classList.remove('on');
  let on = rail[0];
  for (const r of rail) if (s >= +r.dataset.at) on = r;
  on.classList.add('on');
}

function syncUI() {
  document.querySelectorAll('#mode-btns button').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === viewMode);
  });
  const btnCeil = document.getElementById('btn-ceiling');
  btnCeil.textContent = ceilingVisible ? 'Ceiling: ON' : 'Ceiling: OFF';
  btnCeil.classList.toggle('on', !ceilingVisible);

  const btnFin = document.getElementById('btn-finish');
  const finLabels = { auto: 'Finish: Auto', pbr: 'Finish: Full PBR', ink: 'Finish: Ink Plan' };
  btnFin.textContent = finLabels[finishMode];
  btnFin.classList.toggle('on', finishMode !== 'auto');

  const btnScale = document.getElementById('btn-scale');
  btnScale.textContent = dimensionsMode === 'A1' ? 'Grid: 10.0×17.0m' : 'Grid: 9.0×14.5m';
  btnScale.classList.toggle('on', dimensionsMode === 'A1');
}

function animateCameraTo(pos, target, fov) {
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);
  gsap.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: 0.85, ease: 'power3.out' });
  gsap.to(controls.target, { x: target[0], y: target[1], z: target[2], duration: 0.85, ease: 'power3.out' });
  gsap.to(camera, {
    fov,
    duration: 0.85,
    ease: 'power3.out',
    onUpdate: () => { camera.updateProjectionMatrix(); if (CAPTURE) tick(); },
    onComplete: () => { if (CAPTURE) tick(); },
  });
}

function setMode(mode) {
  viewMode = mode;
  if (mode === 'tour') {
    controls.enabled = false;
    ceilingVisible = true;
    document.querySelectorAll('.overlay').forEach((el) => (el.style.display = ''));
    document.getElementById('rail').style.display = '';
    if (lenis) lenis.start();
    drawn = -1;
    drawTour(proxy.s);
  } else {
    if (lenis) lenis.stop();
    document.querySelectorAll('.overlay').forEach((el) => (el.style.display = 'none'));
    document.getElementById('rail').style.display = 'none';
    controls.enabled = true;
    camera.near = 0.15;
    camera.far = 500;
    scene.fog.near = 180;
    scene.fog.far = 420;

    if (mode === 'orbit') {
      ceilingVisible = false;
      CUT.constant = CUT_OPEN;
      animateCameraTo([-9.5, 10.5, 5.5], [0.0, 0.8, -6.2], 46);
    } else if (mode === 'iso') {
      ceilingVisible = false;
      CUT.constant = CUT_OPEN;
      animateCameraTo([-17.5, 16.5, 12.0], [0.0, 0.8, -6.2], 24);
    } else if (mode === 'top') {
      ceilingVisible = false;
      CUT.constant = finishMode === 'pbr' ? CUT_OPEN : CUT_PLAN;
      animateCameraTo([0.0, 56.0, -6.01], [0.0, 0.0, -6.0], 21);
    }
    roofGroup.visible = ceilingVisible;
    applyFinish();
  }
  syncUI();
}

function focusRoom(key) {
  if (key === 'all') {
    setMode(viewMode === 'tour' ? 'orbit' : viewMode);
    return;
  }
  const rm = ROOMS.find((r) => r.key === key);
  if (!rm || !rm.focus) return;
  if (viewMode !== 'orbit') setMode('orbit');
  ceilingVisible = false;
  roofGroup.visible = false;
  CUT.constant = CUT_OPEN;
  applyFinish();
  animateCameraTo(rm.focus.pos, rm.focus.target, 54);
  syncUI();
}

// ---------------------------------------------------------------------------
// scroll timeline
// ---------------------------------------------------------------------------
const proxy = { s: 0 };
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
tl.to(proxy, { s: 1, duration: 1 }, 0);
tl.to('#hero', { autoAlpha: 0, y: -30, duration: 0.04 }, 0.03);
const cap = (sel, a, b) => {
  tl.fromTo(sel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.03 }, a);
  if (b) tl.to(sel, { autoAlpha: 0, y: -16, duration: 0.03 }, b);
};
cap('#cap-lift', 0.08, 0.25);
cap('#cap-balc', 0.30, 0.50);
cap('#cap-core', 0.56, 0.74);
cap('#cap-suite', 0.80, null);

let drawn = -1;
function tick() {
  if (viewMode === 'tour') {
    if (proxy.s !== drawn) {
      drawn = proxy.s;
      drawTour(drawn);
    }
  } else {
    controls.update();
    if (viewMode === 'top') {
      CUT.constant = ceilingVisible ? CUT_PLAN : finishMode === 'pbr' ? CUT_OPEN : CUT_PLAN;
    } else {
      CUT.constant = CUT_OPEN;
    }
    roofGroup.visible = ceilingVisible;
    renderer.render(scene, camera);
    updateHud(camera.fov, camera.position.y, CUT.constant);
  }
}

function wireControls() {
  document.querySelectorAll('#mode-btns button').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  const sel = document.getElementById('focus-room');
  for (const r of ROOMS) {
    const opt = document.createElement('option');
    opt.value = r.key;
    opt.textContent = `${r.ar} · ${r.name}`;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', (e) => focusRoom(e.target.value));

  document.getElementById('btn-ceiling').addEventListener('click', () => {
    ceilingVisible = !ceilingVisible;
    roofGroup.visible = ceilingVisible;
    if (viewMode === 'tour') {
      drawn = -1;
      drawTour(proxy.s);
    }
    renderer.shadowMap.needsUpdate = true;
    syncUI();
  });

  document.getElementById('btn-finish').addEventListener('click', () => {
    const order = ['auto', 'pbr', 'ink'];
    finishMode = order[(order.indexOf(finishMode) + 1) % order.length];
    applyFinish(viewMode === 'tour' ? rig.at(proxy.s) : null);
    syncUI();
  });

  document.getElementById('btn-scale').addEventListener('click', () => {
    dimensionsMode = dimensionsMode === 'A2' ? 'A1' : 'A2';
    rebuildSheet();
    syncUI();
  });

  rail.forEach((span) => {
    span.addEventListener('click', () => {
      if (viewMode !== 'tour') setMode('tour');
      const targetS = parseFloat(span.dataset.at || '0');
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (lenis) lenis.scrollTo(targetS * max, { duration: 1.2 });
      else window.scrollTo(0, targetS * max);
    });
  });

  syncUI();
}

async function boot() {
  await Promise.race([
    Promise.all([
      document.fonts.load('400 20px "IBM Plex Mono"'),
      document.fonts.load('500 20px "IBM Plex Mono"'),
      document.fonts.load('400 40px "Instrument Serif"'),
      document.fonts.load('italic 400 40px "Instrument Serif"'),
      document.fonts.load('600 28px "Cairo"'),
      document.fonts.load('700 28px "Cairo"'),
    ]),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await texturesReady();
  layout();
  for (const m of Object.values(M)) m.needsUpdate = true;
  wireControls();
  drawTour(0);

  if (CAPTURE) {
    window.__frame = (s) =>
      new Promise((res) => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, s * max);
        tl.progress(s);
        drawTour(proxy.s);
        requestAnimationFrame(() => requestAnimationFrame(() => res(true)));
      });
  } else {
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.create({ trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: 0.8, animation: tl });
    gsap.ticker.add(tick);
    gsap.from('#hero h1 .l > span', { yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: 0.25 });
    gsap.from('#hero .eyebrow, #hero .lede, #hero .cue, #bar', { autoAlpha: 0, y: 12, duration: 1, ease: 'power2.out', stagger: 0.08, delay: 0.6 });
  }

  window.addEventListener('resize', () => {
    layout();
    drawn = -1;
    if (CAPTURE) drawTour(proxy.s);
  });

  window.__state = () => ({
    ...last,
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    fov: camera.fov,
    cut: CUT.constant,
    viewMode,
    finishMode,
    ceilingVisible,
    dimensionsMode,
    errors: errors.length,
    calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles,
  });
  window.__draw = drawTour;
  window.__setMode = setMode;
  window.__focusRoom = focusRoom;

  const loading = document.getElementById('loading');
  if (CAPTURE) loading.style.transition = 'none';
  loading.classList.add('done');
  window.__ready = true;
}

boot().catch((e) => {
  errors.push(String(e && e.stack ? e.stack : e));
  console.error(e);
});
