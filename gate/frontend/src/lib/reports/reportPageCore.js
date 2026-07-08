import { useToast } from 'primevue/usetoast';
import { buildMergedColumnDefs } from './agGridRenderers.js';
import { exportGridCsv, buildExportColumnDefs } from './exportGridCsv.js';
import { openPrintableReport, buildReportDateLines } from './openPrintableReport.js';
import { reportSearchPresets } from '../../config/reportSearchPresets';
import { fetchEmployee, addEmployeeNote, deleteEmployeeNote } from '../../api/employees';
import { formatNoteDay } from './noteHelpers.js';
import { fetchCompanies } from '../../api/organization';
import {
  createDefaultFilters,
  resetFilters,
  buildReportParams,
  fetchReportLookups,
  getCachedReportLookups,
  fetchGatesForBases,
} from '../../composables/useReportFilters';

export function createDefaultGuest() {
  return {
    fullname_en: '',
    fullname_ar: '',
    qrcode: '',
    military_number: '',
    phone_number: null,
    qid: null,
    gender_id: null,
    nationality_id: null,
    dep_id: null,
    rank_id: null,
    default_base: 0,
    selectedZones: null,
    id: null,
  };
}

export function createDefaultNote() {
  return {
    emp_id: null,
    day: null,
    notes: null,
    created_by: localStorage.getItem('user_name'),
  };
}

export function createReportPageState(presetKey) {
  const depId = localStorage.getItem('dep_id');
  const searchPreset = reportSearchPresets[presetKey];

  return {
    searchPreset,
    filters: createDefaultFilters(),
    lookups: {
      departments: [],
      ranks: [],
      bases: [],
      gates: [],
      companies: [],
    },
    depId,
    activeTab: 10,
    currentPage: 1,
    perPage: searchPreset.defaultPerPage ?? 55,
    totalRows: 0,
    rowsPerPageOptions: [10, 20, 30],
    selectedPage: 1,
    agGridKey: 0,
    step: 0,
    ColumnsDef: [],
    RawData: [],
    RawDataStatus: [],
    blokGuest: false,
    isLoading: false,
    isChecked: true,
    note: createDefaultNote(),
    guest: createDefaultGuest(),
  };
}

