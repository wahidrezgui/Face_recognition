import {
    fetchAttendanceReport,
    fetchIssuesReport,
    fetchIndividualReport,
} from '../api/reports';

export const reportSearchPresets = {
    individual: {
        key: 'individual',
        dateMode: 'range',
        requireDate: false,
        fetchFn: fetchIndividualReport,
        extraParams: {},
    },
    reports: {
        key: 'reports',
        dateMode: 'single',
        requireDate: true,
        fetchFn: fetchAttendanceReport,
        extraParams: { type: 'basic_date' },
    },
    issues: {
        key: 'issues',
        dateMode: 'single',
        requireDate: true,
        fetchFn: fetchAttendanceReport,
        extraParams: { type: 'daily_issues' },
    },
    export: {
        key: 'export',
        dateMode: 'range',
        requireDate: false,
        fetchFn: fetchIssuesReport,
        extraParams: { status: 'export' },
    },
    unjustified: {
        key: 'unjustified',
        dateMode: 'range',
        requireDate: false,
        fetchFn: fetchIssuesReport,
        extraParams: { status: 'unjustified' },
    },
    justified: {
        key: 'justified',
        dateMode: 'range',
        requireDate: false,
        fetchFn: fetchIssuesReport,
        extraParams: { status: 'justified' },
    },
};

export function getReportSearchPreset(key) {
    return reportSearchPresets[key] ?? reportSearchPresets.individual;
}
