// Every surface in the apartment has two looks and one shader that blends them:
//   ink      flat paper colour, no light, paired with black architectural lines.
//   material full PBR material: Poly Haven CC0 maps, procedural tile joints,
//            soft room ambient occlusion, and directional shadows.

import * as THREE from 'three';
import { PAPER, INK, ROOMS, CUT_PLAN } from './plan.js';

export const CUT = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_PLAN);

const raw = (hex) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);
const IDLE = -1e4;
const SOFT = 1.1;

const sweepOf = (r) => {
  const dx = r.dir[0], dz = -r.dir[1];
  const ox = dx > 0 ? r.x0 : dx < 0 ? r.x1 : (r.x0 + r.x1) / 2;
  const oz = dz < 0 ? -r.n0 : dz > 0 ? -r.n1 : -(r.n0 + r.n1) / 2;
  return { ox, oz, dx, dz, len: Math.abs(dx) * (r.x1 - r.x0) + Math.abs(dz) * (r.n1 - r.n0) };
};
const SW = ROOMS.map(sweepOf);

export const U = {
  uPaper: { value: raw(PAPER) },
  uInkCol: { value: raw(INK) },
  uRoomBox: { value: ROOMS.map((r) => new THREE.Vector4(r.x0, -r.n1, r.x1, -r.n0)) },
  uRoomSweep: { value: SW.map((s) => new THREE.Vector4(s.ox, s.oz, s.dx, s.dz)) },
  uRoomState: { value: ROOMS.map((r) => new THREE.Vector2(IDLE, r.ceil)) },
  uSoft: { value: SOFT },
  uInkTone: { value: 0.045 },
};

export const SWEEP_PLANES = {};
ROOMS.forEach((r, i) => {
  SWEEP_PLANES[r.key] = new THREE.Plane(new THREE.Vector3(SW[i].dx, 0, SW[i].dz), 1e4);
});

// t: 0 = line drawing, 1 = fully material
export function setRoomReveal(key, t) {
  const i = ROOMS.findIndex((r) => r.key === key);
  if (i < 0) return;
  const s = SW[i];
  const front = t <= 0 ? IDLE : -0.4 + t * (s.len + SOFT + 0.8);
  U.uRoomState.value[i].x = front;
  SWEEP_PLANES[key].constant = -(s.ox * s.dx + s.oz * s.dz + front);
}

export function setAllRoomsReveal(t) {
  for (const r of ROOMS) setRoomReveal(r.key, t);
}

const NR = ROOMS.length;

const DECL = /* glsl */ `
#define NR ${NR}
varying vec3 vWp;
varying vec3 vWn;
uniform vec3 uPaper;
uniform vec3 uInkCol;
uniform vec4 uRoomBox[NR];
uniform vec4 uRoomSweep[NR];
uniform vec2 uRoomState[NR];
uniform float uSoft;
uniform float uInkTone;
uniform float uBackInk;
uniform float uGlass;
uniform float uSat;
uniform vec3 uTint;
uniform vec3 uMean;
uniform float uContrast;
uniform float uAO;

int roomOf(vec3 q) {
  for (int i = 0; i < NR; i++) {
    vec4 b = uRoomBox[i];
    if (q.x > b.x && q.x < b.z && q.z > b.y && q.z < b.w && q.y < uRoomState[i].y + 0.1) return i;
  }
  return -1;
}

float inkOf(vec3 q, int r) {
  if (r < 0) return 1.0;
  vec4 s = uRoomSweep[r];
  float d = dot(q.xz - s.xy, s.zw);
  float f = uRoomState[r].x;
  return smoothstep(f - uSoft, f, d);
}

float roomAO(vec3 p, vec3 nn, int r) {
  if (r < 0) return 1.0;
  vec4 b = uRoomBox[r];
  float top = uRoomState[r].y;
  float R = 0.95;
  float occ = 0.0;
  occ += (1.0 - abs(nn.x)) * (exp(-max(p.x - b.x - 0.08, 0.0) / R) + exp(-max(b.z - 0.08 - p.x, 0.0) / R));
  occ += (1.0 - abs(nn.z)) * (exp(-max(p.z - b.y - 0.08, 0.0) / R) + exp(-max(b.w - 0.08 - p.z, 0.0) / R));
  occ += (1.0 - abs(nn.y)) * (exp(-max(p.y, 0.0) / R) + exp(-max(top - p.y, 0.0) / R));
  return clamp(1.0 - uAO * occ, 0.35, 1.0);
}
`;

