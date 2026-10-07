// Number / currency / date formatting helpers.
// Kept dependency-free (no Intl) so output is identical on Hermes (Android)
// and JavaScriptCore (iOS), and matches the web app's ₦ + toLocaleString style.

const groupThousands = (str) => str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function normalizeNumber(value, maxFractionDigits) {
  const n = Number(value);
  if (!isFinite(n)) return { negative: false, int: '0', frac: '' };
  const fixed = n.toFixed(maxFractionDigits);
  const negative = fixed.startsWith('-');
  const unsigned = negative ? fixed.slice(1) : fixed;
  const [intRaw, fracRaw = ''] = unsigned.split('.');
  const frac = fracRaw.replace(/0+$/, '');
  return { negative, int: groupThousands(intRaw || '0'), frac };
}

/** 1234567.891 -> "1,234,567.891" (up to `maxFractionDigits`, trailing zeros trimmed) */
export function formatNumber(value, maxFractionDigits = 3) {
  const { negative, int, frac } = normalizeNumber(value, maxFractionDigits);
  return `${negative ? '-' : ''}${int}${frac ? '.' + frac : ''}`;
}

/** Whole-number formatting for KPI cards: 1234.6 -> "1,235" */
export function formatNumberRound(value) {
  return formatNumber(value, 0);
}

/** Money with kobo only when present: 1500 -> "₦1,500", 1500.5 -> "₦1,500.5" */
export function formatNaira(value, maxFractionDigits = 2) {
  return `₦${formatNumber(value, maxFractionDigits)}`;
}

/** KPI-style whole naira: 45230.7 -> "₦45,231" */
export function formatNairaRound(value) {
  return `₦${formatNumber(value, 0)}`;
}

/** Signed money with the minus BEFORE the naira sign (web style): -1200 -> "-₦1,200" */
export function formatNairaSigned(value, maxFractionDigits = 2) {
  const n = Number(value) || 0;
  const { negative, int, frac } = normalizeNumber(Math.abs(n), maxFractionDigits);
  const body = `${int}${frac ? '.' + frac : ''}`;
  return `${n < 0 || negative ? '-' : ''}₦${body}`;
}

/** Quantities: max 2 decimals like the web's formatQty. */
export function formatQty(value) {
  return formatNumber(value, 2);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

/** "7 Oct 2026, 2:30 PM" */
export function formatDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = MONTHS[d.getMonth()] || '';
  const day = d.getDate();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${pad2(d.getMinutes())} ${ampm}`;
}

/** "7 Oct 2026" */
export function formatDateShort(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()] || ''} ${d.getFullYear()}`;
}

/** "2:30 PM" */
export function formatTime(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${pad2(d.getMinutes())} ${ampm}`;
}

/** Compact "just now" / "12m ago" / "3h ago" / "5d ago" relative label. */
export function formatRelative(ts) {
  const time = typeof ts === 'number' ? ts : new Date(ts).getTime();
  if (!time) return '';
  const diff = Date.now() - time;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateShort(new Date(time).toISOString());
}

/** Server uptime seconds -> "3d 4h 12m" */
export function formatDuration(totalSeconds) {
  let s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(s / 86400);
  s -= days * 86400;
  const hours = Math.floor(s / 3600);
  s -= hours * 3600;
  const mins = Math.floor(s / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || !parts.length) parts.push(`${mins}m`);
  return parts.join(' ');
}
