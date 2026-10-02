export interface ParsedDeviceInfo {
  type: string;
  browser: string;
  os: string;
}

/** API / CLI clients that are not browsers but should not show "Unknown". */
const API_CLIENT_PATTERNS: Array<{ test: RegExp; browser: string; os?: string }> = [
  { test: /^curl\//i, browser: 'cURL', os: 'API client' },
  { test: /^wget\//i, browser: 'Wget', os: 'API client' },
  { test: /postmanruntime/i, browser: 'Postman', os: 'API client' },
  { test: /insomnia/i, browser: 'Insomnia', os: 'API client' },
  { test: /httpie/i, browser: 'HTTPie', os: 'API client' },
  { test: /axios\//i, browser: 'Axios', os: 'API client' },
  { test: /node-fetch/i, browser: 'Node fetch', os: 'API client' },
  { test: /okhttp\//i, browser: 'OkHttp', os: 'Android' },
  { test: /python-requests/i, browser: 'Python requests', os: 'API client' },
  { test: /go-http-client/i, browser: 'Go HTTP client', os: 'API client' },
];

function parseBrowser(ua: string): string {
  const chromeMatch = ua.match(/(?:Chrome|CriOS)\/([\d.]+)/i);
  const edgMatch = ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/i);
  const firefoxMatch = ua.match(/Firefox\/([\d.]+)/i);
  const safariMatch = ua.match(/Version\/([\d.]+).*Safari/i);
  const oprMatch = ua.match(/OPR\/([\d.]+)/i);

  if (chromeMatch && !/edg/i.test(ua)) return `Chrome ${chromeMatch[1]}`;
  if (edgMatch) return `Edge ${edgMatch[1]}`;
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;
  if (oprMatch) return `Opera ${oprMatch[1]}`;
  if (safariMatch && !/chrome|chromium/i.test(ua)) return `Safari ${safariMatch[1]}`;
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'Unknown browser';
}

function parseOs(ua: string, hasBrowser: boolean): string {
  if (/windows nt 10/i.test(ua)) return 'Windows 10+';
  if (/windows/i.test(ua)) return 'Windows';
  const androidMatch = ua.match(/android ([\d.]+)/i);
  if (androidMatch) return `Android ${androidMatch[1]}`;
  if (/android/i.test(ua)) return 'Android';
  if (/ipad/i.test(ua)) return 'iPadOS';
  if (/iphone|ipod/i.test(ua)) return 'iOS';
  const macMatch = ua.match(/mac os x ([\d_]+)/i);
  if (macMatch) return `macOS ${macMatch[1].replace(/_/g, '.')}`;
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (hasBrowser) return 'Desktop';
  return 'Unknown OS';
}

function parseDeviceType(ua: string): string {
  if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) return 'mobile';
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * Parse a user-agent string into display-friendly browser/OS labels.
 * Shared by auth session creation and users session listing.
 */
export function parseUserAgent(rawUa: string | null | undefined): ParsedDeviceInfo {
  const ua = typeof rawUa === 'string' ? rawUa.trim() : '';
  if (!ua) {
    return { type: 'desktop', browser: 'Unknown device', os: 'Unknown platform' };
  }

  for (const pattern of API_CLIENT_PATTERNS) {
    if (pattern.test.test(ua)) {
      return {
        type: 'desktop',
        browser: pattern.browser,
        os: pattern.os ?? 'API client',
      };
    }
  }

  const browser = parseBrowser(ua);
  const hasBrowser = browser !== 'Unknown browser';
  const os = parseOs(ua, hasBrowser);

  return {
    type: parseDeviceType(ua),
    browser,
    os,
  };
}
