'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  Membrane, defaultAnchors, densityLimits, DEFAULT_MAST_HEIGHT, DEFAULT_PARAMS, PLAN_SIZE, REST_SPEED,
  type Anchor, type SolverParams,
} from '@/lib/labs/tensileSolver';
import { track } from '@/lib/analytics';
import styles from './experiment.module.css';

type Mode = 'surface' | 'mesh';

interface Api {
  setDensity(n: number): void;
  setMastHeight(y: number): void;
  setMode(m: Mode): void;
  reset(): void;
  wake(): void;
}

const MAST_RANGE = { min: 1, max: 7 };
const BRASS = 0xe63946;
const TEAL = 0x40e0d0;

export default function TensileMembraneViewport() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<Api | null>(null);
  const params = useRef<SolverParams>({ ...DEFAULT_PARAMS });
  const running = useRef(true);

  // Client-only component (loaded with ssr:false), so device checks are safe here.
  const [limits] = useState(() => densityLimits(window.matchMedia('(pointer: coarse)').matches, navigator.hardwareConcurrency ?? 4));
  const [density, setDensityState] = useState(limits.initial);
  const [stiffness, setStiffness] = useState(DEFAULT_PARAMS.stiffness);
  const [prestress, setPrestress] = useState(DEFAULT_PARAMS.prestress);
  const [mast, setMast] = useState(DEFAULT_MAST_HEIGHT);
  const [gravity, setGravity] = useState(DEFAULT_PARAMS.gravity);
  const [mode, setModeState] = useState<Mode>('surface');
  const [isRunning, setIsRunning] = useState(true);
  const [settled, setSettled] = useState(false);
  const [hover, setHoverState] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [webglError, setWebglError] = useState(false);

  // The scene is created once; React state only drives the UI and calls `api`.
  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const lim = limits;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      queueMicrotask(() => setWebglError(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0a, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    const HOME = { pos: new THREE.Vector3(9.5, 6.5, 10.5), target: new THREE.Vector3(0, 1.4, 0) };
    // Portrait screens sit further back so the whole membrane stays in frame.
    const placeHome = () => {
      const k = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 2.2 : 1;
      camera.position.copy(HOME.target).add(HOME.pos.clone().sub(HOME.target).multiplyScalar(k));
    };
    placeHome();

    const controls = new OrbitControls(camera, canvas);
    controls.target.copy(HOME.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 5;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.screenSpacePanning = true;
    controls.update();

    // Lighting: soft sky/ground fill plus a key light for readable form.
    scene.add(new THREE.HemisphereLight(0xdfeaff, 0x1b1b1b, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(6, 12, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fe9e0, 0.9);
    rim.position.set(-8, 4, -6);
    scene.add(rim);

    // Ground: a restrained grid plus the plan outline of the membrane.
    const grid = new THREE.GridHelper(24, 24, 0x2e2e2e, 0x1a1a1a);
    scene.add(grid);
    const half = PLAN_SIZE / 2;
    const outline = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-half, 0.005, -half), new THREE.Vector3(half, 0.005, -half),
        new THREE.Vector3(half, 0.005, half), new THREE.Vector3(-half, 0.005, half),
      ]),
      new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.25 }),
    );
    scene.add(outline);

    // ---- membrane state & geometry ----
    let anchors: Anchor[] = defaultAnchors(DEFAULT_MAST_HEIGHT);
    let membrane = new Membrane(lim.initial, anchors);
    let mode: Mode = 'surface';

    const surfaceMat = new THREE.MeshStandardMaterial({
      color: 0xb9c4c1, roughness: 0.6, metalness: 0.02, side: THREE.DoubleSide, transparent: true, opacity: 1,
    });
    const lineMat = new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.9 });
    let surface: THREE.Mesh | null = null;
    let lines: THREE.LineSegments | null = null;

    const buildGeometry = () => {
      if (surface) { scene.remove(surface); surface.geometry.dispose(); }
      if (lines) { scene.remove(lines); lines.geometry.dispose(); }
      const n = membrane.n;
      const posAttr = new THREE.BufferAttribute(membrane.pos, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      const tri: number[] = [];
      const seg: number[] = [];
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const a = j * n + i;
          if (i + 1 < n && j + 1 < n) tri.push(a, a + 1, a + n + 1, a, a + n + 1, a + n);
          if (i + 1 < n) seg.push(a, a + 1);
          if (j + 1 < n) seg.push(a, a + n);
        }
      }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', posAttr);
      sg.setIndex(tri);
      sg.computeVertexNormals();
      surface = new THREE.Mesh(sg, surfaceMat);
      surface.frustumCulled = false;
      scene.add(surface);
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', posAttr);
      lg.setIndex(seg);
      lines = new THREE.LineSegments(lg, lineMat);
      lines.frustumCulled = false;
      scene.add(lines);
      applyMode();
    };

    const applyMode = () => {
      const meshMode = mode === 'mesh';
      surfaceMat.opacity = meshMode ? 0.14 : 1;
      surfaceMat.depthWrite = !meshMode;
      if (lines) lines.visible = meshMode;
    };

    // ---- anchor handles ----
    const handleGeo = new THREE.SphereGeometry(1, 20, 14);
    const handleMat = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.4, emissive: 0x4a0f14 });
    const handleHoverMat = new THREE.MeshStandardMaterial({ color: TEAL, roughness: 0.35, emissive: 0x0f4a44 });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const stemMat = new THREE.LineBasicMaterial({ color: 0x8a8a8a, transparent: true, opacity: 0.7 });
    const baseMat = new THREE.MeshBasicMaterial({ color: BRASS, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const baseGeo = new THREE.RingGeometry(0.16, 0.24, 28).rotateX(-Math.PI / 2);

    interface Handle { anchor: Anchor; dot: THREE.Mesh; hit: THREE.Mesh; stem: THREE.Line; base: THREE.Mesh; }
    let handles: Handle[] = [];
    const handleRoot = new THREE.Group();
    scene.add(handleRoot);

    const hitRadius = coarse ? 0.75 : 0.42;
    const buildHandles = () => {
      handleRoot.children.slice().forEach((c) => {
        handleRoot.remove(c);
        const l = c as THREE.Line;
        if (l.geometry && l.geometry !== baseGeo) l.geometry.dispose();
      });
      handles = anchors.map((anchor) => {
        const r = anchor.kind === 'mast' ? 0.17 : 0.14;
        const dot = new THREE.Mesh(handleGeo, handleMat);
        dot.scale.setScalar(r);
        const hit = new THREE.Mesh(handleGeo, hitMat);
        hit.scale.setScalar(hitRadius);
        const stemGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
        const stem = new THREE.Line(stemGeo, stemMat);
        const base = new THREE.Mesh(baseGeo, baseMat);
        handleRoot.add(dot, hit, stem, base);
        hit.userData.anchorId = anchor.id;
        return { anchor, dot, hit, stem, base };
      });
      syncHandles();
    };
    const syncHandles = () => {
      for (const h of handles) {
        const [x, y, z] = h.anchor.pos;
        h.dot.position.set(x, y, z);
        h.hit.position.set(x, y, z);
        h.base.position.set(x, 0.012, z);
        const a = h.stem.geometry.attributes.position as THREE.BufferAttribute;
        a.setXYZ(0, x, 0, z);
        a.setXYZ(1, x, y, z);
        a.needsUpdate = true;
      }
    };

    // ---- render loop (runs only while something is changing) ----
    let raf = 0;
    let lastT = 0;
    let calm = 0;
    let onScreen = true;
    let settledFlag = false;
    let hoverId: string | null = null;
    let dragId: string | null = null;
    let grabbing = false;
    const grabStart = new THREE.Vector3();

    const setSettledUI = (v: boolean) => {
      if (v !== settledFlag) { settledFlag = v; setSettled(v); }
    };

    const frame = (t: number) => {
      raf = 0;
      const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 1 / 60);
      lastT = t;
      let keep = false;

      if (running.current && onScreen) {
        membrane.advance(dt, params.current);
        if (membrane.maxSpeed < REST_SPEED) {
          calm++;
        } else {
          calm = 0;
        }
        const resting = calm > 20 && !dragId && !grabbing;
        setSettledUI(resting);
        if (!resting) keep = true;
        (surface?.geometry.attributes.position as THREE.BufferAttribute | undefined)!.needsUpdate = true;
        surface?.geometry.computeVertexNormals();
      }

      if (controls.update()) keep = true;
      renderer.render(scene, camera);
      if (keep || dragId || grabbing) { raf = requestAnimationFrame(frame); } else { lastT = 0; }
    };
    const wake = () => {
      calm = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    controls.addEventListener('change', () => { if (!raf) raf = requestAnimationFrame(frame); });

    // ---- sizing ----
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const first = camera.aspect === 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (first) { placeHome(); controls.update(); }
      wake();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); });
    io.observe(host);

    // ---- pointer interaction (mouse, touch and pen via Pointer Events) ----
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane();
    const hitPoint = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let interacted = false;

    const setNdc = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
    };
    const pick = (): Handle | null => {
      const hits = raycaster.intersectObjects(handles.map((h) => h.hit), false);
      if (!hits.length) return null;
      return handles.find((h) => h.hit === hits[0].object) ?? null;
    };
    // Nearest mesh node to a surface hit, so the fabric itself can be grabbed.
    const pickSurface = (): { node: number; point: THREE.Vector3 } | null => {
      if (!surface) return null;
      const hit = raycaster.intersectObject(surface, false)[0];
      if (!hit || !hit.face) return null;
      let best = hit.face.a, bd = Infinity;
      for (const v of [hit.face.a, hit.face.b, hit.face.c]) {
        const d = hit.point.distanceToSquared(new THREE.Vector3(membrane.pos[v * 3], membrane.pos[v * 3 + 1], membrane.pos[v * 3 + 2]));
        if (d < bd) { bd = d; best = v; }
      }
      if (membrane.pinned[best]) return null;
      return { node: best, point: hit.point.clone() };
    };
    const setHover = (id: string | null) => {
      if (id === hoverId) return;
      hoverId = id;
      for (const h of handles) {
        const on = h.anchor.id === id;
        h.dot.material = on ? handleHoverMat : handleMat;
        h.dot.scale.setScalar((h.anchor.kind === 'mast' ? 0.17 : 0.14) * (on ? 1.4 : 1));
      }
      setHoverState(!!id);
      wake();
    };

    const onDown = (e: PointerEvent) => {
      setNdc(e);
      const h = pick();
      if (!h) {
        const s = pickSurface();
        if (!s) return;
        e.preventDefault();
        grabbing = true;
        grabStart.copy(s.point);
        membrane.startGrab(s.node);
        controls.enabled = false;
        canvas.setPointerCapture(e.pointerId);
        plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), s.point);
        setHoverState(true);
        setDragging(true);
        if (!interacted) {
          interacted = true;
          track('cta_click', { page: '/labs/tensile-membrane', meta: { cta: 'lab_experiment_interact', experiment: 'tensile-membrane' } });
        }
        wake();
        return;
      }
      e.preventDefault();
      dragId = h.anchor.id;
      controls.enabled = false;
      canvas.setPointerCapture(e.pointerId);
      const camDir = camera.getWorldDirection(new THREE.Vector3());
      const p = new THREE.Vector3(...h.anchor.pos);
      plane.setFromNormalAndCoplanarPoint(camDir, p);
      dragOffset.set(0, 0, 0);
      if (raycaster.ray.intersectPlane(plane, hitPoint)) dragOffset.copy(p).sub(hitPoint);
      setHover(h.anchor.id);
      setDragging(true);
      if (!interacted) {
        interacted = true;
        track('cta_click', { page: '/labs/tensile-membrane', meta: { cta: 'lab_experiment_interact', experiment: 'tensile-membrane' } });
      }
      wake();
    };
    const onMove = (e: PointerEvent) => {
      setNdc(e);
      if (grabbing) {
        if (raycaster.ray.intersectPlane(plane, hitPoint)) {
          membrane.moveGrab([hitPoint.x - grabStart.x, hitPoint.y - grabStart.y, hitPoint.z - grabStart.z]);
          wake();
        }
        return;
      }
      if (dragId) {
        const h = handles.find((x) => x.anchor.id === dragId);
        if (!h || !raycaster.ray.intersectPlane(plane, hitPoint)) return;
        const lim = PLAN_SIZE * 1.1;
        const x = THREE.MathUtils.clamp(hitPoint.x + dragOffset.x, -lim, lim);
        const y = THREE.MathUtils.clamp(hitPoint.y + dragOffset.y, 0.05, 8);
        const z = THREE.MathUtils.clamp(hitPoint.z + dragOffset.z, -lim, lim);
        h.anchor.pos = [x, y, z];
        membrane.anchorsMoved();
        syncHandles();
        if (h.anchor.kind === 'mast') {
          const ys = anchors.filter((a) => a.kind === 'mast').map((a) => a.pos[1]);
          setMast(THREE.MathUtils.clamp(ys.reduce((s, v) => s + v, 0) / ys.length, MAST_RANGE.min, MAST_RANGE.max));
        }
        wake();
      } else if (e.pointerType === 'mouse') {
        const hh = pick();
        setHover(hh?.anchor.id ?? null);
        if (!hh) setHoverState(!!pickSurface());
      }
    };
    const endDrag = (e: PointerEvent) => {
      if (grabbing) {
        grabbing = false;
        membrane.endGrab();
        controls.enabled = true;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        setDragging(false);
        setHoverState(false);
        wake();
        return;
      }
      if (!dragId) return;
      dragId = null;
      controls.enabled = true;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      setDragging(false);
      if (e.pointerType !== 'mouse') setHover(null);
      wake();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => { if (!dragId) setHover(null); });

    // ---- API used by the UI ----
    api.current = {
      setDensity(n) {
        if (n === membrane.n) return;
        membrane = new Membrane(n, anchors, membrane);
        buildGeometry();
        wake();
      },
      setMastHeight(y) {
        for (const a of anchors) if (a.kind === 'mast') a.pos[1] = y;
        membrane.anchorsMoved();
        syncHandles();
        wake();
      },
      setMode(m) { mode = m; applyMode(); wake(); },
      reset() {
        anchors = defaultAnchors(DEFAULT_MAST_HEIGHT);
        const n = lim.initial;
        membrane = new Membrane(n, anchors);
        buildGeometry();
        buildHandles();
        controls.target.copy(HOME.target);
        placeHome();
        controls.update();
        wake();
      },
      wake,
    };

    buildGeometry();
    buildHandles();
    resize();
    wake();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      controls.dispose();
      surface?.geometry.dispose();
      lines?.geometry.dispose();
      handleRoot.children.forEach((c) => (c as THREE.Line).geometry?.dispose?.());
      [surfaceMat, lineMat, handleMat, handleHoverMat, hitMat, stemMat, baseMat, handleGeo, baseGeo].forEach((r) => r.dispose());
      grid.dispose();
      outline.geometry.dispose();
      renderer.dispose();
      api.current = null;
    };
  }, [limits]);

  // UI -> solver
  const onDensity = (n: number) => { setDensityState(n); api.current?.setDensity(n); };
  const onStiffness = (v: number) => { setStiffness(v); params.current.stiffness = v; api.current?.wake(); };
  const onPrestress = (v: number) => { setPrestress(v); params.current.prestress = v; api.current?.wake(); };
  const onMast = (v: number) => { setMast(v); api.current?.setMastHeight(v); };
  const onGravity = () => { const v = !gravity; setGravity(v); params.current.gravity = v; api.current?.wake(); };
  const onMode = (m: Mode) => { setModeState(m); api.current?.setMode(m); };
  const onRun = () => { const v = !isRunning; setIsRunning(v); running.current = v; api.current?.wake(); };
  const onReset = useCallback(() => {
    params.current = { ...DEFAULT_PARAMS };
    running.current = true;
    setStiffness(DEFAULT_PARAMS.stiffness);
    setPrestress(DEFAULT_PARAMS.prestress);
    setGravity(DEFAULT_PARAMS.gravity);
    setMast(DEFAULT_MAST_HEIGHT);
    setIsRunning(true);
    setDensityState(limits.initial);
    api.current?.reset();
  }, [limits.initial]);

  const live = isRunning && !settled;
  const statusText = !isRunning ? 'Paused' : settled ? 'Equilibrium' : 'Relaxing';

  return (
    <div className={styles.stage}>
      <div ref={hostRef} className={`${styles.viewport} ${hover ? styles.over : ''} ${dragging ? styles.dragging : ''}`}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Interactive 3D tensile membrane. Drag the fabric or the red masts and anchors to reshape it." />
        {webglError && <div className={styles.loading}>3D view needs WebGL, which this browser could not start.</div>}
        <div className={styles.hint}>Drag the fabric, masts or anchors · orbit · scroll to zoom</div>
        <div className={styles.status} aria-live="polite">
          <span className={`${styles.dot} ${live ? styles.dotLive : ''}`} />
          {statusText}
        </div>
        <div className={styles.toolbar}>
          <button type="button" className={styles.btn} onClick={onRun} aria-pressed={isRunning}>{isRunning ? 'Pause' : 'Run'}</button>
          <div className={styles.seg} role="group" aria-label="Display mode">
            <button type="button" aria-pressed={mode === 'surface'} onClick={() => onMode('surface')}>Surface</button>
            <button type="button" aria-pressed={mode === 'mesh'} onClick={() => onMode('mesh')}>Mesh</button>
          </div>
        </div>
      </div>

      <aside className={styles.panel} aria-label="Form-finding parameters">
        <p className={styles.panelTitle}>Parameters</p>
        <label className={styles.field}>
          <span className={styles.fieldHead}>Mesh Density <output>{density} × {density}</output></span>
          <input className={styles.range} type="range" min={limits.min} max={limits.max} step={2} value={density} onChange={(e) => onDensity(+e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldHead}>Relaxation / Stiffness <output>{stiffness.toFixed(1)}</output></span>
          <input className={styles.range} type="range" min={1.5} max={8} step={0.5} value={stiffness} onChange={(e) => onStiffness(+e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldHead}>Prestress <output>{Math.round(prestress * 100)}%</output></span>
          <input className={styles.range} type="range" min={0.05} max={0.95} step={0.01} value={prestress} onChange={(e) => onPrestress(+e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldHead}>Mast Height <output>{mast.toFixed(1)} m</output></span>
          <input className={styles.range} type="range" min={MAST_RANGE.min} max={MAST_RANGE.max} step={0.1} value={mast} onChange={(e) => onMast(+e.target.value)} />
        </label>
        <div className={styles.switchRow}>
          <span id="gravity-label">Gravity</span>
          <button type="button" role="switch" aria-checked={gravity} aria-labelledby="gravity-label" className={styles.switch} onClick={onGravity} />
        </div>
        <button type="button" className={`${styles.btn} ${styles.panelReset}`} onClick={onReset}>Reset</button>
      </aside>
    </div>
  );
}
