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
import { CollisionWorld, FirstPersonController } from './walk.js';
import { createMeasureTool } from './measure.js';
import { createDoorSystem } from './doors.js';

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
renderer.toneMappingExposure = 0.94;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
setAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(new THREE.Color(PAPER), 4000, 9000);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.50;

const camera = new THREE.PerspectiveCamera(2, window.innerWidth / window.innerHeight, 1, 5000);
camera.rotation.order = 'YXZ';

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.485;
controls.minDistance = 1.6;
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
// apartment 3D geometry & subsystems
// ---------------------------------------------------------------------------
const M = makeMaterials();
const H = buildHouse();
const house = new THREE.Group();
const roofGroup = new THREE.Group();
const shellMeshes = [];
scene.add(house);
house.add(roofGroup);

const solid = (geo, mat, parent = house, shadows = true, isShell = false) => {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadows;
  m.receiveShadow = shadows;
  m.frustumCulled = false; // ensures GPU shaders & textures warm up before entering any room
  parent.add(m);
  if (isShell) shellMeshes.push(m);
  return m;
};

for (const key in H.shell.geos) solid(H.shell.geos[key], M[key], house, true, true);
for (const key in H.roof.geos) solid(H.roof.geos[key], key === 'ceiling' ? M.ceiling : M.facadePlaster, roofGroup, true);
for (const key in H.kit.b) {
  const mat = key.split('|')[1];
  const mesh = solid(H.bucketToGeometry(H.kit.b[key]), M[mat], house, mat !== 'glass' && mat !== 'lamp');
  if (mat === 'glass') mesh.renderOrder = 3;
}
for (const room in H.shell.edges) house.add(lines('structure', room, H.shell.edges[room]));
for (const room in H.roof.edges) roofGroup.add(lines('structure', room, H.roof.edges[room]));
for (const room in H.kit.e) house.add(lines('furniture', room, H.kit.e[room]));

const collisionWorld = new CollisionWorld(H.wallSegments, H.doorCarves, H.obstacles);
const doorSystem = createDoorSystem(M, planesFor, collisionWorld);
house.add(doorSystem.group);
const fpController = new FirstPersonController(camera, canvas, collisionWorld);
const measureTool = createMeasureTool(scene, camera, canvas, shellMeshes, H.wallSegments);

// Soft contact shadows under key furniture (10.00 x 17.00 m layout)
const contact = (x0, n0, x1, n1, y, strength) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, n1 - n0), contactShadowMaterial(strength));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, -(n0 + n1) / 2);
  m.renderOrder = 2;
  house.add(m);
};
contact(-4.65, 0.90, -3.78, 2.86, 0.021, 0.45);
contact(-2.40, 0.95, -1.58, 2.84, 0.021, 0.45);
contact(-3.45, 1.40, -2.70, 2.46, 0.021, 0.42);
contact(-0.25, 0.65, 1.20, 3.15, 0.008, 0.38);
contact(2.75, 0.85, 4.78, 2.60, 0.008, 0.45);
contact(2.60, 3.80, 4.30, 5.50, 0.008, 0.45);
contact(-1.44, 12.10, 0.20, 13.66, 0.008, 0.45);
contact(2.80, 11.72, 4.78, 13.42, 0.008, 0.45);

// ---------------------------------------------------------------------------
// lighting: natural late-afternoon sun + balanced 3500K interior fill
// ---------------------------------------------------------------------------
const el = (SUN_ELEV * Math.PI) / 180;
const sunDir = new THREE.Vector3(SUN_HEADING[0] * Math.cos(el), -Math.sin(el), SUN_HEADING[1] * Math.cos(el)).normalize();
const sun = new THREE.DirectionalLight(0xffdfb8, 5.8);
sun.target.position.set(0, 0.8, -7.0);
sun.position.copy(sun.target.position).addScaledVector(sunDir, -60);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 15, bottom: -15, near: 10, far: 130 });
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.015;
scene.add(sun, sun.target);

scene.add(new THREE.HemisphereLight(0xf1f5fc, 0xd4c6b0, 0.85));

