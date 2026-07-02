<template>
  <PageContainer title="تقرير متقدم" description="Advanced Report">
    <ReportNavCards class="mb-6" />

    <ReportSearchPanel
      :preset="searchPreset"
      :filters="filters"
      :lookups="lookups"
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
    <Toast />
  </PageContainer>
</template>
  
  <script>
import ReportNavCards from '../../components/reports/ReportNavCards.vue';
import ReportSearchPanel from '../../components/reports/ReportSearchPanel.vue';
import ReportDataGrid from '../../components/reports/ReportDataGrid.vue';
import ReportLoadingOverlay from '../../components/reports/ReportLoadingOverlay.vue';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import EmployeeDetailPanel from '../../components/reports/EmployeeDetailPanel.vue';
import { buildMergedColumnDefs } from '../../lib/reports/agGridRenderers.js';
import { reportSearchPresets } from '../../config/reportSearchPresets';
import {
  createDefaultFilters,
  resetFilters,
  buildReportParams,
  fetchReportLookups,
  getCachedReportLookups,
  fetchGatesForBases,
} from '../../composables/useReportFilters';
import api from '../../api/client';
import { fetchEmployee, addEmployeeNote } from '../../api/employees';
import Toast from 'primevue/toast';

  export default {
    components: {
      ReportNavCards,
      ReportSearchPanel,
      ReportDataGrid,
      ReportLoadingOverlay,
      EmployeeDetailPanel,
      PageContainer,
      AppCard,
      Toast,
    },
    data() {
      const depId = localStorage.getItem('dep_id');
      return {
        searchPreset: reportSearchPresets.individual,
        filters: createDefaultFilters(),
        lookups: {
          departments: [],
          ranks: [],
          bases: [],
          gates: [],
        },
        activeTab: 10,
        currentPage: 1,
        perPage: 55,
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
        depId,
        note: {
          emp_id: null,
          day: null,
          notes: null,
          created_by: localStorage.getItem('user_name'),
        },
        guest: {
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
        },
      };
    },
    mounted() {
      this.fetchInitialData(); // Load departments tree initially
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
        return Math.ceil(this.totalRows / this.perPage); // Calculate total pages
      }
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

      buildExportParams(action) {
        return {
          ...buildReportParams(this.filters, this.searchPreset, {
            page: 1,
            perPage: this.totalRows,
          }),
          action,
        };
      },

      getEmployees() {
        this.isLoading = true;
        const params = buildReportParams(this.filters, this.searchPreset, {
          page: this.currentPage,
          perPage: this.perPage,
        });

        this.searchPreset.fetchFn(params)
          .then((response) => {
            this.step = response.data.data[this.agGridKey].id;
            this.ColumnsDef = response.data.columns;
            this.RawDataStatus = response.data.data;

            if (response.data.data[this.agGridKey].guests) {
              this.RawData = response.data.data[this.agGridKey].guests.data;
              this.totalRows = response.data.data[this.agGridKey].pagination.total;
            } else {
              this.RawData = [];
            }
          })
          .finally(() => {
            this.isLoading = false;
          });
      },

      onSubmit() {
        this.currentPage = 1;
        this.getEmployees();
      },
      onGridPageChange({ page, perPage }) {
        this.currentPage = page;
        if (perPage) {
          this.perPage = perPage;
        }
        this.getEmployees();
      },
      onGridReady() {},
      onSelectionChanged(event) {
                          var selectedRows = event.api.getSelectedRows();
                          let checkedState = false;
  
                          selectedRows.forEach(function (selectedRow, index) {
                          if (index >= 0) {
                          checkedState = true;
                          }
                          });
      },
      OnClicked(event){
                          var id = event.data.id;
                          var mvdate = event.data.mvdate;  // Get the 'mvdate' field from the clicked row data
                          this.activeTab=10;
  
                          fetchEmployee(id, { day: mvdate }) 
                          //fetchEmployee(id, { day: this.toDate })
                          .then(response => {
                          this.guest = response.data[0];
                          this.note.emp_id=this.guest.id;
                          this.note.day=this.guest.day;
                          });
  
                          this.blokGuest=true;
  
      },
      addNotes(){
                          addEmployeeNote(this.note)
                                      .then(response => {
                                          this.note.notes='';
                                          this.getEmployees();
                                          this.blokGuest=false;
                                      });
      },
      resetForm() {
        resetFilters(this.filters);
        this.lookups.gates = [];
      },
      print() {
        this.$htmlToPaper("printMe");
      },
      onBtPdf() {
        this.isLoading = true;

        api.get('/api/reports/individual', {
          params: this.buildExportParams('pdf generated'),
        })
        .then(response => {
          this.RawData = response.data.data[this.agGridKey].guests.data;
          const mergedColumnDefs = buildMergedColumnDefs(response.data.columns);
  
          // Reorder the columns as desired
          const reorderedColumns = [
            {
                headerName: "م",
                field: "numbering",
            },
            mergedColumnDefs.find(col => col.field === 'military_number'),
            mergedColumnDefs.find(col => col.field === 'rank_category'),
            mergedColumnDefs.find(col => col.field === 'rank'),
            mergedColumnDefs.find(col => col.field === 'gender'),
            mergedColumnDefs.find(col => col.field === 'fullname_ar'),
            mergedColumnDefs.find(col => col.field === 'department'),
            mergedColumnDefs.find(col => col.field === 'mvtype'),
            mergedColumnDefs.find(col => col.field === 'mvdate'),
            mergedColumnDefs.find(col => col.field === 'mvtime'),
            mergedColumnDefs.find(col => col.field === 'base'),
            mergedColumnDefs.find(col => col.field === 'gate'),
          ];
  
          // Add numbering to each row
          this.RawData = this.RawData.map((row, index) => ({
              ...row,
              numbering: index + 1 // Add numbering starting from 1
          }));
  
          const printWindow = window.open('', '', 'height=600,width=800'); // Open a new window for printing
          printWindow.document.write('<html dir="rtl"><head><title></title>'); // Set RTL direction
          printWindow.document.write('<style>');
  
          // General styles for body and content
          printWindow.document.write('body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; position: relative; }');
          printWindow.document.write('table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }');
          printWindow.document.write('th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }');
          printWindow.document.write('th { background-color: #f2f2f2; }');
          printWindow.document.write('h1, h3 { text-align: center; }');
  
          // Watermark style
          printWindow.document.write('.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: -1; opacity: 0.1; width: 500px; height: auto; }'); // Center and size watermark
  
          printWindow.document.write('</style>');
          printWindow.document.write('</head><body>');
  
          // Add watermark image from the public folder
          printWindow.document.write('<img src="/armed.png" class="watermark" alt="Watermark">');
  
          // Centered h1 element for the report title
          printWindow.document.write('<h1>تقرير متقدم</h1>');
  
          // Conditionally add From Date and To Date if they are selected
          if (this.filters.fromDate && this.filters.toDate) {
              printWindow.document.write(`<h3>من: ${this.filters.fromDate} إلى: ${this.filters.toDate}</h3>`);
          }
  
          // Add current Day, Date, and Time
          const now = new Date();
          const currentDay = now.toLocaleDateString('ar-EG', { weekday: 'long' });
          const currentDate = now.toLocaleDateString('ar-EG');
          const currentTime = now.toLocaleTimeString('ar-EG');
          printWindow.document.write(`<h3>تاريخ الطباعة: ${currentDay}, ${currentDate}, في ${currentTime}</h3>`);
  
          // Add logged-in username from localStorage
          const userName = localStorage.getItem('user_name');
          printWindow.document.write(`<h3>اسم المستخدم: ${userName}</h3>`);
  
          printWindow.document.write('<table>');
  
          // Print column headers in the reordered format
          printWindow.document.write('<thead><tr>');
          reorderedColumns.forEach(col => {
            printWindow.document.write(`<th>${col.headerName}</th>`);
          });
          printWindow.document.write('</tr></thead>');
  
          // Print row data in the reordered format
          printWindow.document.write('<tbody>');
          this.RawData.forEach(row => {
            printWindow.document.write('<tr>');
            reorderedColumns.forEach(col => {
              printWindow.document.write(`<td>${row[col.field]}</td>`);
            });
            printWindow.document.write('</tr>');
          });
          printWindow.document.write('</tbody>');
          printWindow.document.write('</table>');
          printWindow.document.write('</body></html>');
  
          printWindow.document.close(); // Close the document for writing
          printWindow.focus(); // Focus on the new window
          printWindow.print(); // Print the document
        })
        .finally(() => {
          this.isLoading = false; // Stop loading indicator
        });
      },
  
  
      onBtExport() {
        this.isLoading = true;

        api.get('/api/reports/individual', {
          params: this.buildExportParams('excel generated'),
        })
        .then(response => {
            const allData = response.data.data[this.agGridKey].guests.data;
            const mergedColumnDefs = buildMergedColumnDefs(response.data.columns);

            const reorderedColumns = [
              mergedColumnDefs.find(col => col.field === 'military_number'),
              mergedColumnDefs.find(col => col.field === 'rank_category'),
              mergedColumnDefs.find(col => col.field === 'rank'),
              mergedColumnDefs.find(col => col.field === 'gender'),
              mergedColumnDefs.find(col => col.field === 'fullname_ar'),
              mergedColumnDefs.find(col => col.field === 'department'),
              mergedColumnDefs.find(col => col.field === 'mvtype'),
              mergedColumnDefs.find(col => col.field === 'mvdate'),
              mergedColumnDefs.find(col => col.field === 'mvtime'),
              mergedColumnDefs.find(col => col.field === 'base'),
              mergedColumnDefs.find(col => col.field === 'gate'),
              ...mergedColumnDefs.filter(col => !['military_number', 'rank_category', 'rank', 'gender', 'fullname_ar', 'department', 'mvtype', 'mvdate', 'mvtime', 'base', 'gate'].includes(col.field))
            ];
  
          // Prepare grid for export with all rows
          this.$refs.reportGrid.setColumnDefs(reorderedColumns); // Set the reordered columns
          this.$refs.reportGrid.setRowData(allData);
  
          // Trigger CSV export
          this.$refs.reportGrid.exportDataAsCsv({
            allColumns: true, // Export all columns
            columnKeys: reorderedColumns.map(col => col.field), // Use reordered columns for export
            fileName: 'Advanced-Report.csv', // Customize file name
          });
        })
        .finally(() => {
          this.isLoading = false; // Stop loading indicator
        });
    }
  
    }
  }
  </script>