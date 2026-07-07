import { buildMergedColumnDefs } from './agGridRenderers';

const NUMBERING_COLUMN = { headerName: 'م', field: 'numbering' };

export function reorderColumns(mergedColumnDefs, fieldOrder, { includeNumbering = false } = {}) {
  const columns = [];

  if (includeNumbering) {
    columns.push(NUMBERING_COLUMN);
  }

  for (const field of fieldOrder) {
    if (field === 'numbering') {
      continue;
    }
    const col = mergedColumnDefs.find((c) => c.field === field);
    if (col) {
      columns.push(col);
    }
  }

  return columns;
}

export function buildExportColumnDefs(mergedColumnDefs, preset, { forPdf = false } = {}) {
  const fieldOrder = forPdf ? preset.pdfColumnFields : preset.exportColumnFields;
  const includeNumbering = forPdf && fieldOrder.includes('numbering');
  let columns = reorderColumns(mergedColumnDefs, fieldOrder, { includeNumbering });

  if (!forPdf && preset.exportIncludeRemaining) {
    const usedFields = new Set(preset.exportColumnFields);
    columns = [
      ...columns,
      ...mergedColumnDefs.filter((col) => !usedFields.has(col.field)),
    ];
  }

  return columns.filter(Boolean);
}

export function processIssueRowsForExport(rows) {
  return rows.map((row) => {
    const newRow = { ...row };
    if (row.hasEntryIssue) {
      newRow.dakhool = `${newRow.dakhool ?? ''} ⚠️`;
    }
    if (row.hasExitIssue) {
      newRow.khorooj = `${newRow.khorooj ?? ''} ⚠️`;
    }
    return newRow;
  });
}

export function prepareExportRows(rows, preset) {
  if (preset.pdfOptions?.issueHighlight && preset.exportColumnFields?.includes('dakhool')) {
    return processIssueRowsForExport(rows);
  }
  return rows;
}

export function exportGridCsv(gridRef, { mergedColumnDefs, preset, rows }) {
  const columns = buildExportColumnDefs(mergedColumnDefs, preset, { forPdf: false });
  const processedRows = prepareExportRows(rows, preset);

  gridRef.setColumnDefs(columns);
  gridRef.setRowData(processedRows);
  gridRef.exportDataAsCsv({
    allColumns: true,
    columnKeys: columns.map((col) => col.field),
    fileName: preset.csvFileName,
  });
}

export function columnsFromResponse(responseColumns, preset, options = {}) {
  return buildExportColumnDefs(buildMergedColumnDefs(responseColumns), preset, options);
}
