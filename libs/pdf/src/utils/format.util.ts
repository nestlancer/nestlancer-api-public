export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(paise: number, currency = 'INR'): string {
  const amount = paise / 100;
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

/** Table cells in demo templates omit the ₹ prefix and use fixed decimals. */
export function formatMoneyCell(paise: number, currency = 'INR'): string {
  const amount = paise / 100;
  if (currency === 'INR') {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount.toFixed(2);
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const parsed = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** NL-BUG-PDF-004: never print internal payment enums on customer documents. */
export function formatPaymentMethodLabel(raw?: string | null): string {
  const value = String(raw || '').trim();
  if (!value) return 'Online';
  const key = value.toLowerCase().replace(/[\s-]+/g, '_');
  const map: Record<string, string> = {
    manual: 'Manual / bank transfer',
    bank_transfer: 'Bank transfer',
    banktransfer: 'Bank transfer',
    offline: 'Manual / bank transfer',
    razorpay: 'Online (Razorpay)',
    upi: 'UPI',
    card: 'Card',
    credit_card: 'Credit card',
    debit_card: 'Debit card',
    netbanking: 'Net banking',
    wallet: 'Wallet',
    cash: 'Cash',
  };
  if (map[key]) return map[key];
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** NL-BUG-PDF-004: customer-facing payment status wording. */
export function formatPaymentStatusLabel(raw?: string | null): string {
  const value = String(raw || '').trim();
  if (!value) return '';
  const key = value.toUpperCase().replace(/[\s-]+/g, '_');
  const map: Record<string, string> = {
    COMPLETED: 'Paid',
    PAID: 'Paid',
    PENDING: 'Pending',
    CREATED: 'Awaiting payment',
    PROCESSING: 'Processing',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
    PARTIALLY_REFUNDED: 'Partially refunded',
    CANCELLED: 'Cancelled',
    CANCELED: 'Cancelled',
    DISPUTED: 'Disputed',
  };
  if (map[key]) return map[key];
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function splitAddressLines(address?: string): string[] {
  if (!address) return [];
  return address
    .split(/,\s*|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

const BELOW_TWENTY = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return BELOW_TWENTY[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${TENS[tens]} ${BELOW_TWENTY[ones]}` : TENS[tens];
}

function threeDigits(n: number): string {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (hundred === 0) return twoDigits(rest);
  return rest
    ? `${BELOW_TWENTY[hundred]} Hundred ${twoDigits(rest)}`
    : `${BELOW_TWENTY[hundred]} Hundred`;
}

function convertIndianNumber(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${convertIndianNumber(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function amountInWords(paise: number, currency = 'INR'): string {
  const rupees = Math.floor(paise / 100);
  if (currency !== 'INR') {
    return `${formatMoney(paise, currency)} only`;
  }
  return `Rupees ${convertIndianNumber(rupees)} Only`;
}

export function termsToListHtml(terms: string): string {
  const lines = terms
    .split(/\n+/)
    .map((line) => line.trim())
    // Drop leading "1. " / "2) " so <ol> does not double-number (L4 audit).
    .map((line) => line.replace(/^\d+[\.\)]\s+/, '').trim())
    .filter(Boolean);
  if (lines.length === 0) return '';
  if (lines.length === 1) {
    return `<ol><li>${escapeHtml(lines[0])}</li></ol>`;
  }
  return `<ol>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol>`;
}
