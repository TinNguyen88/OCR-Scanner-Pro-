import { CameraDevice, ImageEnhancementOptions } from '../types';

export interface CameraStreamResult {
  stream: MediaStream;
  activeDeviceId?: string;
  error?: string;
}

/**
 * Get available camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1} (${device.deviceId.slice(0, 6)}...)`,
      }));
    return videoDevices;
  } catch (err) {
    console.warn('Error enumerating camera devices:', err);
    return [];
  }
}

/**
 * Robustly requests camera stream using multi-tier constraint fallbacks
 */
export async function openCameraStream(preferredDeviceId?: string): Promise<CameraStreamResult> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      stream: new MediaStream(),
      error: 'Trình duyệt không hỗ trợ truy cập Camera trực tiếp hoặc đang bị giới hạn iFrame.',
    };
  }

  // Define constraint fallback attempts
  const constraintAttempts: MediaStreamConstraints[] = [];

  if (preferredDeviceId) {
    constraintAttempts.push({
      video: { deviceId: { exact: preferredDeviceId } },
    });
  }

  // Attempt 1: High quality back camera
  constraintAttempts.push({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  });

  // Attempt 2: Flexible environment camera
  constraintAttempts.push({
    video: { facingMode: { ideal: 'environment' } },
  });

  // Attempt 3: Any video
  constraintAttempts.push({
    video: true,
  });

  let lastError: any = null;

  for (const constraints of constraintAttempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();

      return {
        stream,
        activeDeviceId: settings?.deviceId,
      };
    } catch (err: any) {
      console.warn('Camera constraint attempt failed:', constraints, err);
      lastError = err;
      
      // If user explicitly denied permission, don't loop endlessly
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        break;
      }
    }
  }

  // Process human-friendly error message
  let errorMessage = 'Không thể mở Camera.';
  if (lastError) {
    if (lastError.name === 'NotAllowedError' || lastError.name === 'PermissionDeniedError') {
      errorMessage = 'Quyền truy cập Camera bị từ chối. Vui lòng cấp quyền trong trình duyệt hoặc mở ứng dụng trong thẻ mới.';
    } else if (lastError.name === 'NotFoundError' || lastError.name === 'DevicesNotFoundError') {
      errorMessage = 'Không tìm thấy thiết bị Camera trên thiết bị của bạn.';
    } else if (lastError.name === 'NotReadableError' || lastError.name === 'TrackStartError') {
      errorMessage = 'Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng đó và thử lại.';
    } else if (lastError.name === 'OverconstrainedError') {
      errorMessage = 'Thiết bị không đáp ứng cấu hình Camera được yêu cầu.';
    } else if (lastError.message) {
      errorMessage = lastError.message;
    }
  }

  return {
    stream: new MediaStream(),
    error: errorMessage,
  };
}

/**
 * Toggle flash/torch on active video track if supported
 */
export async function toggleTorch(stream: MediaStream, enable: boolean): Promise<boolean> {
  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return false;

  const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
  if (!capabilities.torch) {
    return false;
  }

  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: enable } as any],
    });
    return true;
  } catch (err) {
    console.warn('Torch failed:', err);
    return false;
  }
}

/**
 * Process canvas image with enhancement parameters (brightness, contrast, grayscale, rotation)
 */
export function applyImageFilters(
  sourceCanvas: HTMLCanvasElement,
  options: ImageEnhancementOptions
): string {
  const { brightness, contrast, grayscale, rotation } = options;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return sourceCanvas.toDataURL('image/jpeg', 0.95);

  const isRotated90or270 = rotation === 90 || rotation === 270;
  canvas.width = isRotated90or270 ? sourceCanvas.height : sourceCanvas.width;
  canvas.height = isRotated90or270 ? sourceCanvas.width : sourceCanvas.height;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  // Apply filters
  const filterParts: string[] = [];
  filterParts.push(`brightness(${brightness}%)`);
  filterParts.push(`contrast(${contrast}%)`);
  if (grayscale) filterParts.push('grayscale(100%)');

  ctx.filter = filterParts.join(' ');

  ctx.drawImage(
    sourceCanvas,
    -sourceCanvas.width / 2,
    -sourceCanvas.height / 2
  );
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Parses Vietnamese CCCD raw OCR text into structured key-value pairs
 */
export function parseVietnameseCccdText(rawText: string): Partial<import('../types').CccdFields> {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: Partial<import('../types').CccdFields> = { rawText };

  // ID Number regex (12 digits for CCCD, 9 digits for CMND)
  const idMatch = rawText.match(/(?:Số|No\.|So|S6|ID)?[\s:]*([0-9]{9,12})\b/i) ||
                  rawText.match(/\b([0-9]{12})\b/);
  if (idMatch) {
    result.idNumber = idMatch[1];
  }

  // Name regex patterns
  const nameMatch = rawText.match(/(?:Họ và tên|Họ tên|Full name|Ho va ten)[\s:]*([^\n\r\d]+)/i) ||
                    rawText.match(/\b([A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚƯĐ\s]{4,30})\b/);
  if (nameMatch && nameMatch[1]) {
    const cleanedName = nameMatch[1].replace(/CỘNG HÒA|XÃ HỘI|CHỦ NGHĨA|VIỆT NAM|CĂN CƯỚC|CÔNG DÂN/g, '').trim();
    if (cleanedName.length > 2) {
      result.fullName = cleanedName;
    }
  }

  // DOB pattern (DD/MM/YYYY)
  const dobMatch = rawText.match(/(?:Ngày sinh|Date of birth|Sinh ngày)[\s:]*([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{4})/i) ||
                   rawText.match(/\b([0-9]{2}[\/][0-9]{2}[\/][0-9]{4})\b/);
  if (dobMatch) {
    result.dateOfBirth = dobMatch[1];
  }

  // Gender
  if (/Nam|Male/i.test(rawText)) result.gender = 'Nam';
  else if (/Nữ|Female|Nu/i.test(rawText)) result.gender = 'Nữ';

  // Nationality
  if (/Việt Nam|Viet Nam/i.test(rawText)) result.nationality = 'Việt Nam';

  // Place of origin (Quê quán)
  const originMatch = rawText.match(/(?:Quê quán|Place of origin)[\s:]*([^\n]+)/i);
  if (originMatch) result.placeOfOrigin = originMatch[1].trim();

  // Residence (Nơi thường trú)
  const residenceMatch = rawText.match(/(?:Nơi thường trú|Place of residence|Thường trú)[\s:]*([^\n]+(?:\n[^\n]+)?)/i);
  if (residenceMatch) result.placeOfResidence = residenceMatch[1].replace(/\n/g, ' ').trim();

  // Expiry date (Có giá trị đến)
  const expiryMatch = rawText.match(/(?:Giá trị đến|Date of expiry|Có giá trị đến)[\s:]*([0-9]{1,2}[\/\.-][0-9]{1,2}[\/\.-][0-9]{4})/i);
  if (expiryMatch) result.dateOfExpiry = expiryMatch[1];

  return result;
}
