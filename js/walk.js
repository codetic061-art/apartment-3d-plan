// First-Person Walkthrough Controller & Apartment Collision World
//
// Features:
//   - Capsule/circle-vs-AABB sub-stepped collision with smooth wall sliding
//   - Doorway carving from actual modeled floor-level openings (walkable doors)
//   - Curved front balcony containment (elliptical parapet bounds)
//   - Furniture & bathroom fixture collision
//   - Desktop: WASD / Arrow keys + Pointer Lock (or click-drag fallback) + ESC
//   - Mobile: On-screen virtual joystick (#fp-joystick) + canvas touch look

import { CONFIG, BALCONIES, ROOMS } from './plan.js';

function subtractRect(box, hole) {
  const [x0, n0, x1, n1] = box;
  const [hx0, hn0, hx1, hn1] = hole;
  // No overlap -> keep intact
  if (hx1 <= x0 + 0.001 || hx0 >= x1 - 0.001 || hn1 <= n0 + 0.001 || hn0 >= n1 - 0.001) {
    return [box];
  }
  const out = [];
  // Horizontal wall (along X) split along X if hole spans its N thickness
  if (x1 - x0 >= n1 - n0) {
    if (hx0 > x0 + 0.01) out.push([x0, n0, Math.min(x1, hx0), n1]);
    if (hx1 < x1 - 0.01) out.push([Math.max(x0, hx1), n0, x1, n1]);
  } else {
    // Vertical wall (along N) split along N
    if (hn0 > n0 + 0.01) out.push([x0, n0, x1, Math.min(n1, hn0)]);
    if (hn1 < n1 - 0.01) out.push([x0, Math.max(n0, hn1), x1, n1]);
  }
  return out;
}

export class CollisionWorld {
  constructor(wallSegments, doorCarves, obstacles) {
    let walls = wallSegments.map((w) => [w.x0, w.n0, w.x1, w.n1]);
    for (const carve of doorCarves) {
      const next = [];
      for (const b of walls) next.push(...subtractRect(b, carve));
      walls = next;
    }
    // Store colliders in Three.js XZ coordinates: [x0, z0, x1, z1] where z = -n
    this.colliders = [...walls, ...obstacles].map(([x0, n0, x1, n1]) => ({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      z0: -Math.max(n0, n1),
      z1: -Math.min(n0, n1),
    }));
    this.dynamicColliders = [];
  }

  setDynamicObstacles(boxes = []) {
    this.dynamicColliders = boxes.map(([x0, n0, x1, n1]) => ({
      x0: Math.min(x0, x1),
      x1: Math.max(x0, x1),
      z0: -Math.max(n0, n1),
      z1: -Math.min(n0, n1),
    }));
  }

  _pushOut(x, z, r) {
    let px = x;
    let pz = z;

    // 1. Resolve circle vs every wall, furniture & closed-door AABB
    const active = this.dynamicColliders.length ? [...this.colliders, ...this.dynamicColliders] : this.colliders;
    for (let iter = 0; iter < 3; iter++) {
      for (const b of active) {
        const cx = Math.max(b.x0, Math.min(px, b.x1));
        const cz = Math.max(b.z0, Math.min(pz, b.z1));
        const dx = px - cx;
        const dz = pz - cz;
        const distSq = dx * dx + dz * dz;
        if (distSq < r * r) {
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            const push = r - dist;
            px += (dx / dist) * push;
            pz += (dz / dist) * push;
          } else {
            // Inside AABB: push out along minimum penetration axis
            const dL = px - b.x0;
            const dR = b.x1 - px;
            const dT = pz - b.z0;
            const dB = b.z1 - pz;
            const m = Math.min(dL, dR, dT, dB);
            if (m === dL) px = b.x0 - r;
            else if (m === dR) px = b.x1 + r;
            else if (m === dT) pz = b.z0 - r;
            else pz = b.z1 + r;
          }
        }
      }
    }

    // 2. Enforce exterior perimeter (10.00 x 17.00 m) & curved balcony boundaries
    px = Math.max(-4.80 + r, Math.min(4.80 - r, px));
    pz = Math.max(-14.35 + r, pz);

