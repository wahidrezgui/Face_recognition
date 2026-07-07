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

/** Normalize guest note day strings (e.g. "Mon, Jul 2 2026") to YYYY-MM-DD for the API. */
export function formatNoteDay(dateString) {
  if (!dateString) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  const normalized = String(dateString).replace(',', '').trim();
  const parts = normalized.split(/\s+/);

  if (parts.length < 3) {
    return dateString;
  }

  const month = MONTH_MAP[parts[0]] ?? parts[0];
  const day = parts[1].padStart(2, '0');
  const year = parts[2];

  return `${year}-${month}-${day}`;
}
