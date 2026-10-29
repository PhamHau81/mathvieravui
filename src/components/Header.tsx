import React from 'react';
import {
  Box,
  Compass,
  TrendingUp,
  BarChart3,
  PenTool,
  Terminal,
  Download,
  Sparkles,
  RotateCw,
  Settings,
  Key,
} from 'lucide-react';
import { ActiveModule } from '../types/math';

interface HeaderProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  onOpenPrompts: () => void;
  onOpenExport: () => void;
  onOpenApiKeySettings: () => void;
  onOpenAiAssistant: () => void;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  onSelectModule,
  onOpenPrompts,
  onOpenExport,
  onOpenApiKeySettings,
  onOpenAiAssistant,
  hasApiKey,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-3 md:px-6 flex items-center justify-between text-slate-100 z-40 select-none">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              TOÁN HỌC TƯƠNG TÁC <span className="text-amber-400 font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">_ PHẠM HẬU</span>
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-medium">
              GDPT 2018
            </span>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Không gian hình học động & Bảng toán tương tác
          </p>
        </div>
      </div>

      {/* 6 Core Modules Nav Tabs */}
      <nav className="flex items-center gap-1 bg-slate-950/70 border border-slate-800/80 p-1 rounded-xl shadow-inner">
        <button
          onClick={() => onSelectModule('3d-geometry')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeModule === '3d-geometry'
              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span className="hidden md:inline">1. Không gian 3D</span>
          <span className="md:hidden">3D</span>
        </button>

        <button
          onClick={() => onSelectModule('revolution')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeModule === 'revolution'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
              : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
          }`}
          title="Tạo mặt tròn xoay từ đường sinh và trục xoay"
        >
          <RotateCw className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
          <span className="hidden md:inline">2. Mặt tròn xoay</span>
          <span className="md:hidden">Mặt xoay</span>
        </button>

        <button
          onClick={() => onSelectModule('2d-geometry')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeModule === '2d-geometry'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden md:inline">3. Hình phẳng 2D</span>
          <span className="md:hidden">2D</span>
        </button>

        <button
          onClick={() => onSelectModule('graphing')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeModule === 'graphing'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="hidden md:inline">4. Đồ thị hàm số</span>
          <span className="md:hidden">Đồ thị</span>
        </button>

        <button
          onClick={() => onSelectModule('analytics')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeModule === 'analytics'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">5. Thống kê & Sơ đồ</span>
          <span className="md:hidden">Thống kê</span>
        </button>

        <button
          onClick={() => onSelectModule('whiteboard')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeModule === 'whiteboard'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="hidden md:inline">6. Bảng trắng</span>
          <span className="md:hidden">Bảng</span>
        </button>
      </nav>

      {/* Right Utilities: Settings (API Key) with Red Warning Text, AI Solver, Prompts & Export */}
      <div className="flex items-center gap-2">
        {/* Settings (API Key) Button - Mandated to ALWAYS display with red text by AI_INSTRUCTIONS.md */}
        <button
          onClick={onOpenApiKeySettings}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 rounded-xl border border-slate-700/80 shadow-sm transition-all group"
          title="Thiết lập Model AI & Gemini API Key (Bấm để thay đổi key khi hết quota)"
        >
          <Settings className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
          <div className="flex flex-col items-start leading-none text-left">
            <div className="flex items-center gap-1 text-[11px] font-bold text-white">
              <span>Settings (API Key)</span>
              {hasApiKey ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Đã có API Key" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" title="Chưa có API Key" />
              )}
            </div>
            <span className="text-[9px] font-semibold text-rose-400 group-hover:text-rose-300">
              Lấy API key để sử dụng app
            </span>
          </div>
        </button>

        {/* AI Solver Button */}
        <button
          onClick={onOpenAiAssistant}
          className="px-2.5 py-1.5 bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 text-sky-300 text-xs font-semibold rounded-xl border border-sky-500/30 flex items-center gap-1.5 transition-all shadow-sm"
          title="AI Gia sư giải toán & Dựng hình không gian"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden xl:inline">AI Giải Toán</span>
        </button>

        <button
          onClick={onOpenPrompts}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700/80 flex items-center gap-1.5 transition-all shadow-sm"
          title="Xem bộ Prompt chuẩn xây dựng phần mềm (Phần 2)"
        >
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden 2xl:inline">Bộ Prompt AI (Phần 2)</span>
        </button>

        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-sky-600/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xuất bản</span>
        </button>
      </div>
    </header>
  );
};
