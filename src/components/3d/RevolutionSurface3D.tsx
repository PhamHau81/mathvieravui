import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RevolutionPreset, ProfilePoint } from '../../types/math';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  FastForward,
  Rewind,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Palette,
  Maximize2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Compass,
  Box,
  Repeat,
  Flame,
} from 'lucide-react';

// Color themes for the swept surface of revolution
interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  ambient: string;
  tailwindBg: string;
}

const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cyan',
    name: 'Lam Ngọc (Cyan Neon)',
    primary: '#06b6d4',
    secondary: '#22d3ee',
    ambient: '#083344',
    tailwindBg: 'bg-cyan-500',
  },
  {
    id: 'amber',
    name: 'Hổ Phách (Neon Amber)',
    primary: '#f59e0b',
    secondary: '#fbbf24',
    ambient: '#451a03',
    tailwindBg: 'bg-amber-500',
  },
  {
    id: 'emerald',
    name: 'Lục Bảo (Emerald Green)',
    primary: '#10b981',
    secondary: '#34d399',
    ambient: '#022c22',
    tailwindBg: 'bg-emerald-500',
  },
  {
    id: 'violet',
    name: 'Tím Thạch Anh (Electric Violet)',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    ambient: '#2e1065',
    tailwindBg: 'bg-violet-500',
  },
  {
    id: 'rose',
    name: 'San Hô (Ruby Rose)',
    primary: '#f43f5e',
    secondary: '#fb7185',
    ambient: '#4c0519',
    tailwindBg: 'bg-rose-500',
  },
  {
    id: 'blue',
    name: 'Đại Dương (Royal Blue)',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    ambient: '#172554',
    tailwindBg: 'bg-blue-500',
  },
];