const interiorLights = [
  [0xffe6c4, 4.0, 10, -2.95, 2.45, -1.9],
  [0xffe6c4, 3.8, 10, 0.45, 2.45, -1.9],
  [0xffeed8, 3.4, 8, 3.20, 2.45, -1.85],
  [0xf6f8ff, 3.6, 9, -3.45, 2.45, -7.5],
  [0xffe6c4, 3.2, 9, -1.45, 2.45, -6.8],
  [0xffeed8, 3.0, 8, -0.10, 2.45, -6.1],
  [0xffe6c4, 3.4, 9, 3.25, 2.45, -5.1],
  [0xf5f8ff, 3.2, 9, 0.0, 2.45, -12.8],
  [0xf5f8ff, 3.2, 9, 3.25, 2.45, -12.4],
  [0xf5f8ff, 3.2, 9, -3.05, 2.45, -12.2],
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
  measureTool.resize(w, h);
  rig = makeRig(w / h);
  rebuildSheet();
}

// ---------------------------------------------------------------------------
// single-owner camera state machine & room containment
// ---------------------------------------------------------------------------
let viewMode = 'tour';     // 'sheet' | 'tour' | 'iso' | 'orbit' | 'top' | 'fp'
let activeRoomKey = 'all';
let finishMode = 'auto';   // 'auto' | 'pbr' | 'ink'
let ceilingVisible = true;
let lenis = null;
let scrollTriggerInst = null;

const hud = {
  lens: document.getElementById('hud-lens'),
  height: document.getElementById('hud-height'),
  cut: document.getElementById('hud-cut'),
};
const rail = [...document.querySelectorAll('#rail span')];
const grain = document.getElementById('grain');
const fpHint = document.getElementById('fp-hint');
const fpJoystick = document.getElementById('fp-joystick');
const ctaFp = document.getElementById('cta-fp');
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
    if ((viewMode === 'tour' || viewMode === 'sheet') && oTour) {
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
  roofGroup.visible = ceilingVisible && o.cut > CONFIG.wallHeight + 0.05;
  scene.fog.near = o.fogNear;
  scene.fog.far = o.fogFar;
  applyFinish(o);

  doorSystem.update(camera.position, CAPTURE ? 1.0 : 1 / 30, s <= 0.12 ? 'sheet' : 'tour');

  renderer.render(scene, camera);
  updateHud(o.fov, o.y, o.cut);

  if (ctaFp) ctaFp.classList.toggle('on', viewMode === 'tour' && s >= 0.96);

  for (const r of rail) r.classList.remove('on');
  let on = rail[0];
  for (const r of rail) if (s >= +r.dataset.at) on = r;
  on.classList.add('on');
}

function clampRoomOrbit() {
  if (activeRoomKey === 'all' || viewMode !== 'orbit') return;
  const rm = ROOMS.find((r) => r.key === activeRoomKey);
  if (!rm || !rm.bounds) return;
  const b = rm.bounds;
  const zMin = -b.n1;
  const zMax = -b.n0;
  controls.target.x = Math.max(b.x0 + 0.15, Math.min(b.x1 - 0.15, controls.target.x));
  controls.target.z = Math.max(zMin + 0.15, Math.min(zMax - 0.15, controls.target.z));
  controls.target.y = Math.max(0.35, Math.min(CONFIG.wallHeight - 0.45, controls.target.y));

  camera.position.x = Math.max(b.x0 + 0.08, Math.min(b.x1 - 0.08, camera.position.x));
  camera.position.z = Math.max(zMin + 0.08, Math.min(zMax - 0.08, camera.position.z));
  camera.position.y = Math.max(0.45, Math.min(CONFIG.wallHeight - 0.15, camera.position.y));
}

