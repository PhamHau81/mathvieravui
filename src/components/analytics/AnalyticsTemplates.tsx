import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  GitFork,
  CircleDot,
  BookOpen,
  Sparkles,
  Calculator,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';

type AnalyticsSubTab = 'statistics' | 'tree' | 'venn' | 'curriculum';

interface GroupedDataRow {
  interval: string;
  lower: number;
  upper: number;
  mid: number;
  freq: number;
}

export const AnalyticsTemplates: React.FC = () => {
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('statistics');

  // 1. Statistics State (Grouped Data - Chuẩn SGK Toán 11, 12 mới)
  const [datasetTitle, setDatasetTitle] = useState<string>(
    'Thời gian tự học hàng ngày của học sinh lớp 12A1 (phút)'
  );
  const [dataRows, setDataRows] = useState<GroupedDataRow[]>([
    { interval: '[30; 60)', lower: 30, upper: 60, mid: 45, freq: 5 },
    { interval: '[60; 90)', lower: 60, upper: 90, mid: 75, freq: 12 },
    { interval: '[90; 120)', lower: 90, upper: 120, mid: 105, freq: 18 },
    { interval: '[120; 150)', lower: 120, upper: 150, mid: 135, freq: 10 },
    { interval: '[150; 180)', lower: 150, upper: 180, mid: 165, freq: 5 },
  ]);

  // Statistical calculations
  const stats = useMemo(() => {
    const totalN = dataRows.reduce((sum, r) => sum + r.freq, 0);
    if (totalN === 0) return null;

    // Mean (Số trung bình)
    const sumXf = dataRows.reduce((sum, r) => sum + r.mid * r.freq, 0);
    const mean = sumXf / totalN;

    // Variance & Std Dev (Phương sai & Độ lệch chuẩn)
    const sumSqDiff = dataRows.reduce((sum, r) => sum + r.freq * Math.pow(r.mid - mean, 2), 0);
    const variance = sumSqDiff / totalN;
    const stdDev = Math.sqrt(variance);

    // Median group calculation
    let cum = 0;
    const nHalf = totalN / 2;
    let medGroup = dataRows[0];
    let cumBefore = 0;
    for (let i = 0; i < dataRows.length; i++) {
      cum += dataRows[i].freq;
      if (cum >= nHalf) {
        medGroup = dataRows[i];
        cumBefore = cum - dataRows[i].freq;
        break;
      }
    }
    const median =
      medGroup.lower + ((nHalf - cumBefore) / medGroup.freq) * (medGroup.upper - medGroup.lower);

    // Q1 group
    const nQuarter = totalN / 4;
    cum = 0;
    let q1Group = dataRows[0];
    let cumQ1Before = 0;
    for (let i = 0; i < dataRows.length; i++) {
      cum += dataRows[i].freq;
      if (cum >= nQuarter) {
        q1Group = dataRows[i];
        cumQ1Before = cum - dataRows[i].freq;
        break;
      }
    }
    const q1 =
      q1Group.lower + ((nQuarter - cumQ1Before) / q1Group.freq) * (q1Group.upper - q1Group.lower);

    // Q3 group
    const nThreeQuarters = (3 * totalN) / 4;
    cum = 0;
    let q3Group = dataRows[0];
    let cumQ3Before = 0;
    for (let i = 0; i < dataRows.length; i++) {
      cum += dataRows[i].freq;
      if (cum >= nThreeQuarters) {
        q3Group = dataRows[i];
        cumQ3Before = cum - dataRows[i].freq;
        break;
      }
    }
    const q3 =
      q3Group.lower +
      ((nThreeQuarters - cumQ3Before) / q3Group.freq) * (q3Group.upper - q3Group.lower);

    const iqr = q3 - q1;

    return {
      totalN,
      mean,
      variance,
      stdDev,
      median,
      q1,
      q3,
      iqr,
      min: dataRows[0].lower,
      max: dataRows[dataRows.length - 1].upper,
    };
  }, [dataRows]);

  // 2. Probability Tree State (Sơ đồ cây xác suất SGK mới)
  const [probA, setProbA] = useState<number>(0.6); // P(A)
  const [probBgivenA, setProbBgivenA] = useState<number>(0.85); // P(B|A)
  const [probBgivenNotA, setProbBgivenNotA] = useState<number>(0.2); // P(B|!A)

  const treeProb = useMemo(() => {
    const pNotA = 1 - probA;
    const pNotBgivenA = 1 - probBgivenA;
    const pNotBgivenNotA = 1 - probBgivenNotA;

    // Branches outcomes
    const pA_and_B = probA * probBgivenA;
    const pA_and_notB = probA * pNotBgivenA;
    const pNotA_and_B = pNotA * probBgivenNotA;
    const pNotA_and_notB = pNotA * pNotBgivenNotA;

    // Total probability P(B)
    const pTotalB = pA_and_B + pNotA_and_B;
    // Bayes formula: P(A|B) = P(A ∩ B) / P(B)
    const pAgivenB = pTotalB > 0 ? pA_and_B / pTotalB : 0;

    return {
      pNotA,
      pNotBgivenA,
      pNotBgivenNotA,
      pA_and_B,
      pA_and_notB,
      pNotA_and_B,
      pNotA_and_notB,
      pTotalB,
      pAgivenB,
    };
  }, [probA, probBgivenA, probBgivenNotA]);

  // 3. Venn Diagram State
  const [vennMode, setVennMode] = useState<'intersection' | 'union' | 'diffA' | 'diffB'>('intersection');

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation Tabs */}
      <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('statistics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'statistics'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Thống kê & Boxplot
          </button>
          <button
            onClick={() => setSubTab('tree')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'tree'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GitFork className="w-4 h-4" /> Sơ đồ cây xác suất
          </button>
          <button
            onClick={() => setSubTab('venn')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'venn'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CircleDot className="w-4 h-4" /> Biểu đồ Venn
          </button>
          <button
            onClick={() => setSubTab('curriculum')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              subTab === 'curriculum'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Kho học liệu SGK 10-11-12
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden md:inline-block">
          Chương trình GDPT 2018 Toán
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: THỐNG KÊ GHÉP NHÓM & BIỂU ĐỒ CỘT & BOXPLOT */}
        {subTab === 'statistics' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-400" />
                  Mẫu số liệu ghép nhóm & Biểu đồ hộp (Boxplot)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tự động tính số trung bình, trung vị, tứ phân vị, phương sai, độ lệch chuẩn và dựng biểu đồ chuẩn sách giáo khoa Toán mới.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={datasetTitle}
                  onChange={(e) => setDatasetTitle(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 w-80 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Frequency Table Input */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    Bảng tần số ghép nhóm
                  </h3>
                  <button
                    onClick={() => {
                      const last = dataRows[dataRows.length - 1];
                      const step = last.upper - last.lower;
                      setDataRows([
                        ...dataRows,
                        {
                          interval: `[${last.upper}; ${last.upper + step})`,
                          lower: last.upper,
                          upper: last.upper + step,
                          mid: last.upper + step / 2,
                          freq: 4,
                        },
                      ]);
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Thêm nhóm
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-2.5">Nhóm</th>
                        <th className="py-2 px-2 text-center">Giá trị đại diện</th>
                        <th className="py-2 px-2 text-center">Tần số (m)</th>
                        <th className="py-2 px-1 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {dataRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2 px-2.5 text-slate-200">{row.interval}</td>
                          <td className="py-2 px-2 text-center text-slate-400">{row.mid}</td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.freq}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const next = [...dataRows];
                                next[idx].freq = val;
                                setDataRows(next);
                              }}
                              className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-amber-400 font-bold"
                            />
                          </td>
                          <td className="py-2 px-1 text-center">
                            {dataRows.length > 2 && (
                              <button
                                onClick={() => setDataRows(dataRows.filter((_, i) => i !== idx))}
                                className="text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Statistical Numerical Metrics */}
                {stats && (
                  <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Cỡ mẫu n:</div>
                      <div className="text-sky-400 font-bold font-mono text-sm">{stats.totalN}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Số trung bình x̄:</div>
                      <div className="text-amber-400 font-bold font-mono text-sm">{stats.mean.toFixed(2)}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Trung vị Me:</div>
                      <div className="text-emerald-400 font-bold font-mono text-sm">{stats.median.toFixed(2)}</div>
                    </div>
                    <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Độ lệch chuẩn s:</div>
                      <div className="text-pink-400 font-bold font-mono text-sm">{stats.stdDev.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Charts Display: Histogram & Boxplot */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Histogram (Biểu đồ cột ghép nhóm) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Biểu đồ tần số ghép nhóm (Histogram)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Trục đứng: Tần số | Trục ngang: Khoảng</span>
                  </div>

                  <div className="h-48 flex items-end gap-3 px-4 pt-4 border-b border-l border-slate-700 bg-slate-950/60 rounded-lg relative">
                    {dataRows.map((row, idx) => {
                      const maxFreq = Math.max(...dataRows.map((r) => r.freq), 1);
                      const heightPercent = (row.freq / maxFreq) * 82;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <span className="text-[10px] font-mono text-amber-300 font-bold mb-1 opacity-90">
                            {row.freq}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-md hover:brightness-110 transition-all shadow-md shadow-sky-600/20"
                          />
                          <span className="text-[9px] font-mono text-slate-400 mt-2 rotate-[-15deg] truncate w-full text-center">
                            {row.interval}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Boxplot (Biểu đồ hộp & râu) */}
                {stats && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Biểu đồ hộp (Box & Whisker Plot)</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Q1={stats.q1.toFixed(1)} | Me={stats.median.toFixed(1)} | Q3={stats.q3.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 relative">
                      <svg viewBox="0 0 500 80" className="w-full h-20 overflow-visible">
                        {/* Scale calculation */}
                        {(() => {
                          const minX = stats.min;
                          const maxX = stats.max;
                          const range = Math.max(maxX - minX, 1);
                          const toX = (val: number) => 30 + ((val - minX) / range) * 440;

                          const xMin = toX(stats.min);
                          const xQ1 = toX(stats.q1);
                          const xMed = toX(stats.median);
                          const xQ3 = toX(stats.q3);
                          const xMax = toX(stats.max);

                          return (
                            <g>
                              {/* Left whisker */}
                              <line x1={xMin} y1="36" x2={xQ1} y2="36" stroke="#94a3b8" strokeWidth="2" />
                              <line x1={xMin} y1="24" x2={xMin} y2="48" stroke="#94a3b8" strokeWidth="2" />

                              {/* Box Q1 to Q3 */}
                              <rect
                                x={xQ1}
                                y="16"
                                width={Math.max(xQ3 - xQ1, 2)}
                                height="40"
                                rx="4"
                                fill="rgba(16, 185, 129, 0.2)"
                                stroke="#10b981"
                                strokeWidth="2"
                              />

                              {/* Median line */}
                              <line x1={xMed} y1="16" x2={xMed} y2="56" stroke="#f59e0b" strokeWidth="3" />

                              {/* Right whisker */}
                              <line x1={xQ3} y1="36" x2={xMax} y2="36" stroke="#94a3b8" strokeWidth="2" />
                              <line x1={xMax} y1="24" x2={xMax} y2="48" stroke="#94a3b8" strokeWidth="2" />

                              {/* Labels */}
                              <text x={xMin} y="68" fill="#94a3b8" fontSize="10" textAnchor="middle" className="font-mono">
                                Min:{stats.min}
                              </text>
                              <text x={xQ1} y="10" fill="#6ee7b7" fontSize="10" textAnchor="middle" className="font-mono">
                                Q1
                              </text>
                              <text x={xMed} y="72" fill="#fcd34d" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                                Me
                              </text>
                              <text x={xQ3} y="10" fill="#6ee7b7" fontSize="10" textAnchor="middle" className="font-mono">
                                Q3
                              </text>
                              <text x={xMax} y="68" fill="#94a3b8" fontSize="10" textAnchor="middle" className="font-mono">
                                Max:{stats.max}
                              </text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SƠ ĐỒ CÂY XÁC SUẤT & BAYES (PROBABILITY TREE) */}
        {subTab === 'tree' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GitFork className="w-5 h-5 text-emerald-400" />
                Sơ đồ hình cây xác suất có điều kiện & Công thức Bayes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mô phỏng cây xác suất 2 tầng theo chuẩn sách giáo khoa Toán 12 mới (Chương Xác suất).
              </p>
            </div>

            {/* Tree Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Xác suất biến cố P(A):</span>
                  <span className="font-mono text-emerald-400 font-bold">{probA.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={probA}
                  onChange={(e) => setProbA(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Xác suất có điều kiện P(B | A):</span>
                  <span className="font-mono text-sky-400 font-bold">{probBgivenA.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={probBgivenA}
                  onChange={(e) => setProbBgivenA(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Xác suất có điều kiện P(B | Ā):</span>
                  <span className="font-mono text-sky-400 font-bold">{probBgivenNotA.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={probBgivenNotA}
                  onChange={(e) => setProbBgivenNotA(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Visual Probability Tree SVG */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto flex items-center justify-center">
              <svg viewBox="0 0 760 320" className="w-full max-w-3xl font-mono text-xs select-none">
                {/* Root node */}
                <circle cx="50" cy="160" r="10" fill="#38bdf8" />
                <text x="50" y="164" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Ω
                </text>

                {/* Level 1 branches */}
                {/* Branch to A */}
                <path d="M 50 160 C 130 160, 150 80, 220 80" fill="none" stroke="#10b981" strokeWidth="2.5" />
                <rect x="110" y="98" width="60" height="20" rx="4" fill="#0f172a" stroke="#10b981" />
                <text x="140" y="112" fill="#6ee7b7" fontSize="10" textAnchor="middle">
                  {probA.toFixed(2)}
                </text>

                {/* Branch to !A */}
                <path d="M 50 160 C 130 160, 150 240, 220 240" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                <rect x="110" y="198" width="60" height="20" rx="4" fill="#0f172a" stroke="#f43f5e" />
                <text x="140" y="212" fill="#fda4af" fontSize="10" textAnchor="middle">
                  {treeProb.pNotA.toFixed(2)}
                </text>

                {/* Node A */}
                <circle cx="220" cy="80" r="16" fill="#10b981" />
                <text x="220" y="85" fill="#0f172a" fontSize="13" fontWeight="bold" textAnchor="middle">
                  A
                </text>

                {/* Node !A */}
                <circle cx="220" cy="240" r="16" fill="#f43f5e" />
                <text x="220" y="245" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">
                  Ā
                </text>

                {/* Level 2 branches from A */}
                {/* A -> B */}
                <path d="M 220 80 C 300 80, 320 40, 420 40" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="310" y="48" fill="#7dd3fc" fontSize="10">
                  P(B|A)={probBgivenA.toFixed(2)}
                </text>
                <circle cx="420" cy="40" r="14" fill="#0284c7" />
                <text x="420" y="44" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                  B
                </text>
                <text x="450" y="44" fill="#e2e8f0" fontSize="11">
                  P(A ∩ B) = <strong className="text-emerald-400">{treeProb.pA_and_B.toFixed(3)}</strong>
                </text>

                {/* A -> !B */}
                <path d="M 220 80 C 300 80, 320 120, 420 120" fill="none" stroke="#64748b" strokeWidth="2" />
                <text x="310" y="112" fill="#94a3b8" fontSize="10">
                  P(B̄|A)={treeProb.pNotBgivenA.toFixed(2)}
                </text>
                <circle cx="420" cy="120" r="14" fill="#475569" />
                <text x="420" y="124" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                  B̄
                </text>
                <text x="450" y="124" fill="#94a3b8" fontSize="11">
                  P(A ∩ B̄) = {treeProb.pA_and_notB.toFixed(3)}
                </text>

                {/* Level 2 branches from !A */}
                {/* !A -> B */}
                <path d="M 220 240 C 300 240, 320 200, 420 200" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <text x="310" y="208" fill="#7dd3fc" fontSize="10">
                  P(B|Ā)={probBgivenNotA.toFixed(2)}
                </text>
                <circle cx="420" cy="200" r="14" fill="#0284c7" />
                <text x="420" y="204" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                  B
                </text>
                <text x="450" y="204" fill="#e2e8f0" fontSize="11">
                  P(Ā ∩ B) = <strong className="text-emerald-400">{treeProb.pNotA_and_B.toFixed(3)}</strong>
                </text>

                {/* !A -> !B */}
                <path d="M 220 240 C 300 240, 320 280, 420 280" fill="none" stroke="#64748b" strokeWidth="2" />
                <text x="310" y="272" fill="#94a3b8" fontSize="10">
                  P(B̄|Ā)={treeProb.pNotBgivenNotA.toFixed(2)}
                </text>
                <circle cx="420" cy="280" r="14" fill="#475569" />
                <text x="420" y="284" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                  B̄
                </text>
                <text x="450" y="284" fill="#94a3b8" fontSize="11">
                  P(Ā ∩ B̄) = {treeProb.pNotA_and_notB.toFixed(3)}
                </text>
              </svg>
            </div>

            {/* Total Prob & Bayes Formula Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="text-xs font-bold text-sky-400">1. Công thức xác suất toàn phần:</div>
                <div className="font-mono text-xs text-slate-300">
                  P(B) = P(A)·P(B|A) + P(Ā)·P(B|Ā)
                </div>
                <div className="text-base font-bold text-emerald-400 font-mono mt-1">
                  P(B) = {treeProb.pTotalB.toFixed(4)}
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="text-xs font-bold text-amber-400">2. Công thức Bayes:</div>
                <div className="font-mono text-xs text-slate-300">
                  P(A | B) = [P(A)·P(B|A)] / P(B)
                </div>
                <div className="text-base font-bold text-amber-400 font-mono mt-1">
                  P(A | B) = {treeProb.pAgivenB.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BIỂU ĐỒ VENN */}
        {subTab === 'venn' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-amber-400" />
                Biểu đồ Venn & Các phép toán tập hợp (Toán 10)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Trực quan hóa phép Giao (∩), Hợp (∪), Hiệu (\) của các tập hợp trong không gian mẫu.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVennMode('intersection')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  vennMode === 'intersection' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Giao A ∩ B
              </button>
              <button
                onClick={() => setVennMode('union')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  vennMode === 'union' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Hợp A ∪ B
              </button>
              <button
                onClick={() => setVennMode('diffA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  vennMode === 'diffA' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Hiệu A \ B
              </button>
              <button
                onClick={() => setVennMode('diffB')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  vennMode === 'diffB' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Hiệu B \ A
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-center">
              <svg viewBox="0 0 500 280" className="w-full max-w-lg select-none">
                {/* Universe Box */}
                <rect x="20" y="20" width="460" height="240" rx="12" fill="#0a0f1d" stroke="#334155" strokeWidth="2" />
                <text x="35" y="44" fill="#64748b" fontSize="12" fontWeight="bold">
                  E (Không gian mẫu)
                </text>

                {/* Circle A */}
                <circle cx="190" cy="140" r="85" fill={vennMode === 'diffA' || vennMode === 'union' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.1)'} stroke="#38bdf8" strokeWidth="2.5" />
                {/* Circle B */}
                <circle cx="310" cy="140" r="85" fill={vennMode === 'diffB' || vennMode === 'union' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.1)'} stroke="#f59e0b" strokeWidth="2.5" />

                {/* Intersection highlight */}
                {vennMode === 'intersection' && (
                  <path
                    d="M 250 78 A 85 85 0 0 1 250 202 A 85 85 0 0 1 250 78 Z"
                    fill="#10b981"
                    className="opacity-60"
                  />
                )}

                {/* Labels */}
                <text x="140" y="145" fill="#bae6fd" fontSize="16" fontWeight="bold">
                  A
                </text>
                <text x="355" y="145" fill="#fde68a" fontSize="16" fontWeight="bold">
                  B
                </text>
                <text x="250" y="145" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">
                  {vennMode === 'intersection' ? 'A ∩ B' : ''}
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* TAB 4: KHO HỌC LIỆU SGK 10-11-12 */}
        {subTab === 'curriculum' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Kho học liệu chuyên đề GDPT 2018 Toán
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Các chuyên đề cấu trúc sẵn theo từng khối lớp để giáo viên sử dụng trong tiết dạy và soạn giáo án.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lớp 10 */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="px-2.5 py-1 bg-sky-500/20 text-sky-400 font-bold text-xs rounded-lg inline-block">
                  Toán Lớp 10
                </div>
                <h3 className="text-sm font-bold text-white">Hình học & Thống kê cơ bản</h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Hệ thức lượng trong tam giác
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Vectơ và tọa độ phẳng Oxy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Số đặc trưng đo xu thế trung tâm
                  </li>
                </ul>
              </div>

              {/* Lớp 11 */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-lg inline-block">
                  Toán Lớp 11
                </div>
                <h3 className="text-sm font-bold text-white">Hình học không gian & Cắt thiết diện</h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Quan hệ song song & vuông góc 3D
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Cắt thiết diện hình chóp qua 3 điểm
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Thống kê mẫu số liệu ghép nhóm
                  </li>
                </ul>
              </div>

              {/* Lớp 12 */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="px-2.5 py-1 bg-amber-500/20 text-amber-400 font-bold text-xs rounded-lg inline-block">
                  Toán Lớp 12
                </div>
                <h3 className="text-sm font-bold text-white">Giải tích, Oxyz & Xác suất có điều kiện</h3>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Khảo sát hàm số & tham số m
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Mặt cầu ngoại tiếp khối đa diện
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Công thức xác suất toàn phần & Bayes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
