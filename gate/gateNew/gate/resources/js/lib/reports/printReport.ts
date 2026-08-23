import { trans } from 'laravel-vue-i18n';
import { withBase } from '@/lib/basePath';
import { BRAND_COLORS, STATUS_COLORS } from '@/theme/colors';
import type { ReportPreset, ReportRow } from '@/types/reports';
import { groupRowsByDepartmentThenEmployee } from './groupReportRows';

function escapeHtml(value: unknown): string {
    const text = value === null || value === undefined ? '' : String(value);

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildRowHtml(row: ReportRow, preset: ReportPreset): string {
    const cells = preset.columns
        .map((column) => {
            const value = row[column.field];
            const flagged =
                preset.issueHighlight &&
                column.issueField &&
                row[column.issueField];

            return `<td${flagged ? ' class="issue"' : ''}>${escapeHtml(value)}</td>`;
        })
        .join('');

    return `<tr>${cells}</tr>`;
}

function buildGroupedBody(rows: ReportRow[], preset: ReportPreset): string {
    const colCount = preset.columns.length;
    const groups = groupRowsByDepartmentThenEmployee(rows);

    return groups
        .map((group) => {
            const departmentRow = `<tr class="group-department"><td colspan="${colCount}">${escapeHtml(trans('reports.columns.department'))}: ${escapeHtml(group.department)}</td></tr>`;

            const employeeRows = group.employees
                .map((employee) => {
                    const employeeLabel = `${escapeHtml(trans('reports.columns.fullname'))}: ${escapeHtml(employee.fullname_ar ?? employee.fullname_en ?? '')} — ${escapeHtml(trans('reports.columns.militaryNumber'))}: ${escapeHtml(employee.military_number ?? '')}`;
                    const employeeHeader = `<tr class="group-employee"><td colspan="${colCount}">${employeeLabel}</td></tr>`;
                    const dataRows = employee.rows
                        .map((row) => buildRowHtml(row, preset))
                        .join('');

                    return employeeHeader + dataRows;
                })
                .join('');

            return departmentRow + employeeRows;
        })
        .join('');
}

/**
 * Client-side "print to PDF" — matches legacy's openPrintableReport.js: opens
 * a blank window, writes a full HTML table into it, and calls print(). No
 * server-side PDF library involved, relies on the browser's print-to-PDF.
 */
export function printReport(
    rows: ReportRow[],
    preset: ReportPreset,
    dateRangeLabel: string,
    printedByLabel: string,
): void {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        return;
    }

    const headers = preset.columns
        .map((column) => `<th>${escapeHtml(trans(column.headerKey))}</th>`)
        .join('');
    const body = preset.groupByDepartmentAndEmployee
        ? buildGroupedBody(rows, preset)
        : rows.map((row) => buildRowHtml(row, preset)).join('');

    printWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(trans(preset.titleKey))}</title>
                <style>
                    body { font-family: sans-serif; padding: 24px; }
                    h1 { font-size: 18px; margin-bottom: 4px; }
                    p { font-size: 12px; color: ${BRAND_COLORS.mutedText}; margin: 2px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th, td { border: 1px solid ${BRAND_COLORS.border}; padding: 6px 8px; font-size: 12px; text-align: start; }
                    th { background: ${BRAND_COLORS.headerBg}; }
                    td.issue { background: ${STATUS_COLORS.dangerBg}; color: ${STATUS_COLORS.dangerText}; }
                    tr.group-department td { background: ${BRAND_COLORS.headerBg}; font-weight: bold; }
                    tr.group-employee td { font-weight: 600; padding-inline-start: 20px; }
                    .watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.06; z-index: -1; }
                    .watermark img { width: 60%; }
                </style>
            </head>
            <body>
                <div class="watermark"><img src="${withBase('/armedforces.png')}" alt="" /></div>
                <h1>${escapeHtml(trans(preset.titleKey))}</h1>
                <p>${escapeHtml(dateRangeLabel)}</p>
                <p>${escapeHtml(printedByLabel)}</p>
                <table>
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}
