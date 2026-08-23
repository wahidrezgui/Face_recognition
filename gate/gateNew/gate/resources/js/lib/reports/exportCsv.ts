import { trans } from 'laravel-vue-i18n';
import type { ReportPreset, ReportRow } from '@/types/reports';

function csvEscape(value: unknown): string {
    const text = value === null || value === undefined ? '' : String(value);

    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Client-side CSV export — matches legacy's actual behavior (its "Excel"
 * button is ag-Grid's built-in CSV export, not a real .xlsx). Annotates
 * issue-flagged check-in/check-out cells with a warning emoji when the
 * preset highlights issues, matching legacy's export column annotation.
 */
export function exportReportCsv(rows: ReportRow[], preset: ReportPreset): void {
    const headers = preset.columns.map((column) => trans(column.headerKey));
    const lines = [headers.map(csvEscape).join(',')];

    for (const row of rows) {
        const cells = preset.columns.map((column) => {
            const value = row[column.field];
            const flagged =
                preset.issueHighlight &&
                column.issueField &&
                row[column.issueField];

            return csvEscape(flagged ? `⚠️ ${value ?? ''}` : value);
        });
        lines.push(cells.join(','));
    }

    const blob = new Blob([`﻿${lines.join('\r\n')}`], {
        type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = preset.csvFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
