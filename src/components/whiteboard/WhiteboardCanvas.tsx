import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  Highlighter,
  Eraser,
  Slash,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Box,
  ToggleLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sparkles,
  Move,
  Type,
  X,
  Target,
  Link2,
  Triangle,
  Square,
} from 'lucide-react';
import { BoardStyle, WhiteboardStroke, WhiteboardVertex } from '../../types/math';

// Custom Parallelogram Icon
const ParallelogramIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="6 4 21 4 18 20 3 20" />
  </svg>
);

type WhiteboardTool =
  | 'drag-vertex'       // Dời điểm (Kéo đỉnh di chuyển)
  | 'move-label'        // Di chuyển chữ cái ở đỉnh (Kéo nhãn S, A, B, C...)
  | 'two-point-solid'   // Chấm 2 điểm tạo nét liền
  | 'two-point-dashed'  // Chấm 2 điểm tạo nét đứt
  | 'toggle-line'       // Bấm vào đoạn thẳng để chuyển nét liền <-> nét đứt
  | 'triangle'          // Vẽ tam giác
  | 'parallelogram'     // Vẽ hình bình hành
  | 'square'            // Vẽ hình vuông
  | 'pan'               // Dời hình (Pan / Di chuyển bảng vẽ)
  | 'pen'
  | 'highlighter'
  | 'arrow'
  | 'eraser';

// Distance from point (px, py) to line segment (x1, y1)-(x2, y2)
function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

// Compute vertices for 2D geometric shapes (Triangle, Parallelogram, Square)
function computeShapeVertices(
  tool: 'triangle' | 'parallelogram' | 'square',
  start: { x: number; y: number },
  current: { x: number; y: number }
): { x: number; y: number }[] {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const dist = Math.hypot(dx, dy);

  // If clicked without dragging much (dist < 15), provide standard preset size centered at start point
  if (dist < 15) {
    const cx = start.x;
    const cy = start.y;
    if (tool === 'triangle') {
      return [
        { x: cx, y: cy - 70 },       // Top vertex A
        { x: cx - 90, y: cy + 60 },   // Bottom-left vertex B
        { x: cx + 90, y: cy + 60 },   // Bottom-right vertex C
      ];
    } else if (tool === 'square') {
      const s = 140;
      const hs = s / 2;
      return [
        { x: cx - hs, y: cy - hs },   // Top-left A
        { x: cx + hs, y: cy - hs },   // Top-right B
        { x: cx + hs, y: cy + hs },   // Bottom-right C
        { x: cx - hs, y: cy + hs },   // Bottom-left D
      ];
    } else if (tool === 'parallelogram') {
      const w = 190;
      const h = 115;
      const skew = 45;
      return [
        { x: Math.round(cx - w / 2 + skew), y: Math.round(cy - h / 2) },   // Top-left A
        { x: Math.round(cx + w / 2), y: Math.round(cy - h / 2) },          // Top-right B
        { x: Math.round(cx + w / 2 - skew), y: Math.round(cy + h / 2) },   // Bottom-right C
        { x: Math.round(cx - w / 2), y: Math.round(cy + h / 2) },          // Bottom-left D
      ];
    }
  }

  if (tool === 'square') {
    const side = Math.max(Math.abs(dx), Math.abs(dy), 20);
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const x1 = start.x;
    const y1 = start.y;
    const x2 = start.x + signX * side;
    const y2 = start.y + signY * side;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
  }

  const minX = Math.min(start.x, current.x);
  const maxX = Math.max(start.x, current.x);
  const minY = Math.min(start.y, current.y);
  const maxY = Math.max(start.y, current.y);

  if (tool === 'triangle') {
    return [
      { x: Math.round((minX + maxX) / 2), y: minY }, // Top vertex A
      { x: minX, y: maxY },                         // Bottom-left B
      { x: maxX, y: maxY },                         // Bottom-right C
    ];
  }

  if (tool === 'parallelogram') {
    const w = maxX - minX;
    const h = maxY - minY;
    const skew = Math.round(Math.min(w * 0.28, Math.max(h * 0.35, 15)));
    return [
      { x: minX + skew, y: minY },
      { x: maxX, y: minY },
      { x: maxX - skew, y: maxY },
      { x: minX, y: maxY },
    ];
  }

  return [];
}

