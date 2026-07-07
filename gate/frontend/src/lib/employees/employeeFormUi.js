export const EMPLOYEE_INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

export const EMPLOYEE_INPUT_LTR_CLASS =
  `${EMPLOYEE_INPUT_CLASS} text-left`;

export const EMPLOYEE_DROPDOWN_CLASS = 'w-full';

export const EMPLOYEE_GENDER_OPTIONS = [
  { id: 1, name_ar: 'ذكر', name_en: 'Male' },
  { id: 2, name_ar: 'أنثى', name_en: 'Female' },
];

export const EMPLOYEE_STATUS_LABELS = {
  0: { text: 'معلّق', className: 'bg-amber-100 text-amber-800' },
  1: { text: 'معتمد', className: 'bg-emerald-100 text-emerald-800' },
  2: { text: 'مطبوع', className: 'bg-sky-100 text-sky-800' },
  3: { text: 'تم الاستلام', className: 'bg-brand/15 text-brand' },
};

export const EMPLOYEE_STATUS_FILTER_OPTIONS = [
  { id: '', label_ar: 'الكل' },
  { id: 0, label_ar: 'معلّق' },
  { id: 1, label_ar: 'معتمد' },
  { id: 2, label_ar: 'مطبوع' },
  { id: 3, label_ar: 'تم الاستلام' },
];

export function employeeCountLabel(count) {
  if (count === 1) {
    return 'موظف واحد';
  }
  if (count === 2) {
    return 'موظفين';
  }
  if (count >= 3 && count <= 10) {
    return `${count} موظفين`;
  }
  return `${count} موظف`;
}

function normalizeEmployeeStatus(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  return Number(value);
}

/** Bulk bar actions from status filter and/or selected row statuses. */
export function resolveEmployeeBulkActions({ filterStatusId, selectedRows = [] }) {
  const statuses = new Set();

  const filterStatus = normalizeEmployeeStatus(filterStatusId);
  if (filterStatus !== null) {
    statuses.add(filterStatus);
  }

  for (const row of selectedRows) {
    const rowStatus = normalizeEmployeeStatus(row.status);
    if (rowStatus !== null) {
      statuses.add(rowStatus);
    }
  }

  return {
    canApprove: statuses.has(0),
    canUnapprove: statuses.has(1) || statuses.has(2) || statuses.has(3),
    canPrint: statuses.has(1) || statuses.has(2),
    canCollect: statuses.has(2),
  };
}

export function buildEmployeeBulkConfirm(action, count) {
  const label = employeeCountLabel(count);

  const configs = {
    delete: {
      title: 'تأكيد الحذف',
      message: `هل تريد حذف ${label} من القائمة؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'نعم، احذف',
      confirmVariant: 'danger',
    },
    approve: {
      title: 'اعتماد الموظفين',
      message: `هل تريد اعتماد ${label} ونقلهم إلى حالة «معتمد»؟`,
      confirmLabel: 'نعم، اعتماد',
      confirmVariant: 'primary',
    },
    unapprove: {
      title: 'إلغاء الاعتماد',
      message: `هل تريد إلغاء اعتماد ${label} وإرجاعهم إلى حالة «معلّق»؟`,
      confirmLabel: 'نعم، إلغاء الاعتماد',
      confirmVariant: 'primary',
    },
    collect: {
      title: 'تأكيد الاستلام',
      message: `هل تريد تأكيد استلام بطاقات ${label}؟`,
      confirmLabel: 'نعم، تأكيد الاستلام',
      confirmVariant: 'primary',
    },
    print: {
      title: 'طباعة البطاقات',
      message: `هل تريد طباعة بطاقات ${label}؟`,
      confirmLabel: 'نعم، طباعة',
      confirmVariant: 'primary',
    },
  };

  return configs[action] ?? configs.approve;
}

export function buildEmployeeGridColumns(columns = []) {
  const normalized = columns
    .filter((column) => column.field !== 'id' && column.headerName !== 'الرقم القاعدي')
    .map((column) => {
      if (column.colId === 'selection' || column.checkboxSelection) {
        return {
          ...column,
          headerName: '',
          field: undefined,
          colId: 'selection',
          width: 56,
          maxWidth: 56,
          minWidth: 56,
          sortable: false,
          filter: false,
          resizable: false,
          suppressMenu: true,
          pinned: 'right',
          checkboxSelection: true,
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          headerCheckboxSelectionCurrentPageOnly: true,
        };
      }

      return column;
    });

  if (!normalized.some((column) => column.colId === 'selection')) {
    normalized.unshift({
      headerName: '',
      colId: 'selection',
      width: 56,
      maxWidth: 56,
      minWidth: 56,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMenu: true,
      pinned: 'right',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      headerCheckboxSelectionCurrentPageOnly: true,
    });
  }

  return normalized;
}

export function employeeInputClass(invalid = false) {
  return invalid
    ? `${EMPLOYEE_INPUT_CLASS} border-red-500 focus:border-red-500 focus:ring-red-500/20`
    : EMPLOYEE_INPUT_CLASS;
}

export function needsWhiteBorder(color) {
  if (!color) {
    return false;
  }

  const lightColors = ['#FFFFFF', '#FFFF00', '#00FFFF', '#FFCC00', '#FFF', '#FACC15'];
  return lightColors.includes(String(color).toUpperCase());
}
