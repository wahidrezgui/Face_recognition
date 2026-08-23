<template>
    <PageContainer
        title="الشركات"
        description="إدارة موظفي الشركات والتصاريح"
        dir="rtl"
    >
        <!-- General Search -->
        <AppCard class="mb-4" title="بحث عام عن موظفي الشركات" subtitle="يبحث فقط في موظفي الشركات — لا يشمل العسكريين" padding="md">
            <div class="relative">
                <input
                    type="search"
                    v-model="generalSearchQuery"
                    @keyup.enter="performGeneralSearch"
                    @input="handleGeneralSearchInput"
                    class="h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-10 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="الاسم، البطاقة الشخصية، الوظيفة، الشركة..."
                    dir="rtl"
                />
                <i class="pi pi-search absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <AppButton
                    v-if="generalSearchQuery"
                    variant="ghost"
                    size="sm"
                    class="!absolute start-3 top-1/2 !h-8 !w-8 !-translate-y-1/2 !p-0 text-slate-400 hover:text-slate-600"
                    aria-label="مسح البحث"
                    @click="clearGeneralSearch"
                >
                    <i class="pi pi-times" />
                </AppButton>
            </div>
        </AppCard>

        <!-- Search results panel -->
        <AppCard v-if="showGeneralSearchResults" class="search-results-container mb-4" padding="md">
                <div class="mb-4 flex items-center justify-between">
                    <h3 class="text-lg font-bold text-slate-900">
                        نتائج البحث ({{ generalSearchResults.length }} موظف)
                    </h3>
                    <AppButton variant="ghost" size="sm" class="!p-1 text-slate-500 hover:text-slate-700" aria-label="إغلاق" @click="closeGeneralSearch">
                        <i class="pi pi-times text-lg" />
                    </AppButton>
                </div>
                <div v-if="isGeneralSearchLoading" class="py-8 text-center">
                    <i class="pi pi-spinner pi-spin text-2xl text-brand" />
                    <p class="mt-2 text-slate-600">جاري البحث...</p>
                </div>
                <div v-else>
                    <AppDataGrid
                        ref="searchGrid"
                        :column-defs="searchColumnDefs"
                        :row-data="generalSearchResults"
                        :per-page="searchPerPage"
                        :total-rows="searchTotalRows"
                        pagination-mode="server"
                        height="400px"
                        line-height="56px"
                        row-selection="single"
                        :suppress-row-click-selection="false"
                        @grid-ready="onSearchGridReady"
                        @row-clicked="onSearchRowClicked"
                        @page-change="onSearchGridPageChange"
                        @update:per-page="searchPerPage = $event"
                    />
                    <div v-if="generalSearchResults.length === 0 && !isGeneralSearchLoading" class="py-8 text-center text-slate-500">
                        <i class="pi pi-info-circle mb-2 text-3xl" />
                        <p>لا يوجد موظفون مطابقون لمعايير البحث.</p>
                    </div>
                </div>
        </AppCard>

        <div class="companies-workspace flex flex-col gap-4 lg:flex-row lg:items-start">
            <!-- Company sidebar — narrow picker, main area for employees -->
            <aside
                class="companies-sidebar w-full shrink-0 lg:w-72 xl:w-80"
                aria-label="قائمة الشركات"
            >
                <AppCard class="flex flex-col lg:sticky lg:top-4" padding="none" style="max-height: calc(100vh - 7rem);">

                        <!-- Header -->
                        <div class="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-2 pt-4">
                            <h3 class="text-lg font-bold text-slate-900">قائمة الشركات</h3>
                            <AppButton size="sm" @click="OpenAddCompany">
                                <i class="pi pi-plus text-xs" /> إضافة
                            </AppButton>
                        </div>

                        <!-- Search -->
                        <div class="flex-shrink-0 px-3 pb-2 pt-3">
                            <div class="relative">
                                <input
                                    type="search"
                                    v-model="companySearch"
                                    @input="onCompanySearchInput"
                                    class="w-full rounded-xl border border-slate-200 py-2 pe-8 ps-8 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                                    placeholder="ابحث عن شركة..."
                                    dir="rtl"
                                />
                                <i class="pi pi-search absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                                <AppButton
                                    v-if="companySearch"
                                    variant="ghost"
                                    size="sm"
                                    class="!absolute start-2.5 top-1/2 !h-7 !w-7 !-translate-y-1/2 !p-0 text-slate-400 hover:text-slate-600"
                                    aria-label="مسح البحث"
                                    @click="companySearch = ''; onCompanySearchInput()"
                                >
                                    <i class="pi pi-times text-xs" />
                                </AppButton>
                            </div>
                        </div>

                        <!-- All companies -->
                        <div class="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                            <span><i class="pi pi-building ms-1" /> كل الشركات</span>
                            <span class="font-normal text-slate-400">
                                صفحة {{ companyPage }} من {{ companyTotalPages }} ({{ filteredDepartments.length }} شركة)
                            </span>
                        </div>

                        <!-- Company rows -->
                        <div class="flex-1 overflow-y-auto">
                            <div
                                v-for="comp in pagedDepartments" :key="comp.id"
                                @click="infoComp(comp.id);"
                                class="group flex cursor-pointer items-center gap-2 border-b border-slate-50 px-3 py-2 text-sm hover:bg-brand-muted"
                                :class="currentCompanyId === comp.id ? 'bg-brand-muted font-semibold text-brand' : 'text-slate-700'"
                            >
                                <i class="pi pi-building flex-shrink-0 text-xs text-slate-300" />
                                <span class="flex-1 truncate">{{ comp.name_ar || comp.name_en }}</span>
                                <span class="hidden max-w-[5rem] truncate text-xs font-normal text-slate-400 xl:inline">{{ comp.name_en }}</span>
                                <div class="flex flex-shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                                    <AppButton variant="ghost" size="sm" class="!p-1 text-brand" @click.stop="editDep(comp.id)" title="تعديل"><i class="pi pi-pencil text-xs" /></AppButton>
                                    <AppButton variant="ghost" size="sm" class="!p-1 text-emerald-600 hover:text-emerald-700" @click.stop="infoComp(comp.id)" title="عرض"><i class="pi pi-eye text-xs" /></AppButton>

                                </div>
                            </div>
                            <div v-if="pagedDepartments.length === 0" class="py-8 text-center text-sm text-slate-400">
                                <i class="pi pi-search mb-2 block text-2xl" />
                                لا توجد شركات مطابقة لـ "{{ companySearch }}"
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div class="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
                            <span class="text-xs text-slate-500">
                                {{ (companyPage - 1) * companyPageSize + 1 }}–{{ Math.min(companyPage * companyPageSize, filteredDepartments.length) }} من {{ filteredDepartments.length }}
                            </span>
                            <div class="flex items-center gap-1">
                                <AppButton
                                    variant="secondary"
                                    size="sm"
                                    class="!h-7 !w-7 !p-0"
                                    @click="companyPage = 1"
                                    :disabled="companyPage === 1"
                                >«</AppButton>
                                <AppButton
                                    variant="secondary"
                                    size="sm"
                                    class="!h-7 !w-7 !p-0"
                                    @click="companyPage--"
                                    :disabled="companyPage === 1"
                                >‹</AppButton>
                                <AppButton
                                    v-for="p in visiblePageNumbers"
                                    :key="p"
                                    variant="ghost"
                                    size="sm"
                                    class="!h-7 !w-7 !p-0 text-xs"
                                    :class="p === companyPage ? '!border-brand !bg-brand !font-bold !text-white' : 'border border-slate-200 text-slate-600 hover:border-brand hover:bg-brand-muted'"
                                    @click="companyPage = p"
                                >{{ p }}</AppButton>
                                <AppButton
                                    variant="secondary"
                                    size="sm"
                                    class="!h-7 !w-7 !p-0"
                                    @click="companyPage++"
                                    :disabled="companyPage === companyTotalPages"
                                >›</AppButton>
                                <AppButton
                                    variant="secondary"
                                    size="sm"
                                    class="!h-7 !w-7 !p-0"
                                    @click="companyPage = companyTotalPages"
                                    :disabled="companyPage === companyTotalPages"
                                >»</AppButton>
                            </div>
                        </div>
                    </AppCard>
            </aside>

            <section class="companies-main min-w-0 flex-1">
                    <AppCard class="h-full" padding="md">
                        <div v-if="viewDetail">
                            <div class="companies-main-header mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <h3 class="truncate text-xl font-bold text-slate-900">{{ info ? (info.name_ar || info.name_en) : 'اختر شركة' }}</h3>
                                    <span class="text-sm text-slate-500">تاريخ الإنشاء: {{ info?.created_at ? formatDate(info.created_at) : '' }}</span>
                                </div>
                                <AppButton v-if="canMutate" class="shrink-0" @click="openCreatePanel">
                                    <i class="pi pi-user-plus" aria-hidden="true" />
                                    إضافة موظف
                                </AppButton>
                            </div>

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
                                        حدّد المربعات للإجراءات الجماعية
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
                                class="companies-employee-grid mt-4 w-full"
                                :column-defs="mergedColumnDefs"
                                :row-data="RawData"
                                :per-page="perPage"
                                :total-rows="totalRows"
                                :get-row-class="detailRowClass"
                                :row-selection="canMutate ? 'multiple' : 'none'"
                                pagination-mode="server"
                                dom-layout="autoHeight"
                                line-height="56px"
                                loading-label="جاري تحميل الموظفين…"
                                empty-message="لا يوجد موظفون في هذه الشركة."
                                @grid-ready="onGridReady"
                                @row-clicked="openEmployeeDetail"
                                @selection-changed="onSelectionChanged"
                                @page-change="onPageChange"
                                @update:per-page="perPage = $event"
                            />

                        </div>
                        <div v-else class="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                            <i class="pi pi-building mb-3 text-4xl text-slate-300" />
                            <p class="text-sm">اختر شركة من القائمة لعرض موظفيها</p>
                        </div>
                    </AppCard>
            </section>
        </div>
    </PageContainer>

    <!-- ===== CREATE COMPANY DIALOG ===== -->
    <Dialog v-model:visible="addCompany" modal header="Create New Company" :style="{ width: '25rem' }">
        <form novalidate="" @submit.prevent="addComp">
            <div class="flex h-full flex-col divide-y bg-white">
                <div class="flex min-h-0 flex-1 flex-col py-6">
                    <div class="relative flex-1 px-4 sm:px-6">
                        <div class="grid grid-cols-12 gap-x-4">
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center">
                                        <span>Name [En]</span>
                                        <span class="mr-1 text-sm text-red-500">*</span>
                                    </label>
                                    <input type="text" placeholder="Department Name" v-model="formDataDep.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Name [Ar]</span></label>
                                    <input type="text" placeholder="Department Name" v-model="formDataDep.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Start Time</span></label>
                                    <input type="time" v-model="formDataDep.start_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>End Time</span></label>
                                    <input type="time" v-model="formDataDep.end_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 px-4 py-4">
                    <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                        <AppButton variant="secondary" @click="addCompany = false">Cancel</AppButton>
                        <AppButton type="submit" :disabled="isSavingCompany">
                            <i v-if="isSavingCompany" class="pi pi-spinner pi-spin mr-2"></i>
                            {{ isSavingCompany ? 'Saving...' : 'Save' }}
                        </AppButton>
                    </div>
                </div>
            </div>
        </form>
    </Dialog>

    <!-- ===== EDIT COMPANY DIALOG ===== -->
    <Dialog v-model:visible="editCompany" modal header="Edit Company" :style="{ width: '25rem' }">
        <form novalidate="" @submit.prevent="updateComp">
            <div class="flex h-full flex-col divide-y bg-white">
                <div class="flex min-h-0 flex-1 flex-col py-6">
                    <div class="relative flex-1 px-4 sm:px-6">
                        <div class="grid grid-cols-12 gap-x-4">
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center">
                                        <span>Name [En]</span><span class="mr-1 text-sm text-red-500">*</span>
                                    </label>
                                    <input type="text" placeholder="Department Name" v-model="formEditDep.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Name [Ar]</span></label>
                                    <input type="text" placeholder="Department Name" v-model="formEditDep.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Start Time</span></label>
                                    <input type="time" v-model="formEditDep.start_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>End Time</span></label>
                                    <input type="time" v-model="formEditDep.end_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 px-4 py-4">
                    <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                        <AppButton variant="secondary" @click="editCompany = false">Cancel</AppButton>
                        <AppButton type="submit">Save</AppButton>
                    </div>
                </div>
            </div>
        </form>
    </Dialog>

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
        lock-department
        company-guest
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
        lock-department
        company-guest
        @save="updateguest"
        @file-change="handleFileChange"
        @add-car="addCar"
        @delete-car="delCar"
        @print="printFromSidePanel"
    />

    <AppLoader :loading="isLoading" variant="overlay" label="جاري التحميل..." />
