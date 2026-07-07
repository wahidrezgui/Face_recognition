<template>
    <PageContainer
        title="قائمة الموظفين"
        description="إدارة الموظفين والبطاقات وصلاحيات الدخول"
    >
        <template v-if="canMutate" #actions>
            <AppButton @click="OpenAddg">
                <i class="pi pi-user-plus" aria-hidden="true" />
                إضافة موظف
            </AppButton>
            <AppButton variant="secondary" @click="onBtImport">
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
            :isfiltered="isfiltered"
            :selected-count="selectedCount"
            :bulk-actions="bulkActions"
            :read-only="!canMutate"
            @filter="filter"
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

        <AppDataGrid
            ref="agGrid"
            :column-defs="mergedColumnDefs"
            :row-data="RawData"
            :per-page="perPage"
            :total-rows="totalRows"
            :get-row-class="detailRowClass"
            :row-selection="canMutate ? 'multiple' : 'none'"
            pagination-mode="server"
            height="calc(100vh - 22rem)"
            line-height="56px"
            @grid-ready="onGridReady"
            @row-clicked="openEmployeeDetail"
            @selection-changed="onSelectionChanged"
            @page-change="onPageChange"
            @update:per-page="perPage = $event"
        />
    </PageContainer>

<VueSidePanel v-model="addg" lock-scroll no-close="true" width="680px" >
            <div dir="rtl">
            <form novalidate="" id="formguest" @submit.prevent="createguest" >
            <div class="flex h-full flex-col bg-white dark:bg-neutral-900">
            <div class="flex min-h-0 flex-1 flex-col  py-6">

            <div class="px-4 sm:px-6">
            <div class="flex items-start justify-between">
            <div class="space-y-1">
            <h2 class="text-lg font-medium text-neutral-700">
            اضافة موظف
            </h2>
            </div>
            </div>
            </div>

            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div class="grid grid-cols-12 gap-x-4">


            <div class="col-span-12 grid grid-cols-2 gap-4">
            <Avatar icon="pi pi-user" class="mr-2" size="xlarge" shape="circle" />
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الصورة</span>
            </label>
            <div class="relative">
            <input type="file" placeholder="الصورة" name="photo" @change="handleFileChange('photo')" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-2">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الجنس</span>
            </label>
            <div class="relative">
            <Dropdown  v-model="guest.gender_id" :options="gender" optionLabel="name_ar" optionValue="id" placeholder="اختر الجنس" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الاسم بالانجليزي</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.fullname_en" :class="{ 'border-red-500': !fieldValidity.fullname_en }" @input="fieldValidity.fullname_en = true" placeholder="Full Name" name="fullname_en" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الاسم الكامل</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.fullname_ar" :class="{ 'border-red-500': !fieldValidity.fullname_ar }" @input="fieldValidity.fullname_ar = true" placeholder="الاسم الكامل" name="fullname_ar" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>ملاحظات</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.remarks" :class="{ 'border-red-500': !fieldValidity.remarks }" @input="fieldValidity.remarks = true" placeholder="ملاحظات" name="remarks" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>مهنة</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.Job_En" :class="{ 'border-red-500': !fieldValidity.Job_En }" @input="fieldValidity.Job_En = true" placeholder="مهنة" name="Job_En" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>فصيلةالدم</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.bloodtype" :class="{ 'border-red-500': !fieldValidity.bloodtype }" @input="fieldValidity.bloodtype = true" placeholder="فصيلةالدم" name="bloodtype" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الوحدة</span>
            </label>
            <div class="relative">
                <TreeSelect v-model="guest.dep_id" :options="departments" placeholder="اختر الجناح" showClear class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الرتبة</span>
            </label>
            <div class="relative">
                <TreeSelect v-model="guest.rank_id" :options="ranks" optionLabel="name_ar" placeholder="اختر الرتبة" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>رقم الهاتف</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="رقم الهاتف" name="phone_number" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الرقم العسكري</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.military_number" :class="{ 'border-red-500': !fieldValidity.military_number }" @input="fieldValidity.military_number = true" placeholder="Military Number" name="military_number" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>البطاقة الشخصية</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.qid" :class="{ 'border-red-500': !fieldValidity.qid }" @input="fieldValidity.qid = true" placeholder="البطاقة الشخصية" name="qid" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الجنسية</span>
            </label>
            <div class="relative">
            <Dropdown  v-model="guest.nationality_id" :options="nationalities" optionLabel="name_ar" optionValue="id" placeholder="الجنسية" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>انتهاء الصلاحية</span>
            </label>
            <div class="relative">
            <input type="date" v-model="guest.expiry_date" :class="{ 'border-red-500': !fieldValidity.expiry_date }" @input="fieldValidity.expiry_date = true" placeholder="Expiry Date" name="expiry_date" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
             <input type="hidden" name="created_by" :value="userName" >
            <input type="hidden" name="dep_parent_id" :value="depId" >   
            <input type="hidden" name="is_employee" value="0" >  
            </div>
            

            </div>
            </div>

            <hr/>
            <div class="flex justify-between px-8 py-4">
            <h2 class="py-4 text-lg font-medium">صلاحيات الدخول</h2>
            <div class="relative">
            <Dropdown  v-model="guest.default_base" :options="bases" optionLabel="name_en" optionValue="id" placeholder="القاعدة" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>

            <div class="relative mb-5 flex-1 px-4 sm:px-6">
            <div class="grid grid-cols-2 gap-4">
                    <Card v-for="base in bases" :key="base.id" class="bg-white text-gray-700 border shadow-md rounded-md">
                            <template #title> 
                           
                            <div>
                                <label  class="ml-2"> {{base.name_ar}} </label>
                            </div>
                            
                            </template>
                            <template #content>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white">
                                    <tr v-for="zone in base.zones" :key="zone.id" :for="zone.id">
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <Checkbox v-model="guest.selectedZones" name="zoning[]" :inputId="zone.id" :value="zone.id" class="border-2 w-6 h-6 text-gray-600 rounded-lg transition-colors duration-200" />
                                    </td>
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <span class="font-semibold">{{zone.name_en}}</span>
                                    </td>
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <ZoneSwatch :zone="zone" size="md" shape="circle" />
                                    </td>
                                    </tr>
                                    </tbody>
                                </table>
                        </template>
                    </Card>
            </div>
            </div>


            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <AppButton variant="secondary" @click="addg=false">
            الغاء
            </AppButton>
            <AppButton type="submit">
            تسجيل
            </AppButton>
            </div>
            </div>

            </div>
            </div>
            </form>
            </div>
