const MONTH_MAP = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

/** Normalize guest note day strings to YYYY-MM-DD for the API. */
export function formatNoteDay(dateString) {
  if (!dateString) {
    return '';
  }

  const str = String(dateString).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Backend guestInfo uses date('d M, Y') → "07 Jul, 2026"
  const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = MONTH_MAP[dmyMatch[2]] ?? dmyMatch[2];
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const normalized = str.replace(',', '').trim();
  const parts = normalized.split(/\s+/);

  // "Mon Jul 2 2026" (weekday + month + day + year)
  if (parts.length >= 4 && MONTH_MAP[parts[1]]) {
    const month = MONTH_MAP[parts[1]];
    const day = parts[2].padStart(2, '0');
    const year = parts[3];
    return `${year}-${month}-${day}`;
  }

  // "Jul 2 2026" (month + day + year)
  if (parts.length >= 3 && MONTH_MAP[parts[0]]) {
    const month = MONTH_MAP[parts[0]];
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return str;
}
