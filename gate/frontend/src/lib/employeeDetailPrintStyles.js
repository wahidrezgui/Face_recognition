export const employeeDetailPrintStyles = `
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; }
body {
    margin: 0;
    padding: 0;
    font-family: Arial, Tahoma, sans-serif;
    color: #111827;
    background: #fff;
    direction: rtl;
}
.print-report {
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
}
.print-report__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #8a1538;
}
.print-report__org {
    margin: 0 0 0.25rem;
    font-size: 11px;
    color: #64748b;
}
.print-report__title {
    margin: 0;
    font-size: 20px;
    color: #8a1538;
}
.print-report__date {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #334155;
}
.print-report__section {
    margin-bottom: 1rem;
    break-inside: avoid;
    page-break-inside: avoid;
}
.print-report__section-title {
    margin: 0 0 0.5rem;
    padding: 0.35rem 0.6rem;
    font-size: 13px;
    color: #fff;
    background: #8a1538;
    border-radius: 4px;
}
.print-report__employee {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
}
.print-report__photo {
    width: 88px;
    height: 88px;
    object-fit: cover;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    flex-shrink: 0;
}
.print-report__info-table,
.print-report__summary-table,
.print-report__data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
}
.print-report__info-table {
    flex: 1;
}
.print-report__info-table th,
.print-report__summary-table th,
.print-report__data-table th {
    width: 12%;
    padding: 0.4rem 0.5rem;
    text-align: right;
    background: #f8fafc;
    border: 1px solid #d1d5db;
    color: #475569;
    font-weight: 700;
}
.print-report__info-table td,
.print-report__summary-table td,
.print-report__data-table td {
    padding: 0.4rem 0.5rem;
    border: 1px solid #d1d5db;
    text-align: right;
    vertical-align: top;
}
.print-report__data-table thead th {
    background: #f3e4e9;
    color: #6e1029;
}
.print-report__status {
    margin-top: 0.5rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid #fecaca;
    background: #fef2f2;
    border-radius: 4px;
    font-size: 11px;
}
.print-report__status .text-red,
.print-report__status li {
    color: #dc2626;
    margin: 0.15rem 0;
}
.print-report__status ul {
    margin: 0;
    padding: 0;
    list-style: none;
}
.print-report__notes {
    margin-top: 0.5rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 4px;
    font-size: 11px;
}
.print-report__empty {
    text-align: center;
    color: #64748b;
    font-style: italic;
}
`;
