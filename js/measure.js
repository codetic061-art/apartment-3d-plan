// Interactive Architectural Wall Measurement Tool
//
// When active:
//   - Click any wall in 3D Orbit, Isometric, Top Plan, or First-Person view
//   - Renders 3D green architectural dimension lines (horizontal length + vertical height)
//     and extension ticks anchored to the selected wall face
//   - Shows a floating readout badge distinguishing verified vs modeled vs assumed* values

import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { CONFIG } from './plan.js';

const GREEN = 0x00b84c;

export function createMeasureTool(scene, camera, canvas, pickMeshes, wallSegments) {
  let active = false;
  let selectedWall = null;
  const overlayGroup = new THREE.Group();
  overlayGroup.visible = false;
  scene.add(overlayGroup);

  const badge = document.getElementById('measure-badge');
  const badgeTitle = document.getElementById('measure-wall-title');
  const badgeLen = document.getElementById('measure-wall-len');
  const badgeHeight = document.getElementById('measure-wall-height');
  const badgeThick = document.getElementById('measure-wall-thick');
  const badgeNote = document.getElementById('measure-wall-note');

  const lineMat = new LineMaterial({
    color: GREEN,
    linewidth: 2.2,
    worldUnits: false,
    toneMapped: false,
    depthTest: false,
    transparent: true,
    opacity: 0.96,
  });

  function clearOverlay() {
    while (overlayGroup.children.length > 0) {
      const ch = overlayGroup.children[0];
      overlayGroup.remove(ch);
      ch.geometry?.dispose();
    }
  }

  function addSegs(positions) {
    const g = new LineSegmentsGeometry();
    g.setPositions(positions);
    const l = new LineSegments2(g, lineMat);
    l.renderOrder = 10;
    l.frustumCulled = false;
    overlayGroup.add(l);
  }

  function findWallForPoint(px, py, pz, normal) {
    const n = -pz;
    let best = null;
    let bestScore = Infinity;
    for (const w of wallSegments) {
      // Check horizontal wall vs vertical wall alignment with normal if available
      const dx = Math.max(w.x0 - px, 0, px - w.x1);
      const dn = Math.max(w.n0 - n, 0, n - w.n1);
      const dist = Math.hypot(dx, dn);
      if (dist < 0.18) {
        let axisBonus = 0;
        if (normal) {
          if (w.axis === 'x' && Math.abs(normal.z) > 0.5) axisBonus = -0.08;
          if (w.axis === 'n' && Math.abs(normal.x) > 0.5) axisBonus = -0.08;
        }
        const score = dist + axisBonus;
        if (score < bestScore) {
          bestScore = score;
          best = w;
        }
      }
    }
    return best;
  }

  function displayWall(w, hitPoint = null, hitNormal = null) {
    selectedWall = w;
    clearOverlay();
    if (!w) {
      overlayGroup.visible = false;
      if (badge) badge.classList.remove('on');
      return;
    }

    const pos = [];
    const push = (ax, ay, az, bx, by, bz) => pos.push(ax, ay, az, bx, by, bz);

    // Wall bounding outline
    const z0 = -w.n1;
    const z1 = -w.n0;
    const y0 = w.y0;
    const y1 = w.y1;
    const corners = [
      [w.x0, y0, z0], [w.x1, y0, z0], [w.x1, y0, z1], [w.x0, y0, z1],
      [w.x0, y1, z0], [w.x1, y1, z0], [w.x1, y1, z1], [w.x0, y1, z1],
    ];
    for (const [a, b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]) {
      push(...corners[a], ...corners[b]);
    }

    // Horizontal & Vertical architectural dimension arrows offset onto the clicked face
    const off = 0.22;
    const dimY = Math.min(2.45, Math.max(1.25, hitPoint ? hitPoint.y : 1.45));
    const arr = 0.14;

    if (w.axis === 'x') {
      const sideSign = hitNormal && hitNormal.z < 0 ? -1 : 1;
      const zBase = sideSign > 0 ? z1 : z0;
      const zDim = zBase + sideSign * off;
      // Horizontal line + extension lines + arrows
      push(w.x0, dimY, zDim, w.x1, dimY, zDim);
      push(w.x0, dimY, zBase, w.x0, dimY, zDim + sideSign * 0.08);
      push(w.x1, dimY, zBase, w.x1, dimY, zDim + sideSign * 0.08);
      push(w.x0, dimY, zDim, w.x0 + arr, dimY + arr * 0.45, zDim);
      push(w.x0, dimY, zDim, w.x0 + arr, dimY - arr * 0.45, zDim);
      push(w.x1, dimY, zDim, w.x1 - arr, dimY + arr * 0.45, zDim);
      push(w.x1, dimY, zDim, w.x1 - arr, dimY - arr * 0.45, zDim);

      // Vertical height line at wall midpoint or clicked X
      const vx = hitPoint ? Math.max(w.x0 + 0.2, Math.min(w.x1 - 0.2, hitPoint.x)) : (w.x0 + w.x1) / 2;
      const zv = zBase + sideSign * (off + 0.16);
      push(vx, y0, zv, vx, y1, zv);
      push(vx, y0, zBase, vx, y0, zv + sideSign * 0.06);
      push(vx, y1, zBase, vx, y1, zv + sideSign * 0.06);
      push(vx, y0, zv, vx - arr * 0.45, y0 + arr, zv);
      push(vx, y0, zv, vx + arr * 0.45, y0 + arr, zv);
      push(vx, y1, zv, vx - arr * 0.45, y1 - arr, zv);
      push(vx, y1, zv, vx + arr * 0.45, y1 - arr, zv);
    } else {
      const sideSign = hitNormal && hitNormal.x < 0 ? -1 : 1;
      const xBase = sideSign > 0 ? w.x1 : w.x0;
      const xDim = xBase + sideSign * off;
      // Horizontal line along Z + extension lines + arrows
      push(xDim, dimY, z0, xDim, dimY, z1);
      push(xBase, dimY, z0, xDim + sideSign * 0.08, dimY, z0);
      push(xBase, dimY, z1, xDim + sideSign * 0.08, dimY, z1);
      push(xDim, dimY, z0, xDim, dimY + arr * 0.45, z0 + arr);
      push(xDim, dimY, z0, xDim, dimY - arr * 0.45, z0 + arr);
      push(xDim, dimY, z1, xDim, dimY + arr * 0.45, z1 - arr);
      push(xDim, dimY, z1, xDim, dimY - arr * 0.45, z1 - arr);

      // Vertical height line
      const vz = hitPoint ? Math.max(z0 + 0.2, Math.min(z1 - 0.2, hitPoint.z)) : (z0 + z1) / 2;
      const xv = xBase + sideSign * (off + 0.16);
      push(xv, y0, vz, xv, y1, vz);
      push(xBase, y0, vz, xv + sideSign * 0.06, y0, vz);
      push(xBase, y1, vz, xv + sideSign * 0.06, y1, vz);
      push(xv, y0, vz, xv, y0 + arr, vz - arr * 0.45);
      push(xv, y0, vz, xv, y0 + arr, vz + arr * 0.45);
      push(xv, y1, vz, xv, y1 - arr, vz - arr * 0.45);
      push(xv, y1, vz, xv, y1 - arr, vz + arr * 0.45);
    }

    addSegs(pos);
    overlayGroup.visible = true;

    if (badge) {
      badgeTitle.textContent = w.label;
      badgeLen.textContent = `${w.length.toFixed(2)} m`;
      badgeHeight.textContent = `${CONFIG.wallHeight.toFixed(2)} m*`;
      badgeThick.textContent = `${w.thickness.toFixed(2)} m*`;
      badgeNote.textContent = w.verifiedLen
        ? 'Length aligns with floor plan envelope; *wall height & thickness are configurable defaults.'
        : 'Length calculated from modeled geometry; *wall height & thickness are configurable defaults.';
      badge.classList.add('on');
    }
  }

  const raycaster = new THREE.Raycaster();
  let downPos = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    downPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!active || !downPos) return;
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (moved > 6) return; // Ignore orbit drags
    pickAtClientXY(e.clientX, e.clientY);
  });

  function pickAtClientXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickMeshes, false);
    for (const h of hits) {
      if (h.point.y < 0.02 || h.point.y > CONFIG.wallHeight + 0.05) continue;
      if (h.face && Math.abs(h.face.normal.y) > 0.65) continue; // skip floor/top caps
      const wall = findWallForPoint(h.point.x, h.point.y, h.point.z, h.face?.normal);
      if (wall) {
        displayWall(wall, h.point, h.face?.normal);
        return wall;
      }
    }
    return null;
  }

  function setActive(flag) {
    active = Boolean(flag);
    canvas.dataset.measuring = active ? '1' : '0';
    if (!active) {
      clearOverlay();
      overlayGroup.visible = false;
      selectedWall = null;
      if (badge) badge.classList.remove('on');
    } else if (!selectedWall && badge) {
      badgeTitle.textContent = 'Select any wall to measure';
      badgeLen.textContent = '—';
      badgeHeight.textContent = `${CONFIG.wallHeight.toFixed(2)} m*`;
      badgeThick.textContent = '—';
      badgeNote.textContent = 'Click any exterior or interior wall. *Height & thickness are assumed defaults.';
      badge.classList.add('on');
    }
  }

  function selectWallByIndex(idx) {
    const w = wallSegments[idx];
    if (w) displayWall(w, null, null);
    return w;
  }

  return {
    isActive: () => active,
    setActive,
    getSelected: () => selectedWall,
    selectWallByIndex,
    pickAtClientXY,
    resize: (w, h) => lineMat.resolution?.set(w, h),
  };
}
