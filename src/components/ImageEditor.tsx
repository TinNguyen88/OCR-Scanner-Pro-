import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  RotateCw,
  Sun,
  Contrast,
  Sliders,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { ImageEnhancementOptions } from '../types';
import { applyImageFilters } from '../utils/camera';

interface ImageEditorProps {
  sourceCanvas: HTMLCanvasElement;
  onProcessOcr: (enhancedImageDataUrl: string) => void;
  onRetake: () => void;
  isProcessing: boolean;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  sourceCanvas,
  onProcessOcr,
  onRetake,
  isProcessing,
}) => {
  const [enhancements, setEnhancements] = useState<ImageEnhancementOptions>({
    brightness: 100,
    contrast: 100,
    grayscale: false,
    sharpen: false,
    rotation: 0,
  });

  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [showSliders, setShowSliders] = useState<boolean>(false);

  useEffect(() => {
    if (sourceCanvas) {
      const updatedUrl = applyImageFilters(sourceCanvas, enhancements);
      setPreviewDataUrl(updatedUrl);
    }
  }, [sourceCanvas, enhancements]);

  const handleRotateLeft = () => {
    setEnhancements((prev) => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }));
  };

  const handleRotateRight = () => {
    setEnhancements((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  const handleResetFilters = () => {
    setEnhancements({
      brightness: 100,
      contrast: 100,
      grayscale: false,
      sharpen: false,
      rotation: 0,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Eye className="w-5 h-5 text-indigo-600" />
          <span>Xem trước & Tối ưu hóa Ảnh</span>
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSliders(!showSliders)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showSliders
                ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Chỉnh ánh sáng / Tương phản</span>
          </button>

          <button
            onClick={onRetake}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
          >
            Chụp lại / Chọn ảnh khác
          </button>
        </div>
      </div>

      {/* Image Preview Box */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center p-3 min-h-[280px]">
        {previewDataUrl && (
          <img
            src={previewDataUrl}
            alt="Preview Scan"
            className="max-h-[420px] w-auto object-contain rounded-xl shadow-lg"
          />
        )}
      </div>

      {/* Enhancement Controls Panel */}
      {showSliders && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Độ sáng:
              </span>
              <span>{enhancements.brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="180"
              value={enhancements.brightness}
              onChange={(e) =>
                setEnhancements((prev) => ({
                  ...prev,
                  brightness: Number(e.target.value),
                }))
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span className="flex items-center gap-1">
                <Contrast className="w-3.5 h-3.5 text-indigo-500" /> Tương phản:
              </span>
              <span>{enhancements.contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={enhancements.contrast}
              onChange={(e) =>
                setEnhancements((prev) => ({
                  ...prev,
                  contrast: Number(e.target.value),
                }))
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 md:pt-0">
            <button
              onClick={() =>
                setEnhancements((prev) => ({
                  ...prev,
                  grayscale: !prev.grayscale,
                }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                enhancements.grayscale
                  ? 'bg-slate-800 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Trắng đen (B&W)
            </button>

            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 underline"
            >
              Khôi phục gốc
            </button>
          </div>
        </div>
      )}

      {/* Editor Action Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRotateLeft}
            title="Xoay trái 90°"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotateRight}
            title="Xoay phải 90°"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onProcessOcr(previewDataUrl)}
          disabled={isProcessing}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang nhận diện chữ OCR...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Bắt đầu Nhận diện OCR</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
