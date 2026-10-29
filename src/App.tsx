import React, { useState, useEffect } from 'react';
import { ActiveModule } from './types/math';
import { Header } from './components/Header';
import { StereoGeometry3D } from './components/3d/StereoGeometry3D';
import { RevolutionSurface3D } from './components/3d/RevolutionSurface3D';
import { PlaneGeometry2D } from './components/2d/PlaneGeometry2D';
import { GraphingEngine } from './components/algebra/GraphingEngine';
import { AnalyticsTemplates } from './components/analytics/AnalyticsTemplates';
import { WhiteboardCanvas } from './components/whiteboard/WhiteboardCanvas';
import { PromptLibraryModal } from './components/prompts/PromptLibraryModal';
import { ExportModal } from './components/export/ExportModal';
import { ApiKeyModal } from './components/auth/ApiKeyModal';
import { AiMathAssistantModal } from './components/ai/AiMathAssistantModal';
import { getStoredApiKey } from './services/geminiService';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('3d-geometry');
  const [isPromptsOpen, setIsPromptsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Check API Key on initial mount and prompt if missing
  useEffect(() => {
    const key = getStoredApiKey();
    setHasApiKey(Boolean(key));
    if (!key) {
      // Auto open modal if no key is configured yet
      setIsApiKeyModalOpen(true);
    }
  }, []);

  const handleKeySaved = () => {
    const key = getStoredApiKey();
    setHasApiKey(Boolean(key));
  };

  const getModuleName = (mod: ActiveModule) => {
    switch (mod) {
      case '3d-geometry':
        return 'Hình học không gian 3D';
      case 'revolution':
        return 'Mặt tròn xoay từ đường sinh & trục';
      case '2d-geometry':
        return 'Hình học phẳng 2D';
      case 'graphing':
        return 'Đại số & Đồ thị hàm số';
      case 'analytics':
        return 'Thống kê & Sơ đồ xác suất';
      case 'whiteboard':
        return 'Bảng trắng tương tác';
      default:
        return 'Toán học';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Global Application Header */}
      <Header
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenPrompts={() => setIsPromptsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenApiKeySettings={() => setIsApiKeyModalOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        hasApiKey={hasApiKey}
      />

      {/* Main Workspace based on active module */}
      <main className="flex-1 relative overflow-hidden">
        {activeModule === '3d-geometry' && (
          <StereoGeometry3D onSwitchToRevolution={() => setActiveModule('revolution')} />
        )}
        {activeModule === 'revolution' && <RevolutionSurface3D />}
        {activeModule === '2d-geometry' && <PlaneGeometry2D />}
        {activeModule === 'graphing' && <GraphingEngine />}
        {activeModule === 'analytics' && <AnalyticsTemplates />}
        {activeModule === 'whiteboard' && <WhiteboardCanvas />}
      </main>

      {/* AI Prompt Architecture & Documentation Modal (Part 2) */}
      <PromptLibraryModal
        isOpen={isPromptsOpen}
        onClose={() => setIsPromptsOpen(false)}
      />

      {/* Export / Print Dialog */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        activeModuleName={getModuleName(activeModule)}
      />

      {/* Model & Gemini API Key Settings Modal (Strict AI_INSTRUCTIONS.md) */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        isMandatory={false}
        onKeySaved={handleKeySaved}
      />

      {/* 3-Step AI Math Solver & Geometry Assistant */}
      <AiMathAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onOpenSettings={() => setIsApiKeyModalOpen(true)}
      />
    </div>
  );
}
