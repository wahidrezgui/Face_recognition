import type { ReportRow } from '@/types/reports';

export interface EmployeeRowGroup {
    empId: number | string;
    fullname_ar: string | null;
    fullname_en: string | null;
    military_number: number | string | null;
    rows: ReportRow[];
}

export interface DepartmentRowGroup {
    department: string;
    employees: EmployeeRowGroup[];
}

/**
 * Groups report rows by department, then by employee within it (an employee's id is stable
 * across their multiple issue-day rows in a date-range report), sorting departments and
 * employees alphabetically and each employee's own rows by date. Pure data transform, no
 * i18n/formatting — callers (CSV/print builders) decide how to render the group headers.
 */
export function groupRowsByDepartmentThenEmployee(rows: ReportRow[]): DepartmentRowGroup[] {
    const departments = new Map<string, Map<string, EmployeeRowGroup>>();

    for (const row of rows) {
        const departmentKey = row.department ?? '';
        const employees = departments.get(departmentKey) ?? new Map<string, EmployeeRowGroup>();
        departments.set(departmentKey, employees);

        const employeeKey = String(row.id);
        const employee = employees.get(employeeKey) ?? {
            empId: row.id,
            fullname_ar: row.fullname_ar ?? null,
            fullname_en: row.fullname_en ?? null,
            military_number: row.military_number ?? null,
            rows: [],
        };
        employee.rows.push(row);
        employees.set(employeeKey, employee);
    }

    return Array.from(departments.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'ar'))
        .map(([department, employees]) => ({
            department,
            employees: Array.from(employees.values())
                .sort((a, b) => (a.fullname_ar ?? '').localeCompare(b.fullname_ar ?? '', 'ar'))
                .map((employee) => ({
                    ...employee,
                    rows: [...employee.rows].sort((a, b) =>
                        String(a.mvdate ?? '').localeCompare(String(b.mvdate ?? '')),
                    ),
                })),
        }));
}
