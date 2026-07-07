import { buildMergedColumnDefs } from '../lib/reports/agGridRenderers.js';
import {
  createReportPageActions,
  createReportPageState,
} from '../lib/reports/reportPageCore.js';

const REPORT_PAGE_METHODS = [
  'fetchInitialData',
  'loadGatesForBases',
  'buildSearchParams',
  'buildExportParams',
  'resetFilterForm',
  'getEmployees',
  'onSubmit',
  'onGridPageChange',
  'onGridReady',
  'onSelectionChanged',
  'OnClicked',
  'addNotes',
  'deleteNote',
  'resetForm',
  'print',
  'onBtPdf',
  'onBtExport',
];

function bindReportPageActions(vm) {
  return createReportPageActions(vm, {
    getReportGrid: () => vm.$refs.reportGrid,
    printHtml: (target) => vm.$htmlToPaper(target),
  });
}

export function createReportPageMixin(presetKey) {
  const methods = {};

  for (const name of REPORT_PAGE_METHODS) {
    methods[name] = function reportPageMethod(...args) {
      if (!this.__reportPageActions) {
        this.__reportPageActions = bindReportPageActions(this);
      }

      return this.__reportPageActions[name](...args);
    };
  }

  return {
    data() {
      return createReportPageState(presetKey);
    },
    mounted() {
      this.fetchInitialData();
    },
    watch: {
      'filters.selectedBases': {
        handler(selectedBases) {
          this.loadGatesForBases(selectedBases);
        },
        deep: true,
        immediate: true,
      },
    },
    computed: {
      mergedColumnDefs() {
        return buildMergedColumnDefs(this.ColumnsDef);
      },
      totalPages() {
        return Math.ceil(this.totalRows / this.perPage);
      },
    },
    methods,
  };
}
