// Lightweight dynamic-relaxation solver for a tensile membrane, pure TypeScript
// (no DOM, no Three.js) so it can be unit tested and reused by other experiments.
//
// Model: a circular membrane meshed as concentric rings, with lumped nodes joined
// by radial, circumferential, shear and edge-cable springs. A spring's rest length
// is its flat reference length scaled by (1 - prestress), so prestress pre-tensions
// every member:
//   prestress -> 1 : rest lengths shrink toward 0, the spring force becomes
//                    ~ k * length (a force-density network), whose equilibrium is
//                    the minimal-surface approximation for the given boundary
//   prestress -> 0 : an ordinary elastic net that stretches and sags
// Nodes are advanced with damped explicit integration until the residual motion
// dies out (dynamic relaxation). Masses are fictitious and proportional to each
// node's stiffness, which keeps every node equally "fast" and the step stable;
// they do not change the equilibrium shape. Anchors (masts and edge anchors) are
// kinematic: their nodes follow the anchor position and are never moved by the solver.

export type Vec3 = [number, number, number];

export type AnchorKind = 'mast' | 'edge';

export interface Anchor {
  id: string;
  kind: AnchorKind;
  /** Plan position of the pinned node (metres, x/z). */
  x: number;
  z: number;
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

export const PLAN_RADIUS = 4.5; // metres, circular membrane plan
export const GROUND_ANCHOR_Y = 0.6;
export const DEFAULT_MAST_HEIGHT = 3.6;
export const EDGE_ANCHOR_COUNT = 6;
export const MAST_COUNT = 3;
const MAST_RADIUS = 2;

export const DEFAULT_PARAMS: SolverParams = { stiffness: 3, prestress: 0.7, gravity: true };

const GRAVITY_LOAD = 0.3; // force per unit plan area
const GROUND_Y = 0.02; // the membrane rests on the ground plane rather than passing through it
const DAMPING = 2.5; // light enough that a released membrane visibly bounces
const GRAB_RADIUS_CELLS = 2.2; // how far (in ring spacings) a grab drags neighbours along
const GRAB_STIFFNESS = 3; // multiple of the spring stiffness
const EDGE_CABLE_FACTOR = 10;
const SHEAR_FACTOR = 0.5;
const OMEGA0 = 40; // fictitious-mass frequency scale (rad/s)
const MAX_SUBSTEPS = 6;

export function defaultAnchors(mastHeight = DEFAULT_MAST_HEIGHT): Anchor[] {
  const out: Anchor[] = [];
  for (let j = 0; j < EDGE_ANCHOR_COUNT; j++) {
    const a = (j / EDGE_ANCHOR_COUNT) * Math.PI * 2;
    const x = PLAN_RADIUS * Math.cos(a), z = PLAN_RADIUS * Math.sin(a);
    out.push({ id: `edge${j}`, kind: 'edge', x, z, pos: [x, GROUND_ANCHOR_Y, z] });
  }
  for (let j = 0; j < MAST_COUNT; j++) {
    const a = Math.PI / 2 + (j / MAST_COUNT) * Math.PI * 2;
    const x = MAST_RADIUS * Math.cos(a), z = MAST_RADIUS * Math.sin(a);
    out.push({ id: `mast${j}`, kind: 'mast', x, z, pos: [x, mastHeight, z] });
  }
  return out;
}

export class Membrane {
  /** Requested mesh density (the UI value). */
  readonly n: number;
  readonly rings: number;
  readonly sectors: number;
  readonly ringSpacing: number;
  readonly count: number;
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  /** Flat plan coordinates (x, z) per node. */
  readonly plan: Float32Array;
  readonly tris: Uint32Array;
  /** Structural lines (radial + circumferential) for the mesh overlay. */
  readonly segs: Uint32Array;
  readonly springA: Uint32Array;
  readonly springB: Uint32Array;
  readonly springRef: Float32Array;
  readonly springK: Float32Array;
  readonly pinned: Uint8Array;
  private readonly mass: Float32Array;
  private readonly area: Float32Array;
  private readonly force: Float32Array;
  private anchorNodes: number[] = [];
  anchors: Anchor[] = [];
  /** Largest node speed after the latest step, used to detect equilibrium. */
  maxSpeed = Infinity;
  private grab: { idx: number[]; w: number[]; start: Float32Array; delta: Vec3 } | null = null;

