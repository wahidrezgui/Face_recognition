<template>
  <PageContainer
    title="قائمة الموظفين"
    :description="pageDescription"
  >
    <template v-if="canMutate" #actions>
      <AppButton @click="openCreatePanel">
        <i class="pi pi-user-plus" aria-hidden="true" />
        إضافة موظف
      </AppButton>
      <AppButton variant="secondary" @click="dataimport = true">
        <i class="pi pi-file-import" aria-hidden="true" />
        تحميل بيانات
      </AppButton>
    </template>

    <EmployeeStatusCards :statuses="RawDataStatus" />

    <EmployeeDatabaseFilters
      v-model:military-number="military_number"
      v-model:fullname-ar="fullname_ar"
      v-model:plate-number="plate_number"
      v-model:status-id="filter_status_id"
      v-model:base-id="filter_base_id"
      v-model:zone-id="filter_zone_id"
      :bases="bases"
      :has-active-filters="hasActiveFilters"
      :selected-count="selectedCount"
      :bulk-actions="bulkActions"
      :read-only="!canMutate"
      @reset-filter="resetFilter"
      @clear-selection="clearSelection"
      @delete-selected="deleteSelected"
      @approve="approveSelected"
      @bulk-print="confirmBulkPrint"
    />

    <p class="emp-grid-hint" dir="rtl">
      <span class="emp-grid-hint__item">
        <i class="pi pi-eye" aria-hidden="true" />
        انقر على أي صف لعرض تفاصيل الموظف
      </span>
      <template v-if="canMutate">
        <span class="emp-grid-hint__sep" aria-hidden="true">·</span>
        <span class="emp-grid-hint__item">
          <i class="pi pi-check-square" aria-hidden="true" />
          حدّد المربعات للإجراءات الجماعية (حذف، اعتماد، طباعة)
        </span>
      </template>
    </p>

    <p
      v-if="!listLoading"
      class="emp-results-bar"
      dir="rtl"
      aria-live="polite"
    >
      <span class="emp-results-bar__count">{{ gridResultsLabel }}</span>
      <span v-if="hasActiveFilters" class="emp-results-bar__badge">فلاتر مفعّلة</span>
    </p>

    <AppDataGrid
      ref="agGrid"
      :column-defs="mergedColumnDefs"
      :row-data="RawData"
      :per-page="perPage"
      :total-rows="totalRows"
      :get-row-class="detailRowClass"
      :row-selection="canMutate ? 'multiple' : 'none'"
      pagination-mode="server"
      dom-layout="autoHeight"
      line-height="56px"
      @grid-ready="onGridReady"
      @row-clicked="openEmployeeDetail"
      @selection-changed="onSelectionChanged"
      @page-change="onPageChange"
      @update:per-page="perPage = $event"
    />
  </PageContainer>

  <EmployeeDetailPanel
    v-model:open="addg"
    mode="create"
    :active-tab="10"
    :guest="guest"
    :car="car"
    :gender="gender"
    :nationalities="nationalities"
    :departments="departments"
    :ranks="ranks"
    :bases="bases"
    :account-id="accountId"
    :dep-id="depId"
    :field-validity="fieldValidity"
    @create="createguest"
    @file-change="handleFileChange"
  />

  <EmployeeDetailPanel
    v-model:open="blokGuest"
    v-model:active-tab="activeTab"
    mode="edit"
    :guest="guest"
    :car="car"
    :gender="gender"
    :nationalities="nationalities"
    :departments="departments"
    :ranks="ranks"
    :bases="bases"
    :account-id="accountId"
    :dep-id="depId"
    :read-only="!canMutate"
    show-print-button
    :can-print="canMutate"
    @save="updateguest"
    @file-change="handleFileChange"
    @add-car="addCar"
    @delete-car="delCar"
    @print="printFromSidePanel"
  />

  <EmployeeImportPanel
    v-model:open="dataimport"
    :dep-id="depId"
    :account-id="accountId"
    @imported="handleImport"
  />

  <AppLoader :loading="isLoading" variant="overlay" label="جاري التحميل..." />
