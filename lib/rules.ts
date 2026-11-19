export type ManilaNow = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const manilaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const pesoFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const part = parts.find((candidate) => candidate.type === type);
  if (!part) {
    throw new Error(`Missing ${type} in Manila date parts`);
  }
  return Number(part.value);
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

function parseDate(date: string): Date {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new RangeError(`Expected a YYYY-MM-DD date, received "${date}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  if (!isRealDate) {
    throw new RangeError(`"${date}" is not a real calendar date`);
  }
  return parsed;
}

export function manilaNow(now: Date = new Date()): ManilaNow {
  const parts = manilaFormatter.formatToParts(now);
  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour"),
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second"),
  };
}

export function manilaToday(now: Date = new Date()): string {
  const { year, month, day } = manilaNow(now);
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function addDays(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return `${pad(parsed.getUTCFullYear(), 4)}-${pad(parsed.getUTCMonth() + 1, 2)}-${pad(parsed.getUTCDate(), 2)}`;
}

export function formatPeso(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₱${pesoFormatter.format(Math.abs(amount))}`;
}