  constructor(n: number, anchors: Anchor[], from?: Membrane) {
    this.n = n;
    this.rings = Math.max(4, Math.round(n / 2));
    this.sectors = Math.max(12, Math.round((this.rings * 2) / 6) * 6);
    const R = this.rings, S = this.sectors;
    this.ringSpacing = PLAN_RADIUS / R;
    this.count = 1 + R * S;
    this.pos = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.force = new Float32Array(this.count * 3);
    this.plan = new Float32Array(this.count * 2);
    this.pinned = new Uint8Array(this.count);

    const node = (k: number, s: number) => (k === 0 ? 0 : 1 + (k - 1) * S + ((s % S) + S) % S);
    for (let k = 1; k <= R; k++) {
      for (let s = 0; s < S; s++) {
        const i = node(k, s);
        const r = (PLAN_RADIUS * k) / R, a = (s / S) * Math.PI * 2;
        this.plan[i * 2] = r * Math.cos(a);
        this.plan[i * 2 + 1] = r * Math.sin(a);
      }
    }

    const tri: number[] = [];
    const seg: number[] = [];
    const sa: number[] = [], sb: number[] = [], sk: number[] = [];
    const addSpring = (i: number, j: number, w: number) => {
      sa.push(i); sb.push(j); sk.push(w);
    };
    for (let s = 0; s < S; s++) {
      tri.push(0, node(1, s), node(1, s + 1));
      addSpring(0, node(1, s), 1); seg.push(0, node(1, s));
    }
    for (let k = 1; k <= R; k++) {
      for (let s = 0; s < S; s++) {
        const a = node(k, s), b = node(k, s + 1);
        addSpring(a, b, k === R ? EDGE_CABLE_FACTOR : 1); seg.push(a, b);
        if (k < R) {
          const c = node(k + 1, s), d = node(k + 1, s + 1);
          addSpring(a, c, 1); seg.push(a, c);
          addSpring(a, d, SHEAR_FACTOR);
          addSpring(b, c, SHEAR_FACTOR);
          tri.push(a, c, d, a, d, b);
        }
      }
    }
    this.tris = Uint32Array.from(tri);
    this.segs = Uint32Array.from(seg);
    this.springA = Uint32Array.from(sa);
    this.springB = Uint32Array.from(sb);
    this.springK = Float32Array.from(sk);
    this.springRef = new Float32Array(sa.length);
    for (let s = 0; s < sa.length; s++) {
      const a = sa[s], b = sb[s];
      this.springRef[s] = Math.hypot(this.plan[a * 2] - this.plan[b * 2], this.plan[a * 2 + 1] - this.plan[b * 2 + 1]);
    }

    // Plan area tributary to each node (a third of each adjoining triangle).
    this.area = new Float32Array(this.count);
    for (let t = 0; t < this.tris.length; t += 3) {
      const a = this.tris[t], b = this.tris[t + 1], c = this.tris[t + 2];
      const ar = 0.5 * Math.abs(
        (this.plan[b * 2] - this.plan[a * 2]) * (this.plan[c * 2 + 1] - this.plan[a * 2 + 1]) -
        (this.plan[c * 2] - this.plan[a * 2]) * (this.plan[b * 2 + 1] - this.plan[a * 2 + 1]),
      );
      this.area[a] += ar / 3; this.area[b] += ar / 3; this.area[c] += ar / 3;
    }

    // Fictitious masses proportional to nodal stiffness (per unit stiffness).
    const kSum = new Float32Array(this.count).fill(GRAB_STIFFNESS);
    for (let s = 0; s < sa.length; s++) { kSum[sa[s]] += sk[s]; kSum[sb[s]] += sk[s]; }
    this.mass = new Float32Array(this.count);
    for (let i = 0; i < this.count; i++) this.mass[i] = kSum[i] / (OMEGA0 * OMEGA0);

    if (from) this.resampleFrom(from);
    else this.initFlat();
    this.setAnchors(anchors);
  }

