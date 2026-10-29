import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Solid3DType, Point3D } from '../../types/math';
import { createSolidModel, SolidModelData } from '../../utils/solidsData';
import {
  Vec3,
  vSub,
  vNorm,
  vCross,
  vLerp,
  calculateCircumscribedSphere,
  intersectSegmentWithPlane,
  computeFootOfAltitude,
  computeCentroid,
} from '../../utils/math3d';
import { DetachedSection2D } from './DetachedSection2D';
import {
  Box,
  Eye,
  Scissors,
  Globe,
  FoldHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Layers,
  Sliders,
  CheckCircle2,
  Play,
  Pause,
  FastForward,
  Rewind,
  Repeat,
} from 'lucide-react';

// Helper to create crisp billboard 2D text label sprites for 3D points
function createTextSprite(
  text: string,
  color = '#ffffff',
  bgColor = 'rgba(15, 23, 42, 0.85)'
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, 128, 64);
  // Rounded background pill
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(14, 8, 100, 48, 14);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Text
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.65, 0.325, 1);
  sprite.renderOrder = 999;
  return sprite;
}

interface StereoGeometry3DProps {
  onSwitchToRevolution?: () => void;
}

export const StereoGeometry3D: React.FC<StereoGeometry3DProps> = ({ onSwitchToRevolution }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Model & State
  const [solidType, setSolidType] = useState<Solid3DType>('pyramid-tri');
  const [modelData, setModelData] = useState<SolidModelData>(() => createSolidModel('pyramid-tri'));

  // Apex dynamic manipulation
  const [apexHeight, setApexHeight] = useState<number>(3.2);
  const [apexOffsetX, setApexOffsetX] = useState<number>(0);
  const [apexOffsetZ, setApexOffsetZ] = useState<number>(0);

  // Refs for direct 3D canvas apex dragging
  const apexHeightRef = useRef(apexHeight);
  const apexOffsetXRef = useRef(apexOffsetX);
  const apexOffsetZRef = useRef(apexOffsetZ);
  useEffect(() => {
    apexHeightRef.current = apexHeight;
    apexOffsetXRef.current = apexOffsetX;
    apexOffsetZRef.current = apexOffsetZ;
  }, [apexHeight, apexOffsetX, apexOffsetZ]);

  // Geometric features toggles
  const [showAltitude, setShowAltitude] = useState<boolean>(true);
  const [showCentroid, setShowCentroid] = useState<boolean>(true);
  const [showMidpoints, setShowMidpoints] = useState<boolean>(true);
  const [showSectionPlane, setShowSectionPlane] = useState<boolean>(false); // Mặt cắt riêng khi gọi mới có
  const [showIntersectionLine, setShowIntersectionLine] = useState<boolean>(false);
  const [showCircumSphere, setShowCircumSphere] = useState<boolean>(false);
  const [unfoldProgress, setUnfoldProgress] = useState<number>(0); // 0 to 1

  // Auto-unfold animation state (Khai triển tự động theo tốc độ cho phép)
  const [isAutoUnfolding, setIsAutoUnfolding] = useState<boolean>(false);
  const [unfoldSpeed, setUnfoldSpeed] = useState<number>(1); // 0.5x, 1x, 1.5x, 2x, 3x
  const [unfoldLoopMode, setUnfoldLoopMode] = useState<'ping-pong' | 'once'>('ping-pong');
  const unfoldDirectionRef = useRef<number>(1); // +1: Mở ra (0 -> 1), -1: Đóng lại (1 -> 0)
  const lastTimeRef = useRef<number | null>(null);

  // Left Control Sidebar State (Chuyển điều khiển về bên tay trái)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'solid' | 'unfold' | 'apex' | 'section' | 'elements'>('solid');

  // Animation Loop for Auto-Unfold
  useEffect(() => {
    if (!isAutoUnfolding) {
      lastTimeRef.current = null;
      return;
    }

    let animId: number;
    const tick = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = (time - lastTimeRef.current) / 1000; // in seconds
      lastTimeRef.current = time;

      // Base cycle duration at 1.0x is 2.5s for 0 -> 1
      const baseDuration = 2.5;
      const delta = (dt / baseDuration) * unfoldSpeed;

      setUnfoldProgress((prev) => {
        let next = prev + delta * unfoldDirectionRef.current;
        if (next >= 1) {
          next = 1;
          if (unfoldLoopMode === 'ping-pong') {
            unfoldDirectionRef.current = -1;
          } else {
            setIsAutoUnfolding(false);
          }
        } else if (next <= 0) {
          next = 0;
          if (unfoldLoopMode === 'ping-pong') {
            unfoldDirectionRef.current = 1;
          } else {
            setIsAutoUnfolding(false);
          }
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isAutoUnfolding, unfoldSpeed, unfoldLoopMode]);

  // Section plane ratios along lateral edges
  const [ratioSA, setRatioSA] = useState<number>(0.5);
  const [ratioSB, setRatioSB] = useState<number>(0.5);
  const [ratioSC, setRatioSC] = useState<number>(0.5);

  // Detached section panel visibility
  const [isDetachedOpen, setIsDetachedOpen] = useState<boolean>(false);

  // Change solid type
  const handleSelectSolid = (type: Solid3DType) => {
    setSolidType(type);
    const m = createSolidModel(type);
    setModelData(m);
    // Find apex height if exists
    const apex = m.vertices.find((v) => v.id === m.apexId);
    if (apex) {
      setApexHeight(apex.y);
      setApexOffsetX(apex.x);
      setApexOffsetZ(apex.z);
    }
    setUnfoldProgress(0);
    setIsAutoUnfolding(false);
    unfoldDirectionRef.current = 1;
    setShowCircumSphere(false);
    setShowSectionPlane(false);
    setIsDetachedOpen(false);
  };

  // Compute live vertices with apex manipulation
  const currentVertices = useMemo<Point3D[]>(() => {
    return modelData.vertices.map((v) => {
      if (v.id === modelData.apexId) {
        return {
          ...v,
          x: apexOffsetX,
          y: apexHeight,
          z: apexOffsetZ,
        };
      }
      return v;
    });
  }, [modelData, apexHeight, apexOffsetX, apexOffsetZ]);

  // Apex and base vertices
  const apexVertex = useMemo(() => {
    return currentVertices.find((v) => v.id === modelData.apexId);
  }, [currentVertices, modelData.apexId]);

  const baseVertices = useMemo(() => {
    return currentVertices.filter((v) => modelData.baseVertexIds.includes(v.id));
  }, [currentVertices, modelData.baseVertexIds]);

  // Altitude foot H
  const altitudeFoot = useMemo<Vec3 | null>(() => {
    if (!apexVertex || baseVertices.length < 3) return null;
    return computeFootOfAltitude(apexVertex, baseVertices);
  }, [apexVertex, baseVertices]);

  // Base Centroid G
  const baseCentroid = useMemo<Vec3 | null>(() => {
    if (baseVertices.length === 0) return null;
    return computeCentroid(baseVertices);
  }, [baseVertices]);

  // Section Cutting Points on lateral edges
  const cuttingPoints = useMemo<{ pt: Vec3; label: string }[]>(() => {
    if (!apexVertex || baseVertices.length < 3) return [];
    const pts: { pt: Vec3; label: string }[] = [];
    if (baseVertices[0]) {
      pts.push({ pt: vLerp(apexVertex, baseVertices[0], 1 - ratioSA), label: 'M' });
    }
    if (baseVertices[1]) {
      pts.push({ pt: vLerp(apexVertex, baseVertices[1], 1 - ratioSB), label: 'N' });
    }
    if (baseVertices[2]) {
      pts.push({ pt: vLerp(apexVertex, baseVertices[2], 1 - ratioSC), label: 'P' });
    }
    return pts;
  }, [apexVertex, baseVertices, ratioSA, ratioSB, ratioSC]);

  // Calculate full cross-section polygon in 3D
  const crossSectionPolygon = useMemo<{ vertices3D: Vec3[]; labels: string[] }>(() => {
    if (cuttingPoints.length < 3) return { vertices3D: [], labels: [] };
    const p1 = cuttingPoints[0].pt;
    const p2 = cuttingPoints[1].pt;
    const p3 = cuttingPoints[2].pt;

    const normal = vNorm(vCross(vSub(p2, p1), vSub(p3, p1)));

    // Intersect plane with all edges of the pyramid
    const sectionPts: { pt: Vec3; label: string }[] = [];
    const currentVertMap = new Map(currentVertices.map((v) => [v.id, v]));

    modelData.edges.forEach((edge, idx) => {
      const vFrom = currentVertMap.get(edge.from);
      const vTo = currentVertMap.get(edge.to);
      if (vFrom && vTo) {
        const res = intersectSegmentWithPlane(vFrom, vTo, p1, normal);
        if (res.hit && res.point) {
          // Avoid duplicate points
          const isDup = sectionPts.some((sp) => {
            const d = vSub(sp.pt, res.point!);
            return Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) < 0.05;
          });
          if (!isDup) {
            sectionPts.push({
              pt: res.point,
              label: `K${sectionPts.length + 1}`,
            });
          }
        }
      }
    });

    if (sectionPts.length < 3) {
      return {
        vertices3D: cuttingPoints.map((c) => c.pt),
        labels: cuttingPoints.map((c) => c.label),
      };
    }

    // Sort points in rotational order around center
    const center = computeCentroid(sectionPts.map((s) => s.pt));
    const u = vNorm(vSub(sectionPts[0].pt, center));
    const v = vNorm(vCross(normal, u));

    sectionPts.sort((a, b) => {
      const da = vSub(a.pt, center);
      const db = vSub(b.pt, center);
      const angleA = Math.atan2(v.x * da.x + v.y * da.y + v.z * da.z, u.x * da.x + u.y * da.y + u.z * da.z);
      const angleB = Math.atan2(v.x * db.x + v.y * db.y + v.z * db.z, u.x * db.x + u.y * db.y + u.z * db.z);
      return angleA - angleB;
    });

    return {
      vertices3D: sectionPts.map((s) => s.pt),
      labels: sectionPts.map((s) => s.label),
    };
  }, [cuttingPoints, currentVertices, modelData.edges]);

  // Circumscribed sphere
  const circumSphere = useMemo(() => {
    if (!showCircumSphere) return null;
    if (currentVertices.length < 4) return null;
    const [p1, p2, p3, p4] = currentVertices;
    return calculateCircumscribedSphere(p1, p2, p3, p4);
  }, [showCircumSphere, currentVertices]);

  // Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL as per skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(5.5, 4.5, 6.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.6);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.2);
    keyLight.position.set(6, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-6, 3, -5);
    scene.add(fillLight);

    // Subtle Ground Grid
    const grid = new THREE.GridHelper(12, 24, 0x334155, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Main Group for dynamic objects
    const solidGroup = new THREE.Group();
    scene.add(solidGroup);

    // Animation loop with software pacing
    let frameId = 0;
    let isDisposed = false;

    function renderScene() {
      if (isDisposed) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderScene);
    }
    frameId = requestAnimationFrame(renderScene);

    // Store references in mountRef for update
    (container as any).__three = {
      scene,
      camera,
      renderer,
      controls,
      solidGroup,
    };

    // Direct 3D Canvas Apex S dragging handler
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDraggingApex = false;
    const horizontalPlane = new THREE.Plane();

    const getMouseNDC = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const ndc = getMouseNDC(e);
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);

      const apexPos = new THREE.Vector3(
        apexOffsetXRef.current,
        apexHeightRef.current,
        apexOffsetZRef.current
      );
      const apexSphere = new THREE.Sphere(apexPos, 0.4);
      if (raycaster.ray.intersectsSphere(apexSphere)) {
        isDraggingApex = true;
        controls.enabled = false;
        horizontalPlane.set(new THREE.Vector3(0, 1, 0), -apexHeightRef.current);
        renderer.domElement.style.cursor = 'grabbing';
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const ndc = getMouseNDC(e);
      mouse.set(ndc.x, ndc.y);
      raycaster.setFromCamera(mouse, camera);

      if (isDraggingApex) {
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(horizontalPlane, intersection)) {
          const clampedX = Math.max(-3.5, Math.min(3.5, Math.round(intersection.x * 20) / 20));
          const clampedZ = Math.max(-3.5, Math.min(3.5, Math.round(intersection.z * 20) / 20));
          setApexOffsetX(clampedX);
          setApexOffsetZ(clampedZ);
        }
        return;
      }

      const apexPos = new THREE.Vector3(
        apexOffsetXRef.current,
        apexHeightRef.current,
        apexOffsetZRef.current
      );
      const apexSphere = new THREE.Sphere(apexPos, 0.4);
      if (raycaster.ray.intersectsSphere(apexSphere)) {
        renderer.domElement.style.cursor = 'grab';
      } else {
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handlePointerUp = () => {
      if (isDraggingApex) {
        isDraggingApex = false;
        controls.enabled = true;
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync 3D Geometry to Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !(container as any).__three) return;
    const { solidGroup } = (container as any).__three;

    // Clear previous dynamic meshes
    while (solidGroup.children.length > 0) {
      const obj = solidGroup.children[0];
      solidGroup.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }

    const vertMap = new Map<string, THREE.Vector3>();
    currentVertices.forEach((v) => {
      vertMap.set(v.id, new THREE.Vector3(v.x, v.y, v.z));
    });

    // 1. Unfolding vs Solid Geometry Rendering
    if (unfoldProgress > 0 && modelData.apexId && modelData.baseVertexIds.length >= 3) {
      // UNROLLING / NET MODE:
      // A. Base Polygon Mesh & Outline
      const basePts = modelData.baseVertexIds.map((id) => vertMap.get(id)!).filter(Boolean);
      if (basePts.length >= 3) {
        const baseGeom = new THREE.BufferGeometry();
        const basePos: number[] = [];
        for (let i = 1; i < basePts.length - 1; i++) {
          basePos.push(
            basePts[0].x, basePts[0].y, basePts[0].z,
            basePts[i].x, basePts[i].y, basePts[i].z,
            basePts[i + 1].x, basePts[i + 1].y, basePts[i + 1].z
          );
        }
        baseGeom.setAttribute('position', new THREE.Float32BufferAttribute(basePos, 3));
        baseGeom.computeVertexNormals();
        const baseMesh = new THREE.Mesh(
          baseGeom,
          new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide,
          })
        );
        solidGroup.add(baseMesh);

        // Base outline edges
        const baseLoop = [...basePts, basePts[0]];
        const baseOutlineGeom = new THREE.BufferGeometry().setFromPoints(baseLoop);
        const baseOutlineLine = new THREE.Line(
          baseOutlineGeom,
          new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2.2 })
        );
        solidGroup.add(baseOutlineLine);

        // Base vertices and billboard labels
        basePts.forEach((bp, idx) => {
          const vSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.5 })
          );
          vSphere.position.copy(bp);
          solidGroup.add(vSphere);

          const lbl = createTextSprite(modelData.baseVertexIds[idx], '#38bdf8');
          lbl.position.set(bp.x, bp.y + 0.28, bp.z);
          solidGroup.add(lbl);
        });
      }

      // B. Lateral Faces & Synchronized Moving Edges
      const baseCentroidVec = new THREE.Vector3();
      basePts.forEach((p) => baseCentroidVec.add(p));
      baseCentroidVec.multiplyScalar(1 / (basePts.length || 1));

      const apexOriginal = vertMap.get(modelData.apexId)!;

      const lateralFaces = modelData.faces.filter(
        (f) => f.vertexIds.includes(modelData.apexId!) && f.vertexIds.length === 3
      );

      lateralFaces.forEach((face, fIdx) => {
        const baseIds = face.vertexIds.filter((id) => id !== modelData.apexId);
        if (baseIds.length < 2) return;
        const b1 = vertMap.get(baseIds[0])!;
        const b2 = vertMap.get(baseIds[1])!;

        const edgeVec = new THREE.Vector3().subVectors(b2, b1);
        const edgeLen = edgeVec.length();
        if (edgeLen < 1e-4) return;
        const uEdge = edgeVec.clone().normalize();

        // Outward normal on y=0 plane
        let wOut = new THREE.Vector3().crossVectors(uEdge, new THREE.Vector3(0, 1, 0)).normalize();
        const midBase = new THREE.Vector3().addVectors(b1, b2).multiplyScalar(0.5);
        const fromCentroid = new THREE.Vector3().subVectors(midBase, baseCentroidVec);
        if (wOut.dot(fromCentroid) < 0) {
          wOut.negate();
        }

        // Project apex onto base edge line
        const vApexRel = new THREE.Vector3().subVectors(apexOriginal, b1);
        const projT = vApexRel.dot(edgeVec) / (edgeLen * edgeLen);
        const pProj = b1.clone().addScaledVector(edgeVec, projT);

        const vFromProj = new THREE.Vector3().subVectors(apexOriginal, pProj);
        const slantH = vFromProj.length();
        const vApexDir = vFromProj.clone().normalize();

        // Rotation from vApexDir to wOut around rotation axis
        const rotAxis = new THREE.Vector3().crossVectors(vApexDir, wOut).normalize();
        const angleTotal = Math.acos(Math.max(-1, Math.min(1, vApexDir.dot(wOut))));
        const currentAngle = angleTotal * unfoldProgress;

        const rotatedDir = vApexDir.clone().applyAxisAngle(rotAxis, currentAngle);
        const rotatedApex = pProj.clone().addScaledVector(rotatedDir, slantH);

        // 1. Draw face mesh
        const faceGeom = new THREE.BufferGeometry();
        const fPos = [
          b1.x, b1.y, b1.z,
          b2.x, b2.y, b2.z,
          rotatedApex.x, rotatedApex.y, rotatedApex.z,
        ];
        faceGeom.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
        faceGeom.computeVertexNormals();

        const faceMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(face.color || 0x10b981),
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          roughness: 0.3,
        });
        solidGroup.add(new THREE.Mesh(faceGeom, faceMat));

        // 2. Draw all boundary edges of the face (base edge + 2 lateral edges moving simultaneously!)
        const faceEdgeGeom = new THREE.BufferGeometry().setFromPoints([
          b1, b2, rotatedApex, b1
        ]);
        const faceEdgeMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          linewidth: 2.2,
        });
        solidGroup.add(new THREE.Line(faceEdgeGeom, faceEdgeMat));

        // 3. Draw sphere marker and label S for each unfolded apex
        const apexMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.5 })
        );
        apexMesh.position.copy(rotatedApex);
        solidGroup.add(apexMesh);

        const sLabel = createTextSprite(`S${fIdx + 1}`, '#f59e0b');
        sLabel.position.set(rotatedApex.x, rotatedApex.y + 0.3, rotatedApex.z);
        solidGroup.add(sLabel);
      });
    } else {
      // SOLID GEOMETRY MODE (unfoldProgress === 0)
      // 1. Render Edges (Solid vs Dashed)
      modelData.edges.forEach((edge) => {
        const p1 = vertMap.get(edge.from);
        const p2 = vertMap.get(edge.to);
        if (!p1 || !p2) return;

        if (edge.isDashed) {
          const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const material = new THREE.LineDashedMaterial({
            color: 0x94a3b8,
            dashSize: 0.16,
            gapSize: 0.1,
            linewidth: 1.5,
          });
          const line = new THREE.Line(geometry, material);
          line.computeLineDistances();
          solidGroup.add(line);
        } else {
          const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const material = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            linewidth: 2.2,
          });
          const line = new THREE.Line(geometry, material);
          solidGroup.add(line);
        }
      });

      // 2. Render Faces (Translucent tinted meshes)
      modelData.faces.forEach((face) => {
        const pts = face.vertexIds.map((id) => vertMap.get(id)).filter(Boolean) as THREE.Vector3[];
        if (pts.length < 3) return;

        const geom = new THREE.BufferGeometry();
        const pos: number[] = [];
        for (let i = 1; i < pts.length - 1; i++) {
          pos.push(
            pts[0].x, pts[0].y, pts[0].z,
            pts[i].x, pts[i].y, pts[i].z,
            pts[i + 1].x, pts[i + 1].y, pts[i + 1].z
          );
        }
        geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(face.color || 0x3b82f6),
          transparent: true,
          opacity: face.opacity || 0.16,
          side: THREE.DoubleSide,
          roughness: 0.3,
          metalness: 0.1,
        });
        solidGroup.add(new THREE.Mesh(geom, mat));
      });

      // 3. Render Vertices & Text Billboard Labels
      currentVertices.forEach((v) => {
        const isApex = v.id === modelData.apexId;
        const mat = new THREE.MeshStandardMaterial({
          color: isApex ? 0xf59e0b : 0x38bdf8,
          roughness: 0.2,
          metalness: 0.6,
        });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(isApex ? 0.1 : 0.08, 16, 16), mat);
        sphere.position.set(v.x, v.y, v.z);
        if (isApex) sphere.name = 'apex_sphere';
        solidGroup.add(sphere);

        // Billboard Text Label
        const labelSprite = createTextSprite(v.label, isApex ? '#f59e0b' : '#38bdf8');
        labelSprite.position.set(v.x, v.y + (isApex ? 0.35 : 0.25), v.z);
        solidGroup.add(labelSprite);
      });

      // 4. Render Altitude (Chân đường cao H & Nét đứt SH & Ký hiệu góc vuông chính xác)
      if (showAltitude && altitudeFoot && apexVertex) {
        const H = new THREE.Vector3(altitudeFoot.x, altitudeFoot.y, altitudeFoot.z);
        const S = new THREE.Vector3(apexVertex.x, apexVertex.y, apexVertex.z);

        // Dashed altitude line SH (Red)
        const altGeom = new THREE.BufferGeometry().setFromPoints([S, H]);
        const altMat = new THREE.LineDashedMaterial({
          color: 0xef4444,
          dashSize: 0.14,
          gapSize: 0.08,
          linewidth: 2.4,
        });
        const altLine = new THREE.Line(altGeom, altMat);
        altLine.computeLineDistances();
        solidGroup.add(altLine);

        // Point H marker (Prominent red sphere)
        const hMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c })
        );
        hMarker.position.copy(H);
        solidGroup.add(hMarker);

        // Billboard text label for H
        const hLabel = createTextSprite('H', '#ef4444');
        hLabel.position.set(H.x + 0.28, H.y + 0.22, H.z);
        solidGroup.add(hLabel);

        // Standardized textbook auxiliary projection lines and right-angle marker
        if (solidType === 'pyramid-tri') {
          // In S.ABC: Connect H to all 3 base vertices A, B, C with dashed lines
          baseVertices.forEach((bv) => {
            const bPos = new THREE.Vector3(bv.x, bv.y, bv.z);
            if (bPos.distanceTo(H) > 0.15) {
              const gGeom = new THREE.BufferGeometry().setFromPoints([H, bPos]);
              const gMat = new THREE.LineDashedMaterial({
                color: 0xf87171,
                dashSize: 0.12,
                gapSize: 0.08,
              });
              const gLine = new THREE.Line(gGeom, gMat);
              gLine.computeLineDistances();
              solidGroup.add(gLine);
            }
          });

          // Right angle marker at H
          const refPt = baseVertices[0];
          const refPos = new THREE.Vector3(refPt.x, refPt.y, refPt.z);
          const d = Math.hypot(refPos.x - H.x, refPos.z - H.z);
          if (d > 0.25) {
            const uGround = new THREE.Vector3(refPos.x - H.x, 0, refPos.z - H.z).normalize();
            const uAlt = new THREE.Vector3(0, 1, 0);
            const boxSize = 0.22;
            const p1 = H.clone().addScaledVector(uGround, boxSize);
            const p2 = H.clone().addScaledVector(uGround, boxSize).addScaledVector(uAlt, boxSize);
            const p3 = H.clone().addScaledVector(uAlt, boxSize);
            const raGeom = new THREE.BufferGeometry().setFromPoints([p1, p2, p3]);
            const raMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2.2 });
            solidGroup.add(new THREE.Line(raGeom, raMat));
          }
        } else if (solidType === 'pyramid-quad') {
          // In S.ABCD: Draw base diagonals AC and BD in dashed lines intersecting at O(0, 0, 0)
          const A = vertMap.get('A');
          const B = vertMap.get('B');
          const C = vertMap.get('C');
          const D = vertMap.get('D');
          if (A && B && C && D) {
            const diagGeom = new THREE.BufferGeometry().setFromPoints([A, C, B, D]);
            const diagMat = new THREE.LineDashedMaterial({
              color: 0xf87171,
              dashSize: 0.12,
              gapSize: 0.08,
            });
            const diagLine = new THREE.LineSegments(diagGeom, diagMat);
            diagLine.computeLineDistances();
            solidGroup.add(diagLine);

            // Center O marker & label
            const O = new THREE.Vector3(
              (A.x + C.x + B.x + D.x) / 4,
              0,
              (A.z + C.z + B.z + D.z) / 4
            );
            const oMarker = new THREE.Mesh(
              new THREE.SphereGeometry(0.07, 12, 12),
              new THREE.MeshStandardMaterial({ color: 0x10b981 })
            );
            oMarker.position.copy(O);
            solidGroup.add(oMarker);

            const oLabel = createTextSprite('O', '#10b981');
            oLabel.position.set(O.x - 0.25, O.y + 0.22, O.z);
            solidGroup.add(oLabel);

            // If H != O (chóp xiên), draw dashed line OH
            if (H.distanceTo(O) > 0.15) {
              const ohGeom = new THREE.BufferGeometry().setFromPoints([O, H]);
              const ohMat = new THREE.LineDashedMaterial({
                color: 0xf87171,
                dashSize: 0.12,
                gapSize: 0.08,
              });
              const ohLine = new THREE.Line(ohGeom, ohMat);
              ohLine.computeLineDistances();
              solidGroup.add(ohLine);
            }

            // Right-angle marker at H
            const uGround = H.distanceTo(O) > 0.25 
              ? new THREE.Vector3(O.x - H.x, 0, O.z - H.z).normalize()
              : new THREE.Vector3(A.x - H.x, 0, A.z - H.z).normalize();
            const uAlt = new THREE.Vector3(0, 1, 0);
            const boxSize = 0.22;
            const p1 = H.clone().addScaledVector(uGround, boxSize);
            const p2 = H.clone().addScaledVector(uGround, boxSize).addScaledVector(uAlt, boxSize);
            const p3 = H.clone().addScaledVector(uAlt, boxSize);
            const raGeom = new THREE.BufferGeometry().setFromPoints([p1, p2, p3]);
            const raMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2.2 });
            solidGroup.add(new THREE.Line(raGeom, raMat));
          }
        } else {
          // General solid altitude
          if (baseVertices.length > 0) {
            const refPt = baseVertices[0];
            const refPos = new THREE.Vector3(refPt.x, refPt.y, refPt.z);
            if (refPos.distanceTo(H) > 0.25) {
              const uGround = new THREE.Vector3(refPos.x - H.x, 0, refPos.z - H.z).normalize();
              const uAlt = new THREE.Vector3(0, 1, 0);
              const boxSize = 0.22;
              const p1 = H.clone().addScaledVector(uGround, boxSize);
              const p2 = H.clone().addScaledVector(uGround, boxSize).addScaledVector(uAlt, boxSize);
              const p3 = H.clone().addScaledVector(uAlt, boxSize);
              const raGeom = new THREE.BufferGeometry().setFromPoints([p1, p2, p3]);
              const raMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2.2 });
              solidGroup.add(new THREE.Line(raGeom, raMat));
            }
          }
        }
      }
    }

    // 5. Base Centroid G
    if (showCentroid && baseCentroid) {
      const G = new THREE.Vector3(baseCentroid.x, baseCentroid.y, baseCentroid.z);
      const gMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x10b981 })
      );
      gMarker.position.copy(G);
      solidGroup.add(gMarker);

      // Connect G to base vertices with thin green dashed lines
      baseVertices.forEach((bv) => {
        const bgGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(bv.x, bv.y, bv.z),
          G,
        ]);
        const bgMat = new THREE.LineDashedMaterial({
          color: 0x10b981,
          dashSize: 0.1,
          gapSize: 0.08,
        });
        const line = new THREE.Line(bgGeom, bgMat);
        line.computeLineDistances();
        solidGroup.add(line);
      });
    }

    // 6. Section Cutting Plane (Mặt phẳng cắt alpha & Đa giác thiết diện)
    if (showSectionPlane && crossSectionPolygon.vertices3D.length >= 3) {
      const sectionPoints = crossSectionPolygon.vertices3D.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      );

      // Triangulate cross-section
      const secGeom = new THREE.BufferGeometry();
      const secPos: number[] = [];
      for (let i = 1; i < sectionPoints.length - 1; i++) {
        secPos.push(
          sectionPoints[0].x,
          sectionPoints[0].y,
          sectionPoints[0].z,
          sectionPoints[i].x,
          sectionPoints[i].y,
          sectionPoints[i].z,
          sectionPoints[i + 1].x,
          sectionPoints[i + 1].y,
          sectionPoints[i + 1].z
        );
      }
      secGeom.setAttribute('position', new THREE.Float32BufferAttribute(secPos, 3));
      secGeom.computeVertexNormals();

      const secMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0x78350f,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.2,
      });
      const secMesh = new THREE.Mesh(secGeom, secMat);
      solidGroup.add(secMesh);

      // Border outline for cross section
      const outlinePoints = [...sectionPoints, sectionPoints[0]];
      const outlineGeom = new THREE.BufferGeometry().setFromPoints(outlinePoints);
      const outlineMat = new THREE.LineBasicMaterial({
        color: 0xfbbf24,
        linewidth: 3,
      });
      solidGroup.add(new THREE.Line(outlineGeom, outlineMat));

      // Cutting Points Markers (M, N, P...)
      cuttingPoints.forEach((cp) => {
        const cpMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706 })
        );
        cpMesh.position.set(cp.pt.x, cp.pt.y, cp.pt.z);
        solidGroup.add(cpMesh);
      });
    }

    // 7. Intersection Lines (Giao tuyến 2 mặt phẳng - e.g. (SAC) & (SBD) hoặc thiết diện với đáy)
    if (showIntersectionLine && baseVertices.length >= 4 && apexVertex) {
      // Intersection of diagonal planes (SAC) and (SBD) -> line SO (altitude/median axis)
      const A = vertMap.get('A');
      const B = vertMap.get('B');
      const C = vertMap.get('C');
      const D = vertMap.get('D');
      if (A && B && C && D) {
        // Intersection of AC and BD
        const O = new THREE.Vector3(
          (A.x + C.x + B.x + D.x) / 4,
          (A.y + C.y + B.y + D.y) / 4,
          (A.z + C.z + B.z + D.z) / 4
        );
        const S = new THREE.Vector3(apexVertex.x, apexVertex.y, apexVertex.z);

        // Highlight red intersection line SO
        const lineGeom = new THREE.BufferGeometry().setFromPoints([S, O]);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0xdc2626,
          linewidth: 3,
        });
        solidGroup.add(new THREE.Line(lineGeom, lineMat));

        // Point O marker
        const oMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0xdc2626 })
        );
        oMarker.position.copy(O);
        solidGroup.add(oMarker);

        // Dashed diagonal lines AC and BD on the base
        const diagGeom = new THREE.BufferGeometry().setFromPoints([A, C, B, D]);
        const diagMat = new THREE.LineDashedMaterial({
          color: 0xf87171,
          dashSize: 0.12,
          gapSize: 0.08,
        });
        const diagLine = new THREE.LineSegments(diagGeom, diagMat);
        diagLine.computeLineDistances();
        solidGroup.add(diagLine);
      }
    }

    // 8. Circumscribed Sphere (Mặt cầu ngoại tiếp)
    if (showCircumSphere && circumSphere) {
      const { center, radius } = circumSphere;
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.18,
        roughness: 0.1,
        metalness: 0.1,
        wireframe: false,
      });
      const sphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 24),
        sphereMat
      );
      sphereMesh.position.set(center.x, center.y, center.z);
      solidGroup.add(sphereMesh);

      // Wireframe rings for the sphere
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      });
      const wireMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.001, 16, 12),
        wireMat
      );
      wireMesh.position.set(center.x, center.y, center.z);
      solidGroup.add(wireMesh);

      // Center I marker
      const centerMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 })
      );
      centerMarker.position.set(center.x, center.y, center.z);
      solidGroup.add(centerMarker);

      // Radius line from Center I to Apex
      if (apexVertex) {
        const rGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(center.x, center.y, center.z),
          new THREE.Vector3(apexVertex.x, apexVertex.y, apexVertex.z),
        ]);
        const rMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
        solidGroup.add(new THREE.Line(rGeom, rMat));
      }
    }
  }, [
    currentVertices,
    modelData,
    showAltitude,
    altitudeFoot,
    apexVertex,
    showCentroid,
    baseCentroid,
    baseVertices,
    showSectionPlane,
    crossSectionPolygon,
    cuttingPoints,
    showIntersectionLine,
    showCircumSphere,
    circumSphere,
    unfoldProgress,
  ]);

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    const container = mountRef.current;
    if (!container || !(container as any).__three) return;
    const { camera, controls } = (container as any).__three;
    camera.position.set(5.5, 4.5, 6.5);
    controls.target.set(0, 1.2, 0);
    controls.update();
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Left Control Sidebar (Chuyển điều khiển về bên tay trái) */}
      {!isSidebarOpen ? (
        /* Collapsed Floating Pill on Left Side */
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-bold text-xs rounded-xl border border-sky-500/40 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            title="Mở thanh điều khiển 3D (bên trái)"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Điều khiển 3D</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Quick Model Badge */}
          <div className="px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-bold text-white">
            <Box className="w-4 h-4 text-sky-400" />
            <span>{modelData.title}</span>
          </div>

          {/* Quick Play/Pause mini button */}
          <button
            onClick={() => setIsAutoUnfolding(!isAutoUnfolding)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border shadow-lg backdrop-blur-md transition-all ${
              isAutoUnfolding
                ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-emerald-500/20'
                : 'bg-slate-900/90 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10'
            }`}
            title={isAutoUnfolding ? 'Tạm dừng khai triển tự động' : 'Chạy khai triển tự động'}
          >
            {isAutoUnfolding ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{(unfoldProgress * 100).toFixed(0)}%</span>
          </button>

          {/* Reset Camera Button */}
          <button
            onClick={handleResetCamera}
            className="p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md transition-colors"
            title="Đặt lại góc nhìn camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Full Left-Side Control Panel */
        <div className="absolute top-3 left-3 bottom-3 z-30 w-88 max-w-[calc(100vw-24px)] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{modelData.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-sky-500/20 text-sky-300 font-mono rounded font-semibold">
                    Động 3D
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Không gian hình học trực quan</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetCamera}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Đặt lại góc nhìn Camera"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Thu gọn bảng điều khiển"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center p-1.5 gap-1 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto no-scrollbar text-[11px]">
            <button
              onClick={() => setActiveTab('solid')}
              className={`px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'solid'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Khối 3D</span>
            </button>

            <button
              onClick={() => setActiveTab('unfold')}
              className={`px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'unfold'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FoldHorizontal className="w-3.5 h-3.5" />
              <span>Khai triển</span>
              {isAutoUnfolding && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
            </button>

            <button
              onClick={() => setActiveTab('apex')}
              className={`px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'apex'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Đỉnh S & Xiên</span>
            </button>

            <button
              onClick={() => setActiveTab('section')}
              className={`px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'section'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Mặt cắt α</span>
            </button>

            <button
              onClick={() => setActiveTab('elements')}
              className={`px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shrink-0 ${
                activeTab === 'elements'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Phần tử</span>
            </button>
          </div>

          {/* Tab Content Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs text-slate-300 custom-scrollbar">
            {/* TAB: SOLID PRESETS */}
            {activeTab === 'solid' && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Chọn loại hình khối không gian:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pyramid-tri', name: 'Chóp tam giác', sub: 'S.ABC' },
                    { id: 'pyramid-quad', name: 'Chóp tứ giác', sub: 'S.ABCD' },
                    { id: 'pyramid-pent', name: 'Chóp ngũ giác', sub: 'S.ABCDE' },
                    { id: 'tetrahedron', name: 'Tứ diện đều', sub: 'ABCD' },
                    { id: 'prism-tri', name: 'Lăng trụ tam giác', sub: "ABC.A'B'C'" },
                    { id: 'cuboid', name: 'Hình hộp', sub: "ABCD.A'B'C'D'" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSolid(s.id as Solid3DType)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        solidType === s.id
                          ? 'bg-sky-600/30 border-sky-400 text-white shadow-lg shadow-sky-600/20'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-xs font-semibold">{s.name}</div>
                      <div className="text-[10px] text-sky-400 font-mono mt-0.5">{s.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Banner chuyển sang Mặt tròn xoay */}
                {onSwitchToRevolution && (
                  <div className="p-3 bg-gradient-to-r from-cyan-950/50 to-slate-900 rounded-xl border border-cyan-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Mặt Tròn Xoay & Đường Sinh</span>
                      </div>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-medium">
                        Mới
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      Mô phỏng hình nón, hình trụ, mặt cầu, mặt xuyến quét từ đường sinh quay quanh trục Δ.
                    </p>
                    <button
                      onClick={onSwitchToRevolution}
                      className="w-full py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Mở Không Gian Mặt Tròn Xoay</span>
                    </button>
                  </div>
                )}

                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
                  <div className="font-semibold text-sky-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Tương tác 3D trực tiếp
                  </div>
                  <div>• Xoay tự do bằng chuột trái hoặc vuốt cảm ứng.</div>
                  <div>• Kéo trực tiếp đỉnh S trên không gian 3D để tạo chóp xiên mọi góc độ.</div>
                  <div>• Chân đường cao H (⊥) và trọng tâm G tự động bám theo hình dạng.</div>
                </div>
              </div>
            )}

            {/* TAB: AUTO UNFOLD (KHAI TRIỂN TỰ ĐỘNG THEO TỐC ĐỘ CHO PHÉP) */}
            {activeTab === 'unfold' && (
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <FoldHorizontal className="w-4 h-4 text-emerald-400" />
                      <span>Khai triển tự động</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {(unfoldProgress * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Play / Pause Main Trigger */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // If at 100% and not looping, reset to 0 to replay
                        if (unfoldProgress >= 0.99 && unfoldLoopMode === 'once') {
                          setUnfoldProgress(0);
                          unfoldDirectionRef.current = 1;
                        }
                        setIsAutoUnfolding(!isAutoUnfolding);
                      }}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                        isAutoUnfolding
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      }`}
                    >
                      {isAutoUnfolding ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Tạm dừng</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Chạy khai triển tự động</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setIsAutoUnfolding(false);
                        setUnfoldProgress(0);
                        unfoldDirectionRef.current = 1;
                      }}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
                      title="Đặt lại về trạng thái đóng (0%)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Animation status info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Trạng thái:</span>
                    <span className="font-semibold text-emerald-300">
                      {isAutoUnfolding
                        ? unfoldDirectionRef.current > 0
                          ? 'Đang mở ra ↗'
                          : 'Đang khép lại ↙'
                        : unfoldProgress >= 0.99
                        ? 'Đã mở phẳng hoàn toàn'
                        : unfoldProgress <= 0.01
                        ? 'Đang đóng khối (0%)'
                        : 'Đang tạm dừng'}
                    </span>
                  </div>

                  {/* Speed Selector (Tốc độ cho phép) */}
                  <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">Tốc độ cho phép:</span>
                      <span className="font-mono text-emerald-400 font-bold">{unfoldSpeed.toFixed(1)}x</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { speed: 0.5, label: '0.5x' },
                        { speed: 1.0, label: '1.0x' },
                        { speed: 1.5, label: '1.5x' },
                        { speed: 2.0, label: '2.0x' },
                        { speed: 3.0, label: '3.0x' },
                      ].map((item) => (
                        <button
                          key={item.speed}
                          onClick={() => setUnfoldSpeed(item.speed)}
                          className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                            Math.abs(unfoldSpeed - item.speed) < 0.01
                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loop Mode Selector */}
                  <div className="space-y-1.5 pt-2 border-t border-emerald-500/20">
                    <span className="text-[11px] text-slate-300 font-medium">Chế độ lặp lại:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setUnfoldLoopMode('ping-pong')}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                          unfoldLoopMode === 'ping-pong'
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                            : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <Repeat className="w-3 h-3" />
                        <span>Mở ↔ Đóng liên tục</span>
                      </button>

                      <button
                        onClick={() => setUnfoldLoopMode('once')}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                          unfoldLoopMode === 'once'
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                            : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <FastForward className="w-3 h-3" />
                        <span>Mở 1 lần rồi dừng</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manual Fine Scrubbing Slider */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Điều chỉnh thủ công (0% - 100%):</span>
                    <span className="font-mono text-emerald-400 font-bold">{(unfoldProgress * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={unfoldProgress}
                    onChange={(e) => {
                      setIsAutoUnfolding(false);
                      setUnfoldProgress(parseFloat(e.target.value));
                    }}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <button
                      onClick={() => {
                        setIsAutoUnfolding(false);
                        setUnfoldProgress(0);
                        unfoldDirectionRef.current = 1;
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors"
                    >
                      Đóng (0%)
                    </button>
                    <button
                      onClick={() => {
                        setIsAutoUnfolding(false);
                        setUnfoldProgress(0.5);
                      }}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-medium transition-colors"
                    >
                      Nửa mở (50%)
                    </button>
                    <button
                      onClick={() => {
                        setIsAutoUnfolding(false);
                        setUnfoldProgress(1);
                        unfoldDirectionRef.current = -1;
                      }}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] transition-colors"
                    >
                      Mở 100%
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800 text-[10px] text-slate-400 italic leading-relaxed">
                  💡 Khi khai triển, các mặt bên và toàn bộ các cạnh bên chuyển động xoay quanh cạnh đáy mở phẳng xuống mặt phẳng đáy.
                </div>
              </div>
            )}

            {/* TAB: APEX DYNAMICS & SLANT CONTROLS (ĐỈNH S & CHÓP XIÊN) */}
            {activeTab === 'apex' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Dạng chóp hiện tại:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-sky-500/20 text-sky-300 font-mono">
                    {Math.abs(apexOffsetX) < 0.08 && Math.abs(apexOffsetZ) < 0.08
                      ? 'Chóp đều đứng (H ≡ O)'
                      : baseVertices.length > 0 &&
                        Math.abs(apexOffsetX - baseVertices[0].x) < 0.1 &&
                        Math.abs(apexOffsetZ - baseVertices[0].z) < 0.1
                      ? 'Cạnh SA ⊥ Đáy'
                      : 'Chóp xiên (Lệch trục)'}
                  </span>
                </div>

                {/* 4 Textbook Altitude Presets */}
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-slate-300">Thiết lập nhanh chân đường cao H:</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setApexOffsetX(0);
                        setApexOffsetZ(0);
                      }}
                      className={`px-2 py-1.5 rounded-xl text-left border transition-all ${
                        Math.abs(apexOffsetX) < 0.08 && Math.abs(apexOffsetZ) < 0.08
                          ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-md'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">Chóp Đứng (H ≡ O)</div>
                      <div className="text-[9px] opacity-80">SH ⊥ Đáy tại tâm</div>
                    </button>

                    <button
                      onClick={() => {
                        setApexOffsetX(1.4);
                        setApexOffsetZ(0.8);
                      }}
                      className={`px-2 py-1.5 rounded-xl text-left border transition-all ${
                        Math.abs(apexOffsetX - 1.4) < 0.1 && Math.abs(apexOffsetZ - 0.8) < 0.1
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-[11px]">Chóp Xiên Lệch</div>
                      <div className="text-[9px] opacity-80">Đỉnh S nghiêng góc</div>
                    </button>

                    {baseVertices.length > 0 && (
                      <button
                        onClick={() => {
                          setApexOffsetX(baseVertices[0].x);
                          setApexOffsetZ(baseVertices[0].z);
                        }}
                        className={`px-2 py-1.5 rounded-xl text-left border transition-all ${
                          Math.abs(apexOffsetX - baseVertices[0].x) < 0.1 &&
                          Math.abs(apexOffsetZ - baseVertices[0].z) < 0.1
                            ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-[11px]">Cạnh SA ⊥ Đáy</div>
                        <div className="text-[9px] opacity-80">H trùng đỉnh A</div>
                      </button>
                    )}

                    {baseVertices.length >= 2 && (
                      <button
                        onClick={() => {
                          setApexOffsetX((baseVertices[0].x + baseVertices[1].x) / 2);
                          setApexOffsetZ((baseVertices[0].z + baseVertices[1].z) / 2);
                        }}
                        className="px-2 py-1.5 rounded-xl text-left border bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 transition-all"
                      >
                        <div className="font-semibold text-[11px]">SH ⊥ Đáy (AB)</div>
                        <div className="text-[9px] opacity-80">H là trung điểm AB</div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Precision Sliders for Sx, Sy, Sz */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Chiều cao đỉnh S (Oy):</span>
                      <span className="font-mono text-amber-400 font-bold">{apexHeight.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5.5"
                      step="0.05"
                      value={apexHeight}
                      onChange={(e) => setApexHeight(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Độ lệch Ox (Trái ↔ Phải):</span>
                      <span className="font-mono text-sky-400 font-bold">
                        {apexOffsetX > 0 ? `+${apexOffsetX.toFixed(2)}` : apexOffsetX.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-3.5"
                      max="3.5"
                      step="0.05"
                      value={apexOffsetX}
                      onChange={(e) => setApexOffsetX(parseFloat(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Độ lệch Oz (Trước ↔ Sau):</span>
                      <span className="font-mono text-sky-400 font-bold">
                        {apexOffsetZ > 0 ? `+${apexOffsetZ.toFixed(2)}` : apexOffsetZ.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-3.5"
                      max="3.5"
                      step="0.05"
                      value={apexOffsetZ}
                      onChange={(e) => setApexOffsetZ(parseFloat(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 italic bg-slate-950/50 p-2 rounded-lg border border-slate-800 leading-relaxed">
                  💡 Bạn có thể nhấn giữ và kéo trực tiếp đỉnh S trên khung hình 3D, các cạnh bên sẽ tự động co giãn bám theo.
                </div>
              </div>
            )}

            {/* TAB: SECTION PLANE α (MẶT CẮT & THIẾT DIỆN) */}
            {activeTab === 'section' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSectionPlane}
                      onChange={(e) => setShowSectionPlane(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-300">Bật mặt phẳng cắt (α)</span>
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {crossSectionPolygon.vertices3D.length > 0
                      ? `${crossSectionPolygon.vertices3D.length} đỉnh thiết diện`
                      : 'Chưa cắt'}
                  </span>
                </div>

                {showSectionPlane ? (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="text-[11px] text-slate-300 font-medium">
                      Điều chỉnh vị trí các điểm cắt trên cạnh bên:
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Vị trí điểm M trên SA:</span>
                        <span className="font-mono text-amber-400 font-bold">{(ratioSA * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={ratioSA}
                        onChange={(e) => setRatioSA(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Vị trí điểm N trên SB:</span>
                        <span className="font-mono text-amber-400 font-bold">{(ratioSB * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={ratioSB}
                        onChange={(e) => setRatioSB(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Vị trí điểm P trên SC:</span>
                        <span className="font-mono text-amber-400 font-bold">{(ratioSC * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={ratioSC}
                        onChange={(e) => setRatioSC(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
                      />
                    </div>

                    {/* Detach Button */}
                    <button
                      onClick={() => setIsDetachedOpen(true)}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all text-xs"
                    >
                      <Layers className="w-4 h-4" />
                      Tách rời thiết diện ra hình phẳng 2D
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>• Mặt phẳng cắt (α) mặc định được ẩn riêng, chỉ xuất hiện khi người dùng kích hoạt.</p>
                    <p>• Tích chọn "Bật mặt phẳng cắt (α)" ở trên để xác định giao tuyến và thiết diện.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: GEOMETRIC ELEMENTS & SPHERE */}
            {activeTab === 'elements' && (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Hiển thị phần tử hình học:
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs text-slate-200 cursor-pointer border border-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={showAltitude}
                      onChange={(e) => setShowAltitude(e.target.checked)}
                      className="rounded text-sky-500 focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-sky-300">Chân đường cao H (⊥)</div>
                      <div className="text-[10px] text-slate-400">Đoạn SH vuông góc với đáy kèm ký hiệu góc vuông</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs text-slate-200 cursor-pointer border border-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={showCentroid}
                      onChange={(e) => setShowCentroid(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-emerald-300">Trọng tâm đáy G</div>
                      <div className="text-[10px] text-slate-400">Điểm G và các đường nối tới các đỉnh đáy</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs text-slate-200 cursor-pointer border border-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={showIntersectionLine}
                      onChange={(e) => setShowIntersectionLine(e.target.checked)}
                      className="rounded text-red-500 focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-rose-300">Giao tuyến 2 mặt phẳng (đỏ)</div>
                      <div className="text-[10px] text-slate-400">Giao tuyến (SAC) & (SBD) hoặc đường chéo</div>
                    </div>
                  </label>

                  {/* Circumscribed Sphere Option */}
                  <label className="flex items-center gap-2 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-xs text-slate-200 cursor-pointer border border-slate-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={showCircumSphere}
                      onChange={(e) => setShowCircumSphere(e.target.checked)}
                      className="rounded text-indigo-500 focus:ring-0 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-indigo-300">Mặt cầu ngoại tiếp (Circumscribed Sphere)</div>
                      <div className="text-[10px] text-slate-400">Tự động tìm 4 đỉnh, tính tâm I và bán kính R</div>
                    </div>
                  </label>
                </div>

                {/* Sphere Info HUD inside tab */}
                {showCircumSphere && circumSphere && (
                  <div className="p-3 bg-slate-950/70 border border-sky-500/40 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 text-sky-300 font-bold text-xs mb-1">
                      <Globe className="w-3.5 h-3.5" /> Thông số mặt cầu ngoại tiếp:
                    </div>
                    <div className="space-y-1 font-mono text-[11px] text-slate-300">
                      <div>
                        Tâm I:{' '}
                        <span className="text-sky-400 font-bold">
                          ({circumSphere.center.x.toFixed(2)}, {circumSphere.center.y.toFixed(2)},{' '}
                          {circumSphere.center.z.toFixed(2)})
                        </span>
                      </div>
                      <div>
                        Bán kính R:{' '}
                        <span className="text-emerald-400 font-bold">{circumSphere.radius.toFixed(3)} đv</span>
                      </div>
                      <div>
                        Thể tích khối cầu V:{' '}
                        <span className="text-amber-400 font-bold">
                          {((4 / 3) * Math.PI * Math.pow(circumSphere.radius, 3)).toFixed(3)} đvtt
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
            <span>Chế độ: Toàn màn hình 3D</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-sky-400 hover:text-sky-300 font-medium"
            >
              Thu nhỏ ←
            </button>
          </div>
        </div>
      )}

      {/* Detached Section 2D Overlay Window */}
      <DetachedSection2D
        vertices3D={crossSectionPolygon.vertices3D}
        labels={crossSectionPolygon.labels}
        isOpen={isDetachedOpen}
        onClose={() => setIsDetachedOpen(false)}
        solidTitle={modelData.title}
      />
    </div>
  );
};
