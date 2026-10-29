import React, { useState, useRef, useMemo } from 'react';
import {
  Compass,
  Circle,
  Triangle as TriangleIcon,
  Maximize2,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  Check,
  Info,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Move,
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
  label?: string;
}

export const PlaneGeometry2D: React.FC = () => {
  // Triangle vertices state (in world SVG coordinates)
  const [pts, setPts] = useState<{ A: Point; B: Point; C: Point }>({
    A: { x: 380, y: 110, label: 'A' },
    B: { x: 160, y: 440, label: 'B' },
    C: { x: 620, y: 440, label: 'C' },
  });

  const [activeDragPoint, setActiveDragPoint] = useState<'A' | 'B' | 'C' | null>(null);

  // Zoom & Pan State (Phóng to, thu nhỏ và di chuyển hình phẳng 2D)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Sidebar visibility state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Geometric feature toggles
  const [showCircumcircle, setShowCircumcircle] = useState<boolean>(true);
  const [showIncircle, setShowIncircle] = useState<boolean>(false);
  const [showAltitudes, setShowAltitudes] = useState<boolean>(true);
  const [showMedians, setShowMedians] = useState<boolean>(false);
  const [showCentroid, setShowCentroid] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);

  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom In / Zoom Out Controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(parseFloat((z + 0.15).toFixed(2)), 3.5));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(parseFloat((z - 0.15).toFixed(2)), 0.35));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!svgRef.current) {
      handleResetZoom();
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const minX = Math.min(pts.A.x, pts.B.x, pts.C.x);
    const maxX = Math.max(pts.A.x, pts.B.x, pts.C.x);
    const minY = Math.min(pts.A.y, pts.B.y, pts.C.y);
    const maxY = Math.max(pts.A.y, pts.B.y, pts.C.y);

    const figW = Math.max(maxX - minX + 160, 240);
    const figH = Math.max(maxY - minY + 160, 240);
    const scaleX = rect.width / figW;
    const scaleY = rect.height / figH;
    const newZoom = Math.max(0.45, Math.min(2.5, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    setPan({
      x: rect.width / 2 - midX * newZoom,
      y: rect.height / 2 - midY * newZoom,
    });
    setZoom(parseFloat(newZoom.toFixed(2)));
  };

  // Mouse Wheel Zoom (phóng to / thu nhỏ tại vị trí con trỏ chuột)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const newZoom = Math.max(0.35, Math.min(3.5, zoom * zoomFactor));

    setPan((prevPan) => ({
      x: mouseX - (mouseX - prevPan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - prevPan.y) * (newZoom / zoom),
    }));
    setZoom(parseFloat(newZoom.toFixed(2)));
  };

  // Dragging vertex handler with zoom & pan inverted coordinates
  const handlePointerDown = (ptKey: 'A' | 'B' | 'C') => (e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveDragPoint(ptKey);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  // Canvas background pan handler
  const handleSvgPointerDown = (e: React.PointerEvent) => {
    if (activeDragPoint) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOriginRef.current = { ...pan };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeDragPoint) {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      // Invert screen coordinates to world coordinates
      const worldX = (mouseScreenX - pan.x) / zoom;
      const worldY = (mouseScreenY - pan.y) / zoom;

      setPts((prev) => ({
        ...prev,
        [activeDragPoint]: { ...prev[activeDragPoint], x: worldX, y: worldY },
      }));
    } else if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panOriginRef.current.x + dx,
        y: panOriginRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDragPoint) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setActiveDragPoint(null);
    }
    if (isPanning) {
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch (err) {}
      setIsPanning(false);
    }
  };

  // Preset triangles
  const setPreset = (type: 'equilateral' | 'right' | 'isosceles' | 'obtuse') => {
    if (type === 'equilateral') {
      setPts({
        A: { x: 390, y: 120, label: 'A' },
        B: { x: 210, y: 430, label: 'B' },
        C: { x: 570, y: 430, label: 'C' },
      });
    } else if (type === 'right') {
      setPts({
        A: { x: 210, y: 140, label: 'A' },
        B: { x: 210, y: 440, label: 'B' },
        C: { x: 610, y: 440, label: 'C' },
      });
    } else if (type === 'isosceles') {
      setPts({
        A: { x: 390, y: 110, label: 'A' },
        B: { x: 220, y: 440, label: 'B' },
        C: { x: 560, y: 440, label: 'C' },
      });
    } else if (type === 'obtuse') {
      setPts({
        A: { x: 230, y: 220, label: 'A' },
        B: { x: 150, y: 440, label: 'B' },
        C: { x: 640, y: 440, label: 'C' },
      });
    }
  };

  // Geometric Calculations
  const metrics = useMemo(() => {
    const { A, B, C } = pts;

    // Distances
    const dist = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const a = dist(B, C); // BC opposite to A
    const b = dist(C, A); // CA opposite to B
    const c = dist(A, B); // AB opposite to C

    const perimeter = a + b + c;
    const p = perimeter / 2;
    // Heron's Area
    const areaSq = Math.max(0, p * (p - a) * (p - b) * (p - c));
    const area = Math.sqrt(areaSq);

    // Angles (Law of Cosines) in degrees
    const clampCos = (v: number) => Math.max(-1, Math.min(1, v));
    const angleA = (Math.acos(clampCos((b * b + c * c - a * a) / (2 * b * c))) * 180) / Math.PI;
    const angleB = (Math.acos(clampCos((a * a + c * c - b * b) / (2 * a * c))) * 180) / Math.PI;
    const angleC = 180 - angleA - angleB;

    // Check Right Angle (approx 90 deg within 1.2 deg)
    const isRightA = Math.abs(angleA - 90) < 1.2;
    const isRightB = Math.abs(angleB - 90) < 1.2;
    const isRightC = Math.abs(angleC - 90) < 1.2;

    // Circumcenter O (Tâm đường tròn ngoại tiếp)
    const D = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    let O = { x: 0, y: 0 };
    let R = 0;
    if (Math.abs(D) > 1e-4) {
      const sqA = A.x * A.x + A.y * A.y;
      const sqB = B.x * B.x + B.y * B.y;
      const sqC = C.x * C.x + C.y * C.y;
      O.x = (sqA * (B.y - C.y) + sqB * (C.y - A.y) + sqC * (A.y - B.y)) / D;
      O.y = (sqA * (C.x - B.x) + sqB * (A.x - C.x) + sqC * (B.x - A.x)) / D;
      R = dist(O, A);
    }

    // Incenter I (Tâm đường tròn nội tiếp)
    const I = {
      x: (a * A.x + b * B.x + c * C.x) / perimeter,
      y: (a * A.y + b * B.y + c * C.y) / perimeter,
    };
    const rIn = area / p;

    // Centroid G (Trọng tâm)
    const G = {
      x: (A.x + B.x + C.x) / 3,
      y: (A.y + B.y + C.y) / 3,
    };

    // Altitudes & Feet of perpendicular
    const projectPointOnLine = (P: Point, L1: Point, L2: Point) => {
      const dx = L2.x - L1.x;
      const dy = L2.y - L1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-4) return L1;
      const t = ((P.x - L1.x) * dx + (P.y - L1.y) * dy) / lenSq;
      return { x: L1.x + t * dx, y: L1.y + t * dy };
    };

    const Ha = projectPointOnLine(A, B, C); // Chân đường cao từ A
    const Hb = projectPointOnLine(B, C, A); // Chân đường cao từ B
    const Hc = projectPointOnLine(C, A, B); // Chân đường cao từ C

    // Orthocenter H (Trực tâm)
    // Giao điểm 2 đường cao Ha-A và Hb-B
    const lineIntersection = (p1: Point, p2: Point, p3: Point, p4: Point) => {
      const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
      if (Math.abs(denom) < 1e-4) return G;
      const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      };
    };
    const H = lineIntersection(A, Ha, B, Hb);

    // Medians midpoints (Trung điểm)
    const Ma = { x: (B.x + C.x) / 2, y: (B.y + C.y) / 2 };
    const Mb = { x: (C.x + A.x) / 2, y: (C.y + A.y) / 2 };
    const Mc = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };

    return {
      a,
      b,
      c,
      perimeter,
      area,
      angleA,
      angleB,
      angleC,
      isRightA,
      isRightB,
      isRightC,
      O,
      R,
      I,
      rIn,
      G,
      Ha,
      Hb,
      Hc,
      H,
      Ma,
      Mb,
      Mc,
    };
  }, [pts]);

  // Helper for right angle symbol
  const makeRightAngleSymbol = (corner: Point, p1: Point, p2: Point, size = 14) => {
    const v1 = { x: p1.x - corner.x, y: p1.y - corner.y };
    const v2 = { x: p2.x - corner.x, y: p2.y - corner.y };
    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    if (l1 < 1e-3 || l2 < 1e-3) return '';
    const u1 = { x: (v1.x / l1) * size, y: (v1.y / l1) * size };
    const u2 = { x: (v2.x / l2) * size, y: (v2.y / l2) * size };

    const pA = { x: corner.x + u1.x, y: corner.y + u1.y };
    const pB = { x: corner.x + u1.x + u2.x, y: corner.y + u1.y + u2.y };
    const pC = { x: corner.x + u2.x, y: corner.y + u2.y };

    return `M ${pA.x} ${pA.y} L ${pB.x} ${pB.y} L ${pC.x} ${pC.y}`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Main 2D Interactive Canvas Area */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden flex flex-col">
        {/* Top Floating Controls Bar */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          {/* Title Badge */}
          <div className="px-3 py-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              Hình phẳng 2D
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono rounded">
              Kéo đỉnh A, B, C
            </span>
          </div>

          {/* Triangle Presets */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={() => setPreset('equilateral')}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Tam giác đều
            </button>
            <button
              onClick={() => setPreset('right')}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Tam giác vuông
            </button>
            <button
              onClick={() => setPreset('isosceles')}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Tam giác cân
            </button>
            <button
              onClick={() => setPreset('obtuse')}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Tam giác tù
            </button>
          </div>

          {/* ZOOM & PAN CONTROLS (PHÓNG TO, THU NHỎ & ĐẶT LẠI) */}
          <div className="flex items-center gap-1 bg-slate-900/95 border border-sky-500/40 rounded-xl p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Thu nhỏ hình phẳng (-)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono font-bold text-sky-400 hover:bg-slate-800 rounded transition-colors"
              title="Bấm để đặt lại 100%"
            >
              {(zoom * 100).toFixed(0)}%
            </button>

            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Phóng to hình phẳng (+)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-4 bg-slate-700/80 mx-0.5" />

            <button
              onClick={handleFitToScreen}
              className="p-1.5 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
              title="Vừa khung hình (Fit to Screen)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Vừa khung</span>
            </button>

            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Đặt lại vị trí ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border shadow-lg backdrop-blur-md transition-all ${
              !isSidebarOpen
                ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title={isSidebarOpen ? 'Thu gọn bảng thông số' : 'Mở bảng thông số'}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isSidebarOpen ? 'Ẩn thông số' : 'Hiện thông số'}</span>
            {isSidebarOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* SVG Drawing Board with Zoom & Pan Transform */}
        <svg
          ref={svgRef}
          onWheel={handleWheel}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`w-full h-full select-none touch-none ${
            activeDragPoint ? 'cursor-grabbing' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Notebook Grid / Caro Pattern */}
          <defs>
            <pattern id="gridCaro" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1e293b" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Solid base canvas background */}
          <rect width="100%" height="100%" fill="#0a0f1d" />

          {/* Scaled & Panned Scene Group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Extended Caro grid moving and scaling in perfect sync with the geometry */}
            <rect x={-8000} y={-8000} width={16000} height={16000} fill="url(#gridCaro)" />

            {/* 1. Circumcircle (Ngoại tiếp) */}
            {showCircumcircle && metrics.R > 0 && (
              <g>
                <circle
                  cx={metrics.O.x}
                  cy={metrics.O.y}
                  r={metrics.R}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  className="opacity-70"
                />
                <circle cx={metrics.O.x} cy={metrics.O.y} r="4" fill="#06b6d4" />
                <text
                  x={metrics.O.x + 8}
                  y={metrics.O.y - 8}
                  fill="#67e8f9"
                  fontSize="12"
                  fontWeight="bold"
                  className="font-mono select-none"
                >
                  O
                </text>
              </g>
            )}

            {/* 2. Incircle (Nội tiếp) */}
            {showIncircle && metrics.rIn > 0 && (
              <g>
                <circle
                  cx={metrics.I.x}
                  cy={metrics.I.y}
                  r={metrics.rIn}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2"
                  strokeDasharray="5,3"
                  className="opacity-75"
                />
                <circle cx={metrics.I.x} cy={metrics.I.y} r="4" fill="#ec4899" />
                <text
                  x={metrics.I.x + 8}
                  y={metrics.I.y - 8}
                  fill="#f472b6"
                  fontSize="12"
                  fontWeight="bold"
                  className="font-mono select-none"
                >
                  I
                </text>
              </g>
            )}

            {/* 3. Medians (Đường trung tuyến & Trọng tâm G) */}
            {showMedians && (
              <g>
                <line
                  x1={pts.A.x}
                  y1={pts.A.y}
                  x2={metrics.Ma.x}
                  y2={metrics.Ma.y}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <line
                  x1={pts.B.x}
                  y1={pts.B.y}
                  x2={metrics.Mb.x}
                  y2={metrics.Mb.y}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <line
                  x1={pts.C.x}
                  y1={pts.C.y}
                  x2={metrics.Mc.x}
                  y2={metrics.Mc.y}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <circle cx={metrics.Ma.x} cy={metrics.Ma.y} r="3" fill="#10b981" />
                <circle cx={metrics.Mb.x} cy={metrics.Mb.y} r="3" fill="#10b981" />
                <circle cx={metrics.Mc.x} cy={metrics.Mc.y} r="3" fill="#10b981" />
              </g>
            )}

            {/* Centroid G */}
            {showCentroid && (
              <g>
                <circle cx={metrics.G.x} cy={metrics.G.y} r="5" fill="#10b981" />
                <text
                  x={metrics.G.x + 8}
                  y={metrics.G.y - 8}
                  fill="#6ee7b7"
                  fontSize="12"
                  fontWeight="bold"
                  className="font-mono select-none"
                >
                  G
                </text>
              </g>
            )}

            {/* 4. Altitudes & Orthocenter H (Đường cao & Trực tâm) */}
            {showAltitudes && (
              <g>
                {/* Altitudes lines */}
                <line
                  x1={pts.A.x}
                  y1={pts.A.y}
                  x2={metrics.Ha.x}
                  y2={metrics.Ha.y}
                  stroke="#ef4444"
                  strokeWidth="1.8"
                  strokeDasharray="4,4"
                />
                <line
                  x1={pts.B.x}
                  y1={pts.B.y}
                  x2={metrics.Hb.x}
                  y2={metrics.Hb.y}
                  stroke="#ef4444"
                  strokeWidth="1.8"
                  strokeDasharray="4,4"
                />
                <line
                  x1={pts.C.x}
                  y1={pts.C.y}
                  x2={metrics.Hc.x}
                  y2={metrics.Hc.y}
                  stroke="#ef4444"
                  strokeWidth="1.8"
                  strokeDasharray="4,4"
                />

                {/* Orthocenter H */}
                <circle cx={metrics.H.x} cy={metrics.H.y} r="5" fill="#ef4444" />
                <text
                  x={metrics.H.x + 8}
                  y={metrics.H.y - 8}
                  fill="#fca5a5"
                  fontSize="12"
                  fontWeight="bold"
                  className="font-mono select-none"
                >
                  H
                </text>

                {/* Right angle symbols at altitude feet */}
                <path
                  d={makeRightAngleSymbol(metrics.Ha, pts.A, pts.B, 12)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
                <path
                  d={makeRightAngleSymbol(metrics.Hb, pts.B, pts.A, 12)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
                <path
                  d={makeRightAngleSymbol(metrics.Hc, pts.C, pts.A, 12)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* 5. Main Triangle Polygon ABC */}
            <polygon
              points={`${pts.A.x},${pts.A.y} ${pts.B.x},${pts.B.y} ${pts.C.x},${pts.C.y}`}
              fill="rgba(56, 189, 248, 0.14)"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* Right angle marker on vertices if 90 degrees */}
            {metrics.isRightA && (
              <path
                d={makeRightAngleSymbol(pts.A, pts.B, pts.C, 16)}
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
              />
            )}
            {metrics.isRightB && (
              <path
                d={makeRightAngleSymbol(pts.B, pts.A, pts.C, 16)}
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
              />
            )}
            {metrics.isRightC && (
              <path
                d={makeRightAngleSymbol(pts.C, pts.A, pts.B, 16)}
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
              />
            )}

            {/* Angles Arc Labels */}
            {showAngles && (
              <g className="font-mono text-[11px] select-none">
                <text x={pts.A.x} y={pts.A.y + 24} fill="#e2e8f0" textAnchor="middle">
                  {metrics.angleA.toFixed(1)}°
                </text>
                <text x={pts.B.x + 22} y={pts.B.y - 10} fill="#e2e8f0">
                  {metrics.angleB.toFixed(1)}°
                </text>
                <text x={pts.C.x - 42} y={pts.C.y - 10} fill="#e2e8f0">
                  {metrics.angleC.toFixed(1)}°
                </text>
              </g>
            )}

            {/* Side length badges */}
            <g className="font-mono text-[10px] select-none">
              {/* Edge BC (a) */}
              <rect
                x={(pts.B.x + pts.C.x) / 2 - 20}
                y={(pts.B.y + pts.C.y) / 2 + 8}
                width="40"
                height="18"
                rx="4"
                fill="#0f172a"
                stroke="#334155"
              />
              <text
                x={(pts.B.x + pts.C.x) / 2}
                y={(pts.B.y + pts.C.y) / 2 + 21}
                fill="#94a3b8"
                textAnchor="middle"
              >
                a={metrics.a.toFixed(1)}
              </text>

              {/* Edge CA (b) */}
              <rect
                x={(pts.C.x + pts.A.x) / 2 + 8}
                y={(pts.C.y + pts.A.y) / 2 - 10}
                width="40"
                height="18"
                rx="4"
                fill="#0f172a"
                stroke="#334155"
              />
              <text
                x={(pts.C.x + pts.A.x) / 2 + 28}
                y={(pts.C.y + pts.A.y) / 2 + 3}
                fill="#94a3b8"
                textAnchor="middle"
              >
                b={metrics.b.toFixed(1)}
              </text>

              {/* Edge AB (c) */}
              <rect
                x={(pts.A.x + pts.B.x) / 2 - 48}
                y={(pts.A.y + pts.B.y) / 2 - 10}
                width="40"
                height="18"
                rx="4"
                fill="#0f172a"
                stroke="#334155"
              />
              <text
                x={(pts.A.x + pts.B.x) / 2 - 28}
                y={(pts.A.y + pts.B.y) / 2 + 3}
                fill="#94a3b8"
                textAnchor="middle"
              >
                c={metrics.c.toFixed(1)}
              </text>
            </g>

            {/* Interactive Vertex Handles */}
            {(['A', 'B', 'C'] as const).map((key) => {
              const p = pts[key];
              const isDragging = activeDragPoint === key;
              return (
                <g
                  key={key}
                  onPointerDown={handlePointerDown(key)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {/* Glow ring */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isDragging ? 18 : 14}
                    fill="rgba(56, 189, 248, 0.25)"
                  />
                  {/* Core dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="7"
                    fill={isDragging ? '#f59e0b' : '#38bdf8'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  {/* Label text */}
                  <text
                    x={p.x}
                    y={p.y - 12}
                    fill="#ffffff"
                    fontSize="15"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="font-mono select-none drop-shadow"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Hint at Bottom */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg text-[11px] text-slate-400 select-none pointer-events-none flex items-center gap-2">
          <Move className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>
            Lăn chuột để <strong className="text-sky-300">phóng to / thu nhỏ</strong>, kéo rê nền để <strong className="text-emerald-300">di chuyển</strong>, kéo đỉnh A, B, C để đổi kích thước.
          </span>
        </div>
      </div>

      {/* Right Sidebar: Dynamic Geometry Dashboard & Formulas */}
      <div
        className={`bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 h-full overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'w-full lg:w-96 opacity-100' : 'w-0 p-0 border-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
            <TriangleIcon className="w-4 h-4" />
            <span>Thông số hình học tam giác</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Thu gọn bảng thông số"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Kéo các đỉnh A, B, C hoặc dùng thanh zoom để quan sát toàn bộ hệ thức lượng và đường đặc biệt biến thiên theo thời gian thực.
          </p>

          {/* Feature Toggles */}
          <div className="space-y-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-xs">
            <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Bật/Tắt đối tượng dựng hình:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showCircumcircle}
                  onChange={(e) => setShowCircumcircle(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
                Đường tròn (O; R)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showIncircle}
                  onChange={(e) => setShowIncircle(e.target.checked)}
                  className="rounded text-pink-500 focus:ring-0"
                />
                Đường tròn (I; r)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showAltitudes}
                  onChange={(e) => setShowAltitudes(e.target.checked)}
                  className="rounded text-red-500 focus:ring-0"
                />
                Đường cao & Trực tâm H
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showMedians}
                  onChange={(e) => setShowMedians(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                Trung tuyến
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showCentroid}
                  onChange={(e) => setShowCentroid(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                Trọng tâm G
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showAngles}
                  onChange={(e) => setShowAngles(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                Số đo các góc
              </label>
            </div>
          </div>

          {/* Real-time Math Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 text-[11px]">Diện tích S (Heron):</span>
              <div className="text-amber-400 font-mono text-sm font-bold mt-0.5">
                {metrics.area.toFixed(2)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">đvdt</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 text-[11px]">Chu vi 2p:</span>
              <div className="text-emerald-400 font-mono text-sm font-bold mt-0.5">
                {metrics.perimeter.toFixed(2)}{' '}
                <span className="text-[10px] text-slate-500 font-normal">đvdài</span>
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 text-[11px]">Bán kính ngoại tiếp R:</span>
              <div className="text-cyan-400 font-mono text-sm font-bold mt-0.5">
                {metrics.R.toFixed(2)}
              </div>
            </div>
            <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 text-[11px]">Bán kính nội tiếp r:</span>
              <div className="text-pink-400 font-mono text-sm font-bold mt-0.5">
                {metrics.rIn.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Formulas card */}
          <div className="p-3.5 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-2 text-xs">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" /> Công thức SGK liên kết:
            </div>
            <div className="space-y-1 font-mono text-[11px] text-slate-400">
              <div>• S = (a · h_a) / 2 = √[p(p-a)(p-b)(p-c)]</div>
              <div>• S = (abc) / (4R)  ⟹  R = abc / (4S)</div>
              <div>• S = p · r  ⟹  r = S / p</div>
              <div>• Định lý Cosin: a² = b² + c² - 2bc·cos(A)</div>
              <div>• Định lý Sin: a/sin(A) = b/sin(B) = c/sin(C) = 2R</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
