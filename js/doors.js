// Interactive Animated Door System (Hinged Walnut Doors + Glazed Terrace Sliding Doors)
// Syncs live collider AABBs with CollisionWorld and opens smoothly on proximity or click.

import * as THREE from 'three';
import { CONFIG, DOORS } from './plan.js';

const DEG = Math.PI / 180;

function makeHingedDoorMesh(d, mats, planes, idx) {
  const pivot = new THREE.Group();
  pivot.position.set(d.x, 0.01, -d.n);

  const dh = CONFIG.doorHeight - 0.03;
  const leafT = 0.044;

  // Material wrapper preserving shared material while respecting room sweep planes
  const cloneMat = (base) => {
    const m = base.clone();
    m.clippingPlanes = planes;
    return m;
  };

  if (d.glazed) {
    const bronze = cloneMat(mats.bronze);
    const glass = cloneMat(mats.glass);
    // Stiles & rails + glass pane
    const addPart = (geo, mat, px, py, pz) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.doorIndex = idx;
      pivot.add(mesh);
      return mesh;
    };
    const stileW = 0.07;
    addPart(new THREE.BoxGeometry(stileW, dh, leafT), bronze, stileW / 2, dh / 2, 0);
    addPart(new THREE.BoxGeometry(stileW, dh, leafT), bronze, d.w - stileW / 2, dh / 2, 0);
    addPart(new THREE.BoxGeometry(d.w - stileW * 2, 0.14, leafT), bronze, d.w / 2, 0.07, 0);
    addPart(new THREE.BoxGeometry(d.w - stileW * 2, 0.09, leafT), bronze, d.w / 2, dh - 0.045, 0);
    addPart(new THREE.BoxGeometry(d.w - stileW * 2, dh - 0.23, 0.016), glass, d.w / 2, dh / 2 + 0.025, 0);
    // Lever handle on both sides
    for (const s of [-1, 1]) {
      addPart(new THREE.BoxGeometry(0.11, 0.022, 0.022), bronze, d.w - 0.10, 1.02, s * (leafT / 2 + 0.018));
    }
  } else {
    const wood = cloneMat(mats.oakDoor);
    const bronze = cloneMat(mats.bronze);
    const body = new THREE.Mesh(new THREE.BoxGeometry(d.w, dh, leafT), wood);
    body.position.set(d.w / 2, dh / 2, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.doorIndex = idx;
    pivot.add(body);

    // Architectural brass/bronze lever handle both sides
    for (const s of [-1, 1]) {
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 12), bronze);
      rose.rotation.x = Math.PI / 2;
      rose.position.set(d.w - 0.08, 1.02, s * (leafT / 2 + 0.005));
      rose.userData.doorIndex = idx;
      pivot.add(rose);

      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.02, 0.018), bronze);
      lever.position.set(d.w - 0.12, 1.02, s * (leafT / 2 + 0.024));
      lever.userData.doorIndex = idx;
      pivot.add(lever);
    }
  }

  return pivot;
}

function makeSlidingDoorMesh(d, mats, planes, idx) {
  const group = new THREE.Group();
  group.position.set(d.x, 0.01, -d.n);

  const dh = 2.34;
  const leafT = 0.048;
  const bronze = mats.bronze.clone();
  bronze.clippingPlanes = planes;
  const glass = mats.glass.clone();
  glass.clippingPlanes = planes;

  const addPart = (geo, mat, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.doorIndex = idx;
    group.add(m);
  };

  const fw = 0.065;
  addPart(new THREE.BoxGeometry(fw, dh, leafT), bronze, fw / 2, dh / 2, 0);
  addPart(new THREE.BoxGeometry(fw, dh, leafT), bronze, d.w - fw / 2, dh / 2, 0);
  addPart(new THREE.BoxGeometry(d.w - fw * 2, 0.08, leafT), bronze, d.w / 2, 0.04, 0);
  addPart(new THREE.BoxGeometry(d.w - fw * 2, 0.07, leafT), bronze, d.w / 2, dh - 0.035, 0);
  addPart(new THREE.BoxGeometry(d.w - fw * 2, dh - 0.15, 0.018), glass, d.w / 2, dh / 2, 0);

  // Tall vertical pull bar on center meeting stile
  const pullX = d.slideDx < 0 ? d.w - 0.08 : 0.08;
  for (const s of [-1, 1]) {
    addPart(new THREE.CylinderGeometry(0.011, 0.011, 0.62, 10), bronze, pullX, 1.15, s * (leafT / 2 + 0.03));
  }

  return group;
}

