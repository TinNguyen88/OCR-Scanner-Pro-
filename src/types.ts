export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CccdFields {
  idNumber?: string; // Số CCCD / CMND
  fullName?: string; // Họ và tên
  dateOfBirth?: string; // Ngày sinh
  gender?: string; // Giới tính
  nationality?: string; // Quốc tịch
  placeOfOrigin?: string; // Quê quán
  placeOfResidence?: string; // Thường trú
  dateOfExpiry?: string; // Giá trị đến
  issueDate?: string; // Ngày cấp
  issuePlace?: string; // Nơi cấp
  rawText?: string;
}

export interface OcrResultData {
  text: string;
  confidence: number;
  durationMs: number;
  engine: 'tesseract' | 'gemini' | 'gemini-live';
  cccdData?: CccdFields;
  timestamp: string;
}

export interface GeminiLiveStatus {
  isActive: boolean;
  isScanning: boolean;
  advice: string;
  lastDetectedAt?: string;
  autoSpeak: boolean;
}

export interface ImageEnhancementOptions {
  brightness: number; // 50 to 200
  contrast: number;   // 50 to 200
  grayscale: boolean;
  sharpen: boolean;
  rotation: number;   // 0, 90, 180, 270
}

export type ScanMode = 'cccd' | 'passport' | 'document' | 'general';
