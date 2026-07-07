import {
  computed,
  getCurrentInstance,
  onMounted,
  reactive,
  ref,
  toRefs,
  watch,
} from 'vue';
import { buildMergedColumnDefs } from '../lib/reports/agGridRenderers.js';
import {
  createReportPageActions,
  createReportPageState,
} from '../lib/reports/reportPageCore.js';

export function useReportPage(presetKey) {
  const instance = getCurrentInstance();
  const reportGrid = ref(null);
  const state = reactive(createReportPageState(presetKey));

  const actions = createReportPageActions(state, {
    getReportGrid: () => reportGrid.value,
    printHtml: (target) => instance?.proxy?.$htmlToPaper?.(target),
  });

  watch(
    () => state.filters.selectedBases,
    (selectedBases) => {
      actions.loadGatesForBases(selectedBases);
    },
    { deep: true, immediate: true },
  );

  onMounted(() => {
    actions.fetchInitialData();
  });

  const mergedColumnDefs = computed(() => buildMergedColumnDefs(state.ColumnsDef));
  const totalPages = computed(() => Math.ceil(state.totalRows / state.perPage));

  return {
    reportGrid,
    ...toRefs(state),
    mergedColumnDefs,
    totalPages,
    ...actions,
  };
}
