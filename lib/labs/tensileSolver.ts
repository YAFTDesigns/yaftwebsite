// Lightweight dynamic-relaxation solver for a tensile membrane, pure TypeScript
// (no DOM, no Three.js) so it can be unit tested and reused by other experiments.
//
// Model: a square grid of lumped-mass nodes joined by structural, shear and
// boundary-cable springs. A spring's rest length is its flat reference length
// scaled by (1 - prestress), so prestress pre-tensions every member:
//   prestress -> 1 : rest lengths shrink toward 0, the spring force becomes
//                    ~ k * length (a force-density network), whose equilibrium
//                    is the minimal-surface approximation for the given boundary
//   prestress -> 0 : an ordinary elastic net that stretches and sags
// Nodes are advanced with damped explicit (symplectic Euler) integration until
// the residual motion dies out, which is the dynamic-relaxation iteration.
// Anchors (masts and edge anchors) are kinematic: their nodes follow the
// anchor position exactly and are never moved by the solver.

export type Vec3 = [number, number, number];

export type AnchorKind = 'mast' | 'corner';

export interface Anchor {
  id: string;
  kind: AnchorKind;
  /** Plan position on the membrane as fractions 0..1 (picks the pinned node). */
  u: number;
  v: number;
  /** World position the pinned node is held at. */
  pos: Vec3;
}

export interface SolverParams {
  /** Spring stiffness (force per unit stretch). */
  stiffness: number;
  /** 0..0.95 pre-tension; see header. */
  prestress: number;
  gravity: boolean;
}

export const PLAN_SIZE = 8; // metres, square membrane plan
export const GROUND_ANCHOR_Y = 0.6;
export const DEFAULT_MAST_HEIGHT = 3.6;

export const DEFAULT_PARAMS: SolverParams = { stiffness: 3, prestress: 0.7, gravity: true };

// Mass per unit area, gravity load per unit area, viscous damping rate (1/s).
const DENSITY = 0.05;
const GRAVITY_LOAD = 0.3;
const GROUND_Y = 0.02; // the membrane rests on the ground plane rather than passing through it
const DAMPING = 2.5; // light enough that a released membrane visibly bounces
const GRAB_RADIUS = 2; // grid cells either side of a grabbed node that follow it
const GRAB_STIFFNESS = 3; // multiple of the spring stiffness
const EDGE_CABLE_FACTOR = 10;
const SHEAR_FACTOR = 0.5;
const MAX_SUBSTEPS = 12;

export function defaultAnchors(mastHeight = DEFAULT_MAST_HEIGHT): Anchor[] {
  const s = PLAN_SIZE;
  const at = (u: number, v: number, y: number): Vec3 => [(u - 0.5) * s, y, (v - 0.5) * s];
  return [
    { id: 'c00', kind: 'corner', u: 0, v: 0, pos: at(0, 0, GROUND_ANCHOR_Y) },
    { id: 'c10', kind: 'corner', u: 1, v: 0, pos: at(1, 0, GROUND_ANCHOR_Y) },
    { id: 'c01', kind: 'corner', u: 0, v: 1, pos: at(0, 1, GROUND_ANCHOR_Y) },
    { id: 'c11', kind: 'corner', u: 1, v: 1, pos: at(1, 1, GROUND_ANCHOR_Y) },
    { id: 'mastA', kind: 'mast', u: 0.3, v: 0.5, pos: at(0.3, 0.5, mastHeight) },
    { id: 'mastB', kind: 'mast', u: 0.7, v: 0.5, pos: at(0.7, 0.5, mastHeight) },
  ];
}

export class Membrane {
  readonly n: number;
  readonly h: number;
  readonly count: number;
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly springA: Uint32Array;
  readonly springB: Uint32Array;
  readonly springRef: Float32Array;
  readonly springK: Float32Array;
  readonly pinned: Uint8Array;
  readonly mass: number;
  private readonly force: Float32Array;
  private anchorNodes: number[] = [];
  anchors: Anchor[] = [];
  /** Largest node speed after the latest step, used to detect equilibrium. */
  maxSpeed = Infinity;
  private grab: { idx: number[]; w: number[]; start: Float32Array; delta: Vec3 } | null = null;

