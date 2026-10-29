/**
 * Gemini AI Service with Multi-Model Fallback & Auto-Retry
 * Compliant with AI_INSTRUCTIONS.md:
 * - Default & Fallback models:
 *   1. gemini-3-flash-preview (Default)
 *   2. gemini-3-pro-preview
 *   3. gemini-2.5-flash
 * - Auto-retry next model on API error (e.g. 429 RESOURCE_EXHAUSTED)
 * - Exact error extraction & status management
 */

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  tag: string;
  isDefault?: boolean;
}

export const AI_MODELS: ModelOption[] = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Tốc độ siêu nhanh, tối ưu cho phản hồi tức thì và bài toán cơ bản.',
    tag: 'Mặc định (Default)',
    isDefault: true,
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Khả năng suy luận toán học chuyên sâu, phân tích hình không gian phức tạp.',
    tag: 'Chuyên sâu (Pro)',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Mô hình dự phòng ổn định cao, độ tin cậy vượt trội khi quá tải.',
    tag: 'Dự phòng (Fallback)',
  },
];

export const STORAGE_KEY_API_KEY = 'gemini_api_key';
export const STORAGE_KEY_MODEL = 'gemini_selected_model';

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY_API_KEY) || '';
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
}

export function removeStoredApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_API_KEY);
}

export function getStoredModel(): string {
  if (typeof window === 'undefined') return 'gemini-3-flash-preview';
  return localStorage.getItem(STORAGE_KEY_MODEL) || 'gemini-3-flash-preview';
}

export function setStoredModel(model: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MODEL, model);
}

export interface GenerationStepResult {
  step: number;
  title: string;
  output: string;
  modelUsed: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

export interface FallbackCallCallbacks {
  onStepProgress?: (step: number, status: 'running' | 'success' | 'failed', message?: string) => void;
  onModelFallback?: (fromModel: string, toModel: string, reason: string) => void;
}

/**
 * Call Gemini API with automatic fallback through the model chain
 */
export async function generateContentWithFallback(
  prompt: string,
  systemInstruction?: string,
  callbacks?: FallbackCallCallbacks
): Promise<{ text: string; modelUsed: string; fallbackOccurred: boolean }> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('CHƯA_CÓ_API_KEY');
  }

  const userModel = getStoredModel();
  // Build fallback order starting from userModel, then rest in order
  const remaining = AI_MODELS.map((m) => m.id).filter((id) => id !== userModel);
  const modelChain = [userModel, ...remaining];

  let lastError: Error | null = null;
  let fallbackOccurred = false;

  for (let i = 0; i < modelChain.length; i++) {
    const currentModel = modelChain[i];
    try {
      const text = await executeGeminiRequest(currentModel, apiKey, prompt, systemInstruction);
      return {
        text,
        modelUsed: currentModel,
        fallbackOccurred,
      };
    } catch (err: any) {
      lastError = err;
      const errorMsg = err?.message || String(err);

      // Check if there is a next model to fallback to
      if (i < modelChain.length - 1) {
        fallbackOccurred = true;
        const nextModel = modelChain[i + 1];
        if (callbacks?.onModelFallback) {
          callbacks.onModelFallback(currentModel, nextModel, errorMsg);
        }
      }
    }
  }

  // All models failed: throw exact API error
  throw lastError || new Error('Lỗi không xác định khi gọi Gemini API');
}

/**
 * Raw REST call to Google Generative Language API
 */
async function executeGeminiRequest(
  model: string,
  apiKey: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const body: any = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorDetails = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData?.error?.message) {
        errorDetails = `${errData.error.status || response.status}: ${errData.error.message}`;
      }
    } catch (e) {
      // ignore JSON parse error
    }
    throw new Error(errorDetails);
  }

  const data = await response.json();
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    if (data?.candidates?.[0]?.finishReason) {
      throw new Error(`Phản hồi bị chặn hoặc kết thúc bất thường: ${data.candidates[0].finishReason}`);
    }
    throw new Error('API không trả về nội dung hợp lệ.');
  }

  return candidateText;
}
