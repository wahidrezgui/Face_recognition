export function buildEmployeeListParams({
  depId,
  currentPage,
  perPage,
  militaryNumber,
  fullnameAr,
  plateNumber,
  filterBaseId,
  filterZoneId,
  filterStatusId,
  companyOnly = false,
}) {
  const params = {
    dep_id: depId,
    page: currentPage,
    per_page: perPage,
  };

  const military = String(militaryNumber ?? '').trim();
  const name = String(fullnameAr ?? '').trim();
  const plate = String(plateNumber ?? '').trim();

  if (military) {
    params.military_number = military;
  }
  if (name) {
    params.fullname_ar = name;
  }
  if (plate) {
    params.plate_number = plate;
  }
  if (filterBaseId) {
    params.base_id = filterBaseId;
  }
  if (filterZoneId) {
    params.zone_id = filterZoneId;
  }
  if (filterStatusId !== '' && filterStatusId !== null && filterStatusId !== undefined) {
    params.status = filterStatusId;
  }
  if (companyOnly) {
    params.company_only = 1;
  }

  return params;
}

export function hasEmployeeFilters({
  militaryNumber,
  fullnameAr,
  plateNumber,
  filterBaseId,
  filterZoneId,
  filterStatusId,
}) {
  return [
    militaryNumber,
    fullnameAr,
    plateNumber,
    filterBaseId,
    filterZoneId,
    filterStatusId,
  ].some((value) => String(value ?? '').trim() !== '');
}

export function appendZoningToFormData(formData, selectedZones) {
  const zones = Array.isArray(selectedZones)
    ? selectedZones
    : (selectedZones ? Object.values(selectedZones) : []);

  zones.forEach((zoneId) => {
    if (zoneId !== null && zoneId !== undefined && zoneId !== '') {
      formData.append('zoning[]', zoneId);
    }
  });
}

export function applyEmployeeListResponse(payload, filterStatusId) {
  const result = {
    columns: payload.columns || [],
    statusCards: payload.data || [],
    rows: [],
    totalRows: 0,
  };

  if (payload.guests?.data) {
    result.rows = payload.guests.data;
    result.totalRows = payload.pagination?.total ?? payload.guests.total ?? 0;
    return result;
  }

  const bucket = payload.data?.find(
    (item) => String(item.id) === String(filterStatusId),
  ) ?? payload.data?.[0];

  if (bucket?.guests?.data) {
    result.rows = bucket.guests.data;
    result.totalRows = bucket.pagination?.total ?? 0;
  }

  return result;
}

export function resetCreateFieldValidity() {
  return {
    military_number: true,
    fullname_ar: true,
    remarks: true,
    bloodtype: true,
    fullname_en: true,
    Job_En: true,
    qid: true,
    expiry_date: true,
  };
}

export function validateCreateGuest(guest, fieldValidity) {
  const checks = [
    ['military_number', guest.military_number],
    ['fullname_ar', guest.fullname_ar],
    ['remarks', guest.remarks],
    ['bloodtype', guest.bloodtype],
    ['fullname_en', guest.fullname_en],
    ['Job_En', guest.Job_En],
    ['qid', guest.qid],
    ['expiry_date', guest.expiry_date],
  ];

  let valid = true;
  for (const [field, value] of checks) {
    const ok = String(value ?? '').trim() !== '';
    fieldValidity[field] = ok;
    if (!ok) {
      valid = false;
    }
  }

  return valid;
}
