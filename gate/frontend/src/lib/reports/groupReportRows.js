const ENTRY_TYPES = new Set(['دخول', 'check-in', 'check in']);
const EXIT_TYPES = new Set(['خروج', 'check-out', 'check out']);

function normalizeMvtype(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isEntryMovement(row) {
  return ENTRY_TYPES.has(normalizeMvtype(row.mvtype));
}

export function isExitMovement(row) {
  return EXIT_TYPES.has(normalizeMvtype(row.mvtype));
}

export function getPersonGroupKey(row) {
  if (row.id != null && row.id !== '') {
    return String(row.id);
  }
  return String(row.military_number ?? row.fullname_ar ?? '');
}

export function countEntryExit(rows) {
  let entryCount = 0;
  let exitCount = 0;

  for (const row of rows) {
    if (isEntryMovement(row)) {
      entryCount += 1;
    } else if (isExitMovement(row)) {
      exitCount += 1;
    }
  }

  return { entryCount, exitCount };
}

export function groupRowsByPerson(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = getPersonGroupKey(row);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(row);
  }

  return Array.from(groups.values()).map((details) => {
    const counts = countEntryExit(details);
    return {
      summary: details[0],
      entryCount: counts.entryCount,
      exitCount: counts.exitCount,
      details: details.map((detail, index) => ({
        ...detail,
        numbering: index + 1,
      })),
    };
  });
}
