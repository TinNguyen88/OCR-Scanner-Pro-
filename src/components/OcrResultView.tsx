import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Clock,
  Sparkles,
  CreditCard,
  User,
  Calendar,
  MapPin,
  Flag,
  ShieldCheck,
  Code,
  Edit2,
  Save,
  Printer,
} from 'lucide-react';
import { OcrResultData, CccdFields } from '../types';

interface OcrResultViewProps {
  result: OcrResultData | null;
  onUpdateResultText: (text: string) => void;
  onUpdateCccdData: (data: CccdFields) => void;
}

export const OcrResultView: React.FC<OcrResultViewProps> = ({
  result,
  onUpdateResultText,
  onUpdateCccdData,
}) => {
  const [activeTab, setActiveTab] = useState<'cccd' | 'raw' | 'json'>('cccd');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingCccd, setIsEditingCccd] = useState<boolean>(false);
  const [localCccd, setLocalCccd] = useState<CccdFields>({
    idNumber: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Việt Nam',
    placeOfOrigin: '',
    placeOfResidence: '',
    dateOfExpiry: '',
  });

  React.useEffect(() => {
    if (result?.cccdData) {
      setLocalCccd(result.cccdData);
    }
  }, [result]);

  if (!result) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 text-center text-slate-400">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-700">Chưa có kết quả OCR</h3>
        <p className="text-xs text-slate-500 mt-1">
          Chụp ảnh hoặc tải lên tài liệu để hệ thống tự động nhận diện thông tin.
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'raw'
        ? result.text
        : activeTab === 'json'
        ? JSON.stringify(result.cccdData || result.text, null, 2)
        : `Số CCCD: ${localCccd.idNumber || ''}\nHọ và tên: ${localCccd.fullName || ''}\nNgày sinh: ${localCccd.dateOfBirth || ''}\nGiới tính: ${localCccd.gender || ''}\nQuốc tịch: ${localCccd.nationality || ''}\nQuê quán: ${localCccd.placeOfOrigin || ''}\nThường trú: ${localCccd.placeOfResidence || ''}\nGiá trị đến: ${localCccd.dateOfExpiry || ''}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([result.text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `OCR_Result_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadJson = () => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(result.cccdData || { text: result.text }, null, 2)], {
      type: 'application/json',
    });
    element.href = URL.createObjectURL(file);
    element.download = `CCCD_Data_${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveCccdEdit = () => {
    setIsEditingCccd(false);
    onUpdateCccdData(localCccd);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Kết Quả Trích Xuất OCR</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Động cơ:{' '}
            <span className="font-semibold uppercase text-indigo-600">
              {result.engine === 'gemini-live'
                ? '⚡ Gemini Live AI (Trực Tiếp)'
                : result.engine === 'gemini'
                ? '✨ Gemini 2.5 Flash'
                : 'Tesseract OCR'}
            </span>{' '}
            • Thời gian: {result.durationMs}ms
          </p>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Độ chính xác: {result.confidence}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('cccd')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'cccd'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Thẻ Thông Tin CCCD</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'raw'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Văn Bản Thô</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'json'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>JSON Cấu Trúc</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>

          <button
            onClick={handleDownloadTxt}
            title="Tải văn bản TXT"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePrint}
            title="In / Xuất PDF"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Structured CCCD Card View */}
      {activeTab === 'cccd' && (
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-md">
              Căn cước công dân Việt Nam
            </span>

            <button
              onClick={() => {
                if (isEditingCccd) {
                  handleSaveCccdEdit();
                } else {
                  setIsEditingCccd(true);
                }
              }}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
            >
              {isEditingCccd ? (
                <>
                  <Save className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lưu chỉnh sửa</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa thông tin</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* ID Number */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Số CCCD / CMND:</span>
              {isEditingCccd ? (
                <input
                  type="text"
                  value={localCccd.idNumber || ''}
                  onChange={(e) => setLocalCccd({ ...localCccd, idNumber: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-indigo-700"
                />
              ) : (
                <span className="font-mono font-bold text-lg text-indigo-700">
                  {localCccd.idNumber || 'Chưa nhận diện'}
                </span>
              )}
            </div>

            {/* Full Name */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Họ và tên:</span>
              {isEditingCccd ? (
                <input
                  type="text"
                  value={localCccd.fullName || ''}
                  onChange={(e) => setLocalCccd({ ...localCccd, fullName: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded font-bold text-slate-800 uppercase"
                />
              ) : (
                <span className="font-bold text-base text-slate-900 uppercase">
                  {localCccd.fullName || 'Chưa nhận diện'}
                </span>
              )}
            </div>

            {/* DOB & Gender */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Ngày sinh:</span>
                {isEditingCccd ? (
                  <input
                    type="text"
                    value={localCccd.dateOfBirth || ''}
                    onChange={(e) => setLocalCccd({ ...localCccd, dateOfBirth: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
                  />
                ) : (
                  <span className="font-semibold text-slate-800">{localCccd.dateOfBirth || '--'}</span>
                )}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Giới tính:</span>
                {isEditingCccd ? (
                  <input
                    type="text"
                    value={localCccd.gender || ''}
                    onChange={(e) => setLocalCccd({ ...localCccd, gender: e.target.value })}
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
                  />
                ) : (
                  <span className="font-semibold text-slate-800">{localCccd.gender || '--'}</span>
                )}
              </div>
            </div>

            {/* Nationality */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block mb-1">Quốc tịch:</span>
              {isEditingCccd ? (
                <input
                  type="text"
                  value={localCccd.nationality || ''}
                  onChange={(e) => setLocalCccd({ ...localCccd, nationality: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              ) : (
                <span className="font-semibold text-slate-800">{localCccd.nationality || 'Việt Nam'}</span>
              )}
            </div>

            {/* Place of Origin */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs md:col-span-2">
              <span className="text-xs font-medium text-slate-500 block mb-1">Quê quán:</span>
              {isEditingCccd ? (
                <input
                  type="text"
                  value={localCccd.placeOfOrigin || ''}
                  onChange={(e) => setLocalCccd({ ...localCccd, placeOfOrigin: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              ) : (
                <span className="font-medium text-slate-800">{localCccd.placeOfOrigin || '--'}</span>
              )}
            </div>

            {/* Place of Residence */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs md:col-span-2">
              <span className="text-xs font-medium text-slate-500 block mb-1">Nơi thường trú:</span>
              {isEditingCccd ? (
                <input
                  type="text"
                  value={localCccd.placeOfResidence || ''}
                  onChange={(e) => setLocalCccd({ ...localCccd, placeOfResidence: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              ) : (
                <span className="font-medium text-slate-800">{localCccd.placeOfResidence || '--'}</span>
              )}
            </div>

            {/* Expiry Date */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs md:col-span-2">
              <span className="text-xs font-medium text-slate-500 block mb-1">Giá trị đến:</span>
              {isEditingCccd ? (
                <input
                  type="text"
                  value={localCccd.dateOfExpiry || ''}
                  onChange={(e) => setLocalCccd({ ...localCccd, dateOfExpiry: e.target.value })}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              ) : (
                <span className="font-medium text-slate-800">{localCccd.dateOfExpiry || '--'}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Raw Text Editor */}
      {activeTab === 'raw' && (
        <div className="relative">
          <textarea
            value={result.text}
            onChange={(e) => onUpdateResultText(e.target.value)}
            rows={10}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
          <div className="mt-2 flex justify-between text-xs text-slate-500 px-1">
            <span>Độ dài: {result.text.length} ký tự</span>
            <span>Kéo góc dưới để mở rộng ô văn bản</span>
          </div>
        </div>
      )}

      {/* Tab 3: JSON Structure */}
      {activeTab === 'json' && (
        <div className="relative">
          <pre className="p-4 bg-slate-900 text-indigo-300 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
            {JSON.stringify(result.cccdData || { rawText: result.text }, null, 2)}
          </pre>
          <div className="mt-2 text-right">
            <button
              onClick={handleDownloadJson}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Tải file JSON (.json)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
