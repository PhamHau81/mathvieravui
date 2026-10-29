import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  Cpu,
  Layers,
  Sparkles,
  BookOpen,
  Terminal,
} from 'lucide-react';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const prompts = [
    {
      id: 'prompt-1',
      title: 'Prompt 1: Xây dựng Kiến trúc Tổng thể (System Architecture)',
      role: 'Senior Software Architect & EdTech Product Manager',
      content: `Role: Bạn là một Senior Software Architect và EdTech Product Manager chuyên nghiệp.
Task: Hãy thiết kế tài liệu kiến trúc hệ thống tổng thể cho một ứng dụng web mô phỏng toán học tương tác trực tuyến (dạng bảng thông minh cho giáo viên toán, hoạt động tương tự phần mềm Math Viera trong video).
Requirements:
1. Đề xuất Tech Stack phù hợp: React / TypeScript cho Frontend, Three.js / WebGL cho xử lý đồ họa hình học 3D, Canvas 2D / SVG cho hình học phẳng và bảng biến thiên.
2. Thiết kế 5 Module chính:
   - Module 1: Không gian 3D (Spatial Geometry: cắt thiết diện, tách khối 2D, nét đứt nét liền, mặt cầu ngoại tiếp, khai triển khối).
   - Module 2: Hệ tọa độ 2D (Plane Geometry: tam giác động, đường tròn ngoại tiếp, trực tâm, đường cao tự động, ký hiệu góc vuông).
   - Module 3: Đồ thị hàm số & Giải tích (Graphing Calculator: tham số m trôi động, cực trị, tiệm cận, bảng biến thiên chuẩn SGK).
   - Module 4: Thống kê & Sơ đồ (Grouped data statistics, sơ đồ cây xác suất, biểu đồ Venn, kho học liệu).
   - Module 5: Bảng trắng tương tác (Whiteboard: bút vẽ mượt, dạ quang, thước kẻ, ghi chú, xuất ảnh PNG/PDF).
3. Mô tả cơ chế "Dynamic Binding" (liên kết động giữa các đối tượng hình học: kéo đỉnh thay đổi thiết diện, trọng tâm, mặt cầu, thanh trượt tham số m trên đồ thị).`,
    },
    {
      id: 'prompt-2',
      title: 'Prompt 2: Phát triển Hình học không gian 3D (3D Stereo-Geometry & Section Detach)',
      role: 'Chuyên gia Fullstack Developer & Computational Geometry (Three.js)',
      content: `Role: Bạn là một chuyên gia Fullstack Developer am hiểu về Three.js và thuật toán hình học không gian (Computational Geometry).
Task: Viết thuật toán và mã nguồn mẫu cho tính năng "Cắt thiết diện và tách khối 3D" giống như trong phần mềm dạy toán Math Viera.
Logic yêu cầu:
1. Cho phép dựng các khối hình chóp (tam giác S.ABC, tứ giác S.ABCD, ngũ giác S.ABCDE) với các đỉnh có thể kéo thả tương tác trên màn hình.
2. Tự động nhận diện nét thấy / nét khuất (đường nét đứt chuẩn sư phạm SGK Việt Nam).
3. Người dùng chọn 3 điểm (hoặc 3 tỉ lệ trung điểm trên cạnh bên) để tạo mặt phẳng cắt (α).
4. Hệ thống tự động tính toán giao tuyến của mặt phẳng với các mặt khối chóp, xác định đa giác thiết diện, tự động tô màu thiết diện.
5. Tạo một viewport song song để "tách rời" (detach) thiết diện đó ra một hình phẳng 2D độc lập không bị méo góc, đồng thời duy trì liên kết động hai chiều (khi khối 3D thay đổi, hình 2D tách rời cập nhật theo).
6. Tích hợp tính năng tự động tìm tâm và vẽ mặt cầu ngoại tiếp tứ diện, cùng nút bấm khai triển không gian (3D Unfolding).`,
    },
    {
      id: 'prompt-3',
      title: 'Prompt 3: Đồ thị động, Tham số M & Bảng Biến Thiên Chuẩn SGK',
      role: 'Frontend Engineer chuyên về Trực quan hóa Dữ liệu & Toán học',
      content: `Role: Bạn là một Frontend Engineer chuyên về trực quan hóa dữ liệu và toán học.
Task: Thiết kế giao diện và logic xử lý cho module "Khảo sát hàm số và đồ thị động có tham số M".
Requirements:
1. Cho phép người dùng nhập biểu thức hàm số chứa tham số M (ví dụ: y = x³ - 3mx + 2, y = (x + m)/(x - 1), y = x⁴ - 2mx² + 1).
2. Tự động nhận diện tham số và sinh ra thanh trượt (Slider) điều chỉnh giá trị M theo thời gian thực (real-time rendering) kèm nút Play/Pause trôi tham số.
3. Tự động hiển thị các điểm đặc biệt: Cực đại, cực tiểu, điểm uốn, giao điểm trục tọa độ, và các đường tiệm cận đứng/ngang.
4. Tích hợp nút bấm xuất "Bảng biến thiên" chuẩn sách giáo khoa Toán 12 (hàng x với -∞, +∞, các nghiệm cực trị; hàng y' với dấu +, -, số 0 hoặc ||; hàng y với các mũi tên chéo biến thiên và giá trị cực trị).
5. Soạn thảo công thức toán nhanh và hỗ trợ dán đề thi Word trực tiếp lên bảng.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Bộ Prompt Chuẩn Xây Dựng Hệ Thống (Phần 2)
              </h2>
              <p className="text-xs text-slate-400">
                Tài liệu kỹ thuật & Prompt mẫu chuyên nghiệp cho Software Architect, 3D Geometry & Dynamic Graphing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-6">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-sky-300">{p.title}</h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Vai trò: <strong className="text-amber-400">{p.role}</strong>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(p.id, p.content)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    copiedId === p.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {copiedId === p.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" /> Đã sao chép!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Sao chép Prompt
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800/80 max-h-52 overflow-y-auto">
                {p.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
