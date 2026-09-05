export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function fmtVp(n: number): string {
  return `${fmtNum(n)} VP`;
}

export function fmtKc(n: number): string {
  return `${fmtNum(n)} KC`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function fmtCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hms = `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return d > 0 ? `${d}D ${hms}` : hms;
}

export function fmtAgo(unixSeconds: number, now: number = Date.now() / 1000): string {
  const diff = Math.max(0, now - unixSeconds);
  if (diff < 60) return "JUST NOW";
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

export function fmtDays(days: number): string {
  if (days <= 0) return "TODAY";
  if (days === 1) return "1 DAY AGO";
  return `${days} DAYS AGO`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function monthLabel(year: number, month0: number): string {
  return `${MONTHS[month0]} ${year}`;
}

export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function fmtRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s <= 0) return "Ended";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${pad(m)}m left`;
  if (m > 0) return `${m}m ${pad(s % 60)}s left`;
  return `${s}s left`;
}

export function isEndingSoon(seconds: number): boolean {
  return seconds > 0 && seconds < 3600;
}