  private initFlat() {
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 3] = this.plan[i * 2];
      this.pos[i * 3 + 1] = GROUND_ANCHOR_Y;
      this.pos[i * 3 + 2] = this.plan[i * 2 + 1];
    }
  }

  // Keep the current form when density changes: inverse-distance lookup in the old mesh.
  private resampleFrom(old: Membrane) {
    for (let i = 0; i < this.count; i++) {
      const px = this.plan[i * 2], pz = this.plan[i * 2 + 1];
      let sw = 0, sy = 0, sx = 0, sz = 0;
      for (let j = 0; j < old.count; j++) {
        const d2 = (old.plan[j * 2] - px) ** 2 + (old.plan[j * 2 + 1] - pz) ** 2;
        const w = 1 / (d2 * d2 + 1e-6);
        sw += w; sx += w * old.pos[j * 3]; sy += w * old.pos[j * 3 + 1]; sz += w * old.pos[j * 3 + 2];
      }
      this.pos[i * 3] = sx / sw; this.pos[i * 3 + 1] = sy / sw; this.pos[i * 3 + 2] = sz / sw;
    }
  }

  setAnchors(anchors: Anchor[]) {
    this.pinned.fill(0);
    this.anchors = anchors;
    this.anchorNodes = anchors.map((an) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < this.count; i++) {
        const d = (this.plan[i * 2] - an.x) ** 2 + (this.plan[i * 2 + 1] - an.z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      this.pinned[best] = 1;
      return best;
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
    const cx = this.plan[node * 2], cz = this.plan[node * 2 + 1];
    const radius = GRAB_RADIUS_CELLS * this.ringSpacing;
    const idx: number[] = [], w: number[] = [], start: number[] = [];
    for (let k = 0; k < this.count; k++) {
      if (this.pinned[k]) continue;
      const d = Math.hypot(this.plan[k * 2] - cx, this.plan[k * 2 + 1] - cz);
      if (d >= radius) continue;
      idx.push(k); w.push(1 - d / radius);
      start.push(this.pos[k * 3], this.pos[k * 3 + 1], this.pos[k * 3 + 2]);
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

  /** Advance the simulation by `frameDt` seconds of simulated time. */
  advance(frameDt: number, params: SolverParams) {
    const dtStable = 0.6 / OMEGA0;
    const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(frameDt / dtStable)));
    const dt = Math.min(frameDt / steps, dtStable);
    for (let s = 0; s < steps; s++) this.step(dt, params);
  }

  private step(dt: number, params: SolverParams) {
    const { pos, vel, force, springA, springB, springRef, springK, pinned, count, mass, area } = this;
    const scale = 1 - Math.min(0.95, Math.max(0, params.prestress));
    const kk = params.stiffness;
    const g = params.gravity ? -GRAVITY_LOAD : 0;

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
      for (let q = 0; q < idx.length; q++) {
        const p = idx[q] * 3;
        force[p] += kg * w[q] * (start[q * 3] + delta[0] * w[q] - pos[p]);
        force[p + 1] += kg * w[q] * (start[q * 3 + 1] + delta[1] * w[q] - pos[p + 1]);
        force[p + 2] += kg * w[q] * (start[q * 3 + 2] + delta[2] * w[q] - pos[p + 2]);
      }
    }

    const damp = Math.exp(-DAMPING * dt);
    let maxV2 = 0;
    for (let i = 0; i < count; i++) {
      if (pinned[i]) continue;
      const p = i * 3;
      // Masses scale with the stiffness setting so the dynamics speed stays constant.
      const inv = dt / (mass[i] * kk);
      vel[p] = (vel[p] + force[p] * inv) * damp;
      vel[p + 1] = (vel[p + 1] + (force[p + 1] + g * area[i]) * inv) * damp;
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
  surfaceArea(): number {
    const { tris, pos } = this;
    let total = 0;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      total += 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
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