</template>

<script>
import api from '../../api/client';
import { updateEmployee, createEmployee } from '../../api/employees';
import { fetchBases, fetchAllDepartments, fetchDepartmentTree } from '../../api/organization';
import { fetchRanks, fetchNationalities } from '../../api/lookups';
import { normalizeDepartmentTree } from '../../lib/departmentTree';
import AppDataGrid from '../../components/ui/AppDataGrid.vue';
import EmployeeDatabaseFilters from '../../components/employees/EmployeeDatabaseFilters.vue';
import EmployeeStatusCards from '../../components/employees/EmployeeStatusCards.vue';
import EmployeeDetailPanel from '../../components/employees/EmployeeDetailPanel.vue';
import EmployeeImportPanel from '../../components/employees/EmployeeImportPanel.vue';
import {
  EMPLOYEE_GENDER_OPTIONS,
  buildEmployeeBulkConfirm,
  buildEmployeeGridColumns,
  resolveEmployeeBulkActions,
  emptyGuest,
  applyEmployeePhotoFile,
  revokeEmployeePhotoPreview,
  employeeStatusCellRenderer,
  employeePhotoCellRenderer,
  employeeCountLabelFromTotal,
  buildEmployeeSaveFormData,
  treeSelectValue,
  resolveEmployeePhotoFile,
} from '../../lib/employees/employeeFormUi';
import {
  appendZoningToFormData,
  applyEmployeeListResponse,
  buildEmployeeListParams,
  hasEmployeeFilters,
  resetCreateFieldValidity,
  validateCreateGuest,
} from '../../composables/useEmployeesPage';
import { canWriteResource, isGlobalScope } from '../../lib/auth-roles';
import { useAuth } from '../../composables/useAuth';
import { createBadgePrintMixin } from '../../composables/useBadgePrint';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppButton from '../../components/ui/AppButton.vue';
import { ref } from 'vue';

const gridApi = ref();