    const n = -pz;
    if (n < 0.0) {
      const isCenter = Math.abs(px) < 1.15 && n > -1.52;
      const B = isCenter ? BALCONIES.center : (px < 0 ? BALCONIES.left : BALCONIES.right);
      const pad = isCenter ? 0.14 : 0.22;
      const rxMax = Math.max(0.3, B.rx - pad - r);
      const rnMax = Math.max(0.3, B.rn - pad - r);
      const ex = (px - B.cx) / rxMax;
      const en = (n - B.cn) / rnMax;
      const mag = Math.hypot(ex, en);
      if (mag > 1.0) {
        px = B.cx + (ex / mag) * rxMax;
        pz = -(B.cn + (en / mag) * rnMax);
      }
      if (pz > 2.40) pz = 2.40;
    }

    return [px, pz];
  }

  resolvePosition(prevX, prevZ, targetX, targetZ, r = 0.19) {
    const dist = Math.hypot(targetX - prevX, targetZ - prevZ);
    const steps = Math.max(1, Math.ceil(dist / 0.04));
    let cx = prevX;
    let cz = prevZ;
    const stepX = (targetX - prevX) / steps;
    const stepZ = (targetZ - prevZ) / steps;

    for (let i = 0; i < steps; i++) {
      // Independent X then Z pass produces smooth wall sliding
      [cx, cz] = this._pushOut(cx + stepX, cz, r);
      [cx, cz] = this._pushOut(cx, cz + stepZ, r);
    }
    return [cx, cz];
  }
}

export class FirstPersonController {
  constructor(camera, canvas, collisionWorld) {
    this.camera = camera;
    this.canvas = canvas;
    this.world = collisionWorld;
    this.enabled = false;
    this.radius = 0.19;
    this.maxSpeed = 2.6;
    this.accel = 18.0;
    this.damping = 10.0;

    this.pos = { x: -1.25, y: CONFIG.eyeHeight, z: -1.15 };
    this.vel = { x: 0, z: 0 };
    this.yaw = 0.25;
    this.pitch = -0.04;
    this.keys = new Set();
    this.joyVec = { x: 0, y: 0 };
    this.dragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.touchLookId = null;
    this.lastTouch = { x: 0, y: 0 };
    this.pointerLocked = false;

    this._bindEvents();
  }

  spawnAt(x, n, yaw = 0, pitch = -0.04) {
    const [sx, sz] = this.world.resolvePosition(x, -n, x, -n, this.radius);
    this.pos.x = sx;
    this.pos.y = CONFIG.eyeHeight;
    this.pos.z = sz;
    this.vel.x = 0;
    this.vel.z = 0;
    this.yaw = yaw;
    this.pitch = pitch;
    this.applyToCamera();
  }

  spawnInRoom(roomKey) {
    const rm = ROOMS.find((r) => r.key === roomKey) || ROOMS.find((r) => r.key === 'reception');
    if (rm && rm.spawn) this.spawnAt(rm.spawn[0], rm.spawn[1], rm.spawn[2]);
  }

  enable(roomKey = null) {
    this.enabled = true;
    this.keys.clear();
    this.joyVec = { x: 0, y: 0 };
    if (roomKey && roomKey !== 'all') this.spawnInRoom(roomKey);
    else this.spawnInRoom('reception');
    this.camera.fov = 62;
    this.camera.near = 0.08;
    this.camera.far = 220;
    this.camera.updateProjectionMatrix();
    this.applyToCamera();
  }

  disable() {
    this.enabled = false;
    this.keys.clear();
    this.joyVec = { x: 0, y: 0 };
    this.dragging = false;
    this.touchLookId = null;
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
  }