</VueSidePanel>


<VueSidePanel v-model="dataimport" lock-scroll no-close="true" width="400px" >
      <div v-if="headers!=''" class="px-4 py-2 sm:p-3 csv">
            
      <vue-csv-import :fields="{gender_id: {required: true, label: 'Gender'}, Job_En: {required: false, label: 'مهنة'}, fullname_en: {required: false, label: 'Full Name'}, fullname_ar: {required: true, label: 'الاسم الكامل'}, qrcode: {required: true, label: 'Registration Number'}}" >
      <vue-csv-toggle-headers></vue-csv-toggle-headers>
      <vue-csv-input name="file"></vue-csv-input>
      <vue-csv-map :auto-match="true"></vue-csv-map>
      <vue-csv-submit class="inline-flex mt-10 text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded" :url="'/api/employees/import?dep_id='+this.depId+'&by='+this.userName"  :config="{}" @click="handleImport"></vue-csv-submit>
      </vue-csv-import>

      </div>
</VueSidePanel>


<EmployeeDetailPanel
    v-model:open="blokGuest"
    v-model:active-tab="activeTab"
    :guest="guest"
    :car="car"
    :gender="gender"
    :nationalities="nationalities"
    :departments="departments"
    :ranks="ranks"
    :bases="bases"
    :user-name="userName"
    :dep-id="depId"
    :read-only="!canMutate"
    @save="updateguest"
    @file-change="handleFileChange"
    @add-car="addCar"
    @delete-car="delCar"
/>

<AppLoader :loading="isLoading" variant="overlay" label="جاري التحميل..." />
</template>

