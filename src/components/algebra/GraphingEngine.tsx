import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  RotateCcw,
  Plus,
  Minus,
  Sparkles,
  Clipboard,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';

type PresetType = 'quad_over_linear' | 'cubic' | 'fractional' | 'quartic' | 'custom';

export const GraphingEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sidebar collapse state (Điều khiển đồ thị có thể gọn được)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Function Preset State (Bỏ qua tham số m, vẽ trực tiếp hàm số)
  const [presetType, setPresetType] = useState<PresetType>('quad_over_linear');

  // Viewport zoom & pan
  const [scale, setScale] = useState<number>(44); // pixels per math unit
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 380, y: 320 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Feature Toggles
  const [showAsymptotes, setShowAsymptotes] = useState<boolean>(true);
  const [showExtrema, setShowExtrema] = useState<boolean>(true);
  const [showRoots, setShowRoots] = useState<boolean>(true);
  const [showTangent, setShowTangent] = useState<boolean>(false);
  const [tangentX0, setTangentX0] = useState<number>(2.0);

  // Formula Expression & Word problem text (no parameter m)
  const [customExpr, setCustomExpr] = useState<string>('(x^2 - x + 1) / (x - 1)');
  const [problemText, setProblemText] = useState<string>(
    'Đề bài: Khảo sát sự biến thiên và vẽ đồ thị hàm số y = (x² - x + 1)/(x - 1). Xác định tiệm cận đứng, tiệm cận xiên và tìm tọa độ các điểm cực trị.'
  );

  // Handle preset selection (standard textbook functions without parameter m)
  const handleSelectPreset = (p: PresetType) => {
    setPresetType(p);
    if (p === 'quad_over_linear') {
      setCustomExpr('(x^2 - x + 1) / (x - 1)');
      setProblemText(
        'Đề bài: Khảo sát sự biến thiên và vẽ đồ thị hàm phân thức bậc hai trên bậc nhất y = (x² - x + 1)/(x - 1). Tìm tiệm cận đứng, tiệm cận xiên và tâm đối xứng.'
      );
    } else if (p === 'cubic') {
      setCustomExpr('x^3 - 3*x + 2');
      setProblemText(
        'Đề bài: Khảo sát sự biến thiên và vẽ đồ thị hàm số bậc ba y = x³ - 3x + 2. Tìm tọa độ điểm cực đại, điểm cực tiểu và điểm uốn của đồ thị.'
      );
    } else if (p === 'fractional') {
      setCustomExpr('(2*x - 1) / (x - 1)');
      setProblemText(
        'Đề bài: Khảo sát sự biến thiên và vẽ đồ thị hàm nhất biến y = (2x - 1)/(x - 1). Xác định tiệm cận đứng, tiệm cận ngang và tâm đối xứng I.'
      );
    } else if (p === 'quartic') {
      setCustomExpr('x^4 - 2*x^2 + 1');
      setProblemText(
        'Đề bài: Khảo sát sự biến thiên và vẽ đồ thị hàm trùng phương y = x⁴ - 2x² + 1. Xác định 3 điểm cực trị của đồ thị hàm số.'
      );
    }
  };

  // Evaluate function y = f(x) directly without parameter
  const evalFunc = useCallback(
    (x: number): number | null => {
      try {
        if (presetType === 'quad_over_linear') {
          // y = (x^2 - x + 1) / (x - 1) = x + 1/(x - 1)
          if (Math.abs(x - 1) < 1e-4) return null;
          return (x * x - x + 1) / (x - 1);
        } else if (presetType === 'cubic') {
          // y = x^3 - 3x + 2
          return Math.pow(x, 3) - 3 * x + 2;
        } else if (presetType === 'fractional') {
          // y = (2x - 1) / (x - 1)
          if (Math.abs(x - 1) < 1e-4) return null;
          return (2 * x - 1) / (x - 1);
        } else if (presetType === 'quartic') {
          // y = x^4 - 2x^2 + 1
          return Math.pow(x, 4) - 2 * Math.pow(x, 2) + 1;
        } else {
          // Custom expression parsed safely
          const clean = customExpr
            .replace(/\^/g, '**')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/abs/g, 'Math.abs')
            .replace(/\bpi\b/gi, 'Math.PI')
            .replace(/\be\b/gi, 'Math.E')
            .replace(/x/g, `(${x})`);
          // eslint-disable-next-line no-eval
          const val = Function(`"use strict"; return (${clean})`)();
          return isFinite(val) ? val : null;
        }
      } catch (err) {
        return null;
      }
    },
    [presetType, customExpr]
  );

  // Numerical derivative approximation f'(x)
  const evalDerivative = useCallback(
    (x: number): number => {
      const h = 0.001;
      const y1 = evalFunc(x + h);
      const y0 = evalFunc(x - h);
      if (y1 === null || y0 === null) return 0;
      return (y1 - y0) / (2 * h);
    },
    [evalFunc]
  );

  // Critical points (Extrema & Inflection points)
  const criticalPoints = useMemo(() => {
    const pts: { x: number; y: number; type: string }[] = [];
    if (presetType === 'quad_over_linear') {
      // y' = (x(x - 2)) / (x - 1)^2
      // x = 0 => y = -1 (Cực đại)
      pts.push({ x: 0, y: -1, type: 'Cực đại' });
      // x = 2 => y = 3 (Cực tiểu)
      pts.push({ x: 2, y: 3, type: 'Cực tiểu' });
    } else if (presetType === 'cubic') {
      // y' = 3x^2 - 3 => x = -1, x = 1
      pts.push({ x: -1, y: 4, type: 'Cực đại' });
      pts.push({ x: 1, y: 0, type: 'Cực tiểu' });
      pts.push({ x: 0, y: 2, type: 'Điểm uốn' });
    } else if (presetType === 'fractional') {
      // y' = -1 / (x - 1)^2 < 0 (không có cực trị)
    } else if (presetType === 'quartic') {
      // y' = 4x^3 - 4x = 4x(x^2 - 1) => x = 0, x = -1, x = 1
      pts.push({ x: 0, y: 1, type: 'Cực đại' });
      pts.push({ x: -1, y: 0, type: 'Cực tiểu' });
      pts.push({ x: 1, y: 0, type: 'Cực tiểu' });
    } else {
      // Custom: approximate local extrema by sign change of derivative
      for (let x = -10; x <= 10; x += 0.2) {
        const d1 = evalDerivative(x);
        const d2 = evalDerivative(x + 0.2);
        if (d1 * d2 < 0) {
          const xMid = x + 0.1;
          const yMid = evalFunc(xMid);
          if (yMid !== null) {
            pts.push({
              x: parseFloat(xMid.toFixed(2)),
              y: parseFloat(yMid.toFixed(2)),
              type: d1 > 0 ? 'Cực đại' : 'Cực tiểu',
            });
          }
        }
      }
    }
    return pts;
  }, [presetType, evalFunc, evalDerivative]);

  // Roots on Ox (Giao điểm với trục hoành)
  const roots = useMemo(() => {
    const list: number[] = [];
    if (presetType === 'quad_over_linear') {
      // x^2 - x + 1 = 0 => Delta = -3 < 0 => Không cắt Ox
    } else if (presetType === 'cubic') {
      // x^3 - 3x + 2 = (x - 1)^2(x + 2) = 0 => x = -2, x = 1
      list.push(-2);
      list.push(1);
    } else if (presetType === 'fractional') {
      // 2x - 1 = 0 => x = 0.5
      list.push(0.5);
    } else if (presetType === 'quartic') {
      // (x^2 - 1)^2 = 0 => x = -1, x = 1
      list.push(-1);
      list.push(1);
    }
    return list;
  }, [presetType]);

  // Canvas Drawing & Responsive Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Dark coordinate space background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    // Math coords to screen
    const toScreen = (mx: number, my: number) => ({
      x: origin.x + mx * scale,
      y: origin.y - my * scale,
    });
    const toMath = (sx: number, sy: number) => ({
      x: (sx - origin.x) / scale,
      y: (origin.y - sy) / scale,
    });

    // 1. Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const xMinMath = Math.floor(toMath(0, 0).x);
    const xMaxMath = Math.ceil(toMath(width, 0).x);
    const yMinMath = Math.floor(toMath(0, height).y);
    const yMaxMath = Math.ceil(toMath(0, 0).y);

    for (let x = xMinMath; x <= xMaxMath; x++) {
      const sx = toScreen(x, 0).x;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
    }
    for (let y = yMinMath; y <= yMaxMath; y++) {
      const sy = toScreen(0, y).y;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
    }

    // 2. Axes Ox & Oy
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    // Ox
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    // Oy
    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // Axis labels & tick marks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    for (let x = xMinMath; x <= xMaxMath; x++) {
      if (x === 0) continue;
      const sx = toScreen(x, 0).x;
      ctx.fillText(x.toString(), sx - 4, origin.y + 16);
    }
    for (let y = yMinMath; y <= yMaxMath; y++) {
      if (y === 0) continue;
      const sy = toScreen(0, y).y;
      ctx.fillText(y.toString(), origin.x + 8, sy + 4);
    }
    ctx.fillText('O', origin.x - 14, origin.y + 14);
    ctx.fillText('x', width - 16, origin.y - 8);
    ctx.fillText('y', origin.x + 8, 16);

    // 3. Asymptotes (Đường tiệm cận đứng, ngang, xiên)
    if (showAsymptotes) {
      if (presetType === 'quad_over_linear') {
        // Hàm bậc 2/ bậc 1: y = (x^2 - x + 1)/(x - 1) = x + 1/(x - 1)
        // TCĐ: x = 1 (red dashed)
        const vertSX = toScreen(1, 0).x;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(vertSX, 0);
        ctx.lineTo(vertSX, height);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillText('TCĐ: x = 1', vertSX + 6, 26);

        // TCX: y = x (emerald dashed)
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        const xStart = toMath(0, 0).x - 2;
        const xEnd = toMath(width, 0).x + 2;
        const pt1 = toScreen(xStart, xStart);
        const pt2 = toScreen(xEnd, xEnd);
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();

        // Label TCX
        ctx.fillStyle = '#10b981';
        ctx.fillText('TCX: y = x', 16, 44);

        // Center of symmetry I(1, 1)
        const centerI = toScreen(1, 1);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(centerI.x, centerI.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('I(1; 1)', centerI.x + 8, centerI.y - 8);
        ctx.restore();
      } else if (presetType === 'fractional') {
        // Hàm nhất biến: y = (2x - 1)/(x - 1) = 2 + 1/(x - 1)
        // TCĐ: x = 1
        const vertSX = toScreen(1, 0).x;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(vertSX, 0);
        ctx.lineTo(vertSX, height);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.fillText('TCĐ: x = 1', vertSX + 6, 26);

        // TCN: y = 2
        const horizSY = toScreen(0, 2).y;
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(0, horizSY);
        ctx.lineTo(width, horizSY);
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.fillText('TCN: y = 2', 12, horizSY - 6);

        // Center of symmetry I(1, 2)
        const centerI = toScreen(1, 2);
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(centerI.x, centerI.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('I(1; 2)', centerI.x + 8, centerI.y - 8);
        ctx.restore();
      }
    }

    // 4. Function Curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.8;
    ctx.beginPath();

    let started = false;
    for (let sx = 0; sx <= width; sx += 2) {
      const mx = toMath(sx, 0).x;
      const my = evalFunc(mx);

      if (my === null || !isFinite(my) || Math.abs(my) > 80) {
        started = false;
        continue;
      }

      const sy = toScreen(mx, my).y;
      if (!started) {
        ctx.moveTo(sx, sy);
        started = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
    ctx.stroke();

    // 5. Critical Points Markers
    if (showExtrema) {
      criticalPoints.forEach((cp) => {
        const sc = toScreen(cp.x, cp.y);
        ctx.fillStyle = cp.type === 'Cực đại' ? '#f59e0b' : cp.type === 'Cực tiểu' ? '#ec4899' : '#10b981';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label tag
        const tag = `${cp.type} (${cp.x.toFixed(1)}; ${cp.y.toFixed(1)})`;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sc.x + 8, sc.y - 18, tag.length * 6.5 + 8, 16);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(sc.x + 8, sc.y - 18, tag.length * 6.5 + 8, 16);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(tag, sc.x + 12, sc.y - 6);
      });
    }

    // 6. Roots on Ox (Giao trục hoành)
    if (showRoots && roots.length > 0) {
      roots.forEach((rx) => {
        const sc = toScreen(rx, 0);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`(${rx.toFixed(1)}; 0)`, sc.x + 6, sc.y + 14);
      });
    }

    // 7. Tangent line at x0
    if (showTangent) {
      const y0 = evalFunc(tangentX0);
      if (y0 !== null) {
        const k = evalDerivative(tangentX0);
        const ptScreen = toScreen(tangentX0, y0);

        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const xLeft = tangentX0 - 4;
        const xRight = tangentX0 + 4;
        const yLeft = y0 + k * (xLeft - tangentX0);
        const yRight = y0 + k * (xRight - tangentX0);
        const sLeft = toScreen(xLeft, yLeft);
        const sRight = toScreen(xRight, yRight);
        ctx.moveTo(sLeft.x, sLeft.y);
        ctx.lineTo(sRight.x, sRight.y);
        ctx.stroke();

        // Contact point
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(ptScreen.x, ptScreen.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Tiếp tuyến: k = ${k.toFixed(2)}`, ptScreen.x + 8, ptScreen.y - 8);
      }
    }

    ctx.restore();
  }, [
    scale,
    origin,
    presetType,
    evalFunc,
    evalDerivative,
    criticalPoints,
    roots,
    showExtrema,
    showRoots,
    showAsymptotes,
    showTangent,
    tangentX0,
    isSidebarOpen,
  ]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - origin.x, y: e.clientY - origin.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setOrigin({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  };
  const handleMouseUp = () => setIsPanning(false);

  // Quick Math Symbols Palette
  const insertSymbol = (sym: string) => {
    setCustomExpr((prev) => prev + sym);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* LEFT SIDEBAR: Bảng điều khiển có thể thu gọn được (isSidebarOpen) */}
      <div
        className={`bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 z-20 transition-all duration-300 shadow-2xl ${
          isSidebarOpen ? 'w-full sm:w-[360px] opacity-100' : 'w-0 opacity-0 overflow-hidden pointer-events-none'
        }`}
      >
        {/* Sidebar Header with Collapse Button */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white tracking-wide">Điều khiển đồ thị</h3>
              <p className="text-[10px] text-slate-400">Khảo sát hàm số chuẩn SGK</p>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs transition-colors"
            title="Thu gọn thanh điều khiển"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thu gọn</span>
          </button>
        </div>

        {/* Scrollable Control Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-slate-300 custom-scrollbar">
          {/* Card: Preset Functions */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Chọn dạng hàm số:
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <button
                onClick={() => handleSelectPreset('quad_over_linear')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  presetType === 'quad_over_linear'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold shadow-md shadow-emerald-500/10'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-[11px]">Bậc 2 / Bậc 1</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">y = (x²-x+1)/(x-1)</div>
              </button>

              <button
                onClick={() => handleSelectPreset('cubic')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  presetType === 'cubic'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-300 font-bold shadow-md shadow-sky-500/10'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-[11px]">Hàm Bậc 3</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">y = x³ - 3x + 2</div>
              </button>

              <button
                onClick={() => handleSelectPreset('fractional')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  presetType === 'fractional'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-300 font-bold shadow-md shadow-sky-500/10'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-[11px]">Bậc 1 / Bậc 1</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">y = (2x-1)/(x-1)</div>
              </button>

              <button
                onClick={() => handleSelectPreset('quartic')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  presetType === 'quartic'
                    ? 'bg-sky-500/25 border-sky-400 text-sky-300 font-bold shadow-md shadow-sky-500/10'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-[11px]">Trùng Phương</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">y = x⁴ - 2x² + 1</div>
              </button>
            </div>
          </div>

          {/* Card: Expression Input */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-300">Biểu thức hàm số y = f(x):</span>
              <button
                onClick={() => handleSelectPreset('custom')}
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  presetType === 'custom' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tùy chỉnh
              </button>
            </div>
            <input
              type="text"
              value={customExpr}
              onChange={(e) => {
                setCustomExpr(e.target.value);
                setPresetType('custom');
              }}
              className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
              placeholder="VD: (x^2 - x + 1)/(x - 1)"
            />

            {/* Quick Symbols */}
            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
              {['²', '³', '√', 'π', '±', '(', ')', '/', '*', '+', '-'].map((sym) => (
                <button
                  key={sym}
                  onClick={() => insertSymbol(sym)}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 font-bold rounded text-[11px] transition-colors"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Card: Analytical Characteristics (Thông số giải tích) */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Đặc trưng hình học & giải tích:</span>
            </div>
            <div className="text-[11px] text-slate-300 space-y-1 font-mono">
              {presetType === 'quad_over_linear' && (
                <>
                  <div className="text-emerald-400 font-bold">• Tiệm cận xiên: y = x</div>
                  <div className="text-rose-400 font-bold">• Tiệm cận đứng: x = 1</div>
                  <div>• Tâm đối xứng: <span className="text-cyan-300 font-bold">I(1; 1)</span></div>
                  <div>• Điểm cực đại: <span className="text-amber-300 font-bold">(0; -1)</span></div>
                  <div>• Điểm cực tiểu: <span className="text-pink-300 font-bold">(2; 3)</span></div>
                </>
              )}
              {presetType === 'cubic' && (
                <>
                  <div>• Cực đại: <span className="text-amber-300 font-bold">(-1; 4)</span></div>
                  <div>• Cực tiểu: <span className="text-pink-300 font-bold">(1; 0)</span></div>
                  <div>• Điểm uốn: <span className="text-cyan-300 font-bold">(0; 2)</span></div>
                  <div>• Giao trục Ox: <span className="text-sky-300 font-bold">x = -2, x = 1</span></div>
                </>
              )}
              {presetType === 'fractional' && (
                <>
                  <div className="text-rose-400 font-bold">• Tiệm cận đứng: x = 1</div>
                  <div className="text-emerald-400 font-bold">• Tiệm cận ngang: y = 2</div>
                  <div>• Tâm đối xứng: <span className="text-cyan-300 font-bold">I(1; 2)</span></div>
                  <div>• Giao trục Ox: <span className="text-sky-300 font-bold">x = 0.5</span></div>
                </>
              )}
              {presetType === 'quartic' && (
                <>
                  <div>• Cực đại: <span className="text-amber-300 font-bold">(0; 1)</span></div>
                  <div>• Cực tiểu: <span className="text-pink-300 font-bold">(-1; 0) & (1; 0)</span></div>
                  <div>• Giao trục Ox: <span className="text-sky-300 font-bold">x = -1, x = 1</span></div>
                </>
              )}
              {presetType === 'custom' && (
                <div>• Hàm tùy chỉnh theo x đang được render trực tiếp.</div>
              )}
            </div>
          </div>

          {/* Card: Display Toggles */}
          <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
            <div className="text-[11px] font-semibold text-slate-300">Tùy chọn hiển thị:</div>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showAsymptotes}
                  onChange={(e) => setShowAsymptotes(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-0"
                />
                Đường tiệm cận (Đứng, Ngang, Xiên)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showExtrema}
                  onChange={(e) => setShowExtrema(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                Điểm cực đại, cực tiểu & uốn
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showRoots}
                  onChange={(e) => setShowRoots(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
                Giao điểm trục hoành Ox
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={(e) => setShowTangent(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                Tiếp tuyến tại x₀
              </label>

              {showTangent && (
                <div className="pl-6 pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Hoành độ x₀:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={tangentX0}
                    onChange={(e) => setTangentX0(parseFloat(e.target.value) || 0)}
                    className="w-16 p-1 bg-slate-950 border border-slate-700 rounded text-center text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card: Word Problem Paste */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Clipboard className="w-3.5 h-3.5 text-amber-400" /> Dán đề bài từ Word / Đề thi:
            </span>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              rows={3}
              className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              placeholder="Dán nội dung câu hỏi đề thi vào đây..."
            />
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Tọa độ: Động tương tác</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-sky-400 hover:text-sky-300 font-medium"
          >
            Thu gọn ←
          </button>
        </div>
      </div>

      {/* RIGHT: Graphing Canvas Workspace */}
      <div className="flex-1 flex flex-col relative bg-slate-900 overflow-hidden" ref={containerRef}>
        {/* Top Floating Control Bar */}
        <div className="p-2.5 bg-slate-950/85 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10 backdrop-blur-md select-none">
          {/* Collapse/Expand Sidebar Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                !isSidebarOpen
                  ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isSidebarOpen ? 'Thu gọn bảng điều khiển' : 'Mở bảng điều khiển'}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isSidebarOpen ? 'Thu gọn điều khiển' : 'Mở điều khiển'}</span>
              {isSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {/* Current Function Badge */}
            <div className="px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-lg text-xs font-mono font-bold text-sky-400 hidden sm:flex items-center gap-1.5">
              <span>y = {customExpr}</span>
            </div>
          </div>

          {/* Zoom & Pan Reset Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setScale((s) => Math.min(s + 8, 120))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Phóng to"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale((s) => Math.max(s - 8, 20))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Thu nhỏ"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setScale(44);
                setOrigin({ x: 380, y: 320 });
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Đặt lại vị trí gốc tọa độ O"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Canvas Plotting Area */}
        <div
          className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Floating Expand Button when Sidebar is Collapsed */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-3 left-3 z-20 px-3 py-2 bg-slate-900/95 hover:bg-slate-800 text-sky-400 hover:text-sky-300 font-bold text-xs rounded-xl border border-sky-500/40 shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 animate-in fade-in duration-200"
              title="Mở bảng điều khiển đồ thị"
            >
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Điều khiển đồ thị</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          {/* Canvas Floating Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 backdrop-blur-md shadow-lg text-[11px] space-y-1 select-none pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-sky-400 rounded" />
              <span className="font-semibold text-sky-300">Đồ thị y = f(x)</span>
            </div>
            {presetType === 'quad_over_linear' && (
              <>
                <div className="flex items-center gap-2 text-rose-400">
                  <div className="w-3 h-0.5 bg-rose-500 rounded border-dashed" />
                  <span>Tiệm cận đứng: x = 1</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded border-dashed" />
                  <span>Tiệm cận xiên: y = x</span>
                </div>
              </>
            )}
            {presetType === 'fractional' && (
              <>
                <div className="flex items-center gap-2 text-rose-400">
                  <div className="w-3 h-0.5 bg-rose-500 rounded border-dashed" />
                  <span>Tiệm cận đứng: x = 1</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded border-dashed" />
                  <span>Tiệm cận ngang: y = 2</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 text-amber-400">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Điểm cực đại, cực tiểu & uốn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