  applyToCamera() {
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  step(dtRaw, skipLookUpdate = false) {
    if (!this.enabled) return;
    const dt = Math.min(0.05, Math.max(0.001, dtRaw));

    let fwd = this.joyVec.y;
    let strafe = this.joyVec.x;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    const len = Math.hypot(fwd, strafe);
    if (len > 1) {
      fwd /= len;
      strafe /= len;
    }

    // Camera forward in XZ plane for YXZ yaw: (-sin(yaw), -cos(yaw))
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const dirX = -sinY * fwd + cosY * strafe;
    const dirZ = -cosY * fwd - sinY * strafe;

    if (len > 0.01) {
      this.vel.x += dirX * this.accel * dt;
      this.vel.z += dirZ * this.accel * dt;
      const spd = Math.hypot(this.vel.x, this.vel.z);
      if (spd > this.maxSpeed) {
        this.vel.x = (this.vel.x / spd) * this.maxSpeed;
        this.vel.z = (this.vel.z / spd) * this.maxSpeed;
      }
    } else {
      const damp = Math.exp(-this.damping * dt);
      this.vel.x *= damp;
      this.vel.z *= damp;
      if (Math.hypot(this.vel.x, this.vel.z) < 0.01) {
        this.vel.x = 0;
        this.vel.z = 0;
      }
    }

    const nextX = this.pos.x + this.vel.x * dt;
    const nextZ = this.pos.z + this.vel.z * dt;
    const [rx, rz] = this.world.resolvePosition(this.pos.x, this.pos.z, nextX, nextZ, this.radius);

    // Zero velocity components killed by collision
    if (Math.abs(rx - nextX) > 1e-4) this.vel.x = 0;
    if (Math.abs(rz - nextZ) > 1e-4) this.vel.z = 0;

    this.pos.x = rx;
    this.pos.z = rz;
    this.pos.y = CONFIG.eyeHeight;

    if (!skipLookUpdate) this.applyToCamera();
  }

  _rotateLook(dx, dy) {
    const sens = 0.0024;
    this.yaw -= dx * sens;
    this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch - dy * sens));
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        this.keys.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      const hint = document.getElementById('fp-hint');
      if (hint) hint.classList.toggle('locked', this.pointerLocked);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || e.button !== 0) return;
      // Don't hijack clicks when measurement tool is active
      if (this.canvas.dataset.measuring === '1') return;
      this.dragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('dblclick', () => {
      if (!this.enabled || this.canvas.dataset.measuring === '1') return;
      if (!this.pointerLocked && this.canvas.requestPointerLock) {
        try {
          this.canvas.requestPointerLock();
        } catch (_) {}
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.pointerLocked) {
        this._rotateLook(e.movementX || 0, e.movementY || 0);
      } else if (this.dragging) {
        this._rotateLook(e.clientX - this.lastMouse.x, e.clientY - this.lastMouse.y);
        this.lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.dragging = false;
    });

    // Touch look on canvas (separate from joystick)
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (!this.enabled || this.touchLookId !== null) return;
        const t = e.changedTouches[0];
        this.touchLookId = t.identifier;
        this.lastTouch = { x: t.clientX, y: t.clientY };
      },
      { passive: true }
    );
    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!this.enabled || this.touchLookId === null) return;
        for (const t of e.changedTouches) {
          if (t.identifier === this.touchLookId) {
            e.preventDefault();
            this._rotateLook((t.clientX - this.lastTouch.x) * 1.35, (t.clientY - this.lastTouch.y) * 1.35);
            this.lastTouch = { x: t.clientX, y: t.clientY };
          }
        }
      },
      { passive: false }
    );
    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchLookId) this.touchLookId = null;
      }
    };
    this.canvas.addEventListener('touchend', endTouch, { passive: true });
    this.canvas.addEventListener('touchcancel', endTouch, { passive: true });

    // Mobile virtual joystick binding
    const joy = document.getElementById('fp-joystick');
    const stick = document.getElementById('fp-stick');
    if (joy && stick) {
      let joyTouchId = null;
      const maxR = 34;
      const updateStick = (cx, cy) => {
        const rect = joy.getBoundingClientRect();
        const ox = rect.left + rect.width / 2;
        const oy = rect.top + rect.height / 2;
        let dx = cx - ox;
        let dy = cy - oy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        this.joyVec.x = dx / maxR;
        this.joyVec.y = -dy / maxR; // screen up -> forward (+1)
      };
      const resetStick = () => {
        joyTouchId = null;
        stick.style.transform = 'translate(0px, 0px)';
        this.joyVec = { x: 0, y: 0 };
      };
      joy.addEventListener(
        'touchstart',
        (e) => {
          if (!this.enabled || joyTouchId !== null) return;
          e.preventDefault();
          const t = e.changedTouches[0];
          joyTouchId = t.identifier;
          updateStick(t.clientX, t.clientY);
        },
        { passive: false }
      );
      joy.addEventListener(
        'touchmove',
        (e) => {
          if (!this.enabled || joyTouchId === null) return;
          for (const t of e.changedTouches) {
            if (t.identifier === joyTouchId) {
              e.preventDefault();
              updateStick(t.clientX, t.clientY);
            }
          }
        },
        { passive: false }
      );
      joy.addEventListener('touchend', resetStick, { passive: true });
      joy.addEventListener('touchcancel', resetStick, { passive: true });

      // Desktop pointer test support on joystick too
      let mouseJoy = false;
      joy.addEventListener('mousedown', (e) => {
        if (!this.enabled) return;
        e.stopPropagation();
        mouseJoy = true;
        updateStick(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (mouseJoy && this.enabled) updateStick(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', () => {
        if (mouseJoy) {
          mouseJoy = false;
          resetStick();
        }
      });
    }
  }
}