function syncUI() {
  document.querySelectorAll('#mode-btns button').forEach((b) => {
    b.classList.toggle('on', b.dataset.mode === viewMode);
  });
  document.getElementById('btn-measure').classList.toggle('on', measureTool.isActive());

  const btnCeil = document.getElementById('btn-ceiling');
  btnCeil.textContent = ceilingVisible ? 'Ceiling: ON' : 'Ceiling: OFF';
  btnCeil.classList.toggle('on', !ceilingVisible);

  const btnFin = document.getElementById('btn-finish');
  const finLabels = { auto: 'Finish: Auto', pbr: 'Finish: Full PBR', ink: 'Finish: Ink Plan' };
  btnFin.textContent = finLabels[finishMode];
  btnFin.classList.toggle('on', finishMode !== 'auto');

  const isFp = viewMode === 'fp';
  if (fpHint) fpHint.classList.toggle('on', isFp);
  if (fpJoystick) fpJoystick.classList.toggle('on', isFp);
  if (ctaFp) ctaFp.classList.toggle('on', viewMode === 'tour' && proxy.s >= 0.96);
  document.body.classList.toggle('mode-locked', viewMode !== 'tour' && viewMode !== 'sheet');
}

function killCameraTweens() {
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(controls.target);
  gsap.killTweensOf(camera);
}

function animateCameraTo(pos, target, fov) {
  killCameraTweens();
  if (CAPTURE) {
    camera.position.set(pos[0], pos[1], pos[2]);
    controls.target.set(target[0], target[1], target[2]);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    controls.update();
    clampRoomOrbit();
    renderer.render(scene, camera);
    updateHud(camera.fov, camera.position.y, CUT.constant);
    return;
  }
  gsap.to(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: 0.75, ease: 'power3.out' });
  gsap.to(controls.target, { x: target[0], y: target[1], z: target[2], duration: 0.75, ease: 'power3.out' });
  gsap.to(camera, {
    fov,
    duration: 0.75,
    ease: 'power3.out',
    onUpdate: () => {
      camera.updateProjectionMatrix();
      controls.update();
      clampRoomOrbit();
      renderer.render(scene, camera);
    },
    onComplete: () => {
      controls.update();
      clampRoomOrbit();
      renderer.render(scene, camera);
    },
  });
}

function setMode(mode) {
  killCameraTweens();
  fpController.disable();
  viewMode = mode;

  if (mode === 'sheet' || mode === 'tour') {
    controls.enabled = false;
    activeRoomKey = 'all';
    const sel = document.getElementById('focus-room');
    if (sel) sel.value = 'all';
    ceilingVisible = true;
    document.querySelectorAll('.overlay').forEach((el) => (el.style.display = ''));
    document.getElementById('rail').style.display = '';
    if (lenis) lenis.start();
    if (mode === 'sheet') {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
      proxy.s = 0;
      tl.progress(0);
    } else if (scrollTriggerInst) {
      proxy.s = scrollTriggerInst.progress;
      tl.progress(proxy.s);
    }
    drawn = -1;
    drawTour(proxy.s);
  } else if (mode === 'fp') {
    if (lenis) lenis.stop();
    controls.enabled = false;
    document.querySelectorAll('.overlay').forEach((el) => (el.style.display = 'none'));
    document.getElementById('rail').style.display = 'none';
    ceilingVisible = true;
    roofGroup.visible = true;
    CUT.constant = CUT_OPEN;
    scene.fog.near = 60;
    scene.fog.far = 220;
    applyFinish();
    fpController.enable(activeRoomKey);
    renderer.render(scene, camera);
    updateHud(camera.fov, camera.position.y, CUT.constant);
  } else {
    if (lenis) lenis.stop();
    document.querySelectorAll('.overlay').forEach((el) => (el.style.display = 'none'));
    document.getElementById('rail').style.display = 'none';
    controls.enabled = true;
    camera.near = 0.12;
    camera.far = 500;
    scene.fog.near = 180;
    scene.fog.far = 420;

    if (mode === 'orbit') {
      if (activeRoomKey === 'all') {
        ceilingVisible = false;
        controls.minDistance = 1.6;
        controls.maxDistance = 58;
        controls.maxPolarAngle = Math.PI * 0.485;
        CUT.constant = CUT_OPEN;
        animateCameraTo([-9.5, 10.5, 5.5], [0.0, 0.8, -6.2], 46);
      } else {
        focusRoom(activeRoomKey);
        return;
      }
    } else if (mode === 'iso') {
      activeRoomKey = 'all';
      ceilingVisible = false;
      controls.minDistance = 4;
      controls.maxDistance = 58;
      controls.maxPolarAngle = Math.PI * 0.485;
      CUT.constant = CUT_OPEN;
      animateCameraTo([-17.5, 16.5, 12.0], [0.0, 0.8, -6.2], 24);
    } else if (mode === 'top') {
      activeRoomKey = 'all';
      ceilingVisible = false;
      controls.minDistance = 8;
      controls.maxDistance = 90;
      controls.maxPolarAngle = Math.PI * 0.485;
      CUT.constant = finishMode === 'pbr' ? CUT_OPEN : CUT_PLAN;
      animateCameraTo([0.0, 56.0, -6.01], [0.0, 0.0, -6.0], 21);
    }
    roofGroup.visible = ceilingVisible;
    applyFinish();
  }
  syncUI();
}

