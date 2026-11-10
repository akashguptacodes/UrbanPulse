import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Radio,
  Globe2,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface CityHotspot {
  name: string;
  country: string;
  lat: number;
  lng: number;
  complaintsResolved: number;
  activeTriage: number;
  status: 'OPTIMAL' | 'ACTIVE_RESPONSE' | 'SURGE_MONITORED';
}

const CIVIC_HOTSPOTS: CityHotspot[] = [
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006, complaintsResolved: 1420, activeTriage: 18, status: 'OPTIMAL' },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, complaintsResolved: 1180, activeTriage: 12, status: 'OPTIMAL' },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, complaintsResolved: 1890, activeTriage: 8, status: 'OPTIMAL' },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209, complaintsResolved: 2310, activeTriage: 42, status: 'ACTIVE_RESPONSE' },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194, complaintsResolved: 940, activeTriage: 15, status: 'OPTIMAL' },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, complaintsResolved: 860, activeTriage: 9, status: 'OPTIMAL' },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, complaintsResolved: 1640, activeTriage: 4, status: 'OPTIMAL' },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, complaintsResolved: 790, activeTriage: 7, status: 'OPTIMAL' },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, complaintsResolved: 1270, activeTriage: 26, status: 'ACTIVE_RESPONSE' },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219, complaintsResolved: 630, activeTriage: 14, status: 'SURGE_MONITORED' },
];

