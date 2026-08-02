import React, { useState, useEffect } from 'react';
import { History, Trash2, Download, Search, FileSpreadsheet, Eye, Sparkles } from 'lucide-react';
import { OcrResultData } from '../types';

interface ScanHistoryProps {
  currentResult: OcrResultData | null;
  onSelectResult: (result: OcrResultData) => void;
}

export const ScanHistory: React.FC<ScanHistoryProps> = ({ currentResult, onSelectResult }) => {
  const [history, setHistory] = useState<OcrResultData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ocr_scan_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed parsing scan history:', e);
      }
    }
  }, []);

  // Save new scan result automatically
  useEffect(() => {
    if (!currentResult) return;

    setHistory((prev) => {
      // Avoid duplicate timestamp additions
      const exists = prev.some((item) => item.timestamp === currentResult.timestamp);
      if (exists) return prev;

      const updated = [currentResult, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('ocr_scan_history', JSON.stringify(updated));
      return updated;
    });
  }, [currentResult]);

  const handleClearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử quét?')) {
      setHistory([]);
      localStorage.removeItem('ocr_scan_history');
    }
  };

  const handleRemoveItem = (timestamp: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((item) => item.timestamp !== timestamp);
    setHistory(updated);
    localStorage.setItem('ocr_scan_history', JSON.stringify(updated));
  };

  const handleExportCsv = () => {
    if (history.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // BOM for Vietnamese Unicode Excel
    csvContent += 'ThoiGian,SoCCCD,HoTen,NgaySinh,GioiTinh,QuocTich,QueQuan,ThuongTru,DongCo\n';

    history.forEach((item) => {
      const c = item.cccdData || {};
      const row = [
        `"${new Date(item.timestamp).toLocaleString('vi-VN')}"`,
        `"${c.idNumber || ''}"`,
        `"${c.fullName || ''}"`,
        `"${c.dateOfBirth || ''}"`,
        `"${c.gender || ''}"`,
        `"${c.nationality || 'Việt Nam'}"`,
        `"${(c.placeOfOrigin || '').replace(/"/g, '""')}"`,
        `"${(c.placeOfResidence || '').replace(/"/g, '""')}"`,
        `"${item.engine}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LichSu_Quet_CCCD_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const c = item.cccdData;
    return (
      (c?.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c?.idNumber && c.idNumber.toLowerCase().includes(q)) ||
      (item.text && item.text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <span>Lịch Sử Quét Hồ Sơ ({history.length})</span>
        </h2>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel/CSV</span>
              </button>

              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 font-medium text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lịch sử</span>
              </button>
            </>
          )}
        </div>
      </div>

      {history.length > 0 ? (
        <div>
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo Tên, Số CCCD..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* List items */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filteredHistory.map((item, idx) => {
              const c = item.cccdData;
              return (
                <div
                  key={item.timestamp || idx}
                  onClick={() => onSelectResult(item)}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      #{history.length - idx}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">
                          {c?.fullName || 'Chưa nhận diện tên'}
                        </span>
                        {c?.idNumber && (
                          <span className="font-mono text-[11px] text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded font-semibold">
                            {c.idNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(item.timestamp).toLocaleString('vi-VN')} • Engine:{' '}
                        <span className="uppercase text-slate-700 font-medium">{item.engine}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectResult(item)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all"
                      title="Xem lại hồ sơ"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleRemoveItem(item.timestamp, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all"
                      title="Xóa bản ghi này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-slate-400">
          <p className="text-xs">Chưa có lịch sử quét. Mọi bản quét sẽ tự động lưu lại tại đây.</p>
        </div>
      )}
    </div>
  );
};