export default {
  name: 'Employees',
  components: {
    AppDataGrid,
    EmployeeDatabaseFilters,
    EmployeeStatusCards,
    EmployeeDetailPanel,
    EmployeeImportPanel,
    PageContainer,
    AppButton,
  },
  setup() {
    const { user: authUser } = useAuth();
    return { authUser };
  },
  mixins: [
    createBadgePrintMixin({
      getGridApi: () => gridApi.value,
      onAfterBulkPrint(vm, guestIds) {
        vm.getEmployees();
        vm.refreshGuestDetailAfterPrint(guestIds);
      },
    }),
  ],
  data() {
    return {
      filter_base_id: '',
      filter_zone_id: '',
      filter_status_id: '',
      currentPage: 1,
      perPage: 25,
      totalRows: 0,
      military_number: '',
      fullname_ar: '',
      plate_number: '',
      activeTab: 10,
      depId: localStorage.getItem('dep_id'),
      userFullName: localStorage.getItem('user_fullname'),
      accountId: Number(localStorage.getItem('account_id')) || null,
      ColumnsDef: [],
      RawData: [],
      RawDataStatus: [],
      isLoading: false,
      listLoading: false,
      lookupsLoading: false,
      addg: false,
      blokGuest: false,
      dataimport: false,
      activeDetailId: null,
      selectedCount: 0,
      selectedRows: [],
      car: {
        plate_number: '',
        active: 1,
        emp_id: null,
      },
      guest: emptyGuest(),
      fieldValidity: resetCreateFieldValidity(),
      gender: EMPLOYEE_GENDER_OPTIONS,
      departments: [],
      bases: [],
      ranks: [],
      nationalities: [],
      pendingEmployeePhotoFile: null,
    };
  },
  computed: {
    canMutate() {
      return canWriteResource('employees', this.authUser);
    },
    hasActiveFilters() {
      return hasEmployeeFilters({
        militaryNumber: this.military_number,
        fullnameAr: this.fullname_ar,
        plateNumber: this.plate_number,
        filterBaseId: this.filter_base_id,
        filterZoneId: this.filter_zone_id,
        filterStatusId: this.filter_status_id,
      });
    },
    pageDescription() {
      if (this.listLoading) {
        return 'جاري تحميل قائمة الموظفين…';
      }
      if (this.hasActiveFilters) {
        return `عرض ${this.gridResultsLabel} وفق الفلاتر المحددة`;
      }
      return 'إدارة الموظفين والبطاقات وصلاحيات الدخول';
    },
    gridResultsLabel() {
      return employeeCountLabelFromTotal(this.totalRows);
    },
    bulkActions() {
      return resolveEmployeeBulkActions({
        filterStatusId: this.filter_status_id,
        selectedRows: this.selectedRows,
      });
    },
    mergedColumnDefs() {
      let modifiedColumnDefs = buildEmployeeGridColumns(this.ColumnsDef);

      if (!this.canMutate) {
        modifiedColumnDefs = modifiedColumnDefs.filter((column) => column.colId !== 'selection');
      }

      const statusIndex = modifiedColumnDefs.findIndex((column) => column.headerName === 'الحالة');
      if (statusIndex !== -1) {
        modifiedColumnDefs[statusIndex].cellRenderer = employeeStatusCellRenderer;
      }

      const photoIndex = modifiedColumnDefs.findIndex((column) => column.headerName === 'الصورة');
      if (photoIndex !== -1) {
        modifiedColumnDefs[photoIndex].cellRenderer = employeePhotoCellRenderer;
      }

      return modifiedColumnDefs;
    },
    detailRowClass() {
      return (params) => (
        params.data?.id === this.activeDetailId && this.blokGuest
          ? 'emp-row-detail'
          : ''
      );
    },
  },
  watch: {
    military_number() {
      this.scheduleFilter();
    },
    fullname_ar() {
      this.scheduleFilter();
    },
    plate_number() {
      this.scheduleFilter();
    },
    filter_status_id() {
      this.scheduleFilter();
    },
    filter_base_id() {
      this.scheduleFilter();
    },
    filter_zone_id() {
      this.scheduleFilter();
    },
    blokGuest(open) {
      if (!open) {
        this.activeDetailId = null;
        this.clearPendingEmployeePhoto();
      }
    },
    addg(open) {
      if (!open) {
        this.clearPendingEmployeePhoto();
      }
    },
  },
  mounted() {
    this.fetchLookups();
    this.getEmployees();
  },
  beforeUnmount() {
    clearTimeout(this.filterTimer);
  },
  methods: {
    scheduleFilter() {
      clearTimeout(this.filterTimer);
      this.filterTimer = setTimeout(() => this.filter(), 300);
    },
    employeeListParams() {
      return buildEmployeeListParams({
        depId: this.depId,
        currentPage: this.currentPage,
        perPage: this.perPage,
        militaryNumber: this.military_number,
        fullnameAr: this.fullname_ar,
        plateNumber: this.plate_number,
        filterBaseId: this.filter_base_id,
        filterZoneId: this.filter_zone_id,
        filterStatusId: this.filter_status_id,
      });
    },
    applyListPayload(payload) {
      const result = applyEmployeeListResponse(payload, this.filter_status_id);
      this.ColumnsDef = result.columns;
      this.RawDataStatus = result.statusCards;
      this.RawData = result.rows;
      this.totalRows = result.totalRows;

      this.$nextTick(() => {
        gridApi.value?.refreshCells({ force: true });
      });
    },
    loadGuestDetail(id) {
      return api.get(`/api/employees/${id}`).then((response) => {
        revokeEmployeePhotoPreview(this.guest);
        const guest = response.data[0];
        this.guest = guest;
        this.guest.dep_id = { [guest.dep_id]: true };
        this.guest.rank_id = { [guest.rank_id]: true };
        this.guest.photoPreview = null;
        return guest;
      });
    },
    refreshGuestDetailAfterPrint(guestIds) {
      if (this.blokGuest && this.guest?.id && guestIds.includes(this.guest.id)) {
        this.loadGuestDetail(this.guest.id);
      }
    },
    resetFilter() {
      clearTimeout(this.filterTimer);
      this.military_number = '';
      this.fullname_ar = '';
      this.plate_number = '';
      this.filter_base_id = '';
      this.filter_zone_id = '';
      this.filter_status_id = '';
      this.currentPage = 1;
      this.getEmployees();
    },
    filter() {
      this.currentPage = 1;

      if (!this.hasActiveFilters) {
        this.getEmployees();
        return;
      }

      this.listLoading = true;
      this.ColumnsDef = [];
      this.RawData = [];
      this.RawDataStatus = [];
      this.totalRows = 0;

      api.get('/api/employees', { params: this.employeeListParams() })
        .then((response) => {
          this.applyListPayload(response.data);
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
        })
        .finally(() => {
          this.listLoading = false;
        });
    },
    getEmployees() {
      this.listLoading = true;

      return api.get('/api/employees', { params: this.employeeListParams() })
        .then((response) => {
          this.applyListPayload(response.data);
          return response;
        })
        .catch((error) => {
          console.error('Error fetching employees:', error);
          throw error;
        })
        .finally(() => {
          this.listLoading = false;
        });
    },
    async fetchLookups() {
      this.lookupsLoading = true;

      const departmentPromise = (async () => {
        try {
          const treeResponse = isGlobalScope('departments')
            ? await fetchAllDepartments()
            : await fetchDepartmentTree(this.depId);
          this.departments = normalizeDepartmentTree(treeResponse.data?.departments ?? []);
        } catch (error) {
          console.error('Error loading departments:', error);
          this.departments = [];
        }
      })();

      const basesPromise = fetchBases()
        .then((response) => {
          this.bases = response.data;
        })
        .catch((error) => {
          console.error('Error loading bases:', error);
          this.bases = [];
        });

      const ranksPromise = fetchRanks()
        .then((response) => {
          this.ranks = response.data;
        })
        .catch((error) => {
          console.error('Error loading ranks:', error);
          this.ranks = [];
        });

      const nationalitiesPromise = fetchNationalities()
        .then((response) => {
          this.nationalities = response.data;
        })
        .catch((error) => {
          console.error('Error loading nationalities:', error);
          this.nationalities = [];
        });

      await Promise.all([departmentPromise, basesPromise, ranksPromise, nationalitiesPromise]);
      this.lookupsLoading = false;
    },
    onGridReady(params) {
      gridApi.value = params.api;
    },
    onPageChange({ page, perPage }) {
      this.currentPage = page;
      if (perPage) {
        this.perPage = perPage;
      }
      this.getEmployees();
    },
    onSelectionChanged(event) {
      const selectedRows = event.api.getSelectedRows();
      this.selectedRows = selectedRows;
      this.selectedCount = selectedRows.length;
    },
    clearSelection() {
      gridApi.value?.deselectAll();
      this.selectedRows = [];
      this.selectedCount = 0;
    },
    getSelectedEmployeeIds() {
      return (gridApi.value?.getSelectedRows() ?? []).map((row) => row.id);
    },
    handleImport() {
      this.dataimport = false;
      this.getEmployees();
    },
    openCreatePanel() {
      this.clearPendingEmployeePhoto();
      this.guest = emptyGuest();
      this.fieldValidity = resetCreateFieldValidity();
      this.addg = true;
    },
    clearPendingEmployeePhoto() {
      revokeEmployeePhotoPreview(this.guest);
      this.pendingEmployeePhotoFile = null;
    },
    handleFileChange(event) {
      const file = applyEmployeePhotoFile(this.guest, event);
      if (!file) {
        this.pendingEmployeePhotoFile = null;
        this.$toast.add({
          severity: 'warn',
          summary: 'تنبيه',
          detail: 'يرجى اختيار ملف صورة صالح',
          life: 3000,
        });
        return;
      }

      this.pendingEmployeePhotoFile = file;
    },
    updateguest() {
      const formElement = document.getElementById('formeditguest');
      const photoFile = resolveEmployeePhotoFile(
        this.guest,
        formElement,
        this.pendingEmployeePhotoFile,
      );
      const hadNewPhoto = Boolean(this.guest.photoPreview?.startsWith('blob:') || photoFile);

      if (hadNewPhoto && !photoFile) {
        this.$toast.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر إرفاق الصورة. يرجى إعادة اختيارها ثم الحفظ.',
          life: 4000,
        });
        return;
      }

      const formData = buildEmployeeSaveFormData(
        formElement,
        this.guest,
        {
          gender_id: this.guest.gender_id,
          dep_id: treeSelectValue(this.guest.dep_id),
          nationality_id: this.guest.nationality_id,
          rank_id: treeSelectValue(this.guest.rank_id),
          default_base: this.guest.default_base,
          id: this.guest.id,
          dep_parent_id: this.guest.dep_parent_id || this.depId,
        },
        photoFile,
      );
      appendZoningToFormData(formData, this.guest.selectedZones);

      this.isLoading = true;
      updateEmployee(formData)
        .then((response) => {
          if (hadNewPhoto && !response.data?.photo_uploaded) {
            throw new Error('photo_upload_failed');
          }

          if (response.data?.photo) {
            this.guest.photo = response.data.photo;
          }

          this.clearPendingEmployeePhoto();
          return this.getEmployees();
        })
        .then(() => {
          this.blokGuest = false;
          this.$toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ التعديلات', life: 3000 });
        })
        .catch((error) => {
          const detail = error.message === 'photo_upload_failed'
            ? 'تعذر رفع الصورة. تحقق من حجم الملف وحاول مرة أخرى.'
            : (error.response?.data?.message || 'تعذر حفظ التعديلات');
          this.$toast.add({ severity: 'error', summary: 'خطأ', detail, life: 4000 });
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    addCar() {
      if (this.car.plate_number === '') {
        this.$toast.add({ severity: 'warn', summary: 'حقل مطلوب', detail: 'رقم اللوحة', life: 3000 });
        return;
      }

      api.post('/api/employees/cars', this.car)
        .then((response) => {
          this.car.plate_number = '';
          this.loadGuestDetail(response.data.guest_id);
        })
        .catch(() => {
          this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر إضافة السيارة', life: 3000 });
        });
    },
    delCar(id) {
      if (!id) {
        return;
      }

      this.$confirm.require({
        message: 'هل تريد حذف هذه السيارة؟',
        header: 'تأكيد الحذف',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        accept: () => {
          api.post('/api/employees/cars/delete', { id })
            .then((response) => {
              if (response.data.status === 'success') {
                this.loadGuestDetail(this.guest.id);
                this.$toast.add({ severity: 'info', summary: 'تم', detail: 'تم الحذف بنجاح', life: 3000 });
              } else {
                this.$toast.add({ severity: 'error', summary: 'خطأ', detail: response.data.message, life: 3000 });
              }
            })
            .catch(() => {
              this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'حدث خطأ أثناء الحذف', life: 3000 });
            });
        },
      });
    },
    createguest() {
      if (!validateCreateGuest(this.guest, this.fieldValidity)) {
        return;
      }

      if (this.guest.default_base === 0) {
        this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'اختر القاعدة الافتراضية', life: 3000 });
        return;
      }

      const formElement = document.getElementById('formguest');
      const photoFile = resolveEmployeePhotoFile(
        this.guest,
        formElement,
        this.pendingEmployeePhotoFile,
      );
      const formData = buildEmployeeSaveFormData(
        formElement,
        this.guest,
        {
          gender_id: this.guest.gender_id,
          dep_id: treeSelectValue(this.guest.dep_id),
          nationality_id: this.guest.nationality_id,
          rank_id: treeSelectValue(this.guest.rank_id),
          default_base: this.guest.default_base,
        },
        photoFile,
      );
      appendZoningToFormData(formData, this.guest.selectedZones);

      this.isLoading = true;
      createEmployee(formData)
        .then(() => {
          this.clearPendingEmployeePhoto();
          return this.getEmployees();
        })
        .then(() => {
          this.addg = false;
          this.$toast.add({ severity: 'success', summary: 'تم', detail: 'تم تسجيل الموظف', life: 3000 });
        })
        .catch(() => {
          this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'يرجى تعبئة جميع الحقول الإلزامية', life: 3000 });
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    openEmployeeDetail(event) {
      if (!event?.data?.id) {
        return;
      }

      const id = event.data.id;
      this.clearPendingEmployeePhoto();
      this.activeTab = 10;
      this.activeDetailId = id;
      this.car.emp_id = id;
      this.loadGuestDetail(id);
      this.blokGuest = true;
    },
    printFromSidePanel() {
      if (this.guest?.id) {
        this.printSingleBadge(this.guest.id);
      } else {
        this.$toast.add({
          severity: 'warn',
          summary: 'تنبيه',
          detail: 'لم يتم اختيار موظف للطباعة',
          life: 3000,
        });
      }
    },
    deleteSelected() {
      const count = this.getSelectedEmployeeIds().length;
      if (!count) {
        return;
      }

      const dialog = buildEmployeeBulkConfirm('delete', count);
      this.$confirm.require({
        title: dialog.title,
        header: dialog.title,
        message: dialog.message,
        confirmLabel: dialog.confirmLabel,
        cancelLabel: 'إلغاء',
        acceptClass: 'p-button-danger',
        confirmVariant: dialog.confirmVariant,
        accept: () => {
          const guestIds = this.getSelectedEmployeeIds();
          api.post('/api/employees/delete', { guests: guestIds })
            .then(() => {
              this.clearSelection();
              this.getEmployees();
              this.$toast.add({ severity: 'success', summary: 'تم الحذف', detail: `تم حذف ${count} موظف بنجاح`, life: 3000 });
            });
        },
      });
    },
    approveSelected(status) {
      const count = this.getSelectedEmployeeIds().length;
      if (!count) {
        return;
      }

      const action = status === 0 ? 'unapprove' : (status === 3 ? 'collect' : 'approve');
      const dialog = buildEmployeeBulkConfirm(action, count);
      this.$confirm.require({
        title: dialog.title,
        header: dialog.title,
        message: dialog.message,
        confirmLabel: dialog.confirmLabel,
        cancelLabel: 'إلغاء',
        acceptClass: 'p-button-success',
        confirmVariant: dialog.confirmVariant,
        accept: () => {
          const guestIds = this.getSelectedEmployeeIds();
          api.post('/api/employees/approve', { guests: guestIds, created_by_id: this.accountId, status })
            .then(() => {
              this.clearSelection();
              this.getEmployees();
              this.$toast.add({ severity: 'success', summary: 'تم التنفيذ', detail: dialog.message, life: 3000 });
            })
            .catch(() => {
              this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحديث حالة الموظفين', life: 3000 });
            });
        },
      });
    },
    confirmBulkPrint() {
      const count = this.getSelectedEmployeeIds().length;
      if (!count) {
        return;
      }

      const dialog = buildEmployeeBulkConfirm('print', count);
      this.$confirm.require({
        title: dialog.title,
        header: dialog.title,
        message: dialog.message,
        confirmLabel: dialog.confirmLabel,
        cancelLabel: 'إلغاء',
        accept: () => {
          this.bulkprintCombined();
        },
      });
    },
  },
};
</script>

<style scoped>
.emp-grid-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.65rem;
  margin: 0 0 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 0.65rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 0.78rem;
  color: #64748b;
}

.emp-grid-hint__item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.emp-grid-hint__sep {
  color: #cbd5e1;
}

.emp-results-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: #475569;
}

.emp-results-bar__count {
  font-weight: 600;
  color: #0f172a;
}

.emp-results-bar__badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #92400e;
}

:deep(.emp-row-detail) {
  background-color: #fffbeb !important;
}
</style>