</template>

<script>
import api from '../../api/client';
import { updateEmployee, createEmployee } from '../../api/employees';
import { fetchBases } from '../../api/organization';
import { fetchRanks, fetchNationalities } from '../../api/lookups';
import Dialog from 'primevue/dialog';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppButton from '../../components/ui/AppButton.vue';
import AppDataGrid from '../../components/ui/AppDataGrid.vue';
import EmployeeDatabaseFilters from '../../components/employees/EmployeeDatabaseFilters.vue';
import EmployeeDetailPanel from '../../components/employees/EmployeeDetailPanel.vue';
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
import { canWriteResource } from '../../lib/auth-roles';
import { useAuth } from '../../composables/useAuth';
import { ref } from 'vue';
import { createBadgePrintMixin } from '../../composables/useBadgePrint';

const gridApi = ref();

function customCellImgRenderer(params) {
    const cellValue = params.value;
    if (cellValue != null) {
        return `<img src="${cellValue}" class="object-cover w-8 h-8 rounded-full mt-2" alt="" />`;
    }
    return '<img src="/uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" alt="" />';
}

export default {
    name: 'Companies',
    components: {
        Dialog,
        AppDataGrid,
        EmployeeDatabaseFilters,
        EmployeeDetailPanel,
        PageContainer,
        AppCard,
        AppButton,
    },
    setup() {
        const { user: authUser } = useAuth();
        return { authUser };
    },
    mixins: [
        createBadgePrintMixin({
            getGridApi: () => gridApi.value,
            onAfterBulkPrint(vm) {
                vm.loadCompanyEmployees();
            },
            onAfterSinglePrint(vm) {
                vm.performGeneralSearch();
                vm.$toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Badge printed successfully',
                    life: 3000,
                });
            },
            onSinglePrintError(vm) {
                vm.$toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to print badge',
                    life: 3000,
                });
            },
        }),
    ],
    data() {
        return {
            departments: [],
            depId: localStorage.getItem('dep_id'),
            userFullName: localStorage.getItem('user_fullname'),
            accountId: Number(localStorage.getItem('account_id')) || null,
            formDataDep: {
                name_en: '',
                name_ar: '',
                start_time: '',
                end_time: '',
                parent_id: localStorage.getItem('dep_id'),
            },
            formEditDep: {
                name_en: '',
                name_ar: '',
                start_time: '',
                end_time: '',
                id: 0,
            },
            car: {
                plate_number: '',
                active: 1,
                emp_id: null,
                id: null,
            },
            filter_base_id: '',
            filter_zone_id: '',
            filter_status_id: '',
            military_number: '',
            fullname_ar: '',
            plate_number: '',
            guest: emptyGuest(),
            fieldValidity: { ...resetCreateFieldValidity(), name_en: true },
            currentPage: 1,
            perPage: 25,
            totalRows: 0,
            addg: false,
            gender: EMPLOYEE_GENDER_OPTIONS,
            bases: [],
            ranks: [],
            nationalities: [],
            addCompany: false,
            editCompany: false,
            info: {},
            ColumnsDef: [],
            RawData: [],
            viewDetail: false,
            isLoading: false,
            listLoading: false,
            blokGuest: false,
            activeTab: 10,
            activeDetailId: null,
            selectedCount: 0,
            selectedRows: [],
            pendingEmployeePhotoFile: null,
            currentCompanyId: null,
            isSavingCompany: false,
            filterTimer: null,

            // General search
            generalSearchQuery: '',
            generalSearchResults: [],
            showGeneralSearchResults: false,
            isGeneralSearchLoading: false,
            searchTotalRows: 0,
            searchPerPage: 50,
            searchCurrentPage: 1,
            searchGridApi: null,
            debounceTimer: null,

            // Company list
            companySearch: '',
            companyPage: 1,
            companyPageSize: 10,
            pinnedCompanies: JSON.parse(localStorage.getItem('pinnedCompanies') || '[]'),
        };
    },
    mounted() {
        this.fetchData();
        this.fetchLookups();
        window.vueApp = this;
    },
    beforeUnmount() {
        clearTimeout(this.filterTimer);
    },
    watch: {
        military_number() { this.scheduleFilter(); },
        fullname_ar() { this.scheduleFilter(); },
        plate_number() { this.scheduleFilter(); },
        filter_status_id() { this.scheduleFilter(); },
        filter_base_id() { this.scheduleFilter(); },
        filter_zone_id() { this.scheduleFilter(); },
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
    computed: {
        canMutate() {
            return canWriteResource('companies', this.authUser);
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
            let modifiedColumnDefs = buildEmployeeGridColumns(this.ColumnsDef)
                .filter((column) => column.field !== 'department');

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

        searchColumnDefs() {
            return [
                { headerName: 'رقم التصريح', field: 'id', sortable: true, width: 120 },
                { headerName: 'الصورة', field: 'photo', sortable: true, width: 90, cellRenderer: customCellImgRenderer },
                { headerName: 'الاسم (EN)', field: 'fullname_en', sortable: true, width: 200 },
                { headerName: 'الاسم', field: 'fullname_ar', sortable: true, width: 200 },
                { headerName: 'البطاقة الشخصية', field: 'qid', sortable: true, width: 150 },
                { headerName: 'الشركة', field: 'company_name', sortable: true, width: 200 },
                {
                    headerName: 'إجراءات', field: 'actions', width: 200,
                    cellRenderer: (params) => `
                        <div class="flex gap-1">
                            <button onclick="vueApp.viewEmployeeFromSearch(${params.data.id})" class="rounded bg-brand px-3 py-1 text-xs text-white hover:bg-brand-dark"><i class="pi pi-eye"></i> عرض</button>
                            <button onclick="vueApp.printSingleBadge(${params.data.id})" class="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"><i class="pi pi-print"></i> طباعة</button>
                        </div>`
                }
            ];
        },

        // Company list computed
        filteredDepartments() {
            const list = Array.isArray(this.departments) ? this.departments : [];
            const query = String(this.companySearch ?? '').trim();
            if (!query) return list;
            const q = query.toLowerCase();
            return list.filter(c =>
                (c.name_en && c.name_en.toLowerCase().includes(q)) ||
                (c.name_ar && c.name_ar.includes(query))
            );
        },
        companyTotalPages() {
            return Math.max(1, Math.ceil(this.filteredDepartments.length / this.companyPageSize));
        },
        pagedDepartments() {
            const start = (this.companyPage - 1) * this.companyPageSize;
            return this.filteredDepartments.slice(start, start + this.companyPageSize);
        },
        visiblePageNumbers() {
            const total = this.companyTotalPages;
            const current = this.companyPage;
            if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
            if (current <= 3) return [1, 2, 3, 4, 5];
            if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
            return [current - 2, current - 1, current, current + 1, current + 2];
        },
    },
    methods: {
        scheduleFilter() {
            if (!this.currentCompanyId) {
                return;
            }
            clearTimeout(this.filterTimer);
            this.filterTimer = setTimeout(() => this.filter(), 300);
        },
        employeeListParams() {
            return buildEmployeeListParams({
                depId: this.currentCompanyId,
                currentPage: this.currentPage,
                perPage: this.perPage,
                militaryNumber: this.military_number,
                fullnameAr: this.fullname_ar,
                plateNumber: this.plate_number,
                filterBaseId: this.filter_base_id,
                filterZoneId: this.filter_zone_id,
                filterStatusId: this.filter_status_id,
                companyOnly: true,
            });
        },
        applyListPayload(payload) {
            const result = applyEmployeeListResponse(payload, this.filter_status_id);
            this.ColumnsDef = result.columns;
            this.RawData = result.rows;
            this.totalRows = result.totalRows;
            this.$nextTick(() => {
                gridApi.value?.refreshCells({ force: true });
            });
        },
        loadCompanyEmployees() {
            if (!this.currentCompanyId) {
                return Promise.resolve();
            }

            this.listLoading = true;
            return api.get('/api/employees', { params: this.employeeListParams() })
                .then((response) => {
                    this.applyListPayload(response.data);
                })
                .catch((error) => {
                    console.error('Error loading company employees:', error);
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل الموظفين', life: 3000 });
                })
                .finally(() => {
                    this.listLoading = false;
                });
        },
        async fetchLookups() {
            try {
                const [basesRes, ranksRes, nationalitiesRes] = await Promise.all([
                    fetchBases(),
                    fetchRanks(),
                    fetchNationalities(),
                ]);
                this.bases = basesRes.data;
                this.ranks = ranksRes.data;
                this.nationalities = nationalitiesRes.data;
            } catch (error) {
                console.error('Error loading lookups:', error);
            }
        },
        loadGuestDetail(id) {
            return api.get(`/api/employees/${id}`).then((response) => {
                revokeEmployeePhotoPreview(this.guest);
                const guest = response.data[0];
                this.guest = guest;
                this.guest.dep_id = this.currentCompanyId;
                this.guest.rank_id = { [guest.rank_id]: true };
                this.guest.photoPreview = null;
                return guest;
            });
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
        openCreatePanel() {
            if (!this.currentCompanyId) {
                this.$toast.add({ severity: 'warn', summary: 'تنبيه', detail: 'اختر شركة أولاً', life: 3000 });
                return;
            }
            this.clearPendingEmployeePhoto();
            this.guest = emptyGuest();
            this.guest.dep_id = this.currentCompanyId;
            this.fieldValidity = resetCreateFieldValidity();
            this.addg = true;
        },
        openEmployeeDetail(event) {
            if (!event?.data?.id) {
                return;
            }
            this.closeGeneralSearch();
            const id = event.data.id;
            this.clearPendingEmployeePhoto();
            this.activeTab = 10;
            this.activeDetailId = id;
            this.car.emp_id = id;
            this.loadGuestDetail(id);
            this.blokGuest = true;
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
            this.loadCompanyEmployees();
        },
        filter() {
            this.currentPage = 1;
            this.loadCompanyEmployees();
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
                acceptClass: 'p-button-success',
                confirmVariant: dialog.confirmVariant,
                accept: () => this.bulkprintCombined(),
            });
        },

        onCompanySearchInput() {
            this.companyPage = 1;
        },
        pinCompany(comp) {
            if (!this.pinnedCompanies.find(p => p.id === comp.id)) {
                this.pinnedCompanies.push({ id: comp.id, name_en: comp.name_en, name_ar: comp.name_ar });
                localStorage.setItem('pinnedCompanies', JSON.stringify(this.pinnedCompanies));
                this.$toast.add({ severity: 'success', summary: 'Pinned', detail: `${comp.name_en} pinned`, life: 2000 });
            }
        },
        unpinCompany(id) {
            this.pinnedCompanies = this.pinnedCompanies.filter(p => p.id !== id);
            localStorage.setItem('pinnedCompanies', JSON.stringify(this.pinnedCompanies));
        },

        viewEmployeeFromSearch(employeeId) {
            api.get(`/api/employees/${employeeId}`)
                .then((response) => {
                    const employee = response.data[0] ?? response.data;
                    this.currentCompanyId = employee.dep_id;
                    return this.infoComp(employee.dep_id);
                })
                .then(() => {
                    this.closeGeneralSearch();
                    this.openEmployeeDetail({ data: { id: employeeId } });
                    this.$nextTick(() => {
                        gridApi.value?.forEachNode((node) => {
                            if (node.data?.id === employeeId) {
                                node.setSelected(true);
                                gridApi.value.ensureNodeVisible(node);
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Error fetching employee:', error);
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل بيانات الموظف', life: 3000 });
                });
        },

        printFromSidePanel() {
            if (this.guest?.id) {
                this.printSingleBadge(this.guest.id);
            } else {
                this.$toast.add({ severity: 'warn', summary: 'تنبيه', detail: 'لم يتم اختيار موظف للطباعة', life: 3000 });
            }
        },

        onPageChange({ page, perPage }) {
            this.currentPage = page;
            if (perPage) {
                this.perPage = perPage;
            }
            this.loadCompanyEmployees();
        },

        OpenAddCompany() {
            this.addCompany = true;
        },

        addComp() {
            if (this.formDataDep.name_en.trim() === '') {
                this.fieldValidity.name_en = false;
                return;
            }
            if (this.isSavingCompany) return;
            this.isSavingCompany = true;

            api.post('/api/companies', this.formDataDep)
                .then(() => {
                    this.fetchData();
                    this.addCompany = false;
                    this.$toast.add({ severity: 'success', summary: 'تم', detail: 'تم إنشاء الشركة', life: 3000 });
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر إنشاء الشركة', life: 3000 });
                })
                .finally(() => {
                    this.isSavingCompany = false;
                });
        },

        infoComp(id) {
            this.viewDetail = true;
            this.currentCompanyId = id;
            this.currentPage = 1;
            this.clearSelection();

            return api.get(`/api/companies/${id}/summary`)
                .then((response) => {
                    this.info = response.data;
                })
                .then(() => this.loadCompanyEmployees())
                .catch((error) => {
                    console.error('Error loading company info:', error);
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل بيانات الشركة', life: 3000 });
                });
        },

        editDep(id) {
            api.get('/api/companies/' + id + '/summary').then(response => { this.formEditDep = response.data; });
            this.editCompany = true;
        },

        updateComp() {
            api.post('/api/companies', this.formEditDep)
                .then(response => {
                    this.fetchData();
                    this.editCompany = false;
                })
                .catch(error => console.error('API error:', error));
        },

        fetchData() {
            const parentId = this.depId;
            if (!parentId) {
                this.departments = [];
                return;
            }

            api.get(`/api/companies/${parentId}`)
                .then((response) => {
                    this.departments = response.data.companies ?? [];
                })
                .catch((error) => {
                    console.error(error);
                    this.departments = [];
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل قائمة الشركات', life: 3000 });
                });
        },

        onGridReady(params) {
            gridApi.value = params.api;
        },

        deleteDepartment(i) {
            this.$confirm.require({
                message: 'Do you want to delete this record?', header: 'Delete Confirmation', icon: 'pi pi-info-circle', acceptClass: 'p-button-danger',
                accept: () => {
                    api.post('/api/departments/delete', { id: i }).then(response => {
                        this.fetchData();
                        this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfully', life: 3000 });
                    });
                },
                reject: () => { }
            });
        },

        formatDate(value, { dateOnly = false } = {}) {
            if (!value) {
                return '—';
            }
            try {
                const options = dateOnly
                    ? { dateStyle: 'medium' }
                    : { dateStyle: 'medium', timeStyle: 'short' };
                return new Intl.DateTimeFormat('ar-QA', options).format(new Date(value));
            } catch {
                return value;
            }
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
                    dep_id: this.currentCompanyId,
                    nationality_id: this.guest.nationality_id,
                    rank_id: treeSelectValue(this.guest.rank_id),
                    default_base: this.guest.default_base,
                    id: this.guest.id,
                    dep_parent_id: this.depId,
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
                    return this.loadCompanyEmployees();
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
            if (!this.car.plate_number?.trim()) {
                this.$toast.add({ severity: 'warn', summary: 'حقل مطلوب', detail: 'رقم اللوحة', life: 3000 });
                return;
            }
            this.car.emp_id = this.guest.id;
            api.post('/api/employees/cars', this.car)
                .then(() => {
                    this.car.plate_number = '';
                    this.loadGuestDetail(this.guest.id);
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
            if (!this.currentCompanyId) {
                this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'اختر شركة أولاً', life: 3000 });
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
                    dep_id: this.currentCompanyId,
                    nationality_id: this.guest.nationality_id,
                    rank_id: treeSelectValue(this.guest.rank_id),
                    default_base: this.guest.default_base,
                },
                photoFile,
            );
            formData.set('is_employee', '1');
            appendZoningToFormData(formData, this.guest.selectedZones);

            this.isLoading = true;
            createEmployee(formData)
                .then(() => {
                    this.clearPendingEmployeePhoto();
                    return this.loadCompanyEmployees();
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
                            this.loadCompanyEmployees();
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
                            this.loadCompanyEmployees();
                            this.$toast.add({ severity: 'success', summary: 'تم التنفيذ', detail: dialog.message, life: 3000 });
                        })
                        .catch(() => {
                            this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحديث حالة الموظفين', life: 3000 });
                        });
                },
            });
        },

        handleGeneralSearchInput() {
            clearTimeout(this.debounceTimer);
            if (this.generalSearchQuery.trim().length >= 2) {
                this.debounceTimer = setTimeout(() => { this.performGeneralSearch(); }, 500);
            } else if (this.generalSearchQuery.trim() === '') { this.clearGeneralSearch(); }
        },

        performGeneralSearch() {
            if (!this.generalSearchQuery.trim()) return;
            this.isGeneralSearchLoading = true;
            this.showGeneralSearchResults = true;
            api.get('/api/employees/search', {
                params: {
                    query: this.generalSearchQuery,
                    page: this.searchCurrentPage,
                    per_page: this.searchPerPage,
                    scope: 'company',
                },
            })
                .then(response => {
                    this.generalSearchResults = response.data.data;
                    this.searchTotalRows = response.data.total;
                    this.isGeneralSearchLoading = false;
                    setTimeout(() => {
                        const resultsElement = document.querySelector('.search-results-container');
                        if (resultsElement) resultsElement.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                })
                .catch(error => {
                    console.error('Search error:', error);
                    this.isGeneralSearchLoading = false;
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to perform search', life: 3000 });
                });
        },

        onSearchGridReady(params) { this.searchGridApi = params.api; },
        onSearchRowClicked(event) { this.viewEmployeeFromSearch(event.data.id); },
        onSearchGridPageChange({ page, perPage }) {
            this.searchCurrentPage = page;
            if (perPage) {
                this.searchPerPage = perPage;
            }
            this.performGeneralSearch();
        },

        onSearchPageChange(event) { this.searchCurrentPage = event.page + 1; this.performGeneralSearch(); },

        clearGeneralSearch() {
            this.generalSearchQuery = '';
            this.generalSearchResults = [];
            this.showGeneralSearchResults = false;
            this.searchCurrentPage = 1;
        },
        closeGeneralSearch() {
            this.showGeneralSearchResults = false;
            this.generalSearchResults = [];
            this.searchCurrentPage = 1;
        },
    }
};
</script>

<style scoped>
.emp-grid-hint {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.5rem;
    margin: 0.75rem 0 0.5rem;
    font-size: 0.8125rem;
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
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    color: #475569;
}

.emp-results-bar__count {
    font-weight: 600;
    color: #0f172a;
}

.emp-results-bar__badge {
    border-radius: 9999px;
    background: #fef3c7;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #b45309;
}

.companies-workspace {
    width: 100%;
}

.companies-main {
    min-width: 0;
}

.companies-employee-grid :deep(.app-data-grid),
.companies-employee-grid :deep(.gate-data-grid) {
    width: 100%;
}

.companies-main-header h3 {
    max-width: 100%;
}
</style>
