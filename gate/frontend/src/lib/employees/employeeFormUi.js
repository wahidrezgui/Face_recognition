export const EMPLOYEE_FILTER_INPUT_CLASS =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';

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

export function emptyGuest() {
  return {
    fullname_en: '',
    Job_En: '',
    fullname_ar: '',
    qrcode: '',
    military_number: '',
    phone_number: null,
    expiry_date: '',
    qid: null,
    gender_id: null,
    nationality_id: null,
    dep_id: null,
    rank_id: null,
    default_base: 0,
    selectedZones: [],
    id: null,
    plate_number: '',
    dep_name: '',
    nationality: '',
    ranke: '',
    dep3: '',
    bloodtype: '',
    nationalitye: '',
    remarks: '',
    photo: null,
    photoPreview: null,
    photoFile: null,
    dep_parent_id: null,
  };
}

export const EMPLOYEE_PHOTO_PLACEHOLDER = (
  "data:image/svg+xml,"
  + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    + '<circle cx="16" cy="16" r="16" fill="#e2e8f0"/>'
    + '<circle cx="16" cy="12" r="5" fill="#94a3b8"/>'
    + '<path d="M6 27c1.5-5 6-8 10-8s8.5 3 10 8" fill="#94a3b8"/>'
    + '</svg>',
  )
);

export function employeePhotoUrl(photo) {
  if (!photo) {
    return EMPLOYEE_PHOTO_PLACEHOLDER;
  }

  const path = String(photo);
  return path.startsWith('/') ? path : `/${path}`;
}

export function employeePhotoSrc(guest) {
  if (guest?.photoPreview) {
    return guest.photoPreview;
  }

  return employeePhotoUrl(guest?.photo);
}

export function revokeEmployeePhotoPreview(guest) {
  if (guest?.photoPreview?.startsWith('blob:')) {
    URL.revokeObjectURL(guest.photoPreview);
  }

  if (guest) {
    guest.photoPreview = null;
    guest.photoFile = null;
  }
}

export function applyEmployeePhotoFile(guest, event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    return null;
  }

  if (!file.type.startsWith('image/')) {
    return null;
  }

  revokeEmployeePhotoPreview(guest);
  guest.photoFile = file;
  guest.photoPreview = URL.createObjectURL(file);
  return file;
}

export function resolveEmployeePhotoFile(guest, formElement, explicitPhotoFile = null) {
  if (explicitPhotoFile instanceof File) {
    return explicitPhotoFile;
  }

  if (guest?.photoFile instanceof File) {
    return guest.photoFile;
  }

  const input = formElement?.querySelector?.('input[type="file"][name="photo"]');
  const inputFile = input?.files?.[0];
  return inputFile instanceof File ? inputFile : null;
}

export function appendEmployeePhotoToFormData(formData, guest, formElement, explicitPhotoFile = null) {
  const file = resolveEmployeePhotoFile(guest, formElement, explicitPhotoFile);
  if (!(file instanceof File)) {
    return false;
  }

  formData.delete('photo');
  formData.append('photo', file, file.name);
  return true;
}

export function treeSelectValue(value) {
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    return keys[0] ?? '';
  }

  return value ?? '';
}

export function buildEmployeeSaveFormData(formElement, guest, extraFields = {}, explicitPhotoFile = null) {
  const formData = new FormData();

  if (formElement) {
    const raw = new FormData(formElement);
    for (const [key, value] of raw.entries()) {
      if (key === 'photo' || value instanceof File) {
        continue;
      }
      formData.append(key, value);
    }
  }

  Object.entries(extraFields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.set(key, value);
    }
  });

  appendEmployeePhotoToFormData(formData, guest, formElement, explicitPhotoFile);

  return formData;
}

export function employeeStatusCellRenderer(params) {
  const status = EMPLOYEE_STATUS_LABELS[params.value];
  if (!status) {
    return '';
  }

  return `<span class="py-1 px-3 rounded text-xs ${status.className}">${status.text}</span>`;
}

export function employeePhotoCellRenderer(params) {
  const cellValue = params.value;
  const src = employeePhotoUrl(cellValue);
  const fallback = EMPLOYEE_PHOTO_PLACEHOLDER;

  if (cellValue != null && cellValue !== '') {
    return `<img src="${src}" alt="" class="object-cover w-8 h-8 rounded-full mt-2" onerror="this.onerror=null;this.src='${fallback}'" />`;
  }

  return `<img src="${fallback}" alt="" class="object-cover w-8 h-8 rounded-full mt-2" />`;
}

export function employeeCountLabelFromTotal(total) {
  if (total === 1) {
    return 'موظف واحد';
  }
  return `${total} موظف`;
}

export function isMovementCheckIn(mvtype) {
  const text = String(mvtype ?? '').toLowerCase();
  return text.includes('check-in') || text === 'دخول';
}

export function isMovementCheckOut(mvtype) {
  const text = String(mvtype ?? '').toLowerCase();
  return text.includes('check-out') || text === 'خروج';
}

export function movementTypeLabel(movement) {
  return movement?.mvtype || movement?.mvtype_raw || '—';
}

export function movementCreatedByName(movement) {
  if (!movement?.createdby_id) {
    return '—';
  }

  return movement.created_by_name || '—';
}

export function needsWhiteBorder(color) {
  if (!color) {
    return false;
  }

  const lightColors = ['#FFFFFF', '#FFFF00', '#00FFFF', '#FFCC00', '#FFF', '#FACC15'];
  return lightColors.includes(String(color).toUpperCase());
}
