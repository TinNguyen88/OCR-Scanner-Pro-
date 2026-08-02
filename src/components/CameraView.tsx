import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Zap,
  ZapOff,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  FileText,
  CreditCard,
  BookOpen,
  X,
  FlipHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';
import { CameraDevice, ScanMode } from '../types';
import {
  getCameraDevices,
  openCameraStream,
  toggleTorch,
} from '../utils/camera';

interface CameraViewProps {
  onCapture: (canvas: HTMLCanvasElement) => void;
  onFileUpload: (file: File) => void;
  scanMode: ScanMode;
  onScanModeChange: (mode: ScanMode) => void;
  onOpenNewTab: () => void;
  onLiveResult?: (canvas: HTMLCanvasElement, liveData: any) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onCapture,
  onFileUpload,
  scanMode,
  onScanModeChange,
  onOpenNewTab,
  onLiveResult,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directCameraInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(false);

  // Gemini Live State
  const [isGeminiLive, setIsGeminiLive] = useState<boolean>(false);
  const [liveAdvice, setLiveAdvice] = useState<string>('Sẵn sàng theo dõi...');
  const [isAnalyzingFrame, setIsAnalyzingFrame] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [lastScanHash, setLastScanHash] = useState<string>('');
  const [liveSuccessMessage, setLiveSuccessMessage] = useState<string | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);

  // Initialize camera list
  useEffect(() => {
    async function loadDevices() {
      const availableDevices = await getCameraDevices();
      setDevices(availableDevices);
      if (availableDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(availableDevices[0].deviceId);
      }
    }
    loadDevices();
  }, []);

  // Bind media stream to video element
  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      setIsCameraActive(true);
      setCameraError(null);

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            checkTorchSupport(stream);
          })
          .catch((err) => {
            console.warn('Video play error:', err);
            if (err.name !== 'AbortError') {
              setCameraError('Không thể tự động phát luồng Video. Vui lòng bấm "Mở thẻ mới" hoặc dùng nút "Chụp từ Máy ảnh".');
            }
          });
      }
    }
  }, [stream]);

  // Clean up tracks on unmount
  useEffect(() => {
    return () => {
      stopCameraTracks();
    };
  }, []);

  // Gemini Live continuous automated scanning loop
  useEffect(() => {
    let timer: any = null;

    if (isGeminiLive && isCameraActive) {
      timer = setInterval(async () => {
        if (isAnalyzingRef.current || !videoRef.current) return;

        isAnalyzingRef.current = true;
        setIsAnalyzingFrame(true);

        try {
          const video = videoRef.current;
          if (!video.videoWidth || !video.videoHeight) {
            isAnalyzingRef.current = false;
            setIsAnalyzingFrame(false);
            return;
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth, 1280);
          canvas.height = Math.min(video.videoHeight, 720);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

          const res = await fetch('/api/live-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, mode: scanMode }),
          });

          if (res.ok) {
            const result = await res.json();
            const liveData = result.data;

            if (liveData?.advice) {
              setLiveAdvice(liveData.advice);
            }

            if (
              liveData?.detected &&
              (liveData.idNumber || liveData.fullName || liveData.rawText)
            ) {
              const currentHash = `${liveData.idNumber || ''}-${liveData.fullName || ''}-${liveData.dateOfBirth || ''}`;
              if (currentHash !== lastScanHash) {
                setLastScanHash(currentHash);
                const titleText = liveData.fullName
                  ? `✓ Đã nhận diện: ${liveData.fullName}`
                  : `✓ Đã phát hiện số CCCD: ${liveData.idNumber}`;
                setLiveSuccessMessage(titleText);

                // Voice announcement
                if (autoSpeak && 'speechSynthesis' in window) {
                  try {
                    window.speechSynthesis.cancel();
                    const speechStr = `Gemini Live đã tự động cập nhật Căn cước công dân của ${
                      liveData.fullName || ''
                    }, số ${liveData.idNumber || ''}`;
                    const utterance = new SpeechSynthesisUtterance(speechStr);
                    utterance.lang = 'vi-VN';
                    utterance.rate = 1.0;
                    window.speechSynthesis.speak(utterance);
                  } catch (e) {
                    console.warn('Voice synthesis error:', e);
                  }
                }

                if (onLiveResult) {
                  onLiveResult(canvas, liveData);
                }

                setTimeout(() => setLiveSuccessMessage(null), 5000);
              }
            }
          }
        } catch (e) {
          console.warn('Gemini Live loop error:', e);
        } finally {
          isAnalyzingRef.current = false;
          setIsAnalyzingFrame(false);
        }
      }, 1600);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isGeminiLive, isCameraActive, scanMode, lastScanHash, autoSpeak, onLiveResult]);

  const stopCameraTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setIsGeminiLive(false);
  };

  const checkTorchSupport = (mediaStream: MediaStream) => {
    const videoTrack = mediaStream.getVideoTracks()[0];
    if (videoTrack && videoTrack.getCapabilities) {
      const caps = videoTrack.getCapabilities() as any;
      setTorchSupported(Boolean(caps.torch));
    } else {
      setTorchSupported(false);
    }
  };

  const handleStartCamera = async (deviceId?: string) => {
    setIsLoadingCamera(true);
    setCameraError(null);
    stopCameraTracks();

    const targetDeviceId = deviceId || selectedDeviceId;
    const result = await openCameraStream(targetDeviceId);

    setIsLoadingCamera(false);

    if (result.error) {
      setCameraError(result.error);
      setIsCameraActive(false);
    } else if (result.stream) {
      setStream(result.stream);
      setIsCameraActive(true);
      if (result.activeDeviceId) {
        setSelectedDeviceId(result.activeDeviceId);
      }
      // Re-fetch device list to get populated labels now that camera permission is granted
      const availableDevices = await getCameraDevices();
      setDevices(availableDevices);
    }
  };

  const handleToggleGeminiLive = async () => {
    const nextLiveState = !isGeminiLive;
    setIsGeminiLive(nextLiveState);

    if (nextLiveState && !isCameraActive) {
      await handleStartCamera();
    }
  };

  const handleSwitchCamera = () => {
    if (devices.length <= 1) {
      handleStartCamera();
      return;
    }
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    handleStartCamera(nextDevice.deviceId);
  };

  const handleToggleTorch = async () => {
    if (!stream) return;
    const nextTorchState = !isTorchOn;
    const success = await toggleTorch(stream, nextTorchState);
    if (success) {
      setIsTorchOn(nextTorchState);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onCapture(canvas);
      stopCameraTracks();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
      {/* Top Banner & Scan Mode Selection */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            <span>Chụp / Tải ảnh Giấy tờ</span>
          </h2>

          {/* Gemini Live Mode Toggle Button */}
          <button
            onClick={handleToggleGeminiLive}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              isGeminiLive
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white ring-2 ring-indigo-400/50 animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>
              {isGeminiLive ? '⚡ Gemini Live: Đang BẬT' : '✨ Bật Gemini Live (Xem Tự Động)'}
            </span>
            {isGeminiLive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            )}
          </button>
        </div>

        {/* Scan Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onScanModeChange('cccd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              scanMode === 'cccd'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>CCCD / CMND</span>
          </button>

          <button
            onClick={() => onScanModeChange('passport')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              scanMode === 'passport'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hộ chiếu</span>
          </button>

          <button
            onClick={() => onScanModeChange('document')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              scanMode === 'document'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Hóa đơn / Giấy tờ</span>
          </button>
        </div>
      </div>

      {/* Camera Error / Permission Alert */}
      {cameraError && (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-4 mb-4 text-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 flex items-center gap-1.5">
                <span>⚠️ Lỗi mở Camera Stream Trực Tiếp</span>
              </p>
              <p className="text-amber-900 text-xs mt-1 leading-relaxed">{cameraError}</p>
              <p className="text-amber-800 text-[11px] mt-1.5 font-medium">
                👉 <strong>Mẹo:</strong> Nếu bạn đang dùng Zalo/Facebook/iFrame, hãy bấm <strong>"📸 Chụp Bằng Máy Ảnh Gốc"</strong> bên dưới để chụp trực tiếp 100% thành công!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => directCameraInputRef.current?.click()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer animate-bounce"
            >
              <Camera className="w-4 h-4" />
              <span>📸 Chụp Bằng Máy Ảnh Gốc</span>
            </button>
            <button
              onClick={onOpenNewTab}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Thẻ Mới</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải Ảnh Từ Thư Viện</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Video Container / Viewfinder */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 min-h-[320px] md:min-h-[420px] flex items-center justify-center transition-all border-2 ${
          isGeminiLive
            ? 'border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
            : isDragOver
            ? 'border-indigo-500 bg-indigo-950/20'
            : 'border-slate-800'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Laser Sweep Animation Line for Gemini Live */}
        {isCameraActive && isGeminiLive && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_18px_#22d3ee] animate-laser-sweep pointer-events-none z-10" />
        )}

        {/* Video stream element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain max-h-[500px] ${
            isCameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Gemini Live Realtime Top Indicator Badge */}
        {isCameraActive && isGeminiLive && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-cyan-400/40 text-xs font-semibold shadow-lg">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-cyan-300">🔴 Gemini Live Stream: Đang trực tiếp theo dõi</span>
            {isAnalyzingFrame && (
              <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                Đang quét AI...
              </span>
            )}
          </div>
        )}

        {/* Gemini Live Voice Feedback Toggle */}
        {isCameraActive && isGeminiLive && (
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? 'Tắt giọng nói AI' : 'Bật giọng nói AI'}
            className={`absolute top-4 right-4 z-20 px-2.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md cursor-pointer ${
              autoSpeak
                ? 'bg-emerald-500/80 text-white border border-emerald-400'
                : 'bg-black/60 text-slate-300 border border-white/20'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{autoSpeak ? 'Đọc AI: BẬT' : 'Đọc AI: TẮT'}</span>
          </button>
        )}

        {/* Live Detected Success Notification Overlay */}
        {liveSuccessMessage && (
          <div className="absolute top-16 inset-x-6 z-30 bg-emerald-600/90 text-white backdrop-blur-md p-3 rounded-xl border border-emerald-400 shadow-2xl flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span className="text-xs font-bold leading-tight">{liveSuccessMessage}</span>
          </div>
        )}

        {/* Bounding Alignment Box for Cards & Documents */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div
              className={`relative border-2 border-dashed rounded-2xl shadow-2xl transition-all ${
                isGeminiLive
                  ? 'border-cyan-400/90 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                  : 'border-indigo-400/80'
              } ${
                scanMode === 'cccd'
                  ? 'w-[85%] max-w-[420px] aspect-[85/54]'
                  : scanMode === 'passport'
                  ? 'w-[80%] max-w-[460px] aspect-[125/88]'
                  : 'w-[90%] max-w-[500px] aspect-[3/4]'
              }`}
            >
              {/* Corner accents */}
              <div
                className={`absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-md ${
                  isGeminiLive ? 'border-cyan-400' : 'border-indigo-500'
                }`}
              />
              <div
                className={`absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-md ${
                  isGeminiLive ? 'border-cyan-400' : 'border-indigo-500'
                }`}
              />
              <div
                className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-md ${
                  isGeminiLive ? 'border-cyan-400' : 'border-indigo-500'
                }`}
              />
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-md ${
                  isGeminiLive ? 'border-cyan-400' : 'border-indigo-500'
                }`}
              />

              <div className="absolute bottom-2 inset-x-0 text-center px-2">
                <span className="px-3 py-1 bg-black/70 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/20 inline-block max-w-full truncate">
                  {isGeminiLive
                    ? `🤖 Live AI: ${liveAdvice}`
                    : scanMode === 'cccd'
                    ? 'Đặt Căn Cước Công Dân song song trong khung'
                    : scanMode === 'passport'
                    ? 'Căn chỉnh trang thông tin Hộ Chiếu'
                    : 'Đặt tài liệu thẳng góc trong khung'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback View when camera is OFF */}
        {!isCameraActive && (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-indigo-400 shadow-lg">
              {isLoadingCamera ? (
                <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              ) : (
                <Camera className="w-8 h-8" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {isLoadingCamera ? 'Đang kết nối Camera...' : 'Camera đang tắt'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Nhấn <strong>Mở Camera</strong> hoặc kích hoạt <strong>Gemini Live</strong> để tự động xem
              & trích xuất dữ liệu không cần bấm chụp.
            </p>

            <div className="flex flex-wrap justify-center gap-2.5">
              <button
                onClick={handleToggleGeminiLive}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Bật Gemini Live Ngay</span>
              </button>

              <button
                onClick={() => handleStartCamera()}
                disabled={isLoadingCamera}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Mở Camera Thường</span>
              </button>

              <button
                onClick={() => directCameraInputRef.current?.click()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-emerald-100" />
                <span>📸 Chụp Trực Tiếp từ Máy Ảnh</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Tải Ảnh Từ Thư Viện</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        {/* Device Switcher */}
        <div className="flex items-center gap-2">
          {devices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (isCameraActive) {
                  handleStartCamera(e.target.value);
                }
              }}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          )}

          {isCameraActive && devices.length > 1 && (
            <button
              onClick={handleSwitchCamera}
              title="Đổi Camera Trước/Sau"
              className="p-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          {isCameraActive && torchSupported && (
            <button
              onClick={handleToggleTorch}
              className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-medium cursor-pointer ${
                isTorchOn
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isTorchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              <span>{isTorchOn ? 'Tắt Flash' : 'Bật Flash'}</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isCameraActive ? (
            <>
              <button
                onClick={handleToggleGeminiLive}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isGeminiLive
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeminiLive ? 'Gemini Live: BẬT' : 'Bật Gemini Live'}</span>
              </button>

              <button
                onClick={stopCameraTracks}
                className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Đóng</span>
              </button>

              <button
                onClick={handleCapturePhoto}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>📸 Chụp Thủ Công</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Chọn ảnh khác...</span>
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={directCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
};
