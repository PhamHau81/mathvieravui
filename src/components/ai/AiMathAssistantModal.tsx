import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Layers,
  ArrowRight,
  Zap,
  Key,
} from 'lucide-react';
import {
  AI_MODELS,
  getStoredApiKey,
  getStoredModel,
  generateContentWithFallback,
} from '../../services/geminiService';

interface AiMathAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface StepState {
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  modelUsed?: string;
  output?: string;
  error?: string;
}

export const AiMathAssistantModal: React.FC<AiMathAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [problemInput, setProblemInput] = useState<string>(
    'Cho hình chóp tam giác S.ABC có đáy ABC là tam giác đều cạnh a, SA vuông góc với mặt phẳng (ABC), SA = 2a. Tính thể tích khối chóp S.ABC và diện tích xung quanh của mặt nón tròn xoay đỉnh S đáy là đường tròn ngoại tiếp tam giác ABC.'
  );

  const [steps, setSteps] = useState<StepState[]>([
    {
      step: 1,
      title: 'Bước 1: Phân tích & Trích xuất Dữ kiện',
      description: 'Nhận diện hình khối, đỉnh, đáy, chân đường cao và các thông số a, h, R.',
      status: 'pending',
    },
    {
      step: 2,
      title: 'Bước 2: Lập luận Dựng hình & Tính toán',
      description: 'Dựng mặt phẳng, xác định đường sinh l, bán kính r và thiết lập công thức.',
      status: 'pending',
    },
    {
      step: 3,
      title: 'Bước 3: Lời giải Chi tiết & Kết luận',
      description: 'Tổng hợp kết quả thể tích V, diện tích S_xq chuẩn kỳ thi tốt nghiệp THPT.',
      status: 'pending',
    },
  ]);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [activeModelChainLog, setActiveModelChainLog] = useState<string[]>([]);

  if (!isOpen) return null;

  // Calculate overall progress percentage
  const successfulSteps = steps.filter((s) => s.status === 'success').length;
  const progressPercent = Math.round((successfulSteps / steps.length) * 100);

  const handleStartSolving = async () => {
    const apiKey = getStoredApiKey();
    if (!apiKey) {
      onOpenSettings();
      return;
    }

    if (!problemInput.trim()) return;

    setIsRunning(true);
    setGlobalError(null);
    setActiveModelChainLog([]);

    // Reset steps to pending
    const initialSteps: StepState[] = [
      {
        step: 1,
        title: 'Bước 1: Phân tích & Trích xuất Dữ kiện',
        description: 'Nhận diện hình khối, đỉnh, đáy, chân đường cao và các thông số a, h, R.',
        status: 'pending',
      },
      {
        step: 2,
        title: 'Bước 2: Lập luận Dựng hình & Tính toán',
        description: 'Dựng mặt phẳng, xác định đường sinh l, bán kính r và thiết lập công thức.',
        status: 'pending',
      },
      {
        step: 3,
        title: 'Bước 3: Lời giải Chi tiết & Kết luận',
        description: 'Tổng hợp kết quả thể tích V, diện tích S_xq chuẩn kỳ thi tốt nghiệp THPT.',
        status: 'pending',
      },
    ];
    setSteps(initialSteps);

    let step1Output = '';
    let step2Output = '';

    // --- EXECUTE STEP 1 ---
    try {
      setSteps((prev) =>
        prev.map((s) => (s.step === 1 ? { ...s, status: 'running', error: undefined } : s))
      );

      const prompt1 = `Bạn là chuyên gia sư phạm Toán THPT. Dưới đây là bài toán:
"${problemInput}"
BƯỚC 1: Hãy phân tích đề bài, trích xuất:
- Khối hình học chính (chóp, nón, trụ, cầu, v.v.)
- Đỉnh, đáy, chân đường cao, các cạnh và thông số đã cho
- Yêu cầu chính của bài toán.
Viết ngắn gọn, cô đọng dưới dạng gạch đầu dòng rõ ràng.`;

      const res1 = await generateContentWithFallback(prompt1, undefined, {
        onModelFallback: (from, to, reason) => {
          setActiveModelChainLog((prev) => [
            ...prev,
            `[Bước 1] Chuyển đổi fallback: ${from} → ${to} do lỗi: ${reason}`,
          ]);
        },
      });

      step1Output = res1.text;
      setSteps((prev) =>
        prev.map((s) =>
          s.step === 1
            ? { ...s, status: 'success', output: res1.text, modelUsed: res1.modelUsed }
            : s
        )
      );
    } catch (err: any) {
      handlePipelineFailure(1, err);
      return;
    }

    // --- EXECUTE STEP 2 ---
    try {
      setSteps((prev) =>
        prev.map((s) => (s.step === 2 ? { ...s, status: 'running', error: undefined } : s))
      );

      const prompt2 = `Dựa vào dữ kiện Bước 1 đã phân tích:
${step1Output}
BƯỚC 2: Hãy dựng hình và tính toán các đại lượng hình học cần thiết:
- Chiều cao h, diện tích đáy B
- Bán kính đáy R (nếu có mặt nón / trụ / cầu), độ dài đường sinh l
- Lập công thức toán học và thay số chi tiết.`;

      const res2 = await generateContentWithFallback(prompt2, undefined, {
        onModelFallback: (from, to, reason) => {
          setActiveModelChainLog((prev) => [
            ...prev,
            `[Bước 2] Chuyển đổi fallback: ${from} → ${to} do lỗi: ${reason}`,
          ]);
        },
      });

      step2Output = res2.text;
      setSteps((prev) =>
        prev.map((s) =>
          s.step === 2
            ? { ...s, status: 'success', output: res2.text, modelUsed: res2.modelUsed }
            : s
        )
      );
    } catch (err: any) {
      handlePipelineFailure(2, err);
      return;
    }

    // --- EXECUTE STEP 3 ---
    try {
      setSteps((prev) =>
        prev.map((s) => (s.step === 3 ? { ...s, status: 'running', error: undefined } : s))
      );

      const prompt3 = `Dựa vào kết quả các bước trước:
${step1Output}
${step2Output}
BƯỚC 3: Hãy viết lời giải hoàn chỉnh chuẩn sư phạm SGK 12, kết luận rõ ràng đáp số thể tích V và diện tích xung quanh S_xq, kèm lời khuyên ghi nhớ hình vẽ cho học sinh.`;

      const res3 = await generateContentWithFallback(prompt3, undefined, {
        onModelFallback: (from, to, reason) => {
          setActiveModelChainLog((prev) => [
            ...prev,
            `[Bước 3] Chuyển đổi fallback: ${from} → ${to} do lỗi: ${reason}`,
          ]);
        },
      });

      setSteps((prev) =>
        prev.map((s) =>
          s.step === 3
            ? { ...s, status: 'success', output: res3.text, modelUsed: res3.modelUsed }
            : s
        )
      );
    } catch (err: any) {
      handlePipelineFailure(3, err);
      return;
    }

    setIsRunning(false);
  };

  /**
   * Handle failure compliance with AI_INSTRUCTIONS.md:
   * - Display verbatim API error (e.g. 429 RESOURCE_EXHAUSTED).
   * - Transition all pending steps to "Đã dừng do lỗi", NEVER green checkmark or completed.
   */
  const handlePipelineFailure = (failedStep: number, error: any) => {
    setIsRunning(false);
    const verbatimError = error?.message || String(error);
    setGlobalError(verbatimError);

    setSteps((prev) =>
      prev.map((s) => {
        if (s.step === failedStep) {
          return { ...s, status: 'failed', error: verbatimError };
        }
        if (s.step > failedStep) {
          return { ...s, status: 'failed', error: 'Đã dừng do lỗi ở bước trước' };
        }
        return s; // Keep earlier successful steps untouched
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>AI Trợ Lý Giải Toán & Dựng Hình 3D</span>
                <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded">
                  Quy trình 3 Bước Chuẩn GDPT 2018
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Tự động suy luận, trích xuất dữ kiện và hỗ trợ cơ chế Multi-Model Fallback
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Cấu hình Model & API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cài đặt API Key</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-130px)] scrollbar-thin scrollbar-thumb-slate-700">
          {/* Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nhập hoặc dán đề bài toán hình học / giải tích:
              </label>
              <span className="text-[11px] text-slate-400">
                Model chính: <strong className="text-cyan-400">{getStoredModel()}</strong>
              </span>
            </div>
            <textarea
              rows={3}
              value={problemInput}
              onChange={(e) => setProblemInput(e.target.value)}
              placeholder="Nhập đề bài toán..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors leading-relaxed"
            />
          </div>

          {/* Action & Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={handleStartSolving}
                disabled={isRunning || !problemInput.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>AI Đang Xử Lý Quy Trình 3 Bước...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bắt Đầu Giải Toán & Dựng Hình</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">Tiến trình:</span>
                <span
                  className={`font-bold ${
                    progressPercent === 100
                      ? 'text-emerald-400'
                      : globalError
                      ? 'text-rose-400'
                      : 'text-sky-400'
                  }`}
                >
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Progress Bar (Only green when successfully finished) */}
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  progressPercent === 100
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : globalError
                    ? 'bg-rose-500'
                    : 'bg-sky-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Fallback Transition Notifications */}
          {activeModelChainLog.length > 0 && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-1 text-xs text-amber-300 font-mono">
              <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Nhật Ký Tự Động Chuyển Đổi Fallback:</span>
              </div>
              {activeModelChainLog.map((log, idx) => (
                <div key={idx} className="text-[11px] leading-relaxed">
                  • {log}
                </div>
              ))}
            </div>
          )}

          {/* Global Verbatim Error Box (Mandated by Section 3) */}
          {globalError && (
            <div className="p-4 bg-rose-950/60 border border-rose-500/80 rounded-xl space-y-2 text-rose-200">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Thông Báo Lỗi Trực Tiếp Từ Gemini API:</span>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg font-mono text-xs text-rose-300 break-all border border-rose-900/60">
                {globalError}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Trạng thái: Toàn bộ các bước sau đã dừng do lỗi.</span>
                <button
                  onClick={onOpenSettings}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Đổi API Key khác tại đây →
                </button>
              </div>
            </div>
          )}

          {/* 3 STEP COLUMNS / CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {steps.map((st) => (
              <div
                key={st.step}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  st.status === 'success'
                    ? 'bg-slate-900/90 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                    : st.status === 'running'
                    ? 'bg-sky-950/30 border-sky-400 animate-pulse'
                    : st.status === 'failed'
                    ? 'bg-rose-950/30 border-rose-500/70'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">{st.title}</span>
                    <div>
                      {st.status === 'success' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Hoàn tất
                        </span>
                      )}
                      {st.status === 'running' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full animate-pulse">
                          <Clock className="w-3 h-3" /> Đang chạy...
                        </span>
                      )}
                      {st.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Đã dừng do lỗi
                        </span>
                      )}
                      {st.status === 'pending' && (
                        <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">
                          Đang chờ
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                    {st.description}
                  </p>

                  {/* Model badge */}
                  {st.modelUsed && (
                    <div className="mb-2 text-[10px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/40 px-2 py-0.5 rounded inline-block">
                      Model: {st.modelUsed}
                    </div>
                  )}

                  {/* Output Display */}
                  {st.output && (
                    <div className="mt-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans scrollbar-thin scrollbar-thumb-slate-800">
                      {st.output}
                    </div>
                  )}

                  {/* Step Error Display */}
                  {st.error && (
                    <div className="mt-2 p-2 bg-rose-950/50 rounded border border-rose-900/60 text-[10px] text-rose-300 font-mono">
                      {st.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Hệ thống AI tuân thủ cơ chế Fallback: 3 Flash → 3 Pro → 2.5 Flash</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