const VERT_DECL = /* glsl */ `
varying vec3 vWp;
varying vec3 vWn;
`;
const VERT_MAIN = /* glsl */ `
vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWn = normalize(mat3(modelMatrix) * objectNormal);
`;

const GRADE = /* glsl */ `
{
  vec3 c = uMean + (diffuseColor.rgb - uMean) * uContrast;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = max(mix(vec3(l), c, uSat), 0.0) * uTint;
}
`;

const AO = /* glsl */ `
{
  vec3 nnA = normalize(vWn) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 qA = vWp + nnA * 0.03;
  float rao = roomAO(vWp, nnA, roomOf(qA));
  reflectedLight.indirectDiffuse *= rao;
  reflectedLight.indirectSpecular *= rao;
  reflectedLight.directDiffuse *= mix(1.0, rao, 0.35);
}
`;

const INKMIX = /* glsl */ `
{
  vec3 nnI = normalize(vWn) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 qI = vWp + nnI * 0.03;
  float ink = inkOf(qI, roomOf(qI));
  if (uGlass > 0.5) {
    gl_FragColor.a *= (1.0 - ink);
  } else if (uBackInk > 0.5 && !gl_FrontFacing) {
    gl_FragColor.rgb = uInkCol;
  } else {
    vec3 wash = uPaper * (1.0 - uInkTone * (abs(nnI.x) + 0.55 * abs(nnI.z)));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, wash, ink);
  }
}
`;

export function inkAware(material, { backInk = false, glass = false, sat = 1, tint = [1, 1, 1], mean = [0.5, 0.5, 0.5], contrast = 1, ao = 0.24 } = {}) {
  material.side = THREE.DoubleSide;
  material.clippingPlanes = [CUT];
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 1;
  const own = {
    uBackInk: { value: backInk ? 1 : 0 },
    uGlass: { value: glass ? 1 : 0 },
    uSat: { value: sat },
    uTint: { value: new THREE.Vector3(...tint) },
    uMean: { value: new THREE.Vector3(...mean) },
    uContrast: { value: contrast },
    uAO: { value: ao },
  };
  material.userData.ink = own;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, own);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_DECL)
      .replace('#include <fog_vertex>', '#include <fog_vertex>\n' + VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + DECL)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + GRADE)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + AO)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + INKMIX);
  };
  material.customProgramCacheKey = () => 'ink' + (backInk ? 'B' : '') + (glass ? 'G' : '');
  return material;
}

