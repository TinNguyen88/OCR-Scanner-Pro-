import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
    });
  });

  // Gemini Live stream frame processing endpoint
  app.post('/api/live-scan', async (req, res) => {
    try {
      const { imageBase64, mode = 'cccd' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Hình ảnh không hợp lệ' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'Chưa cấu hình GEMINI_API_KEY',
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const prompt = `
Bạn là Gemini Live AI Scanner trực tiếp theo dõi camera stream.
Hãy quan sát khung hình này và xác định xem có giấy tờ (CCCD/CMND/Hộ chiếu/Hóa đơn) rõ ràng trong khung hình hay không.

Trả về JSON theo định dạng duy nhất sau (không kèm markdown):
{
  "detected": true/false,
  "confidence": 0-100,
  "advice": "Lời khuyên ngắn gọn (VD: Giữ yên camera, Cần sát lại gần, Đã thấy CCCD)",
  "idNumber": "Số CCCD/CMND nếu có",
  "fullName": "Họ tên nếu có",
  "dateOfBirth": "Ngày sinh nếu có",
  "gender": "Giới tính nếu có",
  "nationality": "Quốc tịch nếu có",
  "placeOfOrigin": "Quê quán nếu có",
  "placeOfResidence": "Thường trú nếu có",
  "dateOfExpiry": "Giá trị đến nếu có",
  "rawText": "Chữ trích xuất được"
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || '';
      let jsonResult: any = { detected: false, advice: 'Đang theo dõi...' };

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonResult = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Live scan JSON parse error:', e);
      }

      res.json({
        success: true,
        data: jsonResult,
        engine: 'gemini-live',
      });
    } catch (err: any) {
      console.error('Gemini Live scan error:', err);
      res.status(500).json({ error: err.message || 'Lỗi Gemini Live' });
    }
  });

  // AI OCR via Gemini 2.5 Flash (for super high Vietnamese CCCD accuracy)
  app.post('/api/ocr', async (req, res) => {
    try {
      const { imageBase64, mode = 'cccd' } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'Hình ảnh không hợp lệ' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'Chưa cấu hình GEMINI_API_KEY. Bạn có thể sử dụng Tesseract OCR ngoại tuyến.',
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Clean base64 prefix if exists
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      let prompt = `Bạn là chuyên gia OCR tài liệu Tiếng Việt. Hãy đọc chính xác văn bản từ hình ảnh này.`;

      if (mode === 'cccd') {
        prompt = `
Bạn là hệ thống trích xuất thông tin Căn Cước Công Dân (CCCD), Chứng Minh Nhân Dân (CMND), Hộ Chiếu Việt Nam.
Hãy đọc kỹ hình ảnh và trả về JSON theo định dạng chính xác sau (không thêm bất kỳ văn bản giải thích nào khác):
{
  "idNumber": "Số CCCD/CMND/Hộ chiếu (12 hoặc 9 chữ số)",
  "fullName": "Họ và tên đầy đủ (Viết hoa đầy đủ dấu)",
  "dateOfBirth": "Ngày sinh (DD/MM/YYYY)",
  "gender": "Giới tính (Nam/Nữ)",
  "nationality": "Quốc tịch (Việt Nam)",
  "placeOfOrigin": "Quê quán",
  "placeOfResidence": "Nơi thường trú",
  "dateOfExpiry": "Giá trị đến (DD/MM/YYYY)",
  "issueDate": "Ngày cấp (nếu có)",
  "issuePlace": "Nơi cấp (nếu có)",
  "rawText": "Toàn bộ chữ trích xuất được từ giấy tờ"
}
Chú ý giữ nguyên các dấu tiếng Việt (ngã, hỏi, sắc, huyền, nặng). Nếu không rõ thông tin nào, để chuỗi rỗng "".
`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || '';

      // Parse JSON if mode is cccd
      let structuredData = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Could not parse JSON response from Gemini OCR:', e);
      }

      res.json({
        success: true,
        text: structuredData?.rawText || text,
        cccdData: structuredData,
        engine: 'gemini',
      });
    } catch (err: any) {
      console.error('Gemini OCR error:', err);
      res.status(500).json({ error: err.message || 'Lỗi xử lý OCR bằng Gemini AI' });
    }
  });

  // Email dispatch API
  app.post('/api/send-email', async (req, res) => {
    try {
      const { to, subject, body, attachImages } = req.body;

      if (!to || !to.includes('@')) {
        return res.status(400).json({ error: 'Địa chỉ email nhận không hợp lệ' });
      }

      // Simulate sending email success or processing response
      console.log(`[Email Dispatch] Sending email to: ${to}, Subject: ${subject}`);

      res.json({
        success: true,
        message: `Email đã được đưa vào hàng đợi gửi thành công tới ${to}`,
        timestamp: new Date().toISOString(),
        details: { to, subject, bodyLength: body?.length || 0 },
      });
    } catch (err: any) {
      console.error('Send email error:', err);
      res.status(500).json({ error: err.message || 'Lỗi gửi email' });
    }
  });

  // Check if we are running in bundled production mode (dist/server.cjs) vs dev mode (tsx server.ts)
  const distPath = path.join(process.cwd(), 'dist');
  const isRunningBundledServer = process.argv[1]?.includes('server.cjs') || process.argv[1]?.includes('dist');
  const isProductionMode = process.env.NODE_ENV === 'production' && isRunningBundledServer && fs.existsSync(path.join(distPath, 'index.html'));

  if (!isProductionMode) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OCR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