export const WhiteboardCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Left sidebar collapse toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Tools & Properties
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('two-point-solid');
  const [strokeColor, setStrokeColor] = useState<string>('#ffffff');
  const [strokeSize, setStrokeSize] = useState<number>(3);
  const [boardStyle, setBoardStyle] = useState<BoardStyle>('chalkboard');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardStroke[]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  // Shape drawing state (Tam giác, Hình bình hành, Hình vuông)
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

  // 2-Point Geometry state
  const [firstPoint, setFirstPoint] = useState<{ x: number; y: number; label?: string; vertexId?: string } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [vertices, setVertices] = useState<WhiteboardVertex[]>([]);
  const [snapCandidate, setSnapCandidate] = useState<{ x: number; y: number; label: string } | null>(null);
  const [hoveredLabelVertexId, setHoveredLabelVertexId] = useState<string | null>(null);
  const [isChainDrawing, setIsChainDrawing] = useState<boolean>(false); // Nối tiếp điểm cuối để vẽ các đoạn tiếp theo liên tục

  // Vertex Dragging (Kéo đỉnh)
  const draggingVertexIdRef = useRef<string | null>(null);
  const dragCandidateRef = useRef<{
    vertex: WhiteboardVertex;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  // Vertex Label Moving (Di chuyển chữ cái ở đỉnh)
  const draggingLabelVertexIdRef = useRef<string | null>(null);
  const dragLabelCandidateRef = useRef<{
    vertex: WhiteboardVertex;
    startX: number;
    startY: number;
    hasMoved: boolean;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);

  // Quick Rename Vertex Letter (nhấp đúp vào chữ cái)
  const [renamingVertex, setRenamingVertex] = useState<WhiteboardVertex | null>(null);
  const [renameText, setRenameText] = useState<string>('');

  const lastPointerDownRef = useRef<{ time: number; x: number; y: number } | null>(null);

  // Status toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Available label pool for geometry vertices
  const labelPool = ['S', 'A', 'B', 'C', 'D', 'M', 'N', 'P', 'Q', 'H', 'K', 'O', 'I', 'G', "A'", "B'", "C'", "D'"];

  // Sinh chữ cái hợp lý cho các đỉnh hình phẳng (ưu tiên A-B-C cho tam giác, A-B-C-D cho tứ giác)
  const getDistinctLabels = (count: number): string[] => {
    const usedLabels = new Set(vertices.map((v) => v.label));
    if (count === 3 && !usedLabels.has('A') && !usedLabels.has('B') && !usedLabels.has('C')) {
      return ['A', 'B', 'C'];
    }
    if (count === 4 && !usedLabels.has('A') && !usedLabels.has('B') && !usedLabels.has('C') && !usedLabels.has('D')) {
      return ['A', 'B', 'C', 'D'];
    }
    if (count === 3 && !usedLabels.has('M') && !usedLabels.has('N') && !usedLabels.has('P')) {
      return ['M', 'N', 'P'];
    }
    if (count === 4 && !usedLabels.has('M') && !usedLabels.has('N') && !usedLabels.has('P') && !usedLabels.has('Q')) {
      return ['M', 'N', 'P', 'Q'];
    }

    const result: string[] = [];
    for (const l of labelPool) {
      if (!usedLabels.has(l) && !result.includes(l)) {
        result.push(l);
        if (result.length === count) break;
      }
    }
    let counter = 1;
    while (result.length < count) {
      const candidate = `P${counter++}`;
      if (!usedLabels.has(candidate) && !result.includes(candidate)) {
        result.push(candidate);
      }
    }
    return result;
  };

  // Tạo các đỉnh và cạnh kết nối khép kín cho hình tam giác, hình bình hành, hình vuông
  const createShapeFromPoints = (
    tool: 'triangle' | 'parallelogram' | 'square',
    points: { x: number; y: number }[]
  ) => {
    const count = points.length;
    const labels = getDistinctLabels(count);

    const offsets =
      tool === 'triangle'
        ? [
            { ox: 0, oy: -16 },
            { ox: -20, oy: 16 },
            { ox: 14, oy: 16 },
          ]
        : tool === 'square'
        ? [
            { ox: -18, oy: -12 },
            { ox: 14, oy: -12 },
            { ox: 14, oy: 16 },
            { ox: -18, oy: 16 },
          ]
        : [
            { ox: -14, oy: -14 },
            { ox: 14, oy: -12 },
            { ox: 14, oy: 16 },
            { ox: -20, oy: 16 },
          ];

    const timestamp = Date.now();
    const newVerts: WhiteboardVertex[] = points.map((p, idx) => ({
      id: `v-${timestamp}-${idx}`,
      x: Math.round(p.x),
      y: Math.round(p.y),
      label: labels[idx],
      labelOffsetX: offsets[idx].ox,
      labelOffsetY: offsets[idx].oy,
      color: '#38bdf8',
    }));

    const newStrokes: WhiteboardStroke[] = [];
    for (let i = 0; i < count; i++) {
      const nextIdx = (i + 1) % count;
      newStrokes.push({
        id: `e-${timestamp}-${i}`,
        fromVertexId: newVerts[i].id,
        toVertexId: newVerts[nextIdx].id,
        type: 'line',
        isDashed: false,
        points: [
          { x: newVerts[i].x, y: newVerts[i].y },
          { x: newVerts[nextIdx].x, y: newVerts[nextIdx].y },
        ],
        color: strokeColor,
        size: strokeSize,
        opacity: 1,
      });
    }

    setVertices((prev) => [...prev, ...newVerts]);
    setStrokes((prev) => [...prev, ...newStrokes]);
    setRedoStack([]);

    const name =
      tool === 'triangle'
        ? 'Tam giác'
        : tool === 'parallelogram'
        ? 'Hình bình hành'
        : 'Hình vuông';
    showToast(`✓ Đã vẽ ${name} [${labels.join('-')}] (Kéo đỉnh để dời & co giãn)`);
  };

  // Mẫu dựng nhanh 2D (Chèn hình vào giữa bảng vẽ)
  const loadPreset2D = (type: 'triangle' | 'parallelogram' | 'square') => {
    const canvas = canvasRef.current;
    const cx = canvas ? Math.round(canvas.width / 2) : 520;
    const cy = canvas ? Math.round(canvas.height / 2) : 320;

    const pts = computeShapeVertices(type, { x: cx, y: cy }, { x: cx, y: cy });
    createShapeFromPoints(type, pts);
  };

  // Find snap vertex near mouse
  const findSnapVertex = useCallback(
    (x: number, y: number, radius = 20): WhiteboardVertex | null => {
      for (const v of vertices) {
        if (Math.hypot(v.x - x, v.y - y) <= radius) {
          return v;
        }
      }
      return null;
    },
    [vertices]
  );

  // Find snap letter label near mouse
  const findSnapLabel = useCallback(
    (x: number, y: number, radius = 22): WhiteboardVertex | null => {
      for (const v of vertices) {
        const lx = v.x + (v.labelOffsetX ?? 12);
        const ly = v.y + (v.labelOffsetY ?? -12);
        // Center of text bounding area is roughly around lx + 5, ly - 6
        if (Math.hypot(lx + 5 - x, ly - 6 - y) <= radius) {
          return v;
        }
      }
      return null;
    },
    [vertices]
  );

  // Move vertex and stretch all connected line segments
  const moveVertexAndConnectedLines = useCallback(
    (vertexId: string, newX: number, newY: number) => {
      setVertices((prev) => {
        const target = prev.find((v) => v.id === vertexId);
        if (!target) return prev;
        const oldX = target.x;
        const oldY = target.y;

        // Update connected lines that share the endpoint (tolerance 18px or by fromVertexId/toVertexId)
        setStrokes((prevStrokes) =>
          prevStrokes.map((s) => {
            const matchesFrom = s.fromVertexId === vertexId;
            const matchesTo = s.toVertexId === vertexId;
            const hasConnectedPoint = s.points.some(
              (p) => Math.hypot(p.x - oldX, p.y - oldY) <= 18
            );
            if (!matchesFrom && !matchesTo && !hasConnectedPoint) return s;

            return {
              ...s,
              points: s.points.map((p, idx) => {
                if (matchesFrom && idx === 0) return { x: newX, y: newY };
                if (matchesTo && idx === s.points.length - 1) return { x: newX, y: newY };
                if (Math.hypot(p.x - oldX, p.y - oldY) <= 18) return { x: newX, y: newY };
                return p;
              }),
            };
          })
        );

        return prev.map((v) => (v.id === vertexId ? { ...v, x: newX, y: newY } : v));
      });
    },
    []
  );

  // Save quick rename of vertex letter
  const handleSaveRename = () => {
    if (!renamingVertex) return;
    const finalLabel = renameText.trim().toUpperCase() || renamingVertex.label;
    setVertices((prev) =>
      prev.map((v) => (v.id === renamingVertex.id ? { ...v, label: finalLabel } : v))
    );
    showToast(`✓ Đã đổi tên chữ cái thành [${finalLabel}]`);
    setRenamingVertex(null);
  };

  // Delete vertex and its connected lines
  const handleDeleteVertex = (vertexId: string) => {
    const target = vertices.find((v) => v.id === vertexId);
    if (!target) return;
    const vX = target.x;
    const vY = target.y;

    setVertices((prev) => prev.filter((v) => v.id !== vertexId));
    setStrokes((prev) =>
      prev.filter(
        (s) =>
          s.fromVertexId !== vertexId &&
          s.toVertexId !== vertexId &&
          !s.points.some((p) => Math.hypot(p.x - vX, p.y - vY) <= 18)
      )
    );
    showToast(`✓ Đã xóa điểm [${target.label}]`);
    setRenamingVertex(null);
  };

  // Background styling
  const getBackgroundStyle = () => {
    switch (boardStyle) {
      case 'chalkboard':
        return 'bg-[#0f2c1f]'; // Traditional green chalkboard
      case 'whiteboard':
        return 'bg-[#f8fafc]'; // Clean whiteboard
      case 'grid-caro':
        return 'bg-[#0b1329]'; // Grid notebook
      case 'isometric-dots':
        return 'bg-[#090d16]';
    }
  };

  // Redraw canvas content
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw background patterns
    if (boardStyle === 'grid-caro') {
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    } else if (boardStyle === 'isometric-dots') {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
      const step = 32;
      for (let x = 16; x < canvas.width; x += step) {
        for (let y = 16; y < canvas.height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 2. Draw all existing strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity;

      const isDashed = stroke.isDashed || stroke.type === 'dashed-line';

      if (isDashed) {
        ctx.setLineDash([8, 6]);
      } else {
        ctx.setLineDash([]);
      }

      if ((stroke.type === 'line' || stroke.type === 'dashed-line') && stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (stroke.type === 'arrow' && stroke.points.length >= 2) {
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headlen = 16;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headlen * Math.cos(angle - Math.PI / 6),
          end.y - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headlen * Math.cos(angle + Math.PI / 6),
          end.y - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length - 1; i++) {
          const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
        }

        if (stroke.points.length > 1) {
          const last = stroke.points[stroke.points.length - 1];
          ctx.lineTo(last.x, last.y);
        }
        ctx.stroke();
      }

      ctx.restore();
    });

    // 3. Draw Vertices and Movable Labels
    vertices.forEach((v) => {
      const isDraggingVertex = draggingVertexIdRef.current === v.id || dragCandidateRef.current?.vertex.id === v.id;
      const isDraggingLabel = draggingLabelVertexIdRef.current === v.id || dragLabelCandidateRef.current?.vertex.id === v.id;
      const isHoveredVertex = snapCandidate?.label === v.label;
      const isHoveredLabel = hoveredLabelVertexId === v.id;
      const displayLabel = v.label;
      const displayColor = v.color || '#38bdf8';
      ctx.save();

      // Outer glow for currently dragging or hovered vertex
      if (isDraggingVertex) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isHoveredVertex) {
        // Soft ring indicating vertex is draggable / snappable
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(v.x, v.y, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw vertex point circle
      ctx.fillStyle = isDraggingVertex ? '#10b981' : displayColor;
      ctx.beginPath();
      ctx.arc(v.x, v.y, isDraggingVertex ? 7 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dynamic Letter Position (Có thể di chuyển tự do xung quanh đỉnh)
      const lx = v.x + (v.labelOffsetX ?? 12);
      const ly = v.y + (v.labelOffsetY ?? -12);

      // Leader line connecting vertex dot to its moved letter
      if (isDraggingLabel) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(lx + 4, ly - 4);
        ctx.stroke();
        ctx.restore();
      }

      // Highlight badge around letter when hovered or actively dragged
      if (isDraggingLabel || isHoveredLabel || activeTool === 'move-label') {
        ctx.save();
        ctx.fillStyle = isDraggingLabel
          ? 'rgba(56, 189, 248, 0.35)'
          : isHoveredLabel
          ? 'rgba(245, 158, 11, 0.25)'
          : 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = isDraggingLabel ? '#38bdf8' : isHoveredLabel ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash(isDraggingLabel ? [] : [2, 2]);
        const approxW = Math.max(displayLabel.length * 10, 16);
        ctx.beginPath();
        ctx.roundRect(lx - 4, ly - 15, approxW + 8, 19, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // High-contrast outline so vertex letter is always crystal clear on any background
      ctx.font = isDraggingLabel ? 'bold 16px "KaTeX_Main", monospace, sans-serif' : 'bold 14px "KaTeX_Main", monospace, sans-serif';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 4;
      ctx.strokeText(displayLabel, lx, ly);

      ctx.fillStyle = isDraggingLabel ? '#38bdf8' : isHoveredLabel ? '#fde047' : '#ffffff';
      ctx.fillText(displayLabel, lx, ly);
      ctx.restore();
    });

    // 4. Live 2-Point Preview rubber-band line
    if (firstPoint && hoverPos) {
      const targetX = snapCandidate ? snapCandidate.x : hoverPos.x;
      const targetY = snapCandidate ? snapCandidate.y : hoverPos.y;

      ctx.save();
      ctx.strokeStyle = activeTool === 'two-point-dashed' ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = strokeSize;
      if (activeTool === 'two-point-dashed') {
        ctx.setLineDash([8, 6]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(firstPoint.x, firstPoint.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(firstPoint.x, firstPoint.y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
      ctx.fill();

      const dist = Math.hypot(targetX - firstPoint.x, targetY - firstPoint.y);
      const midX = (firstPoint.x + targetX) / 2;
      const midY = (firstPoint.y + targetY) / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(midX - 25, midY - 18, 50, 16);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(midX - 25, midY - 18, 50, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${dist.toFixed(0)}px`, midX - 18, midY - 6);

      ctx.restore();
    }

    // 4.5. Live Shape Preview (Tam giác, Hình bình hành, Hình vuông khi kéo chuột)
    if (
      (activeTool === 'triangle' || activeTool === 'parallelogram' || activeTool === 'square') &&
      isDrawing &&
      shapeStartRef.current &&
      hoverPos
    ) {
      const pts = computeShapeVertices(activeTool, shapeStartRef.current, hoverPos);
      if (pts.length >= 3) {
        ctx.save();
        ctx.strokeStyle = strokeColor || '#38bdf8';
        ctx.lineWidth = strokeSize;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle =
          activeTool === 'triangle'
            ? 'rgba(56, 189, 248, 0.12)'
            : activeTool === 'square'
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(245, 158, 11, 0.12)';
        ctx.fill();

        ctx.setLineDash([]);
        pts.forEach((p) => {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });

        const minX = Math.min(...pts.map((p) => p.x));
        const maxX = Math.max(...pts.map((p) => p.x));
        const minY = Math.min(...pts.map((p) => p.y));
        const maxY = Math.max(...pts.map((p) => p.y));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        const shapeLabel =
          activeTool === 'triangle'
            ? 'Tam giác'
            : activeTool === 'square'
            ? 'Hình vuông'
            : 'Hình bình hành';

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(midX - 52, midY - 11, 104, 22);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 52, midY - 11, 104, 22);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${shapeLabel} (${Math.round(maxX - minX)}x${Math.round(maxY - minY)})`, midX, midY);

        ctx.restore();
      }
    }

    // 5. Snap indicator glow around candidate vertex
    if (snapCandidate) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(snapCandidate.x, snapCandidate.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [boardStyle, strokes, vertices, firstPoint, hoverPos, snapCandidate, hoveredLabelVertexId, activeTool, strokeSize, strokeColor, isDrawing]);

  // Window resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      redrawCanvas();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Escape key cancels 2-point drawing and shape drawing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFirstPoint(null);
        shapeStartRef.current = null;
        setIsDrawing(false);
        showToast('Đã hủy vẽ.');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click on segment to toggle between solid and dashed line (only on segment body, away from vertices)
  const tryToggleSegmentAt = (x: number, y: number): boolean => {
    // Never toggle if clicking on or near any vertex
    const nearVertex = findSnapVertex(x, y, 22);
    if (nearVertex) {
      return false;
    }

    const hitIndex = strokes.findIndex((s) => {
      if ((s.type === 'line' || s.type === 'dashed-line') && s.points.length >= 2) {
        const p1 = s.points[0];
        const p2 = s.points[s.points.length - 1];
        // Ensure click is on the segment body, well away from both endpoints
        const d1 = Math.hypot(x - p1.x, y - p1.y);
        const d2 = Math.hypot(x - p2.x, y - p2.y);
        if (d1 < 22 || d2 < 22) return false;

        return distToSegment(x, y, p1.x, p1.y, p2.x, p2.y) <= 12;
      }
      return false;
    });

    if (hitIndex !== -1) {
      const targetStroke = strokes[hitIndex];
      const currentlyDashed = targetStroke.isDashed || targetStroke.type === 'dashed-line';
      const updatedStroke: WhiteboardStroke = {
        ...targetStroke,
        type: currentlyDashed ? 'line' : 'dashed-line',
        isDashed: !currentlyDashed,
      };

      const updatedStrokes = [...strokes];
      updatedStrokes[hitIndex] = updatedStroke;
      setStrokes(updatedStrokes);
      setRedoStack([]);
      showToast(currentlyDashed ? '✓ Đã chuyển sang NÉT LIỀN' : '✓ Đã chuyển sang NÉT ĐỨT (Nét khuất)');
      return true;
    }
    return false;
  };

  // Execute 2-Point click selection for solid or dashed line creation
  const executeTwoPointClick = (rawX: number, rawY: number, snap: WhiteboardVertex | null) => {
    const x = snap ? snap.x : rawX;
    const y = snap ? snap.y : rawY;

    if (!firstPoint) {
      // Point 1: snap to existing vertex or create new vertex
      let label = snap ? snap.label : undefined;
      let v1Id = snap ? snap.id : undefined;
      if (!label || !v1Id) {
        const usedLabels = new Set(vertices.map((v) => v.label));
        label = labelPool.find((l) => !usedLabels.has(l)) || `P${vertices.length + 1}`;
        v1Id = `v-${Date.now()}`;
        const newVertex: WhiteboardVertex = {
          id: v1Id,
          x,
          y,
          label,
        };
        setVertices((prev) => [...prev, newVertex]);
      }
      setFirstPoint({ x, y, label, vertexId: v1Id });
      showToast(`Đã chọn đầu mút [${label}] - Hãy chọn điểm đầu mút thứ 2`);
    } else {
      // Point 2: can be an existing vertex (including another endpoint) or new point
      const p1 = firstPoint;

      // Prevent zero-length segment if user clicks on the exact same vertex twice
      if (Math.hypot(x - p1.x, y - p1.y) < 8) {
        showToast(`Điểm trùng với đầu mút ban đầu [${p1.label}]. Hãy chọn điểm đầu mút thứ 2 khác.`);
        return;
      }

      let p2Label = snap ? snap.label : undefined;
      let v2Id = snap ? snap.id : undefined;
      if (!p2Label || !v2Id) {
        const usedLabels = new Set(vertices.map((v) => v.label));
        p2Label = labelPool.find((l) => !usedLabels.has(l)) || `P${vertices.length + 1}`;
        v2Id = `v-${Date.now()}-2`;
        const newVertex: WhiteboardVertex = {
          id: v2Id,
          x,
          y,
          label: p2Label,
        };
        setVertices((prev) => [...prev, newVertex]);
      }

      const isDashed = activeTool === 'two-point-dashed';
      const newStroke: WhiteboardStroke = {
        id: `seg-${Date.now()}`,
        type: isDashed ? 'dashed-line' : 'line',
        isDashed,
        fromVertexId: p1.vertexId,
        toVertexId: v2Id,
        points: [
          { x: p1.x, y: p1.y },
          { x, y },
        ],
        color: strokeColor,
        size: strokeSize,
        opacity: 1,
      };

      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);

      if (isChainDrawing) {
        // Keep second point as the starting point for the next segment (Chế độ vẽ liên tiếp)
        setFirstPoint({ x, y, label: p2Label, vertexId: v2Id });
        showToast(`✓ Đã nối đoạn [${p1.label}-${p2Label}]. Tiếp tục vẽ từ [${p2Label}] (Esc để dừng).`);
      } else {
        setFirstPoint(null);
        showToast(
          isDashed
            ? `✓ Đã tạo đoạn nét đứt [${p1.label}-${p2Label}]. (Bấm lại vào [${p1.label}] hoặc [${p2Label}] để vẽ tiếp đoạn thứ 2)`
            : `✓ Đã tạo đoạn nét liền [${p1.label}-${p2Label}]. (Bấm lại vào [${p1.label}] hoặc [${p2Label}] để vẽ tiếp đoạn thứ 2)`
        );
      }
    }
  };

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Double-click/double-tap detection via timing
    const now = Date.now();
    if (lastPointerDownRef.current) {
      const timeDiff = now - lastPointerDownRef.current.time;
      const dist = Math.hypot(rawX - lastPointerDownRef.current.x, rawY - lastPointerDownRef.current.y);
      if (timeDiff < 380 && dist < 26) {
        const doubleClickedLabel = findSnapLabel(rawX, rawY, 24);
        const doubleClickedSnap = findSnapVertex(rawX, rawY, 24);
        const target = doubleClickedLabel || doubleClickedSnap;
        if (target) {
          setRenamingVertex(target);
          setRenameText(target.label);
          lastPointerDownRef.current = null;
          return;
        }
      }
    }
    lastPointerDownRef.current = { time: now, x: rawX, y: rawY };

    const snapLabel = findSnapLabel(rawX, rawY, 22);
    const snap = findSnapVertex(rawX, rawY, 22);

    // 1. Tool "move-label": Prioritize moving letters
    if (activeTool === 'move-label') {
      const target = snapLabel || snap;
      if (target) {
        dragLabelCandidateRef.current = {
          vertex: target,
          startX: rawX,
          startY: rawY,
          hasMoved: false,
          initialOffsetX: target.labelOffsetX ?? 12,
          initialOffsetY: target.labelOffsetY ?? -12,
        };
        draggingLabelVertexIdRef.current = target.id;
        setIsDrawing(true);
        return;
      } else {
        showToast('👉 Nhấn giữ vào chữ cái (S, A, B, C...) để di chuyển vị trí nhãn đỉnh.');
        return;
      }
    }

    // 2. Direct letter grabbing across other tools (when clicking on or near the letter text)
    const distToLabel = snapLabel
      ? Math.hypot((snapLabel.x + (snapLabel.labelOffsetX ?? 12) + 5) - rawX, (snapLabel.y + (snapLabel.labelOffsetY ?? -12) - 6) - rawY)
      : 999;
    const distToVertex = snap
      ? Math.hypot(snap.x - rawX, snap.y - rawY)
      : 999;

    if (snapLabel && distToLabel <= 22 && distToLabel < distToVertex) {
      dragLabelCandidateRef.current = {
        vertex: snapLabel,
        startX: rawX,
        startY: rawY,
        hasMoved: false,
        initialOffsetX: snapLabel.labelOffsetX ?? 12,
        initialOffsetY: snapLabel.labelOffsetY ?? -12,
      };
      return;
    }

    // 3. Vertex pressing / dragging
    if (snap) {
      dragCandidateRef.current = {
        vertex: snap,
        startX: rawX,
        startY: rawY,
        hasMoved: false,
      };

      if (activeTool === 'drag-vertex') {
        draggingVertexIdRef.current = snap.id;
        setIsDrawing(true);
        return;
      }

      if (activeTool === 'two-point-solid' || activeTool === 'two-point-dashed') {
        // Defer 2-point click to pointerUp so that if the user drags (> 4px), we move the vertex instead!
        return;
      }
    }

    // Pan tool (Dời hình)
    if (activeTool === 'pan') {
      panStartRef.current = { x: rawX, y: rawY };
      setIsDrawing(true);
      return;
    }

    // Shape drawing tools (Tam giác, Hình bình hành, Hình vuông)
    if (activeTool === 'triangle' || activeTool === 'parallelogram' || activeTool === 'square') {
      shapeStartRef.current = { x: rawX, y: rawY };
      setIsDrawing(true);
      return;
    }

    // Toggle line tool (Click segment directly)
    if (activeTool === 'toggle-line') {
      const toggled = tryToggleSegmentAt(rawX, rawY);
      if (!toggled) {
        showToast('Bấm vào một đoạn thẳng để đổi nét liền / nét đứt.');
      }
      return;
    }

    // 2-Point Line Creation (Solid or Dashed) when clicking empty space
    if (activeTool === 'two-point-solid' || activeTool === 'two-point-dashed') {
      // Only toggle line if clicking on a segment body away from all vertices and not drawing
      if (!firstPoint && !snap) {
        const toggled = tryToggleSegmentAt(rawX, rawY);
        if (toggled) return;
      }

      executeTwoPointClick(rawX, rawY, null);
      return;
    }

    if (activeTool === 'drag-vertex') {
      showToast('👉 Hãy nhấn giữ vào một điểm bất kỳ để kéo dời điểm đó.');
      return;
    }

    // Freehand pen / highlighter / eraser
    setIsDrawing(true);
    currentStrokeRef.current = [{ x: rawX, y: rawY }];

    if (activeTool === 'eraser') {
      eraseNearby(rawX, rawY);
    }
  };

  const eraseNearby = (x: number, y: number) => {
    const threshold = 18;
    setStrokes((prev) =>
      prev.filter((stroke) => {
        return !stroke.points.some((p) => Math.hypot(p.x - x, p.y - y) < threshold);
      })
    );
    setVertices((prev) =>
      prev.filter((v) => Math.hypot(v.x - x, v.y - y) >= threshold)
    );
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const snap = findSnapVertex(rawX, rawY);
    setSnapCandidate(snap ? { x: snap.x, y: snap.y, label: snap.label } : null);
    const snapLabelHover = findSnapLabel(rawX, rawY);
    setHoveredLabelVertexId(snapLabelHover ? snapLabelHover.id : null);
    setHoverPos({ x: rawX, y: rawY });

    // 1. Check drag label candidate (Di chuyển chữ cái ở đỉnh)
    if (dragLabelCandidateRef.current) {
      const cand = dragLabelCandidateRef.current;
      const dist = Math.hypot(rawX - cand.startX, rawY - cand.startY);

      if (!cand.hasMoved && dist > 3) {
        cand.hasMoved = true;
        draggingLabelVertexIdRef.current = cand.vertex.id;
      }

      if (cand.hasMoved) {
        const dx = rawX - cand.startX;
        const dy = rawY - cand.startY;
        const newOffsetX = Math.round(cand.initialOffsetX + dx);
        const newOffsetY = Math.round(cand.initialOffsetY + dy);
        setVertices((prev) =>
          prev.map((v) =>
            v.id === cand.vertex.id
              ? { ...v, labelOffsetX: newOffsetX, labelOffsetY: newOffsetY }
              : v
          )
        );
        return;
      }
    }

    if (draggingLabelVertexIdRef.current) {
      return;
    }

    // 2. Check drag candidate for vertex moving
    if (dragCandidateRef.current) {
      const cand = dragCandidateRef.current;
      const dist = Math.hypot(rawX - cand.startX, rawY - cand.startY);

      if (!cand.hasMoved && dist > 4) {
        cand.hasMoved = true;
        draggingVertexIdRef.current = cand.vertex.id;
        // If user was in the middle of 2-point drawing from this vertex, clear firstPoint to avoid ghosting
        if (firstPoint && firstPoint.vertexId === cand.vertex.id) {
          setFirstPoint(null);
        }
      }

      if (cand.hasMoved) {
        moveVertexAndConnectedLines(cand.vertex.id, Math.round(rawX), Math.round(rawY));
        return;
      }
    }

    // 3. Direct active vertex dragging
    if (draggingVertexIdRef.current) {
      const targetId = draggingVertexIdRef.current;
      moveVertexAndConnectedLines(targetId, Math.round(rawX), Math.round(rawY));
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pan') {
      if (panStartRef.current) {
        const dx = rawX - panStartRef.current.x;
        const dy = rawY - panStartRef.current.y;
        panStartRef.current = { x: rawX, y: rawY };
        setStrokes((prev) =>
          prev.map((s) => ({
            ...s,
            points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          }))
        );
        setVertices((prev) =>
          prev.map((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
        );
        if (firstPoint) {
          setFirstPoint((prev) =>
            prev ? { ...prev, x: prev.x + dx, y: prev.y + dy } : null
          );
        }
      }
      return;
    }

    if (activeTool === 'eraser') {
      eraseNearby(rawX, rawY);
      return;
    }

    currentStrokeRef.current.push({ x: rawX, y: rawY });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = activeTool === 'highlighter' ? strokeSize * 3 : strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1;

    const pts = currentStrokeRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(rawX, rawY);
      ctx.stroke();
    }
    ctx.restore();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    const rawX = rect ? e.clientX - rect.left : 0;
    const rawY = rect ? e.clientY - rect.top : 0;

    // Finish label drag
    const labelCand = dragLabelCandidateRef.current;
    dragLabelCandidateRef.current = null;
    if (labelCand) {
      draggingLabelVertexIdRef.current = null;
      setIsDrawing(false);
      if (labelCand.hasMoved) {
        showToast(`✓ Đã di chuyển chữ cái [${labelCand.vertex.label}]`);
        return;
      } else {
        if (activeTool === 'move-label') {
          showToast(`Chữ cái [${labelCand.vertex.label}]: Nhấn giữ chuột và kéo để dời vị trí nhãn.`);
          return;
        }
      }
    }
    if (draggingLabelVertexIdRef.current) {
      draggingLabelVertexIdRef.current = null;
      setIsDrawing(false);
      return;
    }

    // Finish vertex drag
    const cand = dragCandidateRef.current;
    dragCandidateRef.current = null;

    if (cand) {
      if (cand.hasMoved) {
        // Vertex was dragged!
        draggingVertexIdRef.current = null;
        setIsDrawing(false);
        showToast(`✓ Đã dời điểm [${cand.vertex.label}]`);
        return;
      } else {
        // User clicked the vertex without moving
        draggingVertexIdRef.current = null;
        setIsDrawing(false);

        if (activeTool === 'drag-vertex') {
          showToast(`Điểm [${cand.vertex.label}]: Nhấn giữ chuột và rê để dời vị trí.`);
          return;
        }

        if (activeTool === 'two-point-solid' || activeTool === 'two-point-dashed') {
          executeTwoPointClick(rawX, rawY, cand.vertex);
          return;
        }
      }
    }

    if (draggingVertexIdRef.current) {
      draggingVertexIdRef.current = null;
      setIsDrawing(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pan') {
      panStartRef.current = null;
      return;
    }

    if (activeTool === 'eraser') return;

    // Finish shape creation (Tam giác, Hình bình hành, Hình vuông)
    if (shapeStartRef.current && (activeTool === 'triangle' || activeTool === 'parallelogram' || activeTool === 'square')) {
      const start = shapeStartRef.current;
      shapeStartRef.current = null;
      setIsDrawing(false);

      const pts = computeShapeVertices(activeTool, start, { x: rawX, y: rawY });
      if (pts.length >= 3) {
        createShapeFromPoints(activeTool, pts);
      }
      return;
    }

    if (currentStrokeRef.current.length > 0) {
      const newStroke: WhiteboardStroke = {
        id: `stroke-${Date.now()}`,
        type:
          activeTool === 'highlighter'
            ? 'highlighter'
            : activeTool === 'arrow'
            ? 'arrow'
            : 'pen',
        points: [...currentStrokeRef.current],
        color: strokeColor,
        size: activeTool === 'highlighter' ? strokeSize * 3 : strokeSize,
        opacity: activeTool === 'highlighter' ? 0.35 : 1,
      };
      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
      currentStrokeRef.current = [];
    }
  };

  // Double-click handler on canvas: quick rename or create new vertex
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    setFirstPoint(null); // Cancel pending 2-point creation

    // Do not create single vertex when in shape drawing tools
    if (activeTool === 'triangle' || activeTool === 'parallelogram' || activeTool === 'square') {
      return;
    }

    const snapLabel = findSnapLabel(rawX, rawY, 24);
    const snap = findSnapVertex(rawX, rawY, 24);
    const target = snapLabel || snap;

    if (target) {
      setRenamingVertex(target);
      setRenameText(target.label);
    } else {
      // Double click on blank area creates a new labeled vertex
      const usedLabels = new Set(vertices.map((v) => v.label));
      const nextLabel = labelPool.find((l) => !usedLabels.has(l)) || `P${vertices.length + 1}`;
      const newVertex: WhiteboardVertex = {
        id: `v-${Date.now()}`,
        x: Math.round(rawX),
        y: Math.round(rawY),
        label: nextLabel,
        color: strokeColor || '#38bdf8',
        labelOffsetX: 12,
        labelOffsetY: -12,
      };
      setVertices((prev) => [...prev, newVertex]);
      showToast(`✓ Đã tạo điểm [${nextLabel}]`);
    }
  };

  // Undo & Redo
  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, last]);
    setFirstPoint(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const item = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setStrokes((prev) => [...prev, item]);
  };

  const handleClear = () => {
    setStrokes([]);
    setVertices([]);
    setRedoStack([]);
    setFirstPoint(null);
    showToast('Đã xóa sạch bảng vẽ.');
  };

  // Quick 3D Wireframe Template Presets
  const loadPreset3D = (type: 'pyramid' | 'cube' | 'prism') => {
    const cx = 520;
    const cy = 300;

    if (type === 'pyramid') {
      const S = { x: cx, y: cy - 140, label: 'S', labelOffsetX: 0, labelOffsetY: -16 };
      const A = { x: cx - 130, y: cy - 10, label: 'A', labelOffsetX: -22, labelOffsetY: 2 };
      const B = { x: cx + 110, y: cy - 10, label: 'B', labelOffsetX: 14, labelOffsetY: 2 };
      const C = { x: cx + 150, y: cy + 100, label: 'C', labelOffsetX: 12, labelOffsetY: 16 };
      const D = { x: cx - 90, y: cy + 100, label: 'D', labelOffsetX: -22, labelOffsetY: 16 };

      const newVerts: WhiteboardVertex[] = [
        { id: 'v-s', ...S },
        { id: 'v-a', ...A },
        { id: 'v-b', ...B },
        { id: 'v-c', ...C },
        { id: 'v-d', ...D },
      ];

      const newStrokes: WhiteboardStroke[] = [
        { id: 'e-ab', fromVertexId: 'v-a', toVertexId: 'v-b', type: 'dashed-line', isDashed: true, points: [A, B], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-ad', fromVertexId: 'v-a', toVertexId: 'v-d', type: 'dashed-line', isDashed: true, points: [A, D], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-sa', fromVertexId: 'v-s', toVertexId: 'v-a', type: 'dashed-line', isDashed: true, points: [S, A], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-bc', fromVertexId: 'v-b', toVertexId: 'v-c', type: 'line', isDashed: false, points: [B, C], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-cd', fromVertexId: 'v-c', toVertexId: 'v-d', type: 'line', isDashed: false, points: [C, D], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-sb', fromVertexId: 'v-s', toVertexId: 'v-b', type: 'line', isDashed: false, points: [S, B], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-sc', fromVertexId: 'v-s', toVertexId: 'v-c', type: 'line', isDashed: false, points: [S, C], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-sd', fromVertexId: 'v-s', toVertexId: 'v-d', type: 'line', isDashed: false, points: [S, D], color: strokeColor, size: 2.5, opacity: 1 },
      ];

      setVertices(newVerts);
      setStrokes(newStrokes);
      showToast('✓ Đã dựng mẫu Chóp S.ABCD (Có thể kéo đỉnh & kéo chữ cái tùy ý)');
    } else if (type === 'cube') {
      const A = { x: cx - 120, y: cy - 20, label: 'A', labelOffsetX: -20, labelOffsetY: 0 };
      const B = { x: cx + 60, y: cy - 20, label: 'B', labelOffsetX: 12, labelOffsetY: 0 };
      const C = { x: cx + 110, y: cy + 70, label: 'C', labelOffsetX: 12, labelOffsetY: 16 };
      const D = { x: cx - 70, y: cy + 70, label: 'D', labelOffsetX: -22, labelOffsetY: 16 };
      const A1 = { x: cx - 120, y: cy - 150, label: "A'", labelOffsetX: -22, labelOffsetY: -8 };
      const B1 = { x: cx + 60, y: cy - 150, label: "B'", labelOffsetX: 12, labelOffsetY: -8 };
      const C1 = { x: cx + 110, y: cy - 60, label: "C'", labelOffsetX: 12, labelOffsetY: -8 };
      const D1 = { x: cx - 70, y: cy - 60, label: "D'", labelOffsetX: -22, labelOffsetY: -8 };

      const newVerts: WhiteboardVertex[] = [
        { id: 'va', ...A }, { id: 'vb', ...B }, { id: 'vc', ...C }, { id: 'vd', ...D },
        { id: 'va1', ...A1 }, { id: 'vb1', ...B1 }, { id: 'vc1', ...C1 }, { id: 'vd1', ...D1 },
      ];

      const newStrokes: WhiteboardStroke[] = [
        { id: 'e-ab', fromVertexId: 'va', toVertexId: 'vb', type: 'dashed-line', isDashed: true, points: [A, B], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-ad', fromVertexId: 'va', toVertexId: 'vd', type: 'dashed-line', isDashed: true, points: [A, D], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-aa1', fromVertexId: 'va', toVertexId: 'va1', type: 'dashed-line', isDashed: true, points: [A, A1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-bc', fromVertexId: 'vb', toVertexId: 'vc', type: 'line', isDashed: false, points: [B, C], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-cd', fromVertexId: 'vc', toVertexId: 'vd', type: 'line', isDashed: false, points: [C, D], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-a1b1', fromVertexId: 'va1', toVertexId: 'vb1', type: 'line', isDashed: false, points: [A1, B1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-b1c1', fromVertexId: 'vb1', toVertexId: 'vc1', type: 'line', isDashed: false, points: [B1, C1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-c1d1', fromVertexId: 'vc1', toVertexId: 'vd1', type: 'line', isDashed: false, points: [C1, D1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-d1a1', fromVertexId: 'vd1', toVertexId: 'va1', type: 'line', isDashed: false, points: [D1, A1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-bb1', fromVertexId: 'vb', toVertexId: 'vb1', type: 'line', isDashed: false, points: [B, B1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-cc1', fromVertexId: 'vc', toVertexId: 'vc1', type: 'line', isDashed: false, points: [C, C1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-dd1', fromVertexId: 'vd', toVertexId: 'vd1', type: 'line', isDashed: false, points: [D, D1], color: strokeColor, size: 2.5, opacity: 1 },
      ];

      setVertices(newVerts);
      setStrokes(newStrokes);
      showToast("✓ Đã dựng mẫu Hình hộp ABCD.A'B'C'D' (Có thể kéo dời các đỉnh & chữ cái)");
    } else if (type === 'prism') {
      const A = { x: cx - 110, y: cy + 40, label: 'A', labelOffsetX: -22, labelOffsetY: 4 };
      const B = { x: cx + 110, y: cy + 40, label: 'B', labelOffsetX: 14, labelOffsetY: 4 };
      const C = { x: cx, y: cy + 110, label: 'C', labelOffsetX: 0, labelOffsetY: 18 };
      const A1 = { x: cx - 110, y: cy - 100, label: "A'", labelOffsetX: -22, labelOffsetY: -10 };
      const B1 = { x: cx + 110, y: cy - 100, label: "B'", labelOffsetX: 14, labelOffsetY: -10 };
      const C1 = { x: cx, y: cy - 30, label: "C'", labelOffsetX: 12, labelOffsetY: -4 };

      const newVerts: WhiteboardVertex[] = [
        { id: 'va', ...A }, { id: 'vb', ...B }, { id: 'vc', ...C },
        { id: 'va1', ...A1 }, { id: 'vb1', ...B1 }, { id: 'vc1', ...C1 },
      ];

      const newStrokes: WhiteboardStroke[] = [
        { id: 'e-ab', fromVertexId: 'va', toVertexId: 'vb', type: 'dashed-line', isDashed: true, points: [A, B], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-bc', fromVertexId: 'vb', toVertexId: 'vc', type: 'line', isDashed: false, points: [B, C], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-ca', fromVertexId: 'vc', toVertexId: 'va', type: 'line', isDashed: false, points: [C, A], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-a1b1', fromVertexId: 'va1', toVertexId: 'vb1', type: 'line', isDashed: false, points: [A1, B1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-b1c1', fromVertexId: 'vb1', toVertexId: 'vc1', type: 'line', isDashed: false, points: [B1, C1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-c1a1', fromVertexId: 'vc1', toVertexId: 'va1', type: 'line', isDashed: false, points: [C1, A1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-aa1', fromVertexId: 'va', toVertexId: 'va1', type: 'line', isDashed: false, points: [A, A1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-bb1', fromVertexId: 'vb', toVertexId: 'vb1', type: 'line', isDashed: false, points: [B, B1], color: strokeColor, size: 2.5, opacity: 1 },
        { id: 'e-cc1', fromVertexId: 'vc', toVertexId: 'vc1', type: 'line', isDashed: false, points: [C, C1], color: strokeColor, size: 2.5, opacity: 1 },
      ];

      setVertices(newVerts);
      setStrokes(newStrokes);
      showToast("✓ Đã dựng mẫu Lăng trụ tam giác ABC.A'B'C' (Có thể kéo dời các đỉnh & chữ cái)");
    }
  };

  // Export PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ToanHocTuongTac-PhamHau-Whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`relative w-full h-[calc(100vh-64px)] overflow-hidden select-none ${getBackgroundStyle()}`}>
      {/* LEFT CONTROL PANEL (Khung điều khiển bên tay trái theo yêu cầu) */}
      <div
        className={`absolute left-3 top-3 bottom-3 z-30 transition-all duration-300 flex ${
          isSidebarOpen ? 'w-64' : 'w-10'
        }`}
      >
        <div className="w-full h-full bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-3 flex flex-col justify-between overflow-y-auto no-scrollbar">
          {isSidebarOpen ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide">
                  <Box className="w-4 h-4 text-sky-400" />
                  <span>Công Cụ Bảng Vẽ</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                  title="Thu gọn bảng điều khiển"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Spatial Geometry Drawing by 2 Points */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                  Vẽ hình không gian (2 Chấm):
                </div>
                <div className="space-y-1">
                  {/* Nét liền */}
                  <button
                    onClick={() => {
                      setActiveTool('two-point-solid');
                      setFirstPoint(null);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'two-point-solid'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Slash className="w-3.5 h-3.5" />
                      2 Chấm → Nét liền
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Nét thấy</span>
                  </button>

                  {/* Nét đứt đoạn */}
                  <button
                    onClick={() => {
                      setActiveTool('two-point-dashed');
                      setFirstPoint(null);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'two-point-dashed'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-0.5 bg-current rounded-full" />
                        <span className="w-1 h-0.5 bg-current rounded-full" />
                        <span className="w-1 h-0.5 bg-current rounded-full" />
                      </div>
                      2 Chấm → Nét đứt
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Nét khuất</span>
                  </button>

                  {/* Bấm đổi nét */}
                  <button
                    onClick={() => {
                      setActiveTool('toggle-line');
                      setFirstPoint(null);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'toggle-line'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ToggleLeft className="w-4 h-4" />
                      Bấm Đổi Nét
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Liền ↔ Đứt</span>
                  </button>

                  {/* Dời điểm (Kéo đỉnh) */}
                  <button
                    onClick={() => {
                      setActiveTool('drag-vertex');
                      setFirstPoint(null);
                      showToast('Chế độ Dời điểm: Nhấn giữ và kéo đỉnh bất kỳ để di chuyển hình.');
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'drag-vertex'
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-400/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Nhấn giữ và kéo bất kỳ đỉnh nào để di chuyển điểm và co giãn các cạnh theo"
                  >
                    <span className="flex items-center gap-2">
                      <Target className="w-3.5 h-3.5" />
                      Dời điểm (Kéo đỉnh)
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Kéo thả</span>
                  </button>

                  {/* Dời hình (Pan / Di chuyển) */}
                  <button
                    onClick={() => {
                      setActiveTool('pan');
                      setFirstPoint(null);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'pan'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Nhấn giữ và rê chuột để dời / tịnh tiến toàn bộ hình vẽ trên bảng"
                  >
                    <span className="flex items-center gap-2">
                      <Move className="w-3.5 h-3.5" />
                      Dời hình (Pan)
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Di chuyển</span>
                  </button>

                  {/* Di chuyển chữ cái ở đỉnh */}
                  <button
                    onClick={() => {
                      setActiveTool('move-label');
                      setFirstPoint(null);
                      showToast('Chế độ Di chuyển chữ cái: Nhấn giữ và kéo chữ cái (S, A, B, C...) để dời vị trí.');
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'move-label'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Nhấn giữ và kéo các chữ cái (S, A, B, C...) để di chuyển nhãn xung quanh đỉnh, tránh đè lên cạnh vẽ"
                  >
                    <span className="flex items-center gap-2">
                      <Type className="w-3.5 h-3.5" />
                      Di chuyển chữ cái
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Kéo nhãn</span>
                  </button>

                  {/* Chế độ vẽ nối tiếp điểm (Chain drawing) */}
                  <button
                    onClick={() => {
                      const next = !isChainDrawing;
                      setIsChainDrawing(next);
                      showToast(
                        next
                          ? '✓ Đã BẬT vẽ nối tiếp: Đoạn mới sẽ tự động lấy điểm cuối làm điểm đầu.'
                          : 'Đã TẮT vẽ nối tiếp: Tự do chọn lại đầu mút bất kỳ.'
                      );
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      isChainDrawing
                        ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30 ring-1 ring-white/50'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title="Vẽ nối tiếp liên hoàn: Điểm mút vừa vẽ sẽ làm điểm bắt đầu cho đoạn tiếp theo (vẽ tam giác, đa giác cực nhanh)"
                  >
                    <span className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5" />
                      Vẽ nối tiếp điểm
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/60 text-purple-200">
                      {isChainDrawing ? 'BẬT' : 'TẮT'}
                    </span>
                  </button>

                  {/* Gợi ý chung đầu mút & di chuyển chữ cái */}
                  <div className="p-2 bg-sky-950/40 border border-sky-800/40 rounded-xl text-[11px] text-sky-300/90 leading-relaxed space-y-1">
                    <div>
                      ✨ <strong>Vẽ chung đầu mút:</strong> Bấm vào bất kỳ đỉnh nào đã có để vẽ tiếp đoạn thứ 2, thứ 3... nối từ đỉnh đó.
                    </div>
                    <div>
                      🔤 <strong>Di chuyển chữ cái:</strong> Nhấn giữ và kéo bất kỳ chữ cái nào (S, A, B, C...) để dời vị trí nhãn đỉnh tùy ý.
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Plane Geometry Drawing (Vẽ hình học phẳng) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Triangle className="w-3.5 h-3.5 text-sky-400" />
                  Vẽ hình học phẳng (2D):
                </div>
                <div className="space-y-1">
                  {/* Tam giác */}
                  <button
                    onClick={() => {
                      setActiveTool('triangle');
                      setFirstPoint(null);
                      showToast('Chế độ Vẽ Tam giác: Kéo thả chuột trên bảng để tạo tam giác (hoặc click để tạo ngay).');
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'triangle'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Nhấn giữ và kéo chuột trên bảng để vẽ tam giác tùy kích thước"
                  >
                    <span className="flex items-center gap-2">
                      <Triangle className="w-3.5 h-3.5" />
                      Vẽ Tam giác
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">3 Đỉnh</span>
                  </button>

                  {/* Hình bình hành */}
                  <button
                    onClick={() => {
                      setActiveTool('parallelogram');
                      setFirstPoint(null);
                      showToast('Chế độ Vẽ Hình bình hành: Kéo thả chuột trên bảng để tạo hình bình hành.');
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'parallelogram'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Nhấn giữ và kéo chuột trên bảng để vẽ hình bình hành chuẩn góc nghiêng"
                  >
                    <span className="flex items-center gap-2">
                      <ParallelogramIcon className="w-3.5 h-3.5" />
                      Vẽ Hình bình hành
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">4 Đỉnh</span>
                  </button>

                  {/* Hình vuông */}
                  <button
                    onClick={() => {
                      setActiveTool('square');
                      setFirstPoint(null);
                      showToast('Chế độ Vẽ Hình vuông: Kéo thả chuột trên bảng để tạo hình vuông.');
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeTool === 'square'
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-400/20'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    title="Nhấn giữ và kéo chuột trên bảng để vẽ hình vuông đều góc"
                  >
                    <span className="flex items-center gap-2">
                      <Square className="w-3.5 h-3.5" />
                      Vẽ Hình vuông
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">Góc vuông</span>
                  </button>
                </div>
              </div>

              {/* 3. Quick 2D Presets */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Square className="w-3.5 h-3.5 text-emerald-400" />
                  Mẫu dựng nhanh 2D:
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => loadPreset2D('triangle')}
                    className="px-2 py-1.5 text-center text-xs bg-slate-800/80 hover:bg-slate-800 hover:text-sky-300 text-slate-300 rounded-lg transition-colors flex flex-col items-center gap-1"
                    title="Chèn ngay Tam giác ABC vào giữa bảng"
                  >
                    <Triangle className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px]">Tam giác</span>
                  </button>
                  <button
                    onClick={() => loadPreset2D('parallelogram')}
                    className="px-2 py-1.5 text-center text-xs bg-slate-800/80 hover:bg-slate-800 hover:text-amber-300 text-slate-300 rounded-lg transition-colors flex flex-col items-center gap-1"
                    title="Chèn ngay Hình bình hành ABCD vào giữa bảng"
                  >
                    <ParallelogramIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px]">Bình hành</span>
                  </button>
                  <button
                    onClick={() => loadPreset2D('square')}
                    className="px-2 py-1.5 text-center text-xs bg-slate-800/80 hover:bg-slate-800 hover:text-emerald-300 text-slate-300 rounded-lg transition-colors flex flex-col items-center gap-1"
                    title="Chèn ngay Hình vuông ABCD vào giữa bảng"
                  >
                    <Square className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px]">Hình vuông</span>
                  </button>
                </div>
              </div>

              {/* 4. 3D Wireframe Presets */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Box className="w-3.5 h-3.5 text-amber-400" />
                  Mẫu dựng nhanh 3D:
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => loadPreset3D('pyramid')}
                    className="w-full px-2.5 py-1.5 text-left text-xs bg-slate-800/80 hover:bg-slate-800 hover:text-sky-300 text-slate-300 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Chóp S.ABCD</span>
                    <span className="text-[10px] text-slate-500 font-mono">SA, AB nét đứt</span>
                  </button>
                  <button
                    onClick={() => loadPreset3D('cube')}
                    className="w-full px-2.5 py-1.5 text-left text-xs bg-slate-800/80 hover:bg-slate-800 hover:text-sky-300 text-slate-300 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Hình hộp chữ nhật</span>
                    <span className="text-[10px] text-slate-500 font-mono">ABCD.A'B'C'D'</span>
                  </button>
                  <button
                    onClick={() => loadPreset3D('prism')}
                    className="w-full px-2.5 py-1.5 text-left text-xs bg-slate-800/80 hover:bg-slate-800 hover:text-sky-300 text-slate-300 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span>Lăng trụ tam giác</span>
                    <span className="text-[10px] text-slate-500 font-mono">ABC.A'B'C'</span>
                  </button>
                </div>
              </div>

              {/* 3. Freehand Pen, Highlighter, Eraser */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bút vẽ & Tẩy:
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setActiveTool('pen');
                      setFirstPoint(null);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      activeTool === 'pen'
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Bút viết</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool('highlighter');
                      setFirstPoint(null);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      activeTool === 'highlighter'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Highlighter className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Dạ quang</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTool('eraser');
                      setFirstPoint(null);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      activeTool === 'eraser'
                        ? 'bg-rose-500 text-white font-bold shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Tẩy nét</span>
                  </button>
                </div>
              </div>

              {/* 4. Color & Line Properties */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>Màu nét:</span>
                  <select
                    value={strokeSize}
                    onChange={(e) => setStrokeSize(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 font-normal"
                  >
                    <option value="2">Mảnh (2px)</option>
                    <option value="3">Vừa (3px)</option>
                    <option value="5">Đậm (5px)</option>
                    <option value="8">Rất đậm</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  {['#ffffff', '#f59e0b', '#38bdf8', '#10b981', '#f43f5e', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setStrokeColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        strokeColor === c
                          ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                          : 'hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 5. Board Background Style */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Kiểu bảng viết:
                </div>
                <select
                  value={boardStyle}
                  onChange={(e) => setBoardStyle(e.target.value as BoardStyle)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs px-2.5 py-1.5 text-slate-200"
                >
                  <option value="chalkboard">Bảng xanh phấn</option>
                  <option value="whiteboard">Bảng trắng</option>
                  <option value="grid-caro">Giấy kẻ ô ly caro</option>
                  <option value="isometric-dots">Lưới chấm 3D</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 space-y-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Mở rộng bảng điều khiển"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <Slash className="w-4 h-4 text-sky-400" />
              <ToggleLeft className="w-4 h-4 text-emerald-400" />
              <button
                onClick={() => {
                  setActiveTool('drag-vertex');
                  setFirstPoint(null);
                  showToast('Chế độ Dời điểm: Nhấn giữ và kéo đỉnh để di chuyển.');
                }}
                className={`p-1.5 rounded transition-colors ${
                  activeTool === 'drag-vertex'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-emerald-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Dời điểm (Kéo đỉnh)"
              >
                <Target className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setActiveTool('move-label');
                  setFirstPoint(null);
                  showToast('Chế độ Di chuyển chữ cái: Nhấn giữ và kéo chữ cái để dời vị trí.');
                }}
                className={`p-1.5 rounded transition-colors ${
                  activeTool === 'move-label'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-amber-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Di chuyển chữ cái ở đỉnh"
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setActiveTool('triangle');
                  setFirstPoint(null);
                  showToast('Chế độ Vẽ Tam giác: Kéo chuột để tạo hình.');
                }}
                className={`p-1.5 rounded transition-colors ${
                  activeTool === 'triangle'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-sky-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Vẽ Tam giác"
              >
                <Triangle className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setActiveTool('parallelogram');
                  setFirstPoint(null);
                  showToast('Chế độ Vẽ Hình bình hành: Kéo chuột để tạo hình.');
                }}
                className={`p-1.5 rounded transition-colors ${
                  activeTool === 'parallelogram'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-amber-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Vẽ Hình bình hành"
              >
                <ParallelogramIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setActiveTool('square');
                  setFirstPoint(null);
                  showToast('Chế độ Vẽ Hình vuông: Kéo chuột để tạo hình.');
                }}
                className={`p-1.5 rounded transition-colors ${
                  activeTool === 'square'
                    ? 'bg-emerald-400 text-slate-950 font-bold'
                    : 'text-emerald-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Vẽ Hình vuông"
              >
                <Square className="w-4 h-4" />
              </button>
              <PenTool className="w-4 h-4 text-slate-300" />
            </div>
          )}

          {/* Bottom Actions: Undo, Redo, Clear, Save */}
          {isSidebarOpen && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={handleUndo}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center justify-center gap-1 transition-colors"
                  title="Hoàn tác (Undo)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  className="py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center justify-center gap-1 transition-colors"
                  title="Làm lại (Redo)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClear}
                  className="py-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg text-xs text-slate-300 flex items-center justify-center gap-1 transition-colors"
                  title="Xóa sạch bảng"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleExportPNG}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Lưu ảnh bảng vẽ (PNG)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Status / Instruction Pill at Bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-slate-950/90 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-md text-xs text-slate-200">
        {firstPoint ? (
          <div className="flex items-center gap-2 text-amber-400 font-semibold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>
              Đã chấm điểm <strong className="text-white">[{firstPoint.label}]</strong>. Hãy chấm điểm thứ 2 để tạo {activeTool === 'two-point-dashed' ? 'nét đứt' : 'nét liền'} (Nhấn Esc để hủy).
            </span>
          </div>
        ) : activeTool === 'drag-vertex' ? (
          <div className="flex items-center gap-2 text-emerald-300">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>
              👉 <strong>Dời điểm (Kéo đỉnh):</strong> Nhấn giữ chuột và kéo bất kỳ đỉnh nào để di chuyển, các cạnh nối sẽ co giãn theo!
            </span>
          </div>
        ) : activeTool === 'move-label' ? (
          <div className="flex items-center gap-2 text-amber-300">
            <Type className="w-4 h-4 text-amber-400" />
            <span>
              👉 <strong>Di chuyển chữ cái:</strong> Nhấn giữ chuột và kéo bất kỳ chữ cái nào (S, A, B, C...) để dời vị trí nhãn đỉnh tùy ý.
            </span>
          </div>
        ) : activeTool === 'two-point-solid' ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>
              👉 <strong>2 Chấm → Nét liền:</strong> Chấm 2 điểm để vẽ. Kéo đỉnh để dời điểm. Kéo chữ cái để dời nhãn.
            </span>
          </div>
        ) : activeTool === 'two-point-dashed' ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>
              👉 <strong>2 Chấm → Nét đứt:</strong> Chấm 2 điểm để vẽ nét khuất. Kéo đỉnh để dời điểm. Kéo chữ cái để dời nhãn.
            </span>
          </div>
        ) : activeTool === 'toggle-line' ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <ToggleLeft className="w-4 h-4" />
            <span>
              👉 <strong>Bấm Đổi Nét:</strong> Bấm vào bất kỳ đoạn thẳng nào để đảo ngay giữa Nét Liền và Nét Đứt.
            </span>
          </div>
        ) : activeTool === 'triangle' ? (
          <div className="flex items-center gap-2 text-sky-300">
            <Triangle className="w-4 h-4 text-sky-400" />
            <span>
              👉 <strong>Vẽ Tam giác:</strong> Nhấn giữ và kéo chuột trên bảng để vẽ tam giác (hoặc bấm 1 điểm để tạo ngay). Kéo đỉnh để dời & biến dạng!
            </span>
          </div>
        ) : activeTool === 'parallelogram' ? (
          <div className="flex items-center gap-2 text-amber-300">
            <ParallelogramIcon className="w-4 h-4 text-amber-400" />
            <span>
              👉 <strong>Vẽ Hình bình hành:</strong> Nhấn giữ và kéo chuột trên bảng để vẽ hình bình hành. Kéo đỉnh để co giãn & chỉnh góc!
            </span>
          </div>
        ) : activeTool === 'square' ? (
          <div className="flex items-center gap-2 text-emerald-300">
            <Square className="w-4 h-4 text-emerald-400" />
            <span>
              👉 <strong>Vẽ Hình vuông:</strong> Nhấn giữ và kéo chuột trên bảng để vẽ hình vuông đều góc. Kéo đỉnh để dời & co giãn!
            </span>
          </div>
        ) : activeTool === 'pan' ? (
          <div className="flex items-center gap-2 text-amber-300">
            <Move className="w-4 h-4" />
            <span>
              👉 <strong>Dời hình (Pan):</strong> Nhấn giữ và rê chuột trên bảng để dịch chuyển toàn bộ hình vẽ & đỉnh.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <span>Bắt dính đỉnh (Auto-snap) &bull; <strong>Kéo đỉnh để dời điểm &bull; Kéo chữ cái để dời nhãn đỉnh</strong>.</span>
          </div>
        )}
      </div>

      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-30 px-3.5 py-2 bg-slate-900 border border-sky-500/50 rounded-xl shadow-2xl text-xs text-sky-200 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Quick Rename Letter Popover (khi nhấp đúp vào chữ cái đỉnh) */}
      {renamingVertex && (
        <div
          className="absolute z-40 bg-slate-900/95 border border-sky-400 rounded-xl shadow-2xl backdrop-blur-md p-3 text-slate-200 w-64 animate-in fade-in zoom-in-95 pointer-events-auto"
          style={{
            left: `${Math.min(
              Math.max(renamingVertex.x + (renamingVertex.labelOffsetX ?? 12), 240),
              (canvasRef.current?.clientWidth || window.innerWidth) - 270
            )}px`,
            top: `${Math.min(
              Math.max(renamingVertex.y + (renamingVertex.labelOffsetY ?? -12) - 30, 20),
              (canvasRef.current?.clientHeight || window.innerHeight) - 180
            )}px`,
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Đổi chữ cái đỉnh [{renamingVertex.label}]
            </span>
            <button
              onClick={() => setRenamingVertex(null)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              title="Đóng (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setRenamingVertex(null);
                }}
                onFocus={(e) => e.target.select()}
                maxLength={6}
                autoFocus
                className="w-20 px-2.5 py-1.5 bg-slate-800 border-2 border-sky-400 rounded-lg text-sm font-bold text-center text-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
                placeholder="A, B, C..."
              />
              <button
                onClick={handleSaveRename}
                className="flex-1 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow-md shadow-sky-500/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Lưu tên
              </button>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1">
              {['S', 'A', 'B', 'C', 'D', 'H', 'M', 'O', 'P'].map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => {
                    setRenameText(lbl);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                    renameText === lbl
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteVertex(renamingVertex.id)}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                title="Xóa đỉnh này khỏi bảng vẽ"
              >
                <Trash2 className="w-3 h-3" />
                Xóa đỉnh
              </button>
              <span className="text-[10px] text-slate-500">Kéo chữ cái để dời</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full block touch-none ${
          draggingLabelVertexIdRef.current
            ? 'cursor-move'
            : draggingVertexIdRef.current
            ? 'cursor-grabbing'
            : hoveredLabelVertexId
            ? 'cursor-move'
            : snapCandidate
            ? 'cursor-grab'
            : activeTool === 'move-label'
            ? 'cursor-move'
            : activeTool === 'drag-vertex'
            ? 'cursor-grab'
            : activeTool === 'pan'
            ? isDrawing
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-crosshair'
        }`}
      />
    </div>
  );
};
