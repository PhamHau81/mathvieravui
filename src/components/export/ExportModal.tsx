import React from 'react';
import { X, Download, Printer, FileText, Image, Check } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  activeModuleName,
}) => {
  if (!isOpen) return null;

  const handleCaptureScreen = () => {
    // Take screenshot of canvas or current screen
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length > 0) {
      const activeCanvas = canvases[0];
      const link = document.createElement('a');
      link.download = `ToanHocTuongTac-PhamHau-${activeModuleName}-${Date.now()}.png`;
      link.href = activeCanvas.toDataURL('image/png');
      link.click();
    } else {
      window.print();
    }
    onClose();
  };

  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" /> Xuất bản bài giảng & Tài liệu
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Xuất không gian làm việc hiện tại (<strong>{activeModuleName}</strong>) sang định dạng phù hợp để đưa vào giáo án điện tử hoặc in ấn cho học sinh.
        </p>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleCaptureScreen}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left flex items-center gap-3 transition-colors"
          >
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Xuất ảnh chất lượng cao (PNG)</div>
              <div className="text-[11px] text-slate-400">Độ phân giải chuẩn, chèn nhanh vào Word / PowerPoint</div>
            </div>
          </button>

          <button
            onClick={handlePrint}
            className="w-full p-3 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-left flex items-center gap-3 transition-colors"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">In ấn / Lưu thành file PDF</div>
              <div className="text-[11px] text-slate-400">Chuẩn khổ giấy A4 cho bài tập hoặc phiếu học tập</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
