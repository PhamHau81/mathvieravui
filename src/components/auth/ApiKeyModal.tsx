import React, { useState, useEffect } from 'react';
import {
  Key,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  X,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AI_MODELS,
  getStoredApiKey,
  setStoredApiKey,
  removeStoredApiKey,
  getStoredModel,
  setStoredModel,
  generateContentWithFallback,
} from '../../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMandatory?: boolean;
  onKeySaved?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  isMandatory = false,
  onKeySaved,
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setSelectedModel(getStoredModel());
      setTestResult({ status: 'idle' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!apiKey.trim()) {
      setTestResult({
        status: 'error',
        message: 'Vui lòng nhập API Key hợp lệ từ Google AI Studio.',
      });
      return;
    }
    setStoredApiKey(apiKey.trim());
    setStoredModel(selectedModel);
    setTestResult({
      status: 'success',
      message: 'Đã lưu cấu hình API Key & Model thành công!',
    });
    if (onKeySaved) onKeySaved();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleRemove = () => {
    removeStoredApiKey();
    setApiKey('');
    setTestResult({
      status: 'idle',
      message: 'Đã xóa API Key khỏi bộ nhớ trình duyệt.',
    });
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        status: 'error',
        message: 'Vui lòng nhập API Key trước khi kiểm tra kết nối.',
      });
      return;
    }
    setIsTesting(true);
    setTestResult({ status: 'idle' });

    // Temporarily save to test
    setStoredApiKey(apiKey.trim());
    setStoredModel(selectedModel);

    try {
      const res = await generateContentWithFallback(
        'Hãy trả lời ngắn gọn đúng 1 từ: "Sẵn sàng!" để kiểm tra kết nối API.'
      );
      setTestResult({
        status: 'success',
        message: `Kết nối thành công với ${res.modelUsed}: "${res.text.trim()}"`,
      });
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Lỗi kết nối: ${err?.message || String(err)}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Thiết Lập Model & Gemini API Key</h2>
              <p className="text-[11px] text-slate-400">
                Tự cấu hình API Key cá nhân để chạy toàn bộ các tính năng AI
              </p>
            </div>
          </div>
          {!isMandatory && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-slate-700">
          {/* Guide Banner */}
          <div className="p-3.5 bg-gradient-to-r from-sky-950/50 to-indigo-950/50 rounded-xl border border-sky-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-300 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Chưa có API Key? Lấy miễn phí tại Google AI Studio
              </span>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[10px] rounded-lg transition-colors shadow-sm"
              >
                <span>Lấy key ngay</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Truy cập <strong className="text-sky-300">https://aistudio.google.com/api-keys</strong>, đăng nhập tài khoản Google và nhấn <strong className="text-white">&quot;Create API Key&quot;</strong> để tạo key hoàn toàn miễn phí.
            </p>
          </div>

          {/* API Key Input Field */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Google Gemini API Key:</span>
              <span className="text-[10px] font-normal text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Lưu bảo mật trên trình duyệt (LocalStorage)
              </span>
            </label>

            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dán mã API key (bắt đầu bằng AIzaSy...)"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title={showKey ? 'Ẩn key' : 'Hiện key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800 transition-colors"
                    title="Xóa key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 1. MODEL SELECTION CARDS (Thứ tự hiển thị chuẩn AI_INSTRUCTIONS.md) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Chọn Model AI Chính & Thứ Tự Fallback</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">3 Model hỗ trợ</span>
            </div>

            <div className="space-y-2">
              {AI_MODELS.map((model, idx) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedModel === model.id
                      ? 'bg-sky-950/40 border-sky-400/80 shadow-md shadow-sky-500/10'
                      : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700'
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedModel === model.id
                          ? 'border-sky-400 bg-sky-400'
                          : 'border-slate-600 bg-transparent'
                      }`}
                    >
                      {selectedModel === model.id && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs text-white truncate">{model.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                          idx === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : idx === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {model.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{model.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fallback & Retry Mechanism Info */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Cơ chế Tự Động Chuyển Đổi (Fallback & Retry)</span>
            </div>
            <p>
              Nếu model được chọn gặp lỗi hoặc hết hạn mức (<code className="text-rose-400 font-mono">429 RESOURCE_EXHAUSTED</code>), hệ thống sẽ <strong>tự động chuyển ngay</strong> sang model tiếp theo trong danh sách:
            </p>
            <div className="font-mono text-[10px] text-sky-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 flex items-center gap-1.5">
              <span>gemini-3-flash-preview</span>
              <span>→</span>
              <span>gemini-3-pro-preview</span>
              <span>→</span>
              <span>gemini-2.5-flash</span>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult.status !== 'idle' && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                testResult.status === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !apiKey.trim()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            {isTesting ? (
              <>
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Đang thử...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Kiểm tra kết nối</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors"
              >
                Đóng
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Thiết Lập</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
