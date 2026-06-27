'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!container || !canvas || !tooltip) return;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let myModel: THREE.Object3D | undefined;
    let idleTimer: ReturnType<typeof setTimeout>;
    let rafId = 0;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000000);
    camera.position.set(100, 100, 100);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight1.position.set(5000, 8000, 5000);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight2.position.set(-5000, 3000, -5000);
    scene.add(dirLight2);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = false;
    controls.autoRotateSpeed = 0.9;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.maxPolarAngle = Math.PI / 1.8;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onMouseMove(event: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;

      mouse.x = (clientX / rect.width) * 2 - 1;
      mouse.y = -(clientY / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      const hit = intersects.find((i) => (i.object as THREE.Mesh).isMesh);

      if (hit) {
        const p = hit.point;
        tooltip!.innerHTML = `<span>X</span> ${p.x.toFixed(1)}<br><span>Y</span> ${p.y.toFixed(1)}<br><span>Z</span> ${p.z.toFixed(1)}`;
        tooltip!.style.left = `${clientX + 15}px`;
        tooltip!.style.top = `${clientY + 15}px`;
        tooltip!.style.opacity = '1';
      } else {
        tooltip!.style.opacity = '0';
      }
    }
    function onMouseLeave() {
      tooltip!.style.opacity = '0';
    }
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    const loader = new OBJLoader();
    loader.load(
      '/point1.obj',
      (object) => {
        const sphereMaterial = new THREE.MeshPhongMaterial({
          color: 0x40e0d0,
          specular: 0x444444,
          shininess: 810,
          side: THREE.DoubleSide,
        });
        const planeMaterial = new THREE.MeshStandardMaterial({
          color: '#9E653B',
          metalness: 1.0,
          roughness: 0.15,
          side: THREE.DoubleSide,
        });
        const sphereMaterial2 = new THREE.MeshStandardMaterial({
          color: 0x063970,
          metalness: 1.0,
          roughness: 0,
          side: THREE.DoubleSide,
        });

        const allMeshes: { mesh: THREE.Mesh; size: number }[] = [];
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.computeBoundingBox();
            const box = mesh.geometry.boundingBox!;
            const sizeX = box.max.x - box.min.x;
            const sizeY = box.max.y - box.min.y;
            const sizeZ = box.max.z - box.min.z;
            allMeshes.push({ mesh, size: Math.max(sizeX, sizeY, sizeZ) });
          }
        });

        allMeshes.sort((a, b) => b.size - a.size);

        if (allMeshes.length > 0) {
          const absoluteLargest = allMeshes[0].size;
          for (const entry of allMeshes) {
            if (entry.size > absoluteLargest * 0.9) {
              entry.mesh.material = sphereMaterial2;
            } else if (entry.size > absoluteLargest * 0.77) {
              entry.mesh.material = sphereMaterial;
            } else {
              entry.mesh.material = planeMaterial;
            }
          }
        }

        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        object.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        controls.minDistance = maxDim * 0.1;
        controls.maxDistance = maxDim * 10;

        const isMobile = window.innerWidth <= 880;
        if (isMobile) {
          camera.position.set(maxDim * 0.8, maxDim * 0.4, maxDim * 0.8);
          controls.target.set(0, 0, 0);
        } else {
          camera.position.set(maxDim * 0.9, maxDim * 0.4, maxDim * 0.7);
          controls.target.set(-maxDim * 0.6, 0, 0);
        }
        controls.update();

        scene.add(object);
        myModel = object;
      },
      undefined,
      (error) => console.error('Error loading OBJ:', error)
    );

    function onCanvasMouseDown() {
      canvas!.style.cursor = 'grabbing';
    }
    function onCanvasMouseUp() {
      canvas!.style.cursor = 'grab';
    }
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mouseup', onCanvasMouseUp);

    function onControlsStart() {
      controls.autoRotate = false;
      clearTimeout(idleTimer);
    }
    function onControlsEnd() {
      idleTimer = setTimeout(() => {
        controls.autoRotate = true;
      }, 3000);
    }
    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('end', onControlsEnd);

    function onResize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    function onPointerDown(e: PointerEvent) {
      isDragging = true;
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
      canvas!.style.cursor = 'grabbing';
    }
    function onPointerMove(e: PointerEvent) {
      if (isDragging && myModel) {
        const deltaMove = {
          x: e.offsetX - previousMousePosition.x,
          y: e.offsetY - previousMousePosition.y,
        };
        myModel.rotation.y += deltaMove.x * 0.005;
        myModel.rotation.x += deltaMove.y * 0.005;
      }
      previousMousePosition = { x: e.offsetX, y: e.offsetY };
    }
    function onPointerUp() {
      isDragging = false;
      canvas!.style.cursor = 'grab';
    }
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    function animate() {
      rafId = requestAnimationFrame(animate);
      controls.update();
      if (myModel && !isDragging) {
        myModel.rotation.y += 0.002;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(idleTimer);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onCanvasMouseDown);
      canvas.removeEventListener('mouseup', onCanvasMouseUp);
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('end', onControlsEnd);
      controls.dispose();
      renderer.dispose();
      pmremGenerator.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
    };
  }, []);

  return (
    <div
      id="hero-bg"
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, zIndex: 0, cursor: 'grab' }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 24,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-soft)',
          letterSpacing: '.05em',
          pointerEvents: 'none',
        }}
      >
        DRAG BACKGROUND TO ROTATE
      </div>
      <div ref={tooltipRef} className="coord-tooltip">
        <span>X</span> 0<br /><span>Y</span> 0<br /><span>Z</span> 0
      </div>
    </div>
  );
}
