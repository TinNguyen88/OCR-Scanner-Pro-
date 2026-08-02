import React from 'react';
import { Camera, Sparkles, ExternalLink, ShieldCheck, Mail } from 'lucide-react';

interface HeaderProps {
  hasGeminiKey: boolean;
  isCameraActive: boolean;
  onOpenNewTab: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasGeminiKey,
  isCameraActive,
  onOpenNewTab,
}) => {
  return (
    <header className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white shadow-lg rounded-2xl p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 shadow-inner">
            <Camera className="w-8 h-8 text-indigo-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">OCR Scanner Pro</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> v2.5 Ultra
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-amber-200 border border-white/20">
                Tác giả: NGUYỄN TRUNG TÍN (0977530943)
              </span>
            </div>
            <p className="text-indigo-100 text-sm mt-0.5 font-medium">
              Quét CCCD, Hộ chiếu & Giấy tờ • Nhận diện AI Tiếng Việt • Gửi Email tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Gemini AI Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium border border-white/15">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Gemini:</span>
            {hasGeminiKey ? (
              <span className="text-emerald-300 font-semibold">Sẵn sàng</span>
            ) : (
              <span className="text-amber-200 font-semibold">Tesseract (Ngoại tuyến)</span>
            )}
          </div>

          {/* Camera Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium border border-white/15">
            <span
              className={`w-2 h-2 rounded-full ${
                isCameraActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'
              }`}
            />
            <span>Camera:</span>
            <span className={isCameraActive ? 'text-emerald-300 font-semibold' : 'text-slate-300'}>
              {isCameraActive ? 'Đang hoạt động' : 'Tắt'}
            </span>
          </div>

          {/* Open in New Tab Button for Frame Fix */}
          <button
            onClick={onOpenNewTab}
            title="Mở ứng dụng trong thẻ mới nếu gặp lỗi quyền Camera trong iFrame"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold text-white transition-all shadow-sm border border-white/30 active:scale-95 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở thẻ mới</span>
          </button>
        </div>
      </div>
    </header>
  );
};