  constructor(n: number, anchors: Anchor[], from?: Membrane) {
    this.n = n;
    this.h = PLAN_SIZE / (n - 1);
    this.count = n * n;
    this.pos = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.force = new Float32Array(this.count * 3);
    this.pinned = new Uint8Array(this.count);
    this.mass = DENSITY * this.h * this.h;

    const a: number[] = [];
    const b: number[] = [];
    const ref: number[] = [];
    const k: number[] = [];
    const add = (i: number, j: number, len: number, w: number) => {
      a.push(i); b.push(j); ref.push(len); k.push(w);
    };
    const idx = (i: number, j: number) => j * n + i;
    const h = this.h;
    const d = h * Math.SQRT2;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (i + 1 < n) add(idx(i, j), idx(i + 1, j), h, (j === 0 || j === n - 1) ? EDGE_CABLE_FACTOR : 1);
        if (j + 1 < n) add(idx(i, j), idx(i, j + 1), h, (i === 0 || i === n - 1) ? EDGE_CABLE_FACTOR : 1);
        if (i + 1 < n && j + 1 < n) {
          add(idx(i, j), idx(i + 1, j + 1), d, SHEAR_FACTOR);
          add(idx(i + 1, j), idx(i, j + 1), d, SHEAR_FACTOR);
        }
      }
    }
    this.springA = Uint32Array.from(a);
    this.springB = Uint32Array.from(b);
    this.springRef = Float32Array.from(ref);
    this.springK = Float32Array.from(k);

    if (from) this.resampleFrom(from);
    else this.initFlat();
    this.setAnchors(anchors);
  }

  private initFlat() {
    const { n } = this;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const p = (j * n + i) * 3;
        this.pos[p] = (i / (n - 1) - 0.5) * PLAN_SIZE;
        this.pos[p + 1] = GROUND_ANCHOR_Y;
        this.pos[p + 2] = (j / (n - 1) - 0.5) * PLAN_SIZE;
      }
    }
  }

  // Keep the current form when density changes: bilinear lookup in the old grid.
  private resampleFrom(old: Membrane) {
    const { n } = this;
    const m = old.n;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const fu = (i / (n - 1)) * (m - 1);
        const fv = (j / (n - 1)) * (m - 1);
        const i0 = Math.min(m - 2, Math.floor(fu));
        const j0 = Math.min(m - 2, Math.floor(fv));
        const tu = fu - i0;
        const tv = fv - j0;
        const p = (j * n + i) * 3;
        for (let c = 0; c < 3; c++) {
          const v00 = old.pos[(j0 * m + i0) * 3 + c];
          const v10 = old.pos[(j0 * m + i0 + 1) * 3 + c];
          const v01 = old.pos[((j0 + 1) * m + i0) * 3 + c];
          const v11 = old.pos[((j0 + 1) * m + i0 + 1) * 3 + c];
          this.pos[p + c] = v00 * (1 - tu) * (1 - tv) + v10 * tu * (1 - tv) + v01 * (1 - tu) * tv + v11 * tu * tv;
        }
      }
    }
  }

  setAnchors(anchors: Anchor[]) {
    this.pinned.fill(0);
    this.anchors = anchors;
    this.anchorNodes = anchors.map((an) => {
      const i = Math.round(an.u * (this.n - 1));
      const j = Math.round(an.v * (this.n - 1));
      const node = j * this.n + i;
      this.pinned[node] = 1;
      return node;
    });
    this.applyAnchors();
    this.maxSpeed = Infinity;
  }

  private applyAnchors() {
    for (let a = 0; a < this.anchors.length; a++) {
      const p = this.anchorNodes[a] * 3;
      const pos = this.anchors[a].pos;
      this.pos[p] = pos[0]; this.pos[p + 1] = pos[1]; this.pos[p + 2] = pos[2];
      this.vel[p] = 0; this.vel[p + 1] = 0; this.vel[p + 2] = 0;
    }
  }

  /** Start pulling the membrane itself at `node` (smooth falloff to neighbours). */
  startGrab(node: number) {
    const ci = node % this.n, cj = Math.floor(node / this.n);
    const idx: number[] = [], w: number[] = [], start: number[] = [];
    for (let j = Math.max(0, cj - GRAB_RADIUS); j <= Math.min(this.n - 1, cj + GRAB_RADIUS); j++) {
      for (let i = Math.max(0, ci - GRAB_RADIUS); i <= Math.min(this.n - 1, ci + GRAB_RADIUS); i++) {
        const k = j * this.n + i;
        if (this.pinned[k]) continue;
        const d = Math.hypot(i - ci, j - cj);
        if (d > GRAB_RADIUS) continue;
        idx.push(k); w.push(1 - d / (GRAB_RADIUS + 1));
        start.push(this.pos[k * 3], this.pos[k * 3 + 1], this.pos[k * 3 + 2]);
      }
    }
    this.grab = { idx, w, start: Float32Array.from(start), delta: [0, 0, 0] };
    this.maxSpeed = Infinity;
  }

  /** Move the grabbed point by `delta` from where it was picked up. */
  moveGrab(delta: Vec3) {
    if (this.grab) { this.grab.delta = delta; this.maxSpeed = Infinity; }
  }

  endGrab() { this.grab = null; this.maxSpeed = Infinity; }

  get isGrabbed() { return this.grab !== null; }

  /** Re-pin after an anchor's position changed (drag or mast-height slider). */
  anchorsMoved() {
    this.applyAnchors();
    this.maxSpeed = Infinity;
  }

  /** Largest stable time step for the current stiffness. */
  stableDt(stiffness: number): number {
    // Worst case a node carries ~ 4 structural + 4 shear + cable springs.
    const kSum = stiffness * (4 * EDGE_CABLE_FACTOR + 4 * SHEAR_FACTOR);
    const omega = Math.sqrt(kSum / this.mass);
    return 1.0 / omega;
  }

  /** Advance the simulation by `frameDt` seconds of simulated time. */
  advance(frameDt: number, params: SolverParams) {
    const dtStable = this.stableDt(params.stiffness);
    const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(frameDt / dtStable)));
    const dt = Math.min(frameDt / steps, dtStable);
    for (let s = 0; s < steps; s++) this.step(dt, params);
  }

  private step(dt: number, params: SolverParams) {
    const { pos, vel, force, springA, springB, springRef, springK, pinned, count, mass } = this;
    const scale = 1 - Math.min(0.95, Math.max(0, params.prestress));
    const kk = params.stiffness;
    const gy = params.gravity ? -GRAVITY_LOAD * this.h * this.h : 0;

    force.fill(0);
    for (let s = 0; s < springA.length; s++) {
      const a = springA[s] * 3;
      const b = springB[s] * 3;
      const dx = pos[b] - pos[a];
      const dy = pos[b + 1] - pos[a + 1];
      const dz = pos[b + 2] - pos[a + 2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
      const f = (kk * springK[s] * (len - springRef[s] * scale)) / len;
      const fx = f * dx, fy = f * dy, fz = f * dz;
      force[a] += fx; force[a + 1] += fy; force[a + 2] += fz;
      force[b] -= fx; force[b + 1] -= fy; force[b + 2] -= fz;
    }

    if (this.grab) {
      const { idx, w, start, delta } = this.grab;
      const kg = kk * GRAB_STIFFNESS;
      for (let g = 0; g < idx.length; g++) {
        const p = idx[g] * 3;
        force[p] += kg * w[g] * (start[g * 3] + delta[0] * w[g] - pos[p]);
        force[p + 1] += kg * w[g] * (start[g * 3 + 1] + delta[1] * w[g] - pos[p + 1]);
        force[p + 2] += kg * w[g] * (start[g * 3 + 2] + delta[2] * w[g] - pos[p + 2]);
      }
    }

    const damp = Math.exp(-DAMPING * dt);
    const inv = dt / mass;
    let maxV2 = 0;
    for (let i = 0; i < count; i++) {
      if (pinned[i]) continue;
      const p = i * 3;
      vel[p] = (vel[p] + force[p] * inv) * damp;
      vel[p + 1] = (vel[p + 1] + (force[p + 1] + gy) * inv) * damp;
      vel[p + 2] = (vel[p + 2] + force[p + 2] * inv) * damp;
      pos[p] += vel[p] * dt;
      pos[p + 1] += vel[p + 1] * dt;
      pos[p + 2] += vel[p + 2] * dt;
      if (pos[p + 1] < GROUND_Y) { pos[p + 1] = GROUND_Y; if (vel[p + 1] < 0) vel[p + 1] = 0; }
      const v2 = vel[p] * vel[p] + vel[p + 1] * vel[p + 1] + vel[p + 2] * vel[p + 2];
      if (v2 > maxV2) maxV2 = v2;
    }
    this.maxSpeed = Math.sqrt(maxV2);
  }

  /** Surface area of the current form (sum of triangle areas). */
  area(): number {
    const { n, pos } = this;
    let total = 0;
    const tri = (a: number, b: number, c: number) => {
      const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
      const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
    };
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        total += tri(a, b, d) + tri(a, d, c);
      }
    }
    return total;
  }
}

/** Equilibrium threshold in m/s: below this the form is visually at rest. */
export const REST_SPEED = 2e-4;

/** Density presets with a lower cap on small/low-power screens. */
export function densityLimits(coarsePointer: boolean, cores: number): { min: number; max: number; initial: number } {
  const lowPower = coarsePointer || cores <= 4;
  return lowPower ? { min: 10, max: 32, initial: 22 } : { min: 10, max: 48, initial: 30 };
}
