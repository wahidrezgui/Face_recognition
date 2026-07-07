import { groupRowsByPerson } from './groupReportRows.js';

export function buildReportDateLines(filters, dateMode) {
  if (dateMode === 'single' && filters.date) {
    return [`التاريخ: ${filters.date}`];
  }

  if (dateMode === 'range' && filters.fromDate && filters.toDate) {
    return [`من: ${filters.fromDate} إلى: ${filters.toDate}`];
  }

  return [];
}

function getPdfCellStyle(col, row, pdfOptions = {}) {
  if (!pdfOptions.issueHighlight) {
    return '';
  }
  if (col.field === 'dakhool' && row.hasEntryIssue) {
    return 'color: red;';
  }
  if (col.field === 'khorooj' && row.hasExitIssue) {
    return 'color: red;';
  }
  return '';
}

function getPdfCellValue(row, col, pdfOptions = {}) {
  if (pdfOptions.blankNotes && col.field === 'notes') {
    return '';
  }
  return row[col.field] ?? '';
}

function buildPrintMetadataLines() {
  const now = new Date();
  const currentDay = now.toLocaleDateString('ar-EG', { weekday: 'long' });
  const currentDate = now.toLocaleDateString('ar-EG');
  const currentTime = now.toLocaleTimeString('ar-EG');
  const userName = localStorage.getItem('user_name');

  return [
    `تاريخ الطباعة: ${currentDay}, ${currentDate}, في ${currentTime}`,
    `اسم المستخدم: ${userName}`,
  ];
}

function writeTableHeader(doc, columns) {
  doc.write('<thead><tr>');
  columns.forEach((col) => {
    doc.write(`<th>${col.headerName}</th>`);
  });
  doc.write('</tr></thead>');
}

function writeTableRows(doc, columns, rows, pdfOptions) {
  doc.write('<tbody>');
  rows.forEach((row) => {
    doc.write('<tr>');
    columns.forEach((col) => {
      const style = getPdfCellStyle(col, row, pdfOptions);
      const value = getPdfCellValue(row, col, pdfOptions);
      doc.write(`<td style="${style}">${value}</td>`);
    });
    doc.write('</tr>');
  });
  doc.write('</tbody>');
}

function pickColumns(columns, fieldOrder = []) {
  if (!fieldOrder.length) {
    return columns;
  }

  return fieldOrder
    .map((field) => columns.find((col) => col.field === field))
    .filter(Boolean);
}

function writeFlatTable(doc, columns, rows, pdfOptions) {
  doc.write('<table>');
  writeTableHeader(doc, columns);
  writeTableRows(doc, columns, rows, pdfOptions);
  doc.write('</table>');
}

function writePersonSummary(doc, group, personIndex) {
  const summary = group.summary;
  const name = summary.fullname_ar || summary.fullname_en || '—';
  const militaryNumber = summary.military_number ?? '—';
  const department = summary.department ?? '—';
  const rank = summary.rank ?? '—';

  doc.write('<table class="summary-table">');
  doc.write('<tbody><tr>');
  doc.write(`<td><strong>م:</strong> ${personIndex}</td>`);
  doc.write(`<td><strong>الاسم:</strong> ${name}</td>`);
  doc.write(`<td><strong>ر/ع:</strong> ${militaryNumber}</td>`);
  doc.write(`<td><strong>الرتبة:</strong> ${rank}</td>`);
  doc.write(`<td><strong>الوحدة:</strong> ${department}</td>`);
  doc.write(`<td><strong>دخول:</strong> ${group.entryCount}</td>`);
  doc.write(`<td><strong>خروج:</strong> ${group.exitCount}</td>`);
  doc.write('</tr></tbody>');
  doc.write('</table>');
}

function writeGroupedTables(doc, columns, rows, pdfOptions) {
  const detailColumns = pickColumns(columns, pdfOptions.detailColumnFields);
  const groups = groupRowsByPerson(rows);

  groups.forEach((group, index) => {
    doc.write('<div class="person-group">');
    writePersonSummary(doc, group, index + 1);
    doc.write('<table class="details-table">');
    writeTableHeader(doc, detailColumns);
    writeTableRows(doc, detailColumns, group.details, pdfOptions);
    doc.write('</table>');
    doc.write('<div class="person-spacer"></div>');
    doc.write('</div>');
  });
}

function writePrintStyles(doc, grouped) {
  doc.write('body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; position: relative; }');
  doc.write('table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }');
  doc.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }');
  doc.write('th { background-color: #f2f2f2; }');
  doc.write('h1, h3 { text-align: center; }');
  doc.write('.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: 0.1; width: 500px; height: auto; }');

  if (grouped) {
    doc.write('.person-group { page-break-inside: avoid; }');
    doc.write('.person-group table { margin-bottom: 0; }');
    doc.write('.summary-table { background: #f8fafc; }');
    doc.write('.summary-table td { font-size: 14px; }');
    doc.write('.person-spacer { height: 12px; }');
  }
}

export function openPrintableReport({ title, dateLines = [], columns, rows, pdfOptions = {} }) {
  const printWindow = window.open('', '', 'height=600,width=800');
  if (!printWindow) {
    return;
  }

  const grouped = Boolean(pdfOptions.groupByPerson);
  const doc = printWindow.document;

  doc.write('<html dir="rtl"><head><title></title>');
  doc.write('<style>');
  writePrintStyles(doc, grouped);
  doc.write('</style>');
  doc.write('</head><body>');
  doc.write('<img src="/armed.png" class="watermark" alt="Watermark">');
  doc.write(`<h1>${title}</h1>`);

  dateLines.forEach((line) => {
    doc.write(`<h3>${line}</h3>`);
  });

  buildPrintMetadataLines().forEach((line) => {
    doc.write(`<h3>${line}</h3>`);
  });

  if (grouped) {
    writeGroupedTables(doc, columns, rows, pdfOptions);
  } else {
    writeFlatTable(doc, columns, rows, pdfOptions);
  }

  doc.write('</body></html>');
  doc.close();
  printWindow.focus();
  printWindow.print();
}