function focusRoom(key) {
  activeRoomKey = key;
  if (key === 'all') {
    setMode(viewMode === 'tour' || viewMode === 'sheet' ? 'orbit' : viewMode);
    return;
  }
  const rm = ROOMS.find((r) => r.key === key);
  if (!rm || !rm.focus) return;

  if (viewMode === 'fp') {
    fpController.spawnInRoom(key);
    renderer.render(scene, camera);
    syncUI();
    return;
  }

  viewMode = 'orbit';
  fpController.disable();
  if (lenis) lenis.stop();
  document.querySelectorAll('.overlay').forEach((el) => (el.style.display = 'none'));
  document.getElementById('rail').style.display = 'none';
  controls.enabled = true;
  controls.minDistance = 0.45;
  controls.maxDistance = 4.2;
  controls.maxPolarAngle = Math.PI * 0.62;
  camera.near = 0.08;
  camera.far = 160;
  scene.fog.near = 80;
  scene.fog.far = 220;
  ceilingVisible = true;
  roofGroup.visible = true;
  CUT.constant = CUT_OPEN;
  applyFinish();
  animateCameraTo(rm.focus.pos, rm.focus.target, 58);
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
cap('#cap-lift', 0.06, 0.15);
cap('#cap-balc', 0.17, 0.29);
cap('#cap-core', 0.34, 0.65);
cap('#cap-suite', 0.74, 0.95);

let drawn = -1;
let prevTime = performance.now();
function tick() {
  const now = performance.now();
  const dt = Math.min(0.1, Math.max(0.001, (now - prevTime) / 1000));
  prevTime = now;

  if (viewMode === 'tour' || viewMode === 'sheet') {
    const stepMode = viewMode === 'sheet' || proxy.s <= 0.12 ? 'sheet' : 'tour';
    const before = doorSystem.getState().map((d) => d.progress);
    if (proxy.s !== drawn) {
      drawn = proxy.s;
      drawTour(drawn);
    } else {
      doorSystem.update(camera.position, dt, stepMode);
      const changed = doorSystem.getState().some((d, i) => Math.abs(d.progress - before[i]) > 0.002);
      if (changed) renderer.render(scene, camera);
    }
  } else if (viewMode === 'fp') {
    doorSystem.update(camera.position, dt, 'fp');
    fpController.step(dt);
    roofGroup.visible = ceilingVisible;
    CUT.constant = CUT_OPEN;
    renderer.render(scene, camera);
    updateHud(camera.fov, camera.position.y, CUT.constant);
  } else {
    doorSystem.update(camera.position, dt, viewMode);
    controls.update();
    clampRoomOrbit();
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

  document.getElementById('btn-measure').addEventListener('click', () => {
    measureTool.setActive(!measureTool.isActive());
    if (measureTool.isActive() && (viewMode === 'tour' || viewMode === 'sheet') && proxy.s < 0.05) {
      setMode('iso');
    }
    syncUI();
  });

  document.getElementById('btn-ceiling').addEventListener('click', () => {
    ceilingVisible = !ceilingVisible;
    roofGroup.visible = ceilingVisible;
    if (viewMode === 'tour' || viewMode === 'sheet') {
      drawn = -1;
      drawTour(proxy.s);
    }
    renderer.shadowMap.needsUpdate = true;
    syncUI();
  });

  document.getElementById('btn-finish').addEventListener('click', () => {
    const order = ['auto', 'pbr', 'ink'];
    finishMode = order[(order.indexOf(finishMode) + 1) % order.length];
    applyFinish(viewMode === 'tour' || viewMode === 'sheet' ? rig.at(proxy.s) : null);
    syncUI();
  });

  // Green end-of-tour CTA: seamless transition into Free First-Person Mode in Bedroom 2
  const btnGoFp = document.getElementById('btn-go-fp');
  if (btnGoFp) {
    btnGoFp.addEventListener('click', () => {
      const cx = camera.position.x;
      const cn = -camera.position.z;
      const cyaw = camera.rotation.y;
      const cpitch = camera.rotation.x;
      activeRoomKey = 'bedroom2';
      const selEl = document.getElementById('focus-room');
      if (selEl) selEl.value = 'bedroom2';
      setMode('fp');
      fpController.spawnAt(cx, cn, cyaw, cpitch);
      renderer.render(scene, camera);
    });
  }

  // Click any interactive door leaf to toggle it open/closed
  const doorRay = new THREE.Raycaster();
  const doorPtr = new THREE.Vector2();
  let downPos = null;
  canvas.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!downPos || measureTool.isActive() || fpController.pointerLocked) return;
    if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    doorPtr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    doorRay.setFromCamera(doorPtr, camera);
    const hits = doorRay.intersectObjects(doorSystem.pickMeshes, false);
    if (hits.length > 0 && hits[0].object.userData.doorIndex !== undefined) {
      doorSystem.toggleByIndex(hits[0].object.userData.doorIndex);
      renderer.render(scene, camera);
    }
  });

  rail.forEach((span) => {
    span.addEventListener('click', () => {
      if (viewMode !== 'tour' && viewMode !== 'sheet') setMode('tour');
      const targetS = parseFloat(span.dataset.at || '0');
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (lenis) lenis.scrollTo(targetS * max, { duration: 1.1 });
      else window.scrollTo(0, targetS * max);
    });
  });

  syncUI();
}