export function createDoorSystem(mats, planesFor, collisionWorld) {
  const root = new THREE.Group();
  const entries = [];
  const pickMeshes = [];

  DOORS.forEach((spec, idx) => {
    const planes = planesFor(spec.room, true);
    const obj =
      spec.type === 'sliding'
        ? makeSlidingDoorMesh(spec, mats, planes, idx)
        : makeHingedDoorMesh(spec, mats, planes, idx);
    root.add(obj);
    obj.traverse((c) => {
      if (c.isMesh) pickMeshes.push(c);
    });

    // Compute closed-state center in world XZ for proximity trigger + collider
    let closedCx, closedCn, boxClosed;
    if (spec.type === 'sliding') {
      closedCx = spec.x + spec.w / 2;
      closedCn = spec.n;
      boxClosed = [spec.x, spec.n - 0.06, spec.x + spec.w, spec.n + 0.06];
    } else {
      const ca = spec.closed * DEG;
      const dx = Math.cos(ca) * spec.w;
      const dn = Math.sin(ca) * spec.w;
      closedCx = spec.x + dx / 2;
      closedCn = spec.n + dn / 2;
      boxClosed = [
        Math.min(spec.x, spec.x + dx) - 0.04,
        Math.min(spec.n, spec.n + dn) - 0.04,
        Math.max(spec.x, spec.x + dx) + 0.04,
        Math.max(spec.n, spec.n + dn) + 0.04,
      ];
    }

    entries.push({
      spec,
      obj,
      closedCx,
      closedCz: -closedCn,
      boxClosed,
      progress: 1, // start open for initial plan/iso inspection
      target: 1,
      manualOverride: null, // null | 'open' | 'closed'
      overrideTimer: 0,
    });
  });

  function applyPose(e) {
    const { spec, obj, progress } = e;
    if (spec.type === 'sliding') {
      obj.position.set(spec.x + spec.slideDx * progress, 0.01, -spec.n - spec.slideDn * progress);
    } else {
      const a = spec.closed + (spec.open - spec.closed) * progress;
      obj.rotation.y = a * DEG;
    }
  }

  function syncCollision(mode) {
    if (!collisionWorld) return;
    if (mode !== 'fp') {
      collisionWorld.setDynamicObstacles([]);
      return;
    }
    const blocked = [];
    for (const e of entries) {
      if (e.progress < 0.45) blocked.push(e.boxClosed);
    }
    collisionWorld.setDynamicObstacles(blocked);
  }

  function toggleByIndex(idx) {
    const e = entries[idx];
    if (!e) return null;
    const isCurrentlyOpen = e.progress > 0.5;
    e.manualOverride = isCurrentlyOpen ? 'closed' : 'open';
    e.overrideTimer = 8.0;
    return { id: e.spec.id, open: !isCurrentlyOpen };
  }

  function update(camPos, dt = 1 / 60, mode = 'tour') {
    const step = Math.min(1, dt * 5.2);
    for (const e of entries) {
      if (e.overrideTimer > 0) {
        e.overrideTimer -= dt;
        if (e.overrideTimer <= 0) e.manualOverride = null;
      }

      if (e.manualOverride === 'open') {
        e.target = 1;
      } else if (e.manualOverride === 'closed') {
        e.target = 0;
      } else if (mode === 'sheet' || mode === 'top' || mode === 'iso' || mode === 'orbit') {
        e.target = 1;
      } else {
        // Scroll Tour & First-Person: stay neatly closed when far, smoothly swing/slide open on approach
        const dist = camPos ? Math.hypot(camPos.x - e.closedCx, camPos.z - e.closedCz) : 99;
        const trigR = e.spec.type === 'sliding' ? 3.1 : 2.25;
        e.target = dist < trigR ? 1 : 0;
      }

      if (Math.abs(e.progress - e.target) > 0.001) {
        e.progress += (e.target - e.progress) * step;
      } else {
        e.progress = e.target;
      }
      applyPose(e);
    }
    syncCollision(mode);
  }

  // Initialize poses once
  entries.forEach(applyPose);

  return {
    group: root,
    pickMeshes,
    update,
    toggleByIndex,
    getState: () => entries.map((e) => ({ id: e.spec.id, progress: +e.progress.toFixed(2), target: e.target })),
  };
}
