import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { ImageEditor } from './components/ImageEditor';
import { OcrResultView } from './components/OcrResultView';
import { EmailForm } from './components/EmailForm';
import { ScanHistory } from './components/ScanHistory';
import { ScanMode, OcrResultData, CccdFields } from './types';
import { parseVietnameseCccdText } from './utils/camera';
import { createWorker } from 'tesseract.js';
import { RefreshCw, CheckCircle2, AlertTriangle, Shield, Layers, BadgeCheck } from 'lucide-react';

export default function App() {
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<ScanMode>('cccd');
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessingOcr, setIsProcessingOcr] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrProgressStatus, setOcrProgressStatus] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OcrResultData | null>(null);
  const [activeEnginePreference, setActiveEnginePreference] = useState<'auto' | 'gemini' | 'tesseract'>('auto');

  // Check health and Gemini key availability on start
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHasGeminiKey(Boolean(data.hasGeminiKey));
        }
      } catch (err) {
        console.warn('Backend health check error:', err);
      }
    }
    checkHealth();
  }, []);

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleCapture = (canvas: HTMLCanvasElement) => {
    setCapturedCanvas(canvas);
  };

  const handleLiveResult = (canvas: HTMLCanvasElement, liveData: any) => {
    setCapturedCanvas(canvas);
    setOcrResult({
      text: liveData.rawText || '',
      confidence: 99,
      durationMs: 350,
      engine: 'gemini-live',
      cccdData: {
        idNumber: liveData.idNumber || '',
        fullName: liveData.fullName || '',
        dateOfBirth: liveData.dateOfBirth || '',
        gender: liveData.gender || '',
        nationality: liveData.nationality || 'Việt Nam',
        placeOfOrigin: liveData.placeOfOrigin || '',
        placeOfResidence: liveData.placeOfResidence || '',
        dateOfExpiry: liveData.dateOfExpiry || '',
      },
      timestamp: new Date().toISOString(),
    });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setCapturedCanvas(canvas);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleProcessOcr = async (imageDataUrl: string) => {
    setIsProcessingOcr(true);
    setOcrProgress(10);
    setOcrProgressStatus('Đang chuẩn bị nhận diện...');

    const startTime = performance.now();

    // Decide engine to use: Gemini AI if preferred or available, otherwise Tesseract
    const useGemini =
      (activeEnginePreference === 'gemini' ||
        (activeEnginePreference === 'auto' && hasGeminiKey));

    if (useGemini) {
      try {
        setOcrProgressStatus('Đang gửi đến Gemini AI OCR...');
        setOcrProgress(40);

        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: imageDataUrl,
            mode: scanMode,
          }),
        });

        const data = await res.json();

        if (res.ok && data.text) {
          const endTime = performance.now();
          const durationMs = Math.round(endTime - startTime);

          const cccdFields = data.cccdData || parseVietnameseCccdText(data.text);

          setOcrResult({
            text: data.text,
            confidence: 98,
            durationMs,
            engine: 'gemini',
            cccdData: cccdFields,
            timestamp: new Date().toISOString(),
          });

          setOcrProgress(100);
          setIsProcessingOcr(false);
          return;
        }
      } catch (err) {
        console.warn('Gemini OCR failed, falling back to Tesseract:', err);
      }
    }

    // Tesseract Fallback Engine
    try {
      setOcrProgressStatus('Khởi tạo Tesseract OCR Engine...');
      setOcrProgress(30);

      const worker = await createWorker('vie+eng');

      setOcrProgressStatus('Đang quét chữ và trích xuất...');
      setOcrProgress(60);

      const ret = await worker.recognize(imageDataUrl);

      await worker.terminate();

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      const text = ret.data.text || '';
      const confidence = Math.round(ret.data.confidence || 75);
      const cccdFields = parseVietnameseCccdText(text);

      setOcrResult({
        text,
        confidence,
        durationMs,
        engine: 'tesseract',
        cccdData: cccdFields,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Tesseract error:', err);
      // Fallback text if OCR fails
      setOcrResult({
        text: 'Không thể nhận diện được chữ trong ảnh. Vui lòng tăng độ tương phản hoặc chụp ảnh rõ nét hơn.',
        confidence: 0,
        durationMs: Math.round(performance.now() - startTime),
        engine: 'tesseract',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setOcrProgress(100);
      setIsProcessingOcr(false);
    }
  };

  const handleUpdateResultText = (newText: string) => {
    if (ocrResult) {
      setOcrResult({
        ...ocrResult,
        text: newText,
      });
    }
  };

  const handleUpdateCccdData = (newData: CccdFields) => {
    if (ocrResult) {
      setOcrResult({
        ...ocrResult,
        cccdData: newData,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Header
          hasGeminiKey={hasGeminiKey}
          isCameraActive={Boolean(capturedCanvas)}
          onOpenNewTab={handleOpenNewTab}
        />

        {/* Engine Preference Selector */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 mb-6 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Chọn Động Cơ OCR:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveEnginePreference('auto')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeEnginePreference === 'auto'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tự Động (Ưu tiên AI)
            </button>

            {hasGeminiKey && (
              <button
                onClick={() => setActiveEnginePreference('gemini')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeEnginePreference === 'gemini'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gemini AI 2.5 (Chính xác cao)
              </button>
            )}

            <button
              onClick={() => setActiveEnginePreference('tesseract')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeEnginePreference === 'tesseract'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tesseract (Ngoại tuyến)
            </button>
          </div>
        </div>

        {/* Camera Capture Section */}
        <CameraView
          onCapture={handleCapture}
          onFileUpload={handleFileUpload}
          scanMode={scanMode}
          onScanModeChange={setScanMode}
          onOpenNewTab={handleOpenNewTab}
          onLiveResult={handleLiveResult}
        />

        {/* Image Editor Preview (if photo captured) */}
        {capturedCanvas && (
          <ImageEditor
            sourceCanvas={capturedCanvas}
            onProcessOcr={handleProcessOcr}
            onRetake={() => {
              setCapturedCanvas(null);
              setOcrResult(null);
            }}
            isProcessing={isProcessingOcr}
          />
        )}

        {/* OCR Progress Indicator Bar */}
        {isProcessingOcr && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 text-center animate-pulse">
            <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold text-sm mb-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>{ocrProgressStatus}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* OCR Result View */}
        <OcrResultView
          result={ocrResult}
          onUpdateResultText={handleUpdateResultText}
          onUpdateCccdData={handleUpdateCccdData}
        />

        {/* Email Dispatch Form */}
        <EmailForm ocrResult={ocrResult} />

        {/* Scan History and Batch CSV Export */}
        <ScanHistory
          currentResult={ocrResult}
          onSelectResult={(selected) => setOcrResult(selected)}
        />

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-6 border-t border-slate-200/60 mt-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-xs mb-3 shadow-2xs">
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
            <span>PHẦN MỀM CHÍNH THỨC - BẢN QUYỀN ĐÃ ĐĂNG KÝ</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">
            🔐 OCR Scanner Pro v2.5 Ultra • Tác giả: NGUYỄN TRUNG TÍN (SĐT: 0977530943)
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Hệ thống Quét & Trích Xuất Căn Cước Công Dân, Hộ Chiếu, Bằng Cấp & Giấy Tờ Tự Động
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Bảo mật tuyệt đối • Xử lý AI Tiếng Việt • Hỗ trợ Gemini Live Realtime
          </p>
        </footer>
      </div>
    </div>
  );
}
