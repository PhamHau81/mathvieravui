import React from 'react';
import { project3DPolygonTo2D, Vec3 } from '../../utils/math3d';
import { Layers, Maximize2, Minimize2, X, RefreshCw } from 'lucide-react';

interface DetachedSection2DProps {
  vertices3D: Vec3[];
  labels: string[];
  isOpen: boolean;
  onClose: () => void;
  solidTitle: string;
}

export const DetachedSection2D: React.FC<DetachedSection2DProps> = ({
  vertices3D,
  labels,
  isOpen,
  onClose,
  solidTitle,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!isOpen) return null;

  const { points2D, edgeLengths, area, perimeter } = project3DPolygonTo2D(vertices3D);

  // Determine SVG bounding box
  const padding = 40;
  const xs = points2D.map((p) => p.x);
  const ys = points2D.map((p) => p.y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;

  const width = Math.max(maxX - minX, 0.1);
  const height = Math.max(maxY - minY, 0.1);

  // Normalize to 300x260 viewBox
  const svgWidth = isExpanded ? 460 : 320;
  const svgHeight = isExpanded ? 360 : 240;

  const scale = Math.min((svgWidth - padding * 2) / width, (svgHeight - padding * 2) / height);
  const cx = svgWidth / 2;
  const cy = svgHeight / 2;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const transformedPts = points2D.map((p) => ({
    x: cx + (p.x - midX) * scale,
    y: cy - (p.y - midY) * scale, // invert Y for SVG
  }));

  const pathD =
    transformedPts.length > 0
      ? `M ${transformedPts[0].x} ${transformedPts[0].y} ` +
        transformedPts
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ') +
        ' Z'
      : '';

  return (
    <div
      className={`absolute top-4 right-4 z-30 bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-300 ${
        isExpanded ? 'w-[480px]' : 'w-84'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Thiết diện tách rời (2D Detached)
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="p-3">
        <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
          <span>Liên kết động: <strong className="text-slate-200">{solidTitle}</strong></span>
          <span className="text-amber-400 font-mono text-[10px] flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400/80" /> Live Sync
          </span>
        </div>

        {/* 2D Canvas SVG */}
        <div className="relative bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center p-2 overflow-hidden shadow-inner">
          {/* Subtle Grid background */}
          <svg className="absolute inset-0 w-full h-full opacity-15" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="smallGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#60a5fa" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#smallGrid)" />
          </svg>

          {transformedPts.length >= 3 ? (
            <svg width={svgWidth} height={svgHeight} className="relative z-10">
              {/* Fill polygon */}
              <path
                d={pathD}
                fill="rgba(245, 158, 11, 0.22)"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Edge labels (lengths) */}
              {transformedPts.map((p, idx) => {
                const nextP = transformedPts[(idx + 1) % transformedPts.length];
                const mx = (p.x + nextP.x) / 2;
                const my = (p.y + nextP.y) / 2;
                const len = edgeLengths[idx]?.toFixed(2) || '0';
                return (
                  <g key={`edge-${idx}`}>
                    <rect
                      x={mx - 14}
                      y={my - 8}
                      width={28}
                      height={16}
                      rx={3}
                      fill="#0f172a"
                      stroke="#475569"
                      strokeWidth="0.5"
                    />
                    <text
                      x={mx}
                      y={my + 3}
                      fontSize="9"
                      fill="#cbd5e1"
                      textAnchor="middle"
                      className="font-mono font-bold select-none"
                    >
                      {len}
                    </text>
                  </g>
                );
              })}

              {/* Vertices & Labels */}
              {transformedPts.map((p, idx) => {
                const label = labels[idx] || `P${idx + 1}`;
                return (
                  <g key={`pt-${idx}`}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={p.x + 8}
                      y={p.y - 8}
                      fontSize="11"
                      fill="#fef08a"
                      fontWeight="bold"
                      className="font-mono select-none"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Đang xác định thiết diện... Kéo mặt phẳng cắt để giao với hình chóp.
            </div>
          )}
        </div>

        {/* Geometric Metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-slate-800/60 rounded-lg border border-slate-700/60">
            <div className="text-[10px] text-slate-400">Diện tích thiết diện S:</div>
            <div className="text-amber-400 font-bold font-mono text-sm mt-0.5">
              {area.toFixed(3)} <span className="text-[10px] text-slate-500 font-normal">đvdt</span>
            </div>
          </div>
          <div className="p-2 bg-slate-800/60 rounded-lg border border-slate-700/60">
            <div className="text-[10px] text-slate-400">Chu vi thiết diện P:</div>
            <div className="text-emerald-400 font-bold font-mono text-sm mt-0.5">
              {perimeter.toFixed(3)} <span className="text-[10px] text-slate-500 font-normal">đvdài</span>
            </div>
          </div>
        </div>

        {/* Teacher Note */}
        <div className="mt-2.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-200/90 leading-tight">
          💡 <strong>Tính chất hình học:</strong> Hình phẳng tách rời không bị biến dạng góc hay tỷ lệ chiếu không gian. Khi kéo đỉnh hình 3D, kích thước thiết diện này tự động biến thiên tương ứng.
        </div>
      </div>
    </div>
  );
};
