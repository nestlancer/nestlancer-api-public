export interface ImageVariant {
  name: string;
  width: number;
  height: number;
  fit: keyof import('sharp').FitEnum;
}

export interface VideoProfile {
  name: string;
  resolution: string;
  bitrate: string;
  audioBitrate: string;
}

export interface ScanResult {
  isInfected: boolean;
  virusName?: string;
  details?: string;
  /** True when the scanner could not run (ClamAV down, S3 error, etc.). */
  scanUnavailable?: boolean;
}

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  exif?: any;
  pages?: number;
  [key: string]: any;
}

export interface ProcessingPipelineResult {
  virusScan: ScanResult;
  thumbnailKey?: string;
  variants?: Record<string, string>;
  metadata: MediaMetadata;
}