export function createReportPageActions(state, { getReportGrid, printHtml }) {
  function isFlatResponse() {
    return state.searchPreset.responseShape === 'flat';
  }

  function applyReportResponse(response) {
    if (isFlatResponse()) {
      state.ColumnsDef = response.data.columns;
      state.RawData = response.data.data;
      state.totalRows = response.data.pagination.total;
      return;
    }

    state.step = response.data.data[state.agGridKey].id;
    state.ColumnsDef = response.data.columns;
    state.RawDataStatus = response.data.data;

    if (response.data.data[state.agGridKey].guests) {
      state.RawData = response.data.data[state.agGridKey].guests.data;
      state.totalRows = response.data.data[state.agGridKey].pagination.total;
    } else {
      state.RawData = [];
    }
  }

  function extractReportRows(response) {
    if (isFlatResponse()) {
      return response.data.data;
    }

    return response.data.data[state.agGridKey].guests.data;
  }

  async function fetchInitialData() {
    if (state.searchPreset.filterMode?.startsWith('company')) {
      try {
        const { data } = await fetchCompanies(state.depId);
        state.lookups.companies = data.companies ?? [];
      } catch (error) {
        console.error(error);
      }

      if (state.searchPreset.autoSearch) {
        getEmployees();
      }
      return;
    }

    const cached = getCachedReportLookups(state.depId);
    if (cached) {
      state.lookups.departments = cached.departments;
      state.lookups.ranks = cached.ranks;
      state.lookups.bases = cached.bases;
      return;
    }

    try {
      const data = await fetchReportLookups(state.depId);
      state.lookups.departments = data.departments;
      state.lookups.ranks = data.ranks;
      state.lookups.bases = data.bases;
    } catch (error) {
      console.error(error);
    }
  }

  async function loadGatesForBases(selectedBases) {
    if (!selectedBases || Object.keys(selectedBases).length === 0) {
      state.lookups.gates = [];
      return;
    }

    try {
      state.lookups.gates = await fetchGatesForBases(state.depId);
    } catch (error) {
      console.error('Error fetching gates:', error);
      state.lookups.gates = [];
    }
  }

  function buildSearchParams(pagination = {}) {
    return buildReportParams(state.filters, state.searchPreset, {
      page: pagination.page ?? state.currentPage,
      perPage: pagination.perPage ?? state.perPage,
    });
  }

  function buildExportParams(action) {
    return {
      ...buildReportParams(state.filters, state.searchPreset, {
        page: 1,
        perPage: state.totalRows,
      }),
      action,
    };
  }

  function resetFilterForm() {
    resetFilters(state.filters);
    state.lookups.gates = [];

    if (state.searchPreset.filterMode === 'companyIssues') {
      state.filters.selectedMvTypes = ['Check-In', 'Check-Out'];
    }
  }

  function getEmployees() {
    state.isLoading = true;
    const params = buildSearchParams();

    state.searchPreset.fetchFn(params)
      .then((response) => {
        applyReportResponse(response);
      })
      .finally(() => {
        state.isLoading = false;
      });
  }

  function onSubmit() {
    if (state.searchPreset.requireDate && !state.filters.date) {
      const toast = useToast();
      toast.add({
        severity: 'warn',
        summary: 'تحذير',
        detail: 'يرجى تحديد التاريخ',
        life: 3000,
      });
      return;
    }

    state.currentPage = 1;
    getEmployees();
  }

  function onGridPageChange({ page, perPage }) {
    state.currentPage = page;
    if (perPage) {
      state.perPage = perPage;
    }
    getEmployees();
  }

  function onGridReady() { }

  function onSelectionChanged() { }

  function OnClicked(event) {
    const id = event.data.id;
    const mvdate = event.data.mvdate || event.data.day || state.filters.date;
    state.activeTab = 10;

    fetchEmployee(id, { day: mvdate })
      .then((response) => {
        state.guest = response.data[0];
        state.note.emp_id = state.guest.id;
        state.note.day = state.guest.day;
      });

    state.blokGuest = true;
  }

  function addNotes() {
    addEmployeeNote(state.note).then(() => {
      state.note.notes = '';
      getEmployees();
      state.blokGuest = false;
    });
  }

  function deleteNote() {
    if (!state.searchPreset.allowDeleteNote) {
      return;
    }

    if (!window.confirm('هل أنت متأكد أنك تريد حذف هذه الملاحظة؟')) {
      return;
    }

    const formattedDate = formatNoteDay(state.note.day) || state.filters.date;

    if (!formattedDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
      const toast = useToast();
      toast.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'تعذر تحديد تاريخ الملاحظة',
        life: 3000,
      });
      return;
    }

    deleteEmployeeNote({
      emp_id: state.note.emp_id,
      day: formattedDate,
      created_by: localStorage.getItem('user_name'),
    }).then(() => {
      state.guest.notes = '';
      getEmployees();
    }).catch(() => {
      const toast = useToast();
      toast.add({
        severity: 'error',
        summary: 'خطأ',
        detail: 'تعذر حذف الملاحظة',
        life: 3000,
      });
    });
  }

  function resetForm() {
    resetFilterForm();
  }

  function print() {
    printHtml?.('printMe');
  }

  function onBtPdf() {
    state.isLoading = true;
    const preset = state.searchPreset;

    preset.fetchFn(buildExportParams(preset.pdfAction))
      .then((response) => {
        const rows = extractReportRows(response);
        const mergedColumnDefs = buildMergedColumnDefs(response.data.columns);
        const columns = buildExportColumnDefs(mergedColumnDefs, preset, { forPdf: true });
        const numberedRows = rows.map((row, index) => ({
          ...row,
          numbering: index + 1,
        }));

        openPrintableReport({
          title: preset.pdfTitle,
          dateLines: buildReportDateLines(state.filters, preset.dateMode),
          columns,
          rows: numberedRows,
          pdfOptions: preset.pdfOptions,
        });
      })
      .finally(() => {
        state.isLoading = false;
      });
  }

  function onBtExport() {
    state.isLoading = true;
    const preset = state.searchPreset;
    const grid = getReportGrid?.();

    preset.fetchFn(buildExportParams(preset.excelAction))
      .then((response) => {
        const allData = extractReportRows(response);
        const mergedColumnDefs = buildMergedColumnDefs(response.data.columns);

        if (grid) {
          exportGridCsv(grid, {
            mergedColumnDefs,
            preset,
            rows: allData,
          });
        }
      })
      .finally(() => {
        state.isLoading = false;
      });
  }

  return {
    fetchInitialData,
    loadGatesForBases,
    buildSearchParams,
    buildExportParams,
    resetFilterForm,
    getEmployees,
    onSubmit,
    onGridPageChange,
    onGridReady,
    onSelectionChanged,
    OnClicked,
    addNotes,
    deleteNote,
    resetForm,
    print,
    onBtPdf,
    onBtExport,
  };
}
