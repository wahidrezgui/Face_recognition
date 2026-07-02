import { reportSearchPresets } from '../config/reportSearchPresets';
import {
  createDefaultFilters,
  resetFilters,
  buildReportParams,
  fetchReportLookups,
  getCachedReportLookups,
  fetchGatesForBases,
} from '../composables/useReportFilters';

export function createReportPageMixin(presetKey) {
  return {
    data() {
      const depId = localStorage.getItem('dep_id');
      return {
        searchPreset: reportSearchPresets[presetKey],
        filters: createDefaultFilters(),
        lookups: {
          departments: [],
          ranks: [],
          bases: [],
          gates: [],
        },
        depId,
      };
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
    methods: {
      async fetchInitialData() {
        const cached = getCachedReportLookups(this.depId);
        if (cached) {
          this.lookups.departments = cached.departments;
          this.lookups.ranks = cached.ranks;
          this.lookups.bases = cached.bases;
          return;
        }

        try {
          const data = await fetchReportLookups(this.depId);
          this.lookups.departments = data.departments;
          this.lookups.ranks = data.ranks;
          this.lookups.bases = data.bases;
        } catch (error) {
          console.error(error);
        }
      },
      async loadGatesForBases(selectedBases) {
        if (!selectedBases || Object.keys(selectedBases).length === 0) {
          this.lookups.gates = [];
          return;
        }
        try {
          this.lookups.gates = await fetchGatesForBases(this.depId);
        } catch (error) {
          console.error('Error fetching gates:', error);
          this.lookups.gates = [];
        }
      },
      buildSearchParams(pagination = {}) {
        return buildReportParams(this.filters, this.searchPreset, {
          page: pagination.page ?? this.currentPage,
          perPage: pagination.perPage ?? this.perPage,
        });
      },
      buildExportParams(action) {
        return {
          ...buildReportParams(this.filters, this.searchPreset, {
            page: 1,
            perPage: this.totalRows,
          }),
          action,
        };
      },
      resetFilterForm() {
        resetFilters(this.filters);
        this.lookups.gates = [];
      },
    },
  };
}