// Helper to create 2D text billboard sprite
function createTextSprite(
  text: string,
  color = '#ffffff',
  bgColor = 'rgba(15, 23, 42, 0.85)',
  borderColor = '#38bdf8'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, 160, 64);
  // Rounded pill background
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(8, 8, 144, 48, 12);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Text
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 80, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.8, 0.32, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export const RevolutionSurface3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Core Preset Selection
  const [preset, setPreset] = useState<RevolutionPreset>('cone');

  // Curve geometry parameters
  const [paramR, setParamR] = useState<number>(2.2); // Base radius R or main radius
  const [paramR2, setParamR2] = useState<number>(1.2); // Top radius for frustum, or tube radius for torus
  const [paramH, setParamH] = useState<number>(3.2); // Height
  const [paramCurvature, setParamCurvature] = useState<number>(1.0); // For paraboloid/hyperboloid/vase

  // Swept angle theta (in degrees: 0° to 360°)
  const [sweepAngleDeg, setSweepAngleDeg] = useState<number>(270);
  const sweepAngleDegRef = useRef(sweepAngleDeg);
  sweepAngleDegRef.current = sweepAngleDeg;

  // Auto Revolution Animation States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1.0); // 0.5x, 1x, 1.5x, 2x, 3x
  const [loopMode, setLoopMode] = useState<'ping-pong' | 'once' | 'infinite'>('loop' as any || 'ping-pong');
  const animDirectionRef = useRef<number>(1); // +1 = sweeping forward, -1 = sweeping backward

  // Visual Styling & Toggles
  const [activeColorTheme, setActiveColorTheme] = useState<string>('cyan');
  const [surfaceOpacity, setSurfaceOpacity] = useState<number>(0.72);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showParallelCircles, setShowParallelCircles] = useState<boolean>(true);
  const [showInitialCurve, setShowInitialCurve] = useState<boolean>(true);
  const [showCurrentCurve, setShowCurrentCurve] = useState<boolean>(true);
  const [showSweepRadii, setShowSweepRadii] = useState<boolean>(true);
  const [showAxisDelta, setShowAxisDelta] = useState<boolean>(true);
  const [showCaps, setShowCaps] = useState<boolean>(false); // Solid caps vs hollow surface
  const [showGridFloor, setShowGridFloor] = useState<boolean>(true);
  const [autoRotateCamera, setAutoRotateCamera] = useState<boolean>(false);

  // Left sidebar & active panel tab
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'preset' | 'sweep' | 'style' | 'theory'>('preset');

  // Custom draggable/editable profile points
  const [customPoints, setCustomPoints] = useState<ProfilePoint[]>([
    { r: 0.1, y: 3.5, label: 'Đỉnh' },
    { r: 1.8, y: 2.2, label: 'Thân trên' },
    { r: 0.9, y: 1.2, label: 'Cổ thắt' },
    { r: 2.3, y: 0.0, label: 'Đáy' },
  ]);

  // Selected Theme Object
  const currentTheme = useMemo(() => {
    return COLOR_THEMES.find((t) => t.id === activeColorTheme) || COLOR_THEMES[0];
  }, [activeColorTheme]);

  // Generate Profile Points C(r, y) based on active preset
  const profilePoints = useMemo<ProfilePoint[]>(() => {
    const pts: ProfilePoint[] = [];
    const N = 40; // Samples along the curve

    switch (preset) {
      case 'cone': {
        // Line from apex S(0, H) to base A(R, 0)
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const y = paramH * (1 - t);
          const r = paramR * t;
          pts.push({ r, y });
        }
        break;
      }
      case 'cone-frustum': {
        // Truncated cone from top A(R2, H) to bottom B(R, 0)
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const y = paramH * (1 - t);
          const r = paramR2 + (paramR - paramR2) * t;
          pts.push({ r, y });
        }
        break;
      }
      case 'cylinder': {
        // Line parallel to axis at distance R, from y = H to y = 0
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const y = paramH * (1 - t);
          pts.push({ r: paramR, y });
        }
        break;
      }
      case 'sphere': {
        // Semicircle of radius R from top (0, R) to bottom (0, -R)
        // Center at (0, 0)
        for (let i = 0; i <= N; i++) {
          const phi = (Math.PI / 2) - (Math.PI * i) / N; // from PI/2 down to -PI/2
          const y = paramR * Math.sin(phi);
          const r = paramR * Math.cos(phi);
          pts.push({ r, y });
        }
        break;
      }
      case 'torus': {
        // Circle of radius R2 offset by R from axis
        // phi from 0 to 2*PI
        const torusN = 48;
        for (let i = 0; i <= torusN; i++) {
          const phi = (2 * Math.PI * i) / torusN;
          const y = paramR2 * Math.sin(phi);
          const r = Math.max(0.01, paramR + paramR2 * Math.cos(phi));
          pts.push({ r, y });
        }
        break;
      }
      case 'paraboloid': {
        // Parabola r = paramR * sqrt(y / H) => from y = H to y = 0
        for (let i = 0; i <= N; i++) {
          const t = 1 - i / N;
          const y = paramH * t;
          const r = paramR * Math.sqrt(Math.max(0, y / paramH)) * paramCurvature;
          pts.push({ r, y });
        }
        break;
      }
      case 'hyperboloid': {
        // 1-sheet hyperboloid: r(y) = sqrt(R_min^2 + k*y^2) with center at y = 0
        const halfH = paramH / 2;
        for (let i = 0; i <= N; i++) {
          const y = halfH - (paramH * i) / N; // from +halfH to -halfH
          const r = Math.sqrt(Math.pow(paramR2, 2) + Math.pow((y / halfH) * (paramR - paramR2) * paramCurvature, 2));
          pts.push({ r, y });
        }
        break;
      }
      case 'vase': {
        // Artistic vase curve: r(y) = R_base + wave
        for (let i = 0; i <= N; i++) {
          const y = paramH * (1 - i / N);
          const phase = (y / paramH) * Math.PI * 2.2;
          const r = Math.max(
            0.2,
            paramR * 0.65 + Math.sin(phase) * 0.7 * paramCurvature + Math.cos(phase * 1.8) * 0.3
          );
          pts.push({ r, y });
        }
        break;
      }
      case 'custom': {
        // Interpolate custom control points with Catmull-Rom or linear
        if (customPoints.length < 2) {
          pts.push({ r: paramR, y: 0 }, { r: 0.1, y: paramH });
        } else {
          // Linear / Subdivided interpolation
          for (let seg = 0; seg < customPoints.length - 1; seg++) {
            const pA = customPoints[seg];
            const pB = customPoints[seg + 1];
            const segSteps = Math.floor(N / (customPoints.length - 1));
            for (let s = 0; s < segSteps; s++) {
              const t = s / segSteps;
              pts.push({
                r: pA.r + (pB.r - pA.r) * t,
                y: pA.y + (pB.y - pA.y) * t,
              });
            }
          }
          const last = customPoints[customPoints.length - 1];
          pts.push({ r: last.r, y: last.y });
        }
        break;
      }
    }
    return pts;
  }, [preset, paramR, paramR2, paramH, paramCurvature, customPoints]);

  // Compute geometrical statistics for display & formulas
  const mathStats = useMemo(() => {
    let l_length = 0;
    for (let i = 0; i < profilePoints.length - 1; i++) {
      const p1 = profilePoints[i];
      const p2 = profilePoints[i + 1];
      l_length += Math.hypot(p2.r - p1.r, p2.y - p1.y);
    }

    let S_xq = 0;
    let V_solid = 0;
    for (let i = 0; i < profilePoints.length - 1; i++) {
      const p1 = profilePoints[i];
      const p2 = profilePoints[i + 1];
      const r_mid = (p1.r + p2.r) / 2;
      const dl = Math.hypot(p2.r - p1.r, p2.y - p1.y);
      const dy = Math.abs(p2.y - p1.y);
      // Swept surface segment area: 2 * pi * r * dl
      S_xq += 2 * Math.PI * r_mid * dl;
      // Truncated cone slice volume: (pi * dy / 3) * (r1^2 + r2^2 + r1*r2)
      V_solid += (Math.PI * dy / 3) * (p1.r * p1.r + p2.r * p2.r + p1.r * p2.r);
    }

    const currentFraction = sweepAngleDeg / 360;
    const partial_S = S_xq * currentFraction;
    const partial_V = V_solid * currentFraction;

    return {
      length: l_length,
      S_xq,
      partial_S,
      V_solid,
      partial_V,
      maxR: Math.max(...profilePoints.map((p) => p.r)),
      minY: Math.min(...profilePoints.map((p) => p.y)),
      maxY: Math.max(...profilePoints.map((p) => p.y)),
    };
  }, [profilePoints, sweepAngleDeg]);

  // Animation Loop for Auto Sweep
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime: number | null = null;

    const tick = (time: number) => {
      if (lastTime === null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Base: full 360° revolution takes 4 seconds at 1x
      const degPerSec = (360 / 3.8) * playSpeed;
      const step = degPerSec * dt * animDirectionRef.current;

      setSweepAngleDeg((prev) => {
        let next = prev + step;

        if (loopMode === 'ping-pong') {
          if (next >= 360) {
            next = 360;
            animDirectionRef.current = -1;
          } else if (next <= 1) {
            next = 1;
            animDirectionRef.current = 1;
          }
        } else if (loopMode === 'once') {
          if (next >= 360) {
            next = 360;
            setIsPlaying(false);
          }
        } else {
          // Infinite continuous loop 0 -> 360 -> 0
          if (next >= 360) {
            next = 0;
          }
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playSpeed, loopMode]);

  // Main Three.js Scene Setup & Render
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16); // Deep slate space

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6.5, 4.8, 7.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, mathStats.minY + (mathStats.maxY - mathStats.minY) / 2, 0);
    controls.autoRotate = autoRotateCamera;
    controls.autoRotateSpeed = 1.2;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(8, 14, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6); // Cyan fill
    dirLight2.position.set(-8, -4, -10);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xfacc15, 0.8, 20); // Warm accent
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);

    // Dynamic Group for all geometric objects
    const geomGroup = new THREE.Group();
    scene.add(geomGroup);

    // Grid Floor
    if (showGridFloor) {
      const grid = new THREE.GridHelper(14, 28, 0x334155, 0x1e293b);
      grid.position.y = mathStats.minY - 0.02;
      geomGroup.add(grid);
    }

    // 1. BUILD AXIS DELTA
    if (showAxisDelta) {
      const axisYMin = mathStats.minY - 1.2;
      const axisYMax = mathStats.maxY + 1.2;
      const axisLen = axisYMax - axisYMin;

      // Axis Line/Cylinder
      const axisGeom = new THREE.CylinderGeometry(0.025, 0.025, axisLen, 16);
      const axisMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const axisMesh = new THREE.Mesh(axisGeom, axisMat);
      axisMesh.position.set(0, (axisYMin + axisYMax) / 2, 0);
      geomGroup.add(axisMesh);

      // Top arrow cone
      const coneGeom = new THREE.ConeGeometry(0.12, 0.35, 16);
      const coneMesh = new THREE.Mesh(coneGeom, axisMat);
      coneMesh.position.set(0, axisYMax, 0);
      geomGroup.add(coneMesh);

      // Bottom arrow / base cap
      const sphereGeom = new THREE.SphereGeometry(0.08, 16, 16);
      const baseSphere = new THREE.Mesh(sphereGeom, axisMat);
      baseSphere.position.set(0, axisYMin, 0);
      geomGroup.add(baseSphere);

      // Axis Label Sprite
      const axisSprite = createTextSprite('Trục quay Δ', '#38bdf8', 'rgba(15, 23, 42, 0.9)', '#0284c7');
      axisSprite.position.set(0.65, axisYMax + 0.2, 0);
      geomGroup.add(axisSprite);

      // Curved rotation direction ring around axis
      const ringCurve = new THREE.EllipseCurve(0, 0, 0.6, 0.6, 0, Math.PI * 1.5, false, 0);
      const ringPts = ringCurve.getPoints(32).map((p) => new THREE.Vector3(p.x, axisYMax - 0.4, p.y));
      const ringGeom = new THREE.BufferGeometry().setFromPoints(ringPts);
      const ringMat = new THREE.LineDashedMaterial({
        color: 0xfacc15,
        dashSize: 0.08,
        gapSize: 0.04,
      });
      const ringLine = new THREE.Line(ringGeom, ringMat);
      ringLine.computeLineDistances();
      geomGroup.add(ringLine);

      // Small arrow head at end of ring curve
      const arrowPt = ringPts[ringPts.length - 1];
      const arrowHeadGeom = new THREE.ConeGeometry(0.06, 0.16, 12);
      const arrowHeadMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const arrowHead = new THREE.Mesh(arrowHeadGeom, arrowHeadMat);
      arrowHead.position.copy(arrowPt);
      arrowHead.rotation.z = Math.PI / 2;
      geomGroup.add(arrowHead);
    }

    // 2. BUILD INITIAL CURVE C0 (At theta = 0)
    if (showInitialCurve && profilePoints.length > 0) {
      const c0Pts = profilePoints.map((p) => new THREE.Vector3(p.r, p.y, 0));
      const c0Geom = new THREE.BufferGeometry().setFromPoints(c0Pts);
      const c0Mat = new THREE.LineDashedMaterial({
        color: 0x94a3b8, // Light slate
        dashSize: 0.12,
        gapSize: 0.06,
        transparent: true,
        opacity: 0.65,
      });
      const c0Line = new THREE.Line(c0Geom, c0Mat);
      c0Line.computeLineDistances();
      geomGroup.add(c0Line);

      // Label for C0
      if (profilePoints.length > 0) {
        const midIdx = Math.floor(profilePoints.length / 2);
        const midP = profilePoints[midIdx];
        const c0Sprite = createTextSprite('C (ban đầu)', '#94a3b8', 'rgba(15, 23, 42, 0.85)', '#475569');
        c0Sprite.position.set(midP.r + 0.45, midP.y, 0);
        geomGroup.add(c0Sprite);
      }
    }

    // Convert degrees to radians
    const thetaRad = (sweepAngleDeg * Math.PI) / 180;

    // 3. BUILD SWEPT SURFACE OF REVOLUTION
    if (thetaRad > 0.005 && profilePoints.length > 1) {
      const numRadialSegs = Math.max(4, Math.round((sweepAngleDeg / 360) * 64));
      const numHeightSegs = profilePoints.length - 1;

      const vertices: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];

      for (let j = 0; j <= numRadialSegs; j++) {
        const phi = (j / numRadialSegs) * thetaRad;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        for (let i = 0; i <= numHeightSegs; i++) {
          const pt = profilePoints[i];
          const x = pt.r * cosPhi;
          const y = pt.y;
          const z = pt.r * sinPhi;

          vertices.push(x, y, z);
          uvs.push(j / numRadialSegs, i / numHeightSegs);
        }
      }

      const stride = numHeightSegs + 1;
      for (let j = 0; j < numRadialSegs; j++) {
        for (let i = 0; i < numHeightSegs; i++) {
          const a = j * stride + i;
          const b = (j + 1) * stride + i;
          const c = (j + 1) * stride + (i + 1);
          const d = j * stride + (i + 1);

          // Two triangles for quad face
          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const surfaceGeom = new THREE.BufferGeometry();
      surfaceGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      surfaceGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      surfaceGeom.setIndex(indices);
      surfaceGeom.computeVertexNormals();

      // Main Swept Material - Highly distinguishable distinct color!
      const surfaceMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(currentTheme.primary),
        emissive: new THREE.Color(currentTheme.ambient),
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.15,
        transmission: 0.1, // Glassy luster
        transparent: true,
        opacity: surfaceOpacity,
        side: THREE.DoubleSide,
        depthWrite: false, // Clean rendering for transparent surfaces
      });

      const surfaceMesh = new THREE.Mesh(surfaceGeom, surfaceMat);
      geomGroup.add(surfaceMesh);

      // Wireframe overlay for 3D depth and meridian/parallel circles
      if (showWireframe) {
        const wireframeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(currentTheme.secondary),
          wireframe: true,
          transparent: true,
          opacity: 0.25,
        });
        const wireMesh = new THREE.Mesh(surfaceGeom, wireframeMat);
        geomGroup.add(wireMesh);
      }

      // Parallel circular swept trails (Vĩ tuyến)
      if (showParallelCircles) {
        const sampleStep = Math.max(1, Math.floor(profilePoints.length / 8));
        for (let i = 0; i < profilePoints.length; i += sampleStep) {
          const pt = profilePoints[i];
          if (pt.r < 0.05) continue;

          const arcCurve = new THREE.EllipseCurve(0, 0, pt.r, pt.r, 0, thetaRad, false, 0);
          const arcPoints = arcCurve.getPoints(Math.max(8, Math.round(numRadialSegs * 0.75)));
          const arc3d = arcPoints.map((p) => new THREE.Vector3(p.x, pt.y, p.y));
          const arcGeom = new THREE.BufferGeometry().setFromPoints(arc3d);
          const arcMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(currentTheme.secondary),
            transparent: true,
            opacity: 0.55,
          });
          const arcLine = new THREE.Line(arcGeom, arcMat);
          geomGroup.add(arcLine);
        }
      }

      // Caps (Mặt đáy nón/trụ khi cần xem khối tròn xoay)
      if (showCaps && thetaRad > 0.05) {
        const capMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(currentTheme.secondary),
          transparent: true,
          opacity: surfaceOpacity * 0.9,
          side: THREE.DoubleSide,
        });

        // Top cap if radius > 0
        const topP = profilePoints[0];
        if (topP.r > 0.05) {
          const topFanVerts: number[] = [0, topP.y, 0];
          const topIndices: number[] = [];
          for (let j = 0; j <= numRadialSegs; j++) {
            const phi = (j / numRadialSegs) * thetaRad;
            topFanVerts.push(topP.r * Math.cos(phi), topP.y, topP.r * Math.sin(phi));
            if (j > 0) {
              topIndices.push(0, j, j + 1);
            }
          }
          const topCapGeom = new THREE.BufferGeometry();
          topCapGeom.setAttribute('position', new THREE.Float32BufferAttribute(topFanVerts, 3));
          topCapGeom.setIndex(topIndices);
          topCapGeom.computeVertexNormals();
          geomGroup.add(new THREE.Mesh(topCapGeom, capMat));
        }

        // Bottom cap if radius > 0
        const btmP = profilePoints[profilePoints.length - 1];
        if (btmP.r > 0.05) {
          const btmFanVerts: number[] = [0, btmP.y, 0];
          const btmIndices: number[] = [];
          for (let j = 0; j <= numRadialSegs; j++) {
            const phi = (j / numRadialSegs) * thetaRad;
            btmFanVerts.push(btmP.r * Math.cos(phi), btmP.y, btmP.r * Math.sin(phi));
            if (j > 0) {
              btmIndices.push(0, j + 1, j);
            }
          }
          const btmCapGeom = new THREE.BufferGeometry();
          btmCapGeom.setAttribute('position', new THREE.Float32BufferAttribute(btmFanVerts, 3));
          btmCapGeom.setIndex(btmIndices);
          btmCapGeom.computeVertexNormals();
          geomGroup.add(new THREE.Mesh(btmCapGeom, capMat));
        }
      }
    }

    // 4. BUILD ACTIVE GENERATRIX CURVE C_theta (Leading Edge of Sweep)
    if (showCurrentCurve && profilePoints.length > 0) {
      const cosTheta = Math.cos(thetaRad);
      const sinTheta = Math.sin(thetaRad);

      const activePts = profilePoints.map(
        (p) => new THREE.Vector3(p.r * cosTheta, p.y, p.r * sinTheta)
      );

      // Bright neon glowing line for the generating curve
      const lineGeom = new THREE.BufferGeometry().setFromPoints(activePts);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xfacc15, // Bright Neon Yellow/Amber
        linewidth: 3,
      });
      const activeLine = new THREE.Line(lineGeom, lineMat);
      geomGroup.add(activeLine);

      // Endpoint nodes & labels
      const nodeGeom = new THREE.SphereGeometry(0.075, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
      });

      // Top vertex node
      const topNode = new THREE.Mesh(nodeGeom, nodeMat);
      topNode.position.copy(activePts[0]);
      geomGroup.add(topNode);

      // Bottom vertex node
      const btmNode = new THREE.Mesh(nodeGeom, nodeMat);
      btmNode.position.copy(activePts[activePts.length - 1]);
      geomGroup.add(btmNode);

      // Sprite Label for Moving Generatrix
      const midIdx = Math.floor(profilePoints.length / 2);
      const midPt = activePts[midIdx];
      const genSprite = createTextSprite(
        `Đường sinh C (${Math.round(sweepAngleDeg)}°)`,
        '#facc15',
        'rgba(24, 24, 27, 0.95)',
        '#f59e0b'
      );
      genSprite.position.copy(midPt).add(new THREE.Vector3(0.55 * cosTheta, 0.15, 0.55 * sinTheta));
      geomGroup.add(genSprite);

      // 5. RADIUS SWEEP GUIDES (from axis (0, y, 0) to active generatrix)
      if (showSweepRadii) {
        const radiusPointsToSample = [0, midIdx, profilePoints.length - 1];
        radiusPointsToSample.forEach((idx) => {
          const pt = profilePoints[idx];
          if (pt.r < 0.2) return;

          const axisCenter = new THREE.Vector3(0, pt.y, 0);
          const edgePt = new THREE.Vector3(pt.r * cosTheta, pt.y, pt.r * sinTheta);

          // Dashed guide line
          const rGeom = new THREE.BufferGeometry().setFromPoints([axisCenter, edgePt]);
          const rMat = new THREE.LineDashedMaterial({
            color: 0x22c55e, // Emerald Green
            dashSize: 0.1,
            gapSize: 0.05,
          });
          const rLine = new THREE.Line(rGeom, rMat);
          rLine.computeLineDistances();
          geomGroup.add(rLine);

          // Center axis node
          const centerNode = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x22c55e })
          );
          centerNode.position.copy(axisCenter);
          geomGroup.add(centerNode);

          // Radius Label
          const rMid = axisCenter.clone().lerp(edgePt, 0.5);
          const rSprite = createTextSprite(
            `r = ${pt.r.toFixed(1)}`,
            '#4ade80',
            'rgba(15, 23, 42, 0.85)',
            '#16a34a'
          );
          rSprite.scale.set(0.55, 0.22, 1);
          rSprite.position.copy(rMid).add(new THREE.Vector3(0, 0.18, 0));
          geomGroup.add(rSprite);
        });
      }
    }

    // Animation & Render Loop
    let isMounted = true;
    const animate = () => {
      if (!isMounted) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    profilePoints,
    sweepAngleDeg,
    activeColorTheme,
    surfaceOpacity,
    showWireframe,
    showParallelCircles,
    showInitialCurve,
    showCurrentCurve,
    showSweepRadii,
    showAxisDelta,
    showCaps,
    showGridFloor,
    autoRotateCamera,
    currentTheme,
    mathStats,
  ]);

  // Handler to change presets
  const handleSelectPreset = (p: RevolutionPreset) => {
    setPreset(p);
    if (p === 'cone') {
      setParamR(2.2);
      setParamH(3.2);
    } else if (p === 'cone-frustum') {
      setParamR(2.5);
      setParamR2(1.2);
      setParamH(3.0);
    } else if (p === 'cylinder') {
      setParamR(2.0);
      setParamH(3.2);
    } else if (p === 'sphere') {
      setParamR(2.2);
    } else if (p === 'torus') {
      setParamR(2.4);
      setParamR2(0.9);
    } else if (p === 'paraboloid') {
      setParamR(2.4);
      setParamH(3.0);
      setParamCurvature(1.0);
    } else if (p === 'hyperboloid') {
      setParamR(2.4);
      setParamR2(1.3);
      setParamH(3.5);
      setParamCurvature(1.2);
    } else if (p === 'vase') {
      setParamR(2.2);
      setParamH(3.6);
      setParamCurvature(1.0);
    }
  };

  // Preset Title & SGK description
  const getPresetInfo = () => {
    switch (preset) {
      case 'cone':
        return {
          title: 'Hình Nón Tròn Xoay (Cone)',
          sub: 'SGK Toán 12 - Chương II: Mặt nón, mặt trụ, mặt cầu',
          desc: 'Quay một tam giác vuông quanh một cạnh góc vuông (hoặc quay đoạn thẳng xiên SA cắt trục tại S quanh trục SO).',
          formulaS: 'S_{xq} = \\pi R l',
          formulaV: 'V = \\frac{1}{3} \\pi R^2 h',
          l_value: Math.hypot(paramR, paramH).toFixed(2),
        };
      case 'cone-frustum':
        return {
          title: 'Hình Nón Cụt (Truncated Cone)',
          sub: 'Cắt hình nón bởi mặt phẳng song song đáy',
          desc: 'Quay hình thang vuông quanh cạnh bên vuông góc với hai đáy (đoạn thẳng xiên không cắt trục).',
          formulaS: 'S_{xq} = \\pi (R_1 + R_2) l',
          formulaV: 'V = \\frac{1}{3} \\pi h (R_1^2 + R_2^2 + R_1 R_2)',
          l_value: Math.hypot(paramR - paramR2, paramH).toFixed(2),
        };
      case 'cylinder':
        return {
          title: 'Hình Trụ Tròn Xoay (Cylinder)',
          sub: 'SGK Toán 12 - Mặt trụ tròn xoay',
          desc: 'Quay hình chữ nhật quanh một cạnh (hoặc quay đoạn thẳng song song với trục Delta ở khoảng cách R).',
          formulaS: 'S_{xq} = 2 \\pi R h',
          formulaV: 'V = \\pi R^2 h',
          l_value: paramH.toFixed(2),
        };
      case 'sphere':
        return {
          title: 'Mặt Cầu & Khối Cầu (Sphere)',
          sub: 'SGK Toán 12 - Mặt cầu',
          desc: 'Quay một nửa đường tròn quanh đường kính cố định (trùng trục Delta).',
          formulaS: 'S = 4 \\pi R^2',
          formulaV: 'V = \\frac{4}{3} \\pi R^3',
          l_value: (Math.PI * paramR).toFixed(2),
        };
      case 'torus':
        return {
          title: 'Mặt Xuyến (Torus / Donut)',
          sub: 'Hình học cổ điển & Ứng dụng thực tế',
          desc: 'Quay một đường tròn bán kính r quanh một trục Delta nằm trong cùng mặt phẳng nhưng không cắt đường tròn (khoảng cách R > r).',
          formulaS: 'S = 4 \\pi^2 R r',
          formulaV: 'V = 2 \\pi^2 R r^2',
          l_value: (2 * Math.PI * paramR2).toFixed(2),
        };
      case 'paraboloid':
        return {
          title: 'Mặt Paraboloid Tròn Xoay',
          sub: 'Đèn pha, Chảo thu sóng Parabol, Kính viễn vọng',
          desc: 'Quay một cung parabol quanh trục đối xứng của nó.',
          formulaS: 'S_{xq} = 2\\pi \\int r \\sqrt{1+(r\')^2} dy',
          formulaV: 'V = \\frac{1}{2} \\pi R^2 h',
          l_value: mathStats.length.toFixed(2),
        };
      case 'hyperboloid':
        return {
          title: 'Mặt Hyperboloid Tròn Xoay',
          sub: 'Tháp làm mát nhiệt điện, Kết cấu vòm kiến trúc',
          desc: 'Quay một nhánh hyperbol (hoặc đoạn thẳng chéo xiên) quanh trục ảo đối xứng.',
          formulaS: 'S_{xq} = 2\\pi \\int r \\sqrt{1+(r\')^2} dy',
          formulaV: 'V = \\pi \\int r^2 dy',
          l_value: mathStats.length.toFixed(2),
        };
      case 'vase':
        return {
          title: 'Mặt Tròn Xoay Bình Hoa Nghệ Thuật',
          sub: 'Tích phân ứng dụng tính thể tích & diện tích vật thể tròn xoay',
          desc: 'Quay đường cong hàm sóng điều hòa quanh trục đứng để tạo vật thể uốn lượn phong phú.',
          formulaS: 'S_{xq} = 2\\pi \\int r(y) \\sqrt{1 + [r\'(y)]^2} dy',
          formulaV: 'V = \\pi \\int [r(y)]^2 dy',
          l_value: mathStats.length.toFixed(2),
        };
      case 'custom':
        return {
          title: 'Đường Sinh Tuỳ Chỉnh (Custom Profile)',
          sub: 'Tự do sáng tạo & Khảo sát quỹ đạo',
          desc: 'Tự định nghĩa các điểm điều khiển mốc để sinh ra mặt tròn xoay đặc trưng.',
          formulaS: 'S_{xq} = \\sum 2\\pi \\bar{r}_i \\Delta l_i',
          formulaV: 'V = \\sum \\pi \\bar{r}_i^2 \\Delta y_i',
          l_value: mathStats.length.toFixed(2),
        };
    }
  };

  const presetInfo = getPresetInfo();

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-950 overflow-hidden select-none flex">
      {/* LEFT CONTROL SIDEBAR (Khung điều khiển bên tay trái chuẩn mực) */}
      <div
        className={`relative z-20 h-full transition-all duration-300 ease-in-out border-r border-slate-800 bg-slate-900/95 backdrop-blur-md flex flex-col ${
          isSidebarOpen ? 'w-80 md:w-96' : 'w-12'
        }`}
      >
        {/* Sidebar Toggle Header */}
        <div className="h-12 border-b border-slate-800 px-3 flex items-center justify-between text-slate-200">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 overflow-hidden">
              <RotateCw className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-bold text-xs uppercase tracking-wider text-cyan-400 truncate">
                Tạo Mặt Tròn Xoay
              </span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={isSidebarOpen ? 'Thu gọn bảng điều khiển' : 'Mở rộng bảng điều khiển'}
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Tabs */}
        {isSidebarOpen && (
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
            <button
              onClick={() => setActiveTab('preset')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'preset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Đường sinh</span>
            </button>
            <button
              onClick={() => setActiveTab('sweep')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'sweep'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Điều khiển xoay</span>
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'style'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Màu sắc</span>
            </button>
            <button
              onClick={() => setActiveTab('theory')}
              className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'theory'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>SGK 12</span>
            </button>
          </div>
        )}

        {/* Sidebar Content Area */}
        {isSidebarOpen ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300 scrollbar-thin scrollbar-thumb-slate-700">
            {/* TAB 1: PRESET SELECTION & PARAMETERS */}
            {activeTab === 'preset' && (
              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block mb-2">
                    1. Chọn Mẫu Mặt Tròn Xoay SGK
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cone', label: 'Hình Nón', icon: '▲' },
                      { id: 'cylinder', label: 'Hình Trụ', icon: '■' },
                      { id: 'sphere', label: 'Mặt Cầu', icon: '●' },
                      { id: 'cone-frustum', label: 'Nón Cụt', icon: '⏢' },
                      { id: 'torus', label: 'Mặt Xuyến', icon: '◎' },
                      { id: 'paraboloid', label: 'Paraboloid', icon: '∪' },
                      { id: 'hyperboloid', label: 'Hyperboloid', icon: '≬' },
                      { id: 'vase', label: 'Bình Hoa', icon: '🏺' },
                      { id: 'custom', label: 'Tuỳ Chỉnh', icon: '✎' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectPreset(item.id as RevolutionPreset)}
                        className={`p-2 rounded-xl text-left font-medium transition-all flex items-center gap-2 border ${
                          preset === item.id
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-sm'
                            : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-sm font-bold text-cyan-400">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parameters adjustments */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-200">Kích thước Đường sinh C</span>
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  </div>

                  {/* Param R */}
                  {preset !== 'custom' && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">
                          {preset === 'sphere' ? 'Bán kính mặt cầu (R):' : 'Bán kính đáy (R):'}
                        </span>
                        <span className="font-mono text-cyan-400 font-bold">{paramR.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="4.0"
                        step="0.1"
                        value={paramR}
                        onChange={(e) => setParamR(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Param R2 (if applicable) */}
                  {(preset === 'cone-frustum' || preset === 'torus' || preset === 'hyperboloid') && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">
                          {preset === 'cone-frustum'
                            ? 'Bán kính đáy trên (R₂):'
                            : preset === 'torus'
                            ? 'Bán kính vòng xuyến (r):'
                            : 'Bán kính eo thắt (R_min):'}
                        </span>
                        <span className="font-mono text-cyan-400 font-bold">{paramR2.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="3.0"
                        step="0.1"
                        value={paramR2}
                        onChange={(e) => setParamR2(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Param H (Height) */}
                  {preset !== 'sphere' && preset !== 'torus' && preset !== 'custom' && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Chiều cao trục (h):</span>
                        <span className="font-mono text-cyan-400 font-bold">{paramH.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={paramH}
                        onChange={(e) => setParamH(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Curvature adjustment for non-linear surfaces */}
                  {(preset === 'paraboloid' || preset === 'hyperboloid' || preset === 'vase') && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Độ uốn cong (Curvature):</span>
                        <span className="font-mono text-cyan-400 font-bold">{paramCurvature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="2.0"
                        step="0.05"
                        value={paramCurvature}
                        onChange={(e) => setParamCurvature(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Custom points control */}
                  {preset === 'custom' && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-400">
                        Chỉnh tọa độ các mấu điểm (Bán kính r, Độ cao y):
                      </div>
                      {customPoints.map((pt, idx) => (
                        <div key={idx} className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-cyan-300">
                            <span>Điểm {idx + 1} ({pt.label || `P${idx}`})</span>
                            <span className="font-mono text-[10px]">
                              r={pt.r.toFixed(1)}, y={pt.y.toFixed(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] text-slate-500">Bán kính r:</span>
                              <input
                                type="range"
                                min="0.1"
                                max="3.5"
                                step="0.1"
                                value={pt.r}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setCustomPoints((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, r: val } : p))
                                  );
                                }}
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500">Độ cao y:</span>
                              <input
                                type="range"
                                min="-2.0"
                                max="4.5"
                                step="0.1"
                                value={pt.y}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setCustomPoints((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, y: val } : p))
                                  );
                                }}
                                className="w-full accent-cyan-400 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brief Info Pill */}
                <div className="p-3 bg-gradient-to-r from-cyan-950/40 to-slate-900 rounded-xl border border-cyan-800/30">
                  <div className="font-bold text-cyan-300 text-xs mb-1">{presetInfo.title}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{presetInfo.desc}</div>
                </div>
              </div>
            )}

            {/* TAB 2: SWEEP ANIMATION & ROTATION CONTROLS */}
            {activeTab === 'sweep' && (
              <div className="space-y-4">
                {/* Big Sweep Status Card */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Góc Quét Mặt Tròn Xoay (θ)
                  </div>
                  <div className="text-3xl font-black font-mono text-cyan-400 flex items-center justify-center gap-1">
                    <span>{Math.round(sweepAngleDeg)}°</span>
                    <span className="text-sm font-normal text-slate-400">
                      / 360° ({((sweepAngleDeg / 360) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Góc radian: {((sweepAngleDeg / 180) * Math.PI).toFixed(2)} rad (
                    {(sweepAngleDeg / 180).toFixed(2)}π)
                  </div>
                </div>

                {/* Main Playback Bar */}
                <div className="space-y-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">
                    Tự Động Xoay & Sinh Mặt
                  </label>

                  {/* Play / Pause / Reset Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                        isPlaying
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Tạm Dừng</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Tự Động Xoay</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setSweepAngleDeg(0);
                        animDirectionRef.current = 1;
                      }}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                      title="Làm lại từ 0° (Chỉ hiện đường sinh)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setSweepAngleDeg(360);
                      }}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                      title="Mở tròn vẹn 360°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Slider Angle */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] mb-1 font-medium">
                      <span className="text-slate-400">Điều chỉnh góc quét thủ công:</span>
                      <span className="text-cyan-400 font-mono font-bold">{Math.round(sweepAngleDeg)}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={sweepAngleDeg}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setSweepAngleDeg(parseFloat(e.target.value));
                      }}
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                  </div>

                  {/* Preset quick angles */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[
                      { deg: 0, label: '0° (Bắt đầu)' },
                      { deg: 90, label: '90° (1/4)' },
                      { deg: 180, label: '180° (Nửa)' },
                      { deg: 270, label: '270° (3/4)' },
                      { deg: 360, label: '360° (Đầy đủ)' },
                    ].map((btn) => (
                      <button
                        key={btn.deg}
                        onClick={() => {
                          setIsPlaying(false);
                          setSweepAngleDeg(btn.deg);
                        }}
                        className={`py-1 rounded text-[10px] font-semibold transition-all border ${
                          Math.round(sweepAngleDeg) === btn.deg
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {btn.deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed & Loop Mode */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold uppercase">Tốc độ xoay:</span>
                    <div className="flex gap-1">
                      {[0.5, 1.0, 1.5, 2.0].map((s) => (
                        <button
                          key={s}
                          onClick={() => setPlaySpeed(s)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            playSpeed === s
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400 text-[11px] font-semibold uppercase">Chế độ lặp:</span>
                    <div className="flex gap-1">
                      {[
                        { id: 'once', label: '1 vòng dừng' },
                        { id: 'ping-pong', label: 'Mở - Đóng' },
                        { id: 'infinite', label: 'Liên tục' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setLoopMode(m.id as any)}
                          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                            loopMode === m.id
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800/80 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Camera Orbit Rotation */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Tự động xoay camera 3D</span>
                  <button
                    onClick={() => setAutoRotateCamera(!autoRotateCamera)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                      autoRotateCamera ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        autoRotateCamera ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: COLOR THEMES & VISUAL CONTROLS ("MÀU KHÁC CHO DỄ NHÌN") */}
            {activeTab === 'style' && (
              <div className="space-y-4">
                {/* Surface Color Palette Selection */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <label className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">
                    Màu Sắc Mặt Tròn Xoay (Nổi Bật)
                  </label>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Chọn màu sắc tương phản giúp học sinh dễ dàng phân biệt giữa đường sinh màu vàng và mặt đã quét ra:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setActiveColorTheme(theme.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          activeColorTheme === theme.id
                            ? 'bg-slate-800 border-white text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <span className="text-[11px] font-medium truncate">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity slider */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">Độ trong suốt mặt xoay:</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round(surfaceOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={surfaceOpacity}
                    onChange={(e) => setSurfaceOpacity(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Độ mờ ~70% giúp nhìn xuyên thấu vào trong để thấy rõ trục quay Δ và các bán kính quét r.
                  </p>
                </div>

                {/* Geometric Elements Toggles */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">
                    Bật / Tắt Các Thành Phần Hình Học
                  </span>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Trục quay Δ (Axis)</span>
                    <input
                      type="checkbox"
                      checked={showAxisDelta}
                      onChange={(e) => setShowAxisDelta(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Đường sinh ban đầu C₀ (θ = 0°)</span>
                    <input
                      type="checkbox"
                      checked={showInitialCurve}
                      onChange={(e) => setShowInitialCurve(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Đường sinh đang quay C (Màu vàng rực)</span>
                    <input
                      type="checkbox"
                      checked={showCurrentCurve}
                      onChange={(e) => setShowCurrentCurve(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Bán kính quét r từ trục Δ</span>
                    <input
                      type="checkbox"
                      checked={showSweepRadii}
                      onChange={(e) => setShowSweepRadii(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Vòng tròn vĩ tuyến (Parallel circles)</span>
                    <input
                      type="checkbox"
                      checked={showParallelCircles}
                      onChange={(e) => setShowParallelCircles(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Lưới kinh tuyến (Wireframe)</span>
                    <input
                      type="checkbox"
                      checked={showWireframe}
                      onChange={(e) => setShowWireframe(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Mặt đáy tròn (Khối đặc vs Mặt rỗng)</span>
                    <input
                      type="checkbox"
                      checked={showCaps}
                      onChange={(e) => setShowCaps(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer py-1">
                    <span className="text-slate-300">Lưới mặt phẳng nền (Grid)</span>
                    <input
                      type="checkbox"
                      checked={showGridFloor}
                      onChange={(e) => setShowGridFloor(e.target.checked)}
                      className="accent-cyan-400 cursor-pointer w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: SGK 12 THEORY & FORMULA CALCULATIONS */}
            {activeTab === 'theory' && (
              <div className="space-y-4">
                {/* Definition Box */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                    <HelpCircle className="w-4 h-4" />
                    <span>Định nghĩa Mặt Tròn Xoay (SGK Toán 12)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed italic bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    &quot;Trong mặt phẳng (P) cho một đường thẳng Δ và một đường C. Khi quay mặt phẳng (P) quanh trục Δ một góc 360°, đường C vạch ra một hình gọi là <strong>mặt tròn xoay</strong>. Đường C gọi là <strong>đường sinh</strong>, đường thẳng Δ gọi là <strong>trục</strong> của mặt tròn xoay.&quot;
                  </p>
                </div>

                {/* Live Formula Calculations */}
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-bold text-cyan-300 text-xs flex items-center justify-between border-b border-slate-800 pb-2">
                    <span>Tính Toán Hình Học Theo Kích Thước</span>
                    <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                  </div>

                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between p-1.5 bg-slate-950/60 rounded">
                      <span className="text-slate-400">Độ dài đường sinh l:</span>
                      <span className="font-bold text-white">{presetInfo.l_value}</span>
                    </div>

                    <div className="flex justify-between p-1.5 bg-slate-950/60 rounded">
                      <span className="text-slate-400">Công thức diện tích xung quanh:</span>
                      <span className="font-bold text-cyan-400">{presetInfo.formulaS}</span>
                    </div>

                    <div className="flex justify-between p-1.5 bg-slate-950/60 rounded">
                      <span className="text-slate-400">Diện tích toàn phần S_xq (360°):</span>
                      <span className="font-bold text-cyan-300">{mathStats.S_xq.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between p-1.5 bg-cyan-950/40 rounded border border-cyan-800/40">
                      <span className="text-cyan-200">S_xq góc {Math.round(sweepAngleDeg)}° hiện tại:</span>
                      <span className="font-bold text-cyan-400">{mathStats.partial_S.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between p-1.5 bg-slate-950/60 rounded">
                      <span className="text-slate-400">Thể tích khối tròn xoay V (360°):</span>
                      <span className="font-bold text-amber-300">{mathStats.V_solid.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between p-1.5 bg-amber-950/40 rounded border border-amber-800/40">
                      <span className="text-amber-200">Thể tích góc {Math.round(sweepAngleDeg)}°:</span>
                      <span className="font-bold text-amber-400">{mathStats.partial_V.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Practical note */}
                <div className="p-3 bg-gradient-to-tr from-indigo-950/50 to-slate-900 rounded-xl border border-indigo-800/30 text-[11px] text-slate-300 leading-relaxed space-y-1">
                  <div className="font-bold text-indigo-300">Ý nghĩa Sư phạm:</div>
                  <p>
                    Mỗi điểm M trên đường sinh C khi quay quanh trục Δ vạch ra một đường tròn tâm O nằm trên Δ và vuông góc với Δ. Bán kính r của đường tròn bằng khoảng cách từ M đến trục Δ.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Collapsed Mini Sidebar Icons */
          <div className="flex-1 flex flex-col items-center py-4 gap-3 text-slate-400">
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setActiveTab('preset');
              }}
              className="p-2 hover:bg-slate-800 rounded-lg text-cyan-400"
              title="Chọn mẫu đường sinh"
            >
              <Box className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setActiveTab('sweep');
              }}
              className="p-2 hover:bg-slate-800 rounded-lg text-amber-400"
              title="Điều khiển tự xoay"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setActiveTab('style');
              }}
              className="p-2 hover:bg-slate-800 rounded-lg text-emerald-400"
              title="Màu sắc và hiển thị"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setIsSidebarOpen(true);
                setActiveTab('theory');
              }}
              className="p-2 hover:bg-slate-800 rounded-lg text-purple-400"
              title="Kiến thức SGK 12"
            >
              <Calculator className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT MAIN 3D CANVAS & OVERLAYS */}
      <div className="flex-1 relative h-full flex flex-col">
        {/* Top Floating Badge Bar */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-xs text-white">{presetInfo.title}</span>
            <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              θ = {Math.round(sweepAngleDeg)}°
            </span>
          </div>

          {/* Color theme indicator badge */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs text-slate-300">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentTheme.primary }} />
            <span className="text-[11px] font-medium">{currentTheme.name}</span>
          </div>

          {/* Quick status if auto rotating */}
          {isPlaying && (
            <div className="bg-amber-500/90 text-slate-950 font-bold px-2.5 py-1 rounded-xl shadow-lg text-[11px] flex items-center gap-1.5 animate-pulse">
              <Flame className="w-3.5 h-3.5" />
              <span>Đang tự xoay sinh mặt ({playSpeed}x)</span>
            </div>
          )}
        </div>

        {/* 3D WebGL Canvas Container */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Bottom Floating Quick Control Bar */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Tạm Dừng' : 'Tự Xoay'}</span>
          </button>

          {/* Quick Step -15 / +15 */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setSweepAngleDeg((prev) => Math.max(0, prev - 15));
            }}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Lùi 15°"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Angle Slider in bottom bar */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">0°</span>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={sweepAngleDeg}
              onChange={(e) => {
                setIsPlaying(false);
                setSweepAngleDeg(parseFloat(e.target.value));
              }}
              className="w-36 md:w-56 accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <span className="text-[11px] font-mono text-cyan-400 font-bold w-10 text-right">
              {Math.round(sweepAngleDeg)}°
            </span>
          </div>

          <button
            onClick={() => {
              setIsPlaying(false);
              setSweepAngleDeg((prev) => Math.min(360, prev + 15));
            }}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Tiến 15°"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Reset button */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setSweepAngleDeg(0);
            }}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Về 0° (Chỉ hiện đường sinh)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Full 360 button */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setSweepAngleDeg(360);
            }}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-[10px] font-bold border border-slate-700"
            title="Quét trọn vẹn 360°"
          >
            360°
          </button>
        </div>

        {/* Floating Legend / Guide at Bottom Right */}
        <div className="hidden lg:flex absolute bottom-5 right-5 z-10 bg-slate-900/85 backdrop-blur-md border border-slate-800/90 p-3 rounded-xl shadow-xl flex-col gap-1.5 text-[11px] pointer-events-none">
          <div className="font-bold text-slate-300 text-[10px] uppercase tracking-wider mb-0.5">
            Quy ước màu sắc trực quan:
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-0.5 bg-amber-400 rounded-full" />
            <span>Đường sinh đang quay C (Vàng)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span
              className="w-3 h-3 rounded-sm opacity-80"
              style={{ backgroundColor: currentTheme.primary }}
            />
            <span>Mặt tròn xoay sinh ra ({currentTheme.name.split(' ')[0]})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
            <span>Trục xoay Δ</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-0.5 bg-emerald-400 border-b border-dashed border-emerald-400" />
            <span>Bán kính quét r từ trục Δ</span>
          </div>
        </div>
      </div>
    </div>
  );
};