<script>
import api from '../../api/client';
import { fetchBases, fetchBase, fetchAllDepartments, fetchDepartmentTree } from '../../api/organization';
import { fetchRanks, fetchNationalities } from '../../api/lookups';
import { normalizeDepartmentTree } from '../../lib/departmentTree';
import AppDataGrid from '../../components/ui/AppDataGrid.vue';
import EmployeeDatabaseFilters from '../../components/employees/EmployeeDatabaseFilters.vue';
import EmployeeStatusCards from '../../components/employees/EmployeeStatusCards.vue';
import EmployeeDetailPanel from '../../components/employees/EmployeeDetailPanel.vue';
import { EMPLOYEE_GENDER_OPTIONS, EMPLOYEE_STATUS_LABELS, buildEmployeeBulkConfirm, buildEmployeeGridColumns, resolveEmployeeBulkActions } from '../../lib/employees/employeeFormUi';
import { canWriteResource, isGlobalScope } from '../../lib/auth-roles';
import { useAuth } from '../../composables/useAuth';
import { ref } from 'vue';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import FileUpload from 'primevue/fileupload';
import {VueCsvToggleHeaders, VueCsvSubmit, VueCsvMap, VueCsvInput, VueCsvErrors, VueCsvImport} from 'vue-csv-import';
import { createBadgePrintMixin } from '../../composables/useBadgePrint';
import Card from 'primevue/card';
import Avatar from 'primevue/avatar';
import TreeSelect from 'primevue/treeselect';
import Tag from 'primevue/tag';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppButton from '../../components/ui/AppButton.vue';
import ZoneSwatch from '../../components/zones/ZoneSwatch.vue';

const gridApi = ref();

function customCellRenderer(params) {
    const cellValue = params.value;
    const status = EMPLOYEE_STATUS_LABELS[cellValue];
    if (!status) {
        return '';
    }
    return `<span class="py-1 px-3 rounded text-xs ${status.className}">${status.text}</span>`;
}

function customCellImgRenderer(params) {
    var cellValue = params.value;
    var formattedValue='';
    if(cellValue!=null){formattedValue='<img src="'+cellValue+'" class="object-cover w-8 h-8 rounded-full mt-2" />';}
    else{formattedValue='<img src="/uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" />';}

    return formattedValue;
}

