import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng thiết lập trong mục Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'API key không hợp lệ hoặc chưa đủ quyền truy cập mô hình này. Vui lòng kiểm tra lại trong mục Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Đã vượt quá hạn mức miễn phí hoặc mô hình này yêu cầu API key trả phí (billing-enabled). Bạn có thể chọn API key trả phí trong Settings > Secrets hoặc thử lại sau.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: `Mô hình không khả dụng hoặc không được hỗ trợ cho tài khoản hiện tại (${raw}).`,
    };
  }
  return { status: 500, message: raw || 'Lỗi máy chủ khi kết nối Gemini API.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // Gemini Intelligence Endpoint: Bách Hiểu Sinh (Wuxia Build & Tactics Advisor)
  app.post('/api/gemini/advisor', async (req, res) => {
    try {
      const { question, mode, characterSummary } = req.body ?? {};
      if (!question || typeof question !== 'string') {
        res.status(400).json({ error: 'Thiếu câu hỏi gửi tới Bách Hiểu Sinh.' });
        return;
      }

      const ai = createGeminiClient();
      const allowedModels: Record<string, string> = {
        fast: 'gemini-3.1-flash-lite',
        general: 'gemini-4-hydrogen',
        tactical: 'gemini-4-neon',
        deep: 'gemini-4-carbon',
      };
      const selectedModel = allowedModels[String(mode)] || 'gemini-4-hydrogen';

      const systemInstruction =
        'Bạn là Bách Hiểu Sinh — bậc kỳ nhân thông tỏ toàn bộ võ học trong thế giới Võ Lâm Kiếm Thế (5 phái Ngũ Hành: Thiếu Lâm-Kim, Đường Môn-Mộc, Nga Mi-Thủy, Cái Bang-Hỏa, Võ Đang-Thổ; Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim). ' +
        'Hãy trả lời bằng tiếng Việt cổ trang súc tích, dễ hiểu, giàu tính chiến thuật (khoảng 120–200 từ). Dựa trực tiếp vào chỉ số, trang bị, cấp độ và lực chiến hiện tại của nhân vật để đưa ra lời khuyên thực tế về cường hóa, khắc hệ Lôi Đài, vượt Phó Bản hoặc Công Thành Chiến.';

      const prompt = `Hồ sơ nhân vật hiện tại:\n${JSON.stringify(characterSummary ?? {}, null, 2)}\n\nCâu hỏi của hiệp khách: ${question}`;

      const config: {
        systemInstruction: string;
        thinkingConfig?: { thinkingLevel: ThinkingLevel };
      } = {
        systemInstruction,
      };

      if (selectedModel === 'gemini-4-hydrogen') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config,
      });

      const answer = response.text?.trim();
      if (!answer) {
        res.status(502).json({ error: 'Bách Hiểu Sinh chưa thể đưa ra hồi đáp lúc này.' });
        return;
      }

      res.json({ answer, model: selectedModel });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Gemini Image Generation Endpoint: Tàng Kinh Họa Các (Supports 1K/2K/4K & all aspect ratios)
  app.post('/api/gemini/generate-art', async (req, res) => {
    try {
      const { prompt, aspectRatio, imageSize, modelChoice } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Vui lòng nhập mô tả bức họa kiếm hiệp.' });
        return;
      }

      const validRatios = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9']);
      const validSizes = new Set(['1K', '2K', '4K']);

      const safeRatio = validRatios.has(String(aspectRatio)) ? String(aspectRatio) : '1:1';
      const safeSize = validSizes.has(String(imageSize)) ? String(imageSize) : '1K';
      const model =
        modelChoice === 'gemini-nano-banana-2.1'
          ? 'gemini-nano-banana-2.1'
          : 'gemini-3-pro-image-preview';

      const ai = createGeminiClient();
      const enhancedPrompt =
        `Classical East Asian Wuxia martial arts game art illustration, dark obsidian ink, crimson cinnabar and burnished imperial gold palette, highly detailed painterly style, no text, no watermark. Subject: ${prompt}`;

      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: safeRatio,
            imageSize: safeSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        res.status(502).json({
          error: caption || 'Mô hình không trả về dữ liệu hình ảnh. Vui lòng thử lại với mô tả khác.',
        });
        return;
      }

      res.json({
        imageUrl,
        caption: caption.trim(),
        model,
        aspectRatio: safeRatio,
        imageSize: safeSize,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Võ Lâm Kiếm Thế server listening on http://localhost:${PORT}`);
  });
}

startServer();