export function contactShadowMaterial(strength = 0.45) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: { ...U, uStrength: { value: strength }, uBackInk: { value: 0 }, uGlass: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uMean: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, uContrast: { value: 1 }, uAO: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vWp; varying vec3 vWn; varying vec2 vUv;
      void main() {
        vUv = uv;
        vWp = (modelMatrix * vec4(position, 1.0)).xyz;
        vWn = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWp, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${DECL}
      varying vec2 vUv;
      uniform float uStrength;
      void main() {
        vec3 q = vWp + normalize(vWn) * 0.03;
        float ink = inkOf(q, roomOf(q));
        vec2 e = smoothstep(vec2(0.0), vec2(0.5), vUv) * smoothstep(vec2(0.0), vec2(0.5), 1.0 - vUv);
        float a = e.x * e.y;
        gl_FragColor = vec4(0.05, 0.035, 0.02, a * a * uStrength * (1.0 - ink));
      }`,
  });
}

// ---- textures ----------------------------------------------------------
const loader = new THREE.TextureLoader();
const pending = [];
let maxAniso = 8;
export const setAnisotropy = (n) => (maxAniso = n);

function tex(file, { srgb = false, size = 1, rot = 0 } = {}) {
  const t = new THREE.Texture();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / size, 1 / size);
  t.rotation = rot;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  pending.push(
    loader.loadAsync('assets/textures/' + file).then((src) => {
      t.image = src.image;
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
    })
  );
  return t;
}
export const texturesReady = () => Promise.all(pending);

// Procedural architectural tile joint normal map (1 tile unit = `tileSize` metres)
function tileNormalTexture({ tileSize = 0.6, nx = 2, ny = 2, groutPx = 3, strength = 0.35 } = {}) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(128,128,255)';
  g.fillRect(0, 0, S, S);
  const dx = S / nx, dy = S / ny;
  const bevel = Math.max(2, groutPx);
  for (let i = 0; i < nx; i++) {
    const x = Math.round(i * dx);
    // left slope (-x) and right slope (+x)
    g.fillStyle = `rgb(${Math.round(128 - 90 * strength)},128,240)`;
    g.fillRect(x, 0, bevel, S);
    g.fillStyle = `rgb(${Math.round(128 + 90 * strength)},128,240)`;
    g.fillRect((x + S - bevel) % S, 0, bevel, S);
  }
  for (let j = 0; j < ny; j++) {
    const y = Math.round(j * dy);
    g.fillStyle = `rgb(128,${Math.round(128 - 90 * strength)},240)`;
    g.fillRect(0, y, S, bevel);
    g.fillStyle = `rgb(128,${Math.round(128 + 90 * strength)},240)`;
    g.fillRect(0, (y + S - bevel) % S, S, bevel);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / (tileSize * nx), 1 / (tileSize * ny));
  t.anisotropy = maxAniso;
  return t;
}

function pbr(name, { size = 1, rot = 0, diff = '_diff_1k.jpg', nor = '_nor_gl_1k.jpg', rough = '_rough_1k.jpg', normalScale = 1, roughness = 1, metalness = 0, ...ink } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex(name + diff, { srgb: true, size, rot }),
    normalMap: nor ? tex(name + nor, { size, rot }) : null,
    roughnessMap: rough ? tex(name + rough, { size, rot }) : null,
    roughness,
    metalness,
  });
  m.normalScale.set(normalScale, normalScale);
  return inkAware(m, ink);
}

const flat = (color, { roughness = 0.8, metalness = 0, emissive = 0x000000, emissiveIntensity = 1, ...ink } = {}) =>
  inkAware(new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity }), ink);

export function makeMaterials() {
  const M = {};
  const PLASTER = [0.44, 0.39, 0.34], LIME = [0.445, 0.33, 0.195], OAKC = [0.28, 0.19, 0.125], HIDE = [0.084, 0.026, 0.006];

  // Reception, dining, corridor: warm honed cream-beige marble
  M.floor = pbr('marble_01', { size: 2.2, diff: '_diff_2k.jpg', nor: '_nor_gl_2k.jpg', normalScale: 0.48, roughness: 0.34, mean: LIME, contrast: 0.95, sat: 0.45, tint: [1.38, 1.34, 1.25], backInk: true });

  // Bedrooms & dressing: warm white oak parquet flooring
  M.woodFloor = pbr('white_oak_veneer', { size: 1.35, diff: '_diff_2k.jpg', normalScale: 0.5, roughness: 0.56, mean: OAKC, contrast: 0.95, sat: 0.9, tint: [1.32, 1.24, 1.12], backInk: true });

  // Kitchen & utility/services: cool warm-grey honed porcelain stone tiles
  M.tileKitchen = pbr('marble_01', { size: 1.6, diff: '_diff_2k.jpg', nor: null, normalScale: 0.65, roughness: 0.44, mean: LIME, contrast: 0.72, sat: 0.16, tint: [1.14, 1.16, 1.18], backInk: true });
  M.tileKitchen.normalMap = tileNormalTexture({ tileSize: 0.6, nx: 2, ny: 2, groutPx: 3, strength: 0.45 });

  // Bathrooms: warm sand-travertine ceramic tile
  M.tileBath = pbr('plastered_wall', { size: 1.5, nor: null, normalScale: 0.58, roughness: 0.4, mean: PLASTER, contrast: 0.62, sat: 0.32, tint: [1.62, 1.56, 1.46], backInk: true });
  M.tileBath.normalMap = tileNormalTexture({ tileSize: 0.45, nx: 2, ny: 2, groutPx: 3, strength: 0.4 });

  // Balconies: matte sandstone terrace paving
  M.tileBalcony = pbr('plastered_wall', { size: 1.8, nor: null, normalScale: 0.7, roughness: 0.78, mean: PLASTER, contrast: 0.76, sat: 0.48, tint: [1.44, 1.36, 1.24], backInk: true });
  M.tileBalcony.normalMap = tileNormalTexture({ tileSize: 0.5, nx: 2, ny: 2, groutPx: 4, strength: 0.55 });

  // Walls & ceilings: warm architectural lime-plaster
  M.plaster = pbr('plastered_wall', { size: 3.0, normalScale: 0.08, roughness: 0.92, mean: PLASTER, contrast: 0.4, sat: 0.28, tint: [1.86, 1.83, 1.77], backInk: true });
  M.ceiling = flat(0xeae6dd, { roughness: 0.96, backInk: true });

  // Architectural stone accents (balcony coping, sills, vanity tops)
  M.stone = pbr('plastered_wall', { size: 1.4, normalScale: 0.12, roughness: 0.52, mean: PLASTER, contrast: 0.75, sat: 0.58, tint: [1.48, 1.42, 1.28], backInk: true });

  // Kitchen dark granite / emperador countertop
  M.countertop = pbr('marble_01', { size: 1.4, diff: '_diff_2k.jpg', nor: '_nor_gl_2k.jpg', normalScale: 0.25, roughness: 0.24, mean: LIME, contrast: 1.0, sat: 0.25, tint: [0.36, 0.35, 0.34] });

  // Natural oak joinery (doors, cabinetry, dining table, bed frames, wardrobes)
  const OAK = { diff: '_diff_2k.jpg', normalScale: 0.48, roughness: 0.72, mean: OAKC };
  M.oak = pbr('white_oak_veneer', { ...OAK, size: 1.1, sat: 0.92, tint: [1.46, 1.40, 1.30], backInk: true });
  M.oakDoor = pbr('white_oak_veneer', { ...OAK, size: 1.05, sat: 0.92, tint: [1.18, 1.10, 1.00], backInk: true });
  M.oakLong = pbr('white_oak_veneer', { ...OAK, size: 1.05, rot: Math.PI / 2, sat: 0.92, tint: [1.38, 1.32, 1.22] });

  // Leather & Upholstery
  M.leather = pbr('brown_leather', { size: 0.7, diff: '_albedo_1k.jpg', normalScale: 0.7, roughness: 0.64, mean: HIDE, sat: 0.58, tint: [4.2, 4.1, 3.2] });
  M.fabricSofa = pbr('plastered_wall', { size: 0.9, normalScale: 0.18, roughness: 0.9, mean: PLASTER, contrast: 0.32, sat: 0.22, tint: [1.72, 1.68, 1.60] });
  M.fabricBed = pbr('plastered_wall', { size: 1.0, normalScale: 0.14, roughness: 0.88, mean: PLASTER, contrast: 0.25, sat: 0.16, tint: [1.88, 1.86, 1.82] });
  M.fabricAccent = flat(0x9a8c7b, { roughness: 0.88 });
  M.rug = pbr('plastered_wall', { size: 1.2, normalScale: 0.22, roughness: 0.95, mean: PLASTER, contrast: 0.4, sat: 0.2, tint: [1.46, 1.42, 1.35] });

  // Metals, Sanitary, Plants, Glass
  M.bronze = flat(0x4b4036, { roughness: 0.36, metalness: 0.88 });
  M.chrome = flat(0xd9dde0, { roughness: 0.22, metalness: 0.92 });
  M.sanitary = flat(0xf6f5f1, { roughness: 0.16, metalness: 0.02 });
  M.appliance = flat(0xcfd3d6, { roughness: 0.32, metalness: 0.78 });
  M.stoveTop = flat(0x222327, { roughness: 0.28, metalness: 0.35 });
  M.foliage = flat(0x4c6642, { roughness: 0.78 });
  M.terracotta = flat(0x9d644c, { roughness: 0.84 });
  M.lamp = flat(0xfff1dc, { roughness: 0.4, emissive: 0xffd9a8, emissiveIntensity: 3.2 });
  M.generic = flat(0xd8d2c6, { roughness: 0.9 });

  M.glass = inkAware(
    new THREE.MeshPhysicalMaterial({ color: 0xdce8ea, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.2 }),
    { glass: true, ao: 0 }
  );
  M.glass.polygonOffset = false;

  return M;
}