export default {
     name: "Employees",
        setup() {
            const { user: authUser } = useAuth();
            return { authUser };
        },
        components: {
                    AppDataGrid,
                    EmployeeDatabaseFilters,
                    EmployeeStatusCards,
                    EmployeeDetailPanel,
                    Dropdown, Checkbox, FileUpload, Card, Avatar, TreeSelect,
                    VueCsvToggleHeaders,
                    VueCsvSubmit,
                    VueCsvMap,
                    VueCsvInput,
                    VueCsvErrors,
                    VueCsvImport,
                    Tag,
                    PageContainer,
                    AppButton,
                    ZoneSwatch,
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
                currentPage:1,
                perPage:25,
                totalRows: 0,
                isfiltered:false,
                selectedCount: 0,
                selectedRows: [],
                activeDetailId: null,
                military_number:'',
                fullname_ar: '',
                activeTab:10,
                plate_number: '',
                depId: localStorage.getItem('dep_id'),
                userName: localStorage.getItem('user_name'),
                ColumnsDef:[],
                RawData:[],
                RawDataStatus:[],
                isLoading:false,
                addg:false,
                blokGuest:false,
                dataimport:false,
                editguest:false,
                car:{
                    plate_number:'',
                    active:1,
                    emp_id:null
                },
                guest:{
                    fullname_en:'',
                    Job_En:'',
                    fullname_ar:'',
                    qrcode:'',
                    military_number:'',
                    phone_number:null,
                    expiry_date:'',
                    qid:null,
                    gender_id:null,
                    nationality_id:null,
                    dep_id:null,
                    rank_id:null,
                    default_base:0,
                    selectedZones:null,
                    id:null,
                    plate_number:'',
                    dep_name:'',
                    nationality:'',
                    ranke:'',
                    dep3:'',
                    bloodtype:'',
                    nationalitye:''
                   
                },
                formDataGuest:{
                    fullname_en:'',
                    Job_En:'',
                    fullname_ar:'',
                    qrcode:'',
                    military_number:'',
                    phone_number:null,
                    expiry_date:'',
                    qid:'',
                    gender_id:null,
                    nationality_id:null,
                    dep_id:null,
                    rank_id:null,
                    default_base:0,
                    selectedZones:null,
                    plate_number:'',
                    dep_name:'',
                    nationality:'',
                    ranke:'',
                    dep3:'',
                    nationalitye:'',
                    bloodtype:'',
                    
                  
                },
           
                fieldValidity: {
                    military_number: true,
                    fullname_ar:true,
                    remarks:true,
                    bloodtype:true,
                    fullname_en:true,
                    Job_En:true,
                    qid:true,
                    expiry_date:true
                },
                selectedGender:null,
                selectedDep:null,
                selectedRank:null,
                selectedNationality:null,
                selectedBases:null,
                gender: EMPLOYEE_GENDER_OPTIONS,
                departments:[],
                bases:[],
                ranks:[],
                nationalities:[],
            }
        },
        mounted() {
            this.fetchData();
            this.getEmployees();
        },
        watch: {
            blokGuest(open) {
                if (!open) {
                    this.activeDetailId = null;
                }
            },
        },
        computed: {
            canMutate() {
                return canWriteResource('employees', this.authUser);
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

                    const columnIndex = modifiedColumnDefs.findIndex( (column) => column.headerName === "الحالة" );
                    if (columnIndex !== -1) { modifiedColumnDefs[columnIndex].cellRenderer = customCellRenderer; }

                    const colIndex = modifiedColumnDefs.findIndex( (column) => column.headerName === "الصورة" );
                    if (colIndex !== -1) { modifiedColumnDefs[colIndex].cellRenderer = customCellImgRenderer; }

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
        methods: {
            employeeListParams() {
                const params = {
                    dep_id: this.depId,
                    page: this.currentPage,
                    per_page: this.perPage,
                };

                const military = String(this.military_number ?? '').trim();
                const name = String(this.fullname_ar ?? '').trim();
                const plate = String(this.plate_number ?? '').trim();

                if (military) {
                    params.military_number = military;
                }
                if (name) {
                    params.fullname_ar = name;
                }
                if (plate) {
                    params.plate_number = plate;
                }
                if (this.filter_base_id) {
                    params.base_id = this.filter_base_id;
                }
                if (this.filter_zone_id) {
                    params.zone_id = this.filter_zone_id;
                }
                if (this.filter_status_id !== '' && this.filter_status_id !== null && this.filter_status_id !== undefined) {
                    params.status = this.filter_status_id;
                }

                return params;
            },
            appendZoning(formData, selectedZones) {
                const zones = Array.isArray(selectedZones)
                    ? selectedZones
                    : (selectedZones ? Object.values(selectedZones) : []);

                zones.forEach((zoneId) => {
                    if (zoneId !== null && zoneId !== undefined && zoneId !== '') {
                        formData.append('zoning[]', zoneId);
                    }
                });
            },
            loadGuestDetail(id) {
                return api.get(`/api/employees/${id}`).then((response) => {
                    const guest = response.data[0];
                    this.guest = guest;
                    this.guest.dep_id = { [guest.dep_id]: true };
                    this.guest.rank_id = { [guest.rank_id]: true };
                    return guest;
                });
            },
            refreshGuestDetailAfterPrint(guestIds) {
                if (this.blokGuest && this.guest?.id && guestIds.includes(this.guest.id)) {
                    this.loadGuestDetail(this.guest.id);
                }
            },
            needsWhiteBorder(color) {
        const lightColors = ['#FFFFFF', '#FFFF00', '#00FFFF', '#FFCC00', /* add more */];
        return lightColors.includes(color.toUpperCase());
    },
            selectGuest(guestData){
                    this.guest = guestData;
                    },
                resetFilter() {
        this.military_number = '';
        this.fullname_ar = '';
        this.plate_number = '';
        this.filter_base_id = '';
        this.filter_zone_id = '';
        this.filter_status_id = '';
        this.isfiltered = false;
        this.currentPage = 1;
        this.getEmployees();
    },
    filter() {
        const hasFilter = [
            this.military_number,
            this.fullname_ar,
            this.plate_number,
            this.filter_base_id,
            this.filter_zone_id,
            this.filter_status_id,
        ].some((value) => String(value ?? '').trim() !== '');

        this.isfiltered = hasFilter;
        this.currentPage = 1;

        if (!hasFilter) {
            this.getEmployees();
            return;
        }

        this.ColumnsDef = [];
        this.RawData = [];
        this.RawDataStatus = [];
        this.totalRows = 0;

        api.get('/api/employees', { params: this.employeeListParams() })
        .then(response => {
            this.applyEmployeeListResponse(response.data);
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
    },
                applyEmployeeListResponse(payload) {
                    this.ColumnsDef = payload.columns || [];
                    this.RawDataStatus = payload.data || [];

                    if (payload.guests?.data) {
                        this.RawData = payload.guests.data;
                        this.totalRows = payload.pagination?.total ?? payload.guests.total ?? 0;
                        return;
                    }

                    const bucket = payload.data?.find(
                        (item) => String(item.id) === String(this.filter_status_id),
                    ) ?? payload.data?.[0];

                    if (bucket?.guests?.data) {
                        this.RawData = bucket.guests.data;
                        this.totalRows = bucket.pagination?.total ?? 0;
                    } else {
                        this.RawData = [];
                        this.totalRows = 0;
                    }
                },
                getEmployees(){
                    api.get('/api/employees', { params: this.employeeListParams() })
                    .then(response => {
                        this.applyEmployeeListResponse(response.data);
                    })
                    .catch(error => {
                        console.error('Error fetching employees:', error);
                    });
                },
                async fetchData(){
                    try {
                        const treeResponse = isGlobalScope('departments')
                            ? await fetchAllDepartments()
                            : await fetchDepartmentTree(this.depId);
                        this.departments = normalizeDepartmentTree(treeResponse.data?.departments ?? []);
                    } catch (error) {
                        console.error('Error loading departments:', error);
                        this.departments = [];
                    }

                    fetchBases() 
                    .then(response => {
                        this.bases = response.data;
                    });

                    fetchRanks() 
                    .then(response => {
                        this.ranks = response.data;
                    });

                    fetchNationalities() 
                    .then(response => {
                        this.nationalities = response.data;
                    });
                },
                onGridReady(params){
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
                onBtExport(){
                        gridApi.value.exportDataAsCsv();
                },
                onBtImport(){
                        this.dataimport=true;
                },
                handleImport() {
                            this.dataimport=false; 
                },
                OpenInvite() {
                        this.invite = !this.invite;
                },
                OpenAddg() {
                        this.addg = !this.addg;
                },
                updateguest(){
                        const formData = new FormData(document.getElementById('formeditguest'));
                        formData.append('gender_id', this.guest.gender_id);
                        formData.append('dep_id', Object.keys(this.guest.dep_id)[0]);
                        formData.append('nationality_id', this.guest.nationality_id);
                        formData.append('rank_id', Object.keys(this.guest.rank_id)[0]);
                        formData.append('default_base', this.guest.default_base);
                        formData.append('id', this.guest.id);
                        formData.append('dep_parent_id', this.guest.dep_parent_id || this.depId);
                        this.appendZoning(formData, this.guest.selectedZones);

                        api.post('/api/employees/update', formData)
                        .then(() => {
                            this.getEmployees();
                            this.blokGuest=false;
                            this.$toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ التعديلات', life: 3000 });
                        })
                        .catch((error) => {
                            const detail = error.response?.data?.message || 'تعذر حفظ التعديلات';
                            this.$toast.add({ severity: 'error', summary: 'خطأ', detail, life: 4000 });
                        });

                },
                addCar(){

                        if (this.car.plate_number == '') {
                            this.$toast.add({ severity: 'Field Required', summary: 'Error', detail: 'Plate number', life: 3000 });
                            return;
                        }

                        api.post('/api/employees/cars', this.car)
                        .then(response => {
                            this.loadGuestDetail(response.data.guest_id);
                        }).catch(error => {
                            this.$toast.add({ severity: 'Field Required', summary: 'Error', detail: 'Plate number', life: 3000 });
                        });
                },
                delCar(id) {
      console.log('Delete method called with ID:', id); // Debugging log
      if (!id) {
        console.error('ID is undefined or null'); // Debugging log
        return;
      }
      this.$confirm.require({
        message: 'Do you want to delete this record?',
        header: 'Delete Confirmation',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        accept: () => {
          console.log('Accepted deletion'); // Debugging log
                        api.post('/api/employees/cars/delete', { id })
            .then(response => {
              console.log('Response:', response); // Debugging log
              if (response.data.status === 'success') {
                this.loadGuestDetail(this.guest.id);
                this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfully', life: 3000 });
              } else {
                this.$toast.add({ severity: 'error', summary: 'Error', detail: response.data.message, life: 3000 });
              }
            })
            .catch(error => {
              console.log('Error:', error); // Debugging log
              this.$toast.add({ severity: 'error', summary: 'Error', detail: 'An error occurred.', life: 3000 });
            });
        },
        reject: () => {
          console.log('Deletion rejected'); // Debugging log
        }
      });
    },
                createguest(){

                    if (this.guest.military_number.trim() === '') {
                    this.fieldValidity.military_number = false;
                    return;
                    }

                    if (this.guest.fullname_ar.trim() === '') {
                    this.fieldValidity.fullname_ar = false;
                    return;
                    }
                  if (this.guest.remarks.trim() === '') {
                    this.fieldValidity.remarks = false;
                    return;
                    }
                    if (this.guest.bloodtype.trim() === '') {
                    this.fieldValidity.bloodtype = false;
                    return;
                    }
                    if (this.guest.fullname_en.trim() === '') {
                    this.fieldValidity.fullname_en = false;
                    return;
                    }
                    if (this.guest.Job_En.trim() === '') {
                    this.fieldValidity.Job_En = false;
                    return;
                    }

                    if (this.guest.qid.trim() === '') {
                    this.fieldValidity.qid = false;
                    return;
                    }

                    if (this.guest.expiry_date.trim() === '') {
                    this.fieldValidity.expiry_date = false;
                    return;
                    }

                        const formData = new FormData(document.getElementById('formguest'));
                        formData.append('gender_id', this.guest.gender_id);
                        formData.append('dep_id', Object.keys(this.guest.dep_id)[0]);
                        formData.append('nationality_id', this.guest.nationality_id);
                        formData.append('rank_id', Object.keys(this.guest.rank_id)[0]);
                        formData.append('default_base', this.guest.default_base);
                        this.appendZoning(formData, this.guest.selectedZones);

                        if (this.guest.default_base == 0) {
                            this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Select Default Base', life: 3000 });
                            return;
                        }

                        api.post('/api/employees', formData)
                        .then(response => {
                            this.getEmployees();
                            this.addg=false;
                        }).catch(error => {
                            this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Please fill all the mandatory fields.', life: 3000 });
                        });
                },
                openEmployeeDetail(event){
                        if (!event?.data?.id) {
                            return;
                        }

                        const id = event.data.id;
                        this.editguest=false;
                        this.activeTab=10;
                        this.activeDetailId=id;
                        this.car.emp_id=id;
                        this.loadGuestDetail(id);
                        this.blokGuest=true;
                },
                deleteSelected(){
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

                        api.post('/api/employees/delete', {'guests':guestIds})
                        .then(() => {
                        this.clearSelection();
                        this.getEmployees();
                        });

                        this.$toast.add({ severity: 'success', summary: 'تم الحذف', detail: `تم حذف ${count} موظف بنجاح`, life: 3000 });
                        },
                        reject: () => {

                        }
                        });
                },
                approveSelected(status){
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

                        api.post('/api/employees/approve', {guests:guestIds,by:this.userName,'status':status})
                        .then(() => {
                        this.clearSelection();
                        this.getEmployees();
                        });

                        this.$toast.add({ severity: 'success', summary: 'تم التنفيذ', detail: dialog.message, life: 3000 });
                        },
                        reject: () => {

                        }
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
                        reject: () => {},
                    });
                },
        }
}
</script>

<style scoped>
.emp-header-btn {
  display: inline-flex;
  align-items: center;
  height: 2.5rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 600;
}

.emp-header-btn--primary {
  background: var(--brand, #8b1538);
  color: #fff;
}

.emp-header-btn--secondary {
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #334155;
}

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

:deep(.emp-row-detail) {
  background-color: #fffbeb !important;
}
</style>