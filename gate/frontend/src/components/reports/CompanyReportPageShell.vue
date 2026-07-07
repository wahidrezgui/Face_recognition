<template>
  <PageContainer :title="title" :description="description">
    <CompanyReportNavCards class="mb-6" />

    <CompanyReportSearchPanel
      :preset="searchPreset"
      :filters="filters"
      :lookups="lookups"
      :mode="searchMode"
      :has-results="RawData.length > 0"
      @search="onSubmit"
      @reset="resetForm"
      @print="onBtPdf"
      @export="onBtExport"
    />

    <AppCard padding="none" class="overflow-hidden" dir="rtl">
      <ReportDataGrid
        ref="reportGrid"
        :column-defs="mergedColumnDefs"
        :row-data="RawData"
        :per-page="perPage"
        :total-rows="totalRows"
        :rows-per-page-options="rowsPerPageOptions"
        :selected-page="selectedPage"
        @grid-ready="onGridReady"
        @row-clicked="OnClicked"
        @selection-changed="onSelectionChanged"
        @page-change="onGridPageChange"
        @update:per-page="perPage = $event"
        @update:selected-page="selectedPage = $event"
      />
    </AppCard>

    <ReportLoadingOverlay :loading="isLoading" />

    <EmployeeDetailPanel
      v-model:open="blokGuest"
      :guest="guest"
      v-model:note-text="note.notes"
      v-model:with-excuse="isChecked"
      @add-note="addNotes"
      @print="print"
    />
  </PageContainer>
</template>

<script>
import CompanyReportNavCards from './CompanyReportNavCards.vue';
import CompanyReportSearchPanel from './CompanyReportSearchPanel.vue';
import ReportDataGrid from './ReportDataGrid.vue';
import ReportLoadingOverlay from './ReportLoadingOverlay.vue';
import EmployeeDetailPanel from './EmployeeDetailPanel.vue';
import PageContainer from '../ui/PageContainer.vue';
import AppCard from '../ui/AppCard.vue';
import { useReportPage } from '../../composables/useReportPage';

export default {
  name: 'CompanyReportPageShell',
  components: {
    CompanyReportNavCards,
    CompanyReportSearchPanel,
    ReportDataGrid,
    ReportLoadingOverlay,
    EmployeeDetailPanel,
    PageContainer,
    AppCard,
  },
  props: {
    presetKey: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    searchMode: {
      type: String,
      default: 'basic',
      validator: (value) => ['basic', 'issues'].includes(value),
    },
  },
  setup(props) {
    return useReportPage(props.presetKey);
  },
};
</script>
