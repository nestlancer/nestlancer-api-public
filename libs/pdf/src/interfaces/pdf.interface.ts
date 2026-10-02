export interface PdfGenerateOptions {
  template: string;
  data: Record<string, unknown>;
  format?: 'A4' | 'Letter';
  landscape?: boolean;
}
export interface PdfResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}