async function boot() {
  const bar = document.getElementById('loading-bar');
  const pct = document.getElementById('loading-pct');

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

  await texturesReady((ratio) => {
    const p = Math.round(ratio * 100);
    if (bar) bar.style.width = `${p}%`;
    if (pct) pct.textContent = `${p}%`;
  });

  layout();
  for (const m of Object.values(M)) m.needsUpdate = true;

  // GPU Pre-Warmup: compile all room PBR + shader programs before interaction starts
  setAllRoomsReveal(1);
  CUT.constant = CUT_OPEN;
  renderer.shadowMap.needsUpdate = true;
  renderer.compile(scene, camera);
  renderer.render(scene, camera);

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
    scrollTriggerInst = ScrollTrigger.create({
      trigger: '#track',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      animation: tl,
    });
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
    activeRoomKey,
    finishMode,
    ceilingVisible,
    dimensionsMode,
    measuring: measureTool.isActive(),
    selectedWall: measureTool.getSelected()?.label || null,
    doors: doorSystem.getState(),
    ctaVisible: !!(ctaFp && ctaFp.classList.contains('on')),
    errors: errors.length,
    calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles,
  });
  window.__draw = drawTour;
  window.__setMode = setMode;
  window.__focusRoom = focusRoom;
  window.__fp = fpController;
  window.__measure = measureTool;
  window.__doors = doorSystem;
  window.__tick = tick;

  const loading = document.getElementById('loading');
  if (CAPTURE) loading.style.transition = 'none';
  loading.classList.add('done');
  window.__ready = true;
}

boot().catch((e) => {
  errors.push(String(e && e.stack ? e.stack : e));
  console.error(e);
});
