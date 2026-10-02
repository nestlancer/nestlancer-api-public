import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  EMBEDDED_LOGO_FULL_LIGHT_SVG,
  EMBEDDED_LOGO_ICON_LIGHT_SVG,
} from './embedded-logos';

export const BRAND_COLORS = {
  navy: '#272A7A',
  teal: '#16B6A5',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  surface: '#f8fafc',
} as const;

const ASSET_CANDIDATE_DIRS = [
  // Next to compiled dist (Docker often copies assets → /app/assets)
  join(__dirname, '..', 'assets'),
  join(__dirname, '..', '..', 'assets'),
  // Monorepo / local paths
  join(process.cwd(), 'libs', 'pdf', 'assets'),
  join(process.cwd(), 'libs', 'pdf', 'src', 'assets'),
  // Nest microservices historically used cwd /app/services/<name>
  join(process.cwd(), '..', '..', 'libs', 'pdf', 'assets'),
  join(process.cwd(), '..', 'libs', 'pdf', 'assets'),
  // Deployed package layout
  join(process.cwd(), 'node_modules', '@nestlancer', 'pdf', 'assets'),
  join(process.cwd(), 'node_modules', '@nestlancer', 'pdf', 'src', 'assets'),
];

const EMBEDDED_SVG_BY_FILENAME: Record<string, string> = {
  'logo-full-light.svg': EMBEDDED_LOGO_FULL_LIGHT_SVG,
  'logo-icon-light.svg': EMBEDDED_LOGO_ICON_LIGHT_SVG,
};

function readBinaryAsset(filename: string): Buffer | null {
  for (const dir of ASSET_CANDIDATE_DIRS) {
    const filePath = join(dir, filename);
    if (existsSync(filePath)) {
      return readFileSync(filePath);
    }
  }
  return null;
}

function readSvgAsset(filename: string): string {
  const binary = readBinaryAsset(filename);
  if (binary) {
    return binary.toString('utf-8');
  }
  const embedded = EMBEDDED_SVG_BY_FILENAME[filename];
  if (embedded) {
    return embedded;
  }
  throw new Error(`PDF logo asset not found: ${filename}`);
}

function toPngDataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function toSvgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf-8').toString('base64')}`;
}

/**
 * Prefer PNG data-URIs so Puppeteer/Chromium embeds real PDF Image XObjects.
 * SVG `<img>` sources often produce 0 `/Subtype /Image` objects in the PDF.
 */
function resolveLogoDataUri(pngName: string, svgName: string): string {
  const png = readBinaryAsset(pngName);
  if (png && png.length > 0) {
    return toPngDataUri(png);
  }
  return toSvgDataUri(readSvgAsset(svgName));
}

let logoFullDataUri: string | null = null;
let logoIconDataUri: string | null = null;
let logoFullBuffer: Buffer | null = null;
let logoIconBuffer: Buffer | null = null;

export function getLogoFullDataUri(): string {
  if (!logoFullDataUri) {
    logoFullDataUri = resolveLogoDataUri('logo-full-light.png', 'logo-full-light.svg');
  }
  return logoFullDataUri;
}

export function getLogoIconDataUri(): string {
  if (!logoIconDataUri) {
    logoIconDataUri = resolveLogoDataUri('logo-icon-light.png', 'logo-icon-light.svg');
  }
  return logoIconDataUri;
}

export function getLogoFullBuffer(): Buffer {
  if (!logoFullBuffer) {
    logoFullBuffer = readBinaryAsset('logo-full-light.png') ?? Buffer.from(readSvgAsset('logo-full-light.svg'), 'utf-8');
  }
  return logoFullBuffer;
}

export function getLogoIconBuffer(): Buffer {
  if (!logoIconBuffer) {
    logoIconBuffer = readBinaryAsset('logo-icon-light.png') ?? Buffer.from(readSvgAsset('logo-icon-light.svg'), 'utf-8');
  }
  return logoIconBuffer;
}
