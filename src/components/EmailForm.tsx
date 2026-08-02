import React, { useState, useEffect } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Sparkles, User, FileText, ExternalLink } from 'lucide-react';
import { OcrResultData, CccdFields } from '../types';

interface EmailFormProps {
  ocrResult: OcrResultData | null;
}

export const EmailForm: React.FC<EmailFormProps> = ({ ocrResult }) => {
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('Kết quả Quét OCR CCCD / Giấy Tờ');
  const [additionalNote, setAdditionalNote] = useState<string>('');
  const [recentContacts, setRecentContacts] = useState<string[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load saved emails & contacts
  useEffect(() => {
    const savedRecipient = localStorage.getItem('ocr_email_recipient');
    if (savedRecipient) setRecipient(savedRecipient);

    const savedContacts = localStorage.getItem('ocr_recent_contacts');
    if (savedContacts) {
      try {
        setRecentContacts(JSON.parse(savedContacts));
      } catch (e) {
        console.warn('Failed parsing recent contacts:', e);
      }
    }
  }, []);

  // Update email subject automatically if name exists
  useEffect(() => {
    if (ocrResult?.cccdData?.fullName) {
      setSubject(`Kết quả Quét OCR CCCD - ${ocrResult.cccdData.fullName}`);
    } else if (ocrResult?.cccdData?.idNumber) {
      setSubject(`Kết quả Quét OCR CCCD - ${ocrResult.cccdData.idNumber}`);
    }
  }, [ocrResult]);

  const handleSaveContact = (email: string) => {
    if (!email || !email.includes('@')) return;
    const updated = Array.from(new Set([email, ...recentContacts])).slice(0, 5);
    setRecentContacts(updated);
    localStorage.setItem('ocr_recent_contacts', JSON.stringify(updated));
    localStorage.setItem('ocr_email_recipient', email);
  };

  const generateEmailBodyText = (): string => {
    if (!ocrResult) return additionalNote;

    let text = `=== KẾT QUẢ QUÉT OCR TÀI LIỆU ===\n\n`;

    if (ocrResult.cccdData && ocrResult.cccdData.idNumber) {
      const c = ocrResult.cccdData;
      text += `--- THÔNG TIN CĂN CƯỚC CÔNG DÂN ---\n`;
      text += `Số CCCD / CMND: ${c.idNumber || ''}\n`;
      text += `Họ và tên: ${c.fullName || ''}\n`;
      text += `Ngày sinh: ${c.dateOfBirth || ''}\n`;
      text += `Giới tính: ${c.gender || ''}\n`;
      text += `Quốc tịch: ${c.nationality || 'Việt Nam'}\n`;
      text += `Quê quán: ${c.placeOfOrigin || ''}\n`;
      text += `Thường trú: ${c.placeOfResidence || ''}\n`;
      text += `Giá trị đến: ${c.dateOfExpiry || ''}\n\n`;
    }

    text += `--- VĂN BẢN TRÍCH XUẤT NGUYÊN BẢN ---\n${ocrResult.text}\n\n`;

    if (additionalNote.trim()) {
      text += `--- GHI CHÚ BỔ SUNG ---\n${additionalNote}\n\n`;
    }

    text += `---\nĐược gửi tự động từ ứng dụng OCR Scanner Pro`;

    return text;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !recipient.includes('@')) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng nhập địa chỉ Email nhận hợp lệ.',
      });
      return;
    }

    if (!ocrResult) {
      setStatusMessage({
        type: 'error',
        text: 'Chưa có dữ liệu OCR để gửi.',
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    handleSaveContact(recipient);

    const fullBody = generateEmailBodyText();

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject: subject || 'Kết quả OCR',
          body: fullBody,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `✓ Email đã được gửi thành công đến ${recipient}!`,
        });
      } else {
        throw new Error(data.error || 'Lỗi gửi email từ server');
      }
    } catch (err: any) {
      console.warn('Backend email send error, falling back to mailto:', err);

      // Fallback to mailto link
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(fullBody)}`;

      navigator.clipboard.writeText(fullBody);

      setStatusMessage({
        type: 'info',
        text: `Đã sao chép nội dung vào Clipboard. Đang mở ứng dụng Email trên máy của bạn...`,
      });

      setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 1200);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          <span>Gửi Kết Quả Qua Email</span>
        </h2>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSendEmail} className="space-y-4">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Email người nhận <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="ví dụ: congty@gmail.com hoặc user@company.com"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />

          {/* Quick Contact Chips */}
          {recentContacts.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Gần đây:</span>
              {recentContacts.map((contact) => (
                <button
                  key={contact}
                  type="button"
                  onClick={() => setRecipient(contact)}
                  className="px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-full transition-all"
                >
                  {contact}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tiêu đề Email
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Nhập tiêu đề thư..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú thêm (tùy chọn)
          </label>
          <textarea
            rows={3}
            value={additionalNote}
            onChange={(e) => setAdditionalNote(e.target.value)}
            placeholder="Nhập thêm tin nhắn, lời nhắn hoặc ghi chú cho người nhận..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-y"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSending || !ocrResult}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isSending ? (
            <span>Đang gửi Email...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Gửi Email Ngay</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
