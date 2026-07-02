export function customCellRendererIn(params) {
    if (params.data.hasEntryIssue) {
        return `<span class="font-bold text-red p-4">${params.value}</span>`;
    }
    return `<span class="font-bold p-4">${params.value}</span>`;
}

export function customCellRendererOut(params) {
    if (params.data.hasExitIssue) {
        return `<span class="font-bold text-red p-4">${params.value}</span>`;
    }
    return `<span class="font-bold p-4">${params.value}</span>`;
}

export function customCellImgRenderer(params) {
    const cellValue = params.value;
    if (cellValue != null) {
        return `<img src="uploads/${cellValue}" class="object-cover w-8 h-8 rounded-full mt-2" />`;
    }
    return '<img src="uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" />';
}

export function customMvtypeRenderer(params) {
    const value = params.value ?? '';
    const text = String(value);
    const lower = text.toLowerCase();
    const isCheckIn = lower.includes('check-in') || text === 'دخول';
    const isCheckOut = lower.includes('check-out') || text === 'خروج';

    const wrap = (label, icon) => (
        `<span style="display:inline-flex;align-items:center;gap:6px;justify-content:flex-end;width:100%;direction:rtl">`
        + `<span>${label}</span>${icon}</span>`
    );

    if (isCheckIn) {
        const icon = (
            '<span style="display:inline-flex;align-items:center;justify-content:center;'
            + 'width:18px;height:18px;border-radius:9999px;background:#ecfdf5;color:#059669;'
            + 'font-size:11px;line-height:1" title="دخول" aria-hidden="true">→</span>'
        );
        return wrap(text, icon);
    }

    if (isCheckOut) {
        const icon = (
            '<span style="display:inline-flex;align-items:center;justify-content:center;'
            + 'width:18px;height:18px;border-radius:9999px;background:#fff1f2;color:#e11d48;'
            + 'font-size:11px;line-height:1" title="خروج" aria-hidden="true">←</span>'
        );
        return wrap(text, icon);
    }

    return `<span style="display:block;width:100%;text-align:right;direction:rtl">${text}</span>`;
}

export function buildMergedColumnDefs(columnsDef) {
    const modifiedColumnDefs = columnsDef.map((column) => ({
        ...column,
        cellStyle: {
            textAlign: 'right',
            direction: 'rtl',
            ...(column.cellStyle || {}),
        },
        headerClass: [column.headerClass, 'ag-right-aligned-header'].filter(Boolean).join(' '),
    }));

    const columnIn = modifiedColumnDefs.findIndex((column) => column.field === 'dakhool');
    if (columnIn !== -1) {
        modifiedColumnDefs[columnIn].cellRenderer = customCellRendererIn;
    }
    const columnOut = modifiedColumnDefs.findIndex((column) => column.field === 'khorooj');
    if (columnOut !== -1) {
        modifiedColumnDefs[columnOut].cellRenderer = customCellRendererOut;
    }
    const mvtypeCol = modifiedColumnDefs.findIndex((column) => column.field === 'mvtype');
    if (mvtypeCol !== -1) {
        modifiedColumnDefs[mvtypeCol].cellRenderer = customMvtypeRenderer;
        modifiedColumnDefs[mvtypeCol].minWidth = modifiedColumnDefs[mvtypeCol].minWidth || 110;
    }
    const colIndex = modifiedColumnDefs.findIndex((column) => column.headerName === 'Photo');
    if (colIndex !== -1) {
        modifiedColumnDefs[colIndex].cellRenderer = customCellImgRenderer;
    }
    return modifiedColumnDefs;
}