const CIVIC_ARCS = [
  { from: 'London', to: 'New York' },
  { from: 'New York', to: 'San Francisco' },
  { from: 'London', to: 'Paris' },
  { from: 'Paris', to: 'New Delhi' },
  { from: 'New Delhi', to: 'Singapore' },
  { from: 'Singapore', to: 'Tokyo' },
  { from: 'Singapore', to: 'Sydney' },
  { from: 'New York', to: 'São Paulo' },
  { from: 'London', to: 'Nairobi' },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Procedural canvas-generated Earth map texture with continents & city lighting
 */
function createEarthCanvasTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep ocean base gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#051813');
  oceanGrad.addColorStop(0.5, '#07201a');
  oceanGrad.addColorStop(1, '#051813');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Graticule grid lines (lat/long grid)
  ctx.strokeStyle = 'rgba(22, 133, 106, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += width / 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += height / 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Approximate procedural landmasses
  ctx.fillStyle = '#0f382e';
  ctx.strokeStyle = '#185949';
  ctx.lineWidth = 2;

  const toX = (lng: number) => ((lng + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  const continents: Array<Array<[number, number]>> = [
    // North America
    [
      [-168, 65], [-140, 70], [-100, 74], [-70, 68], [-55, 50],
      [-65, 42], [-75, 35], [-80, 25], [-90, 18], [-105, 20],
      [-120, 34], [-125, 48], [-140, 58], [-168, 65]
    ],
    // South America
    [
      [-80, 10], [-60, 5], [-35, -5], [-38, -18], [-52, -32],
      [-68, -55], [-75, -45], [-72, -20], [-80, -2], [-80, 10]
    ],
    // Eurasia
    [
      [-10, 36], [10, 38], [25, 36], [35, 30], [55, 25],
      [75, 10], [80, 15], [90, 22], [105, 10], [120, 22],
      [140, 36], [142, 50], [170, 65], [180, 70], [110, 75],
      [60, 70], [30, 70], [15, 60], [-5, 58], [-10, 44], [-10, 36]
    ],
    // Africa
    [
      [-17, 15], [-5, 36], [10, 37], [30, 32], [50, 12],
      [42, -12], [32, -30], [18, -34], [12, -15], [8, 4],
      [-17, 15]
    ],
    // Australia
    [
      [114, -22], [124, -14], [138, -12], [146, -18], [152, -28],
      [150, -38], [138, -36], [128, -32], [116, -34], [114, -22]
    ],
    // Greenland
    [
      [-55, 60], [-20, 70], [-25, 82], [-60, 82], [-55, 60]
    ],
    // India sub-peninsula enhancement
    [
      [68, 24], [78, 8], [88, 22], [78, 30], [68, 24]
    ]
  ];

  continents.forEach((poly) => {
    ctx.beginPath();
    poly.forEach(([lng, lat], idx) => {
      const px = toX(lng);
      const py = toY(lat);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // 4. Dot-matrix land points overlay to give a high-tech civic tech appearance
  for (let lat = -80; lat <= 80; lat += 4) {
    for (let lng = -180; lng <= 180; lng += 4) {
      const px = toX(lng);
      const py = toY(lat);
      if (ctx.isPointInPath(px, py)) {
        // Draw small tech pixel dots
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
        ctx.fill();
      }
    }
  }

  // 5. City lights clusters (soft amber/lime glow)
  const cityClusters = [
    [-74, 40], [-122, 37], [-0.1, 51], [2.3, 48], [77, 28],
    [139, 35], [103, 1.3], [151, -33], [-46, -23], [36, -1.2],
    [121, 31], [114, 22], [13, 52], [55, 25], [-87, 41]
  ];

  cityClusters.forEach(([lng, lat]) => {
    const cx = toX(lng);
    const cy = toY(lat);
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    radGrad.addColorStop(0, 'rgba(185, 231, 105, 0.9)');
    radGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.6)');
    radGrad.addColorStop(1, 'rgba(18, 59, 50, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export const CivicGlobe: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredCity, setHoveredCity] = useState<CityHotspot | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Interactive controls ref
  const controlsRef = useRef({
    autoRotate: true,
    isPointerDown: false,
    pointerX: 0,
    pointerY: 0,
    targetRotationY: 0,
    targetRotationX: 0.15,
    rotationY: 0,
    rotationX: 0.15,
  });

  useEffect(() => {
    controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 2.7;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xddf4e9, 1.8);
    dirLight1.position.set(5, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xb9e769, 0.6);
    dirLight2.position.set(-5, -2, -2);
    scene.add(dirLight2);

    // --- Globe Root Group ---
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const GLOBE_RADIUS = 0.95;

    // 1. Earth Body Sphere
    const earthTexture = createEarthCanvasTexture();
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.75,
      metalness: 0.1,
      bumpScale: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeGroup.add(earthMesh);

    // 2. Atmosphere Glow Outer Sphere
    const atmoGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x16856a,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    globeGroup.add(atmoMesh);

    // 3. Orbital Survey Grid Rings
    const orbitRingGeo = new THREE.RingGeometry(GLOBE_RADIUS * 1.15, GLOBE_RADIUS * 1.155, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x16856a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.3;
    globeGroup.add(orbitRing);

    // 4. Hotspot Beacons & Pulse Rings
    const pulseObjects: Array<{ mesh: THREE.Mesh; initialScale: number; speed: number }> = [];
    const hotspotRaycastMeshes: THREE.Mesh[] = [];

    CIVIC_HOTSPOTS.forEach((spot) => {
      const pos = latLngToVector3(spot.lat, spot.lng, GLOBE_RADIUS * 1.006);

      // Core beacon pin
      const pinGeo = new THREE.SphereGeometry(0.016, 16, 16);
      const isSurge = spot.status === 'ACTIVE_RESPONSE' || spot.status === 'SURGE_MONITORED';
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSurge ? 0xf59e0b : 0xb9e769,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      pinMesh.userData = { spot };
      globeGroup.add(pinMesh);
      hotspotRaycastMeshes.push(pinMesh);

      // Animated Expanding Pulse Ring
      const ringGeo = new THREE.RingGeometry(0.02, 0.026, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isSurge ? 0xf59e0b : 0x34d399,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(pos.clone().multiplyScalar(2));
      globeGroup.add(ringMesh);

      pulseObjects.push({
        mesh: ringMesh,
        initialScale: 1,
        speed: 0.018 + Math.random() * 0.008,
      });
    });

    // 5. Arcs Connecting Municipal Hubs
    const cityMap = new Map(CIVIC_HOTSPOTS.map((s) => [s.name, s]));
    const arcMaterials: THREE.LineBasicMaterial[] = [];

    CIVIC_ARCS.forEach((arcPair) => {
      const cityA = cityMap.get(arcPair.from);
      const cityB = cityMap.get(arcPair.to);
      if (!cityA || !cityB) return;

      const pA = latLngToVector3(cityA.lat, cityA.lng, GLOBE_RADIUS * 1.005);
      const pB = latLngToVector3(cityB.lat, cityB.lng, GLOBE_RADIUS * 1.005);

      // Compute elevated midpoint for 3D trajectory curve
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
      const dist = pA.distanceTo(pB);
      mid.setLength(GLOBE_RADIUS * (1.05 + dist * 0.18));

      const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
      const points = curve.getPoints(40);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

      const curveMat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.35,
      });
      arcMaterials.push(curveMat);

      const line = new THREE.Line(curveGeo, curveMat);
      globeGroup.add(line);
    });

    // --- Interactive Drag & Orbit Handling ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      controlsRef.current.isPointerDown = true;
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      controlsRef.current.pointerX = clientX;
      controlsRef.current.pointerY = clientY;
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      if (controlsRef.current.isPointerDown) {
        const deltaX = clientX - controlsRef.current.pointerX;
        const deltaY = clientY - controlsRef.current.pointerY;

        controlsRef.current.targetRotationY += deltaX * 0.006;
        controlsRef.current.targetRotationX += deltaY * 0.006;

        // Clamp vertical rotation so globe doesn't invert
        controlsRef.current.targetRotationX = Math.max(
          -Math.PI / 2.3,
          Math.min(Math.PI / 2.3, controlsRef.current.targetRotationX)
        );

        controlsRef.current.pointerX = clientX;
        controlsRef.current.pointerY = clientY;
      }

      // Raycast for hover detection on cities
      const rect = container.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspotRaycastMeshes);

      if (intersects.length > 0) {
        const spot = intersects[0].object.userData.spot as CityHotspot;
        setHoveredCity(spot);
        container.style.cursor = 'pointer';
      } else {
        setHoveredCity(null);
        container.style.cursor = controlsRef.current.isPointerDown ? 'grabbing' : 'grab';
      }
    };

    const onPointerUp = () => {
      controlsRef.current.isPointerDown = false;
      setIsDragging(false);
      container.style.cursor = 'grab';
    };

    // Zoom clamped via wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.0015;
      camera.position.z = Math.max(1.8, Math.min(3.8, camera.position.z));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // Handle Resize
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // --- Animation Loop ---
    let animationFrameId: number;
    let pulseTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Auto-rotation when idle
      if (controlsRef.current.autoRotate && !controlsRef.current.isPointerDown) {
        controlsRef.current.targetRotationY += 0.0022;
      }

      // Smooth inertia damping
      controlsRef.current.rotationY +=
        (controlsRef.current.targetRotationY - controlsRef.current.rotationY) * 0.08;
      controlsRef.current.rotationX +=
        (controlsRef.current.targetRotationX - controlsRef.current.rotationX) * 0.08;

      globeGroup.rotation.y = controlsRef.current.rotationY;
      globeGroup.rotation.x = controlsRef.current.rotationX;

      // Pulse beacon rings
      pulseTime += 0.035;
      pulseObjects.forEach((p, idx) => {
        const scale = 1 + ((pulseTime * p.speed * 20 + idx) % 2.5);
        p.mesh.scale.set(scale, scale, scale);
        const opacity = Math.max(0, 1 - scale / 2.5);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.7;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);

      earthGeo.dispose();
      earthMat.dispose();
      earthTexture.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      orbitRingGeo.dispose();
      orbitRingMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const resetOrientation = () => {
    controlsRef.current.targetRotationX = 0.15;
    controlsRef.current.targetRotationY = 0;
  };

  const filteredHotspots = useMemo(() => {
    if (selectedStatusFilter === 'ALL') return CIVIC_HOTSPOTS;
    return CIVIC_HOTSPOTS.filter((h) => h.status === selectedStatusFilter);
  }, [selectedStatusFilter]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-forest-950 border border-forest-800 shadow-xl text-white">
      {/* Background glow and ambient grid texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(22,133,106,0.18),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(185,231,105,0.08),transparent_45%)] pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 px-5 sm:px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-800/80">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-lime-300 border border-emerald-400/30">
            <Radio className="w-3.5 h-3.5 text-lime-400 animate-pulse" />
            <span className="uppercase tracking-wider font-bold">Real-Time Municipal Telemetry</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Global Civic Network in Motion
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Drag to rotate the 3D globe freely. UrbanPulse unites decentralized citizen issue reporting
            and autonomous municipal resolution across interconnected districts worldwide.
          </p>
        </div>

        {/* Status Indicators & Interactive Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              autoRotate
                ? 'bg-emerald-600/30 text-lime-300 border-emerald-400/40 shadow-xs'
                : 'bg-white/10 text-slate-300 border-white/20 hover:bg-white/15'
            }`}
            title="Toggle autonomous globe spin"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Auto Spin: {autoRotate ? 'ON' : 'PAUSED'}</span>
          </button>

          <button
            onClick={resetOrientation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/20 transition-all active:scale-95"
            title="Reset to prime meridian orientation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Canvas & Interactive Overlay Grid */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Three.js Canvas Container (Left / Center) */}
        <div className="lg:col-span-8 relative flex items-center justify-center overflow-hidden min-h-[460px] sm:min-h-[520px]">
          <div
            ref={mountRef}
            className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing select-none"
          />

          {/* User Interaction Guide */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-forest-900/80 border border-forest-700/80 backdrop-blur-md text-[11px] text-slate-300 shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${
                isDragging ? 'bg-lime-400 scale-125' : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span>
              {isDragging
                ? 'Rotating 3D Earth model...'
                : 'Click & drag to freely rotate 3D Earth • Scroll to zoom'}
            </span>
          </div>

          {/* Hover City Tooltip Card */}
          {hoveredCity && (
            <div className="absolute top-6 left-6 z-30 p-3.5 rounded-md bg-forest-900/95 border border-forest-600 shadow-2xl backdrop-blur-md text-xs space-y-1.5 pointer-events-none animate-fadeIn min-w-[210px]">
              <div className="flex items-center justify-between gap-2 border-b border-forest-700 pb-1.5">
                <span className="font-display font-bold text-sm text-white">
                  {hoveredCity.name}, {hoveredCity.country}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    hoveredCity.status === 'OPTIMAL'
                      ? 'bg-emerald-500/20 text-lime-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {hoveredCity.status}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Verified Resolved:</span>
                <span className="font-mono font-bold text-lime-300">{hoveredCity.complaintsResolved}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Active Triage Tickets:</span>
                <span className="font-mono font-bold text-white">{hoveredCity.activeTriage}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                GPS: {hoveredCity.lat.toFixed(2)}°, {hoveredCity.lng.toFixed(2)}°
              </div>
            </div>
          )}
        </div>

        {/* Right Telemetry Drawer & Municipal Zones */}
        <div className="lg:col-span-4 p-5 sm:p-6 bg-forest-900/60 border-t lg:border-t-0 lg:border-l border-forest-800/80 flex flex-col justify-between space-y-5 backdrop-blur-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-lime-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-lime-400" />
                <span>Monitored Civic Zones</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 bg-forest-950 px-2 py-0.5 rounded border border-forest-800">
                {CIVIC_HOTSPOTS.length} Active Hubs
              </span>
            </div>

            {/* Quick Status Pill Filter */}
            <div className="flex gap-1.5 text-[11px]">
              {(['ALL', 'OPTIMAL', 'ACTIVE_RESPONSE'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
                    selectedStatusFilter === st
                      ? 'bg-lime-400 text-forest-950 font-bold'
                      : 'bg-forest-950/70 text-slate-300 border border-forest-800 hover:bg-forest-800'
                  }`}
                >
                  {st === 'ALL' ? 'All Hubs' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Scrollable Hubs List */}
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 text-xs">
              {filteredHotspots.map((spot) => {
                const isSelected = hoveredCity?.name === spot.name;
                return (
                  <div
                    key={spot.name}
                    onMouseEnter={() => setHoveredCity(spot)}
                    onMouseLeave={() => setHoveredCity(null)}
                    className={`p-2.5 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-forest-800 border-lime-400 shadow-sm'
                        : 'bg-forest-950/70 border-forest-800/80 hover:border-forest-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{spot.name}</span>
                      <span className="text-[10px] text-lime-300 font-mono font-semibold">
                        {spot.complaintsResolved} solved
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{spot.country}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {spot.activeTriage} in triage
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Data Trust Assurance */}
          <div className="p-3.5 rounded-md bg-forest-950/80 border border-forest-800 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-lime-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Global Dispatch Protocol</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Every complaint is geocoded against spherical coordinate indexes, enabling instant reverse lookups and autonomous multi-agent duplicate detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
