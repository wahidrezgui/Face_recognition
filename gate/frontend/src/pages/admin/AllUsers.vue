<template>
  <PageContainer
    title="إدارة المستخدمين"
    :description="pageDescription"
  >
    <template #actions>
      <button
        type="button"
        class="rounded-lg bg-brand px-4 py-2 font-semibold text-white transition hover:bg-brand-dark"
        @click="openAddUserPanel"
      >
        <i class="pi pi-plus ms-2" aria-hidden="true" />
        إضافة مستخدم
      </button>
    </template>

    <AppCard padding="sm">
      <AppTableFilters @clear="clearFilters">
        <div class="md:col-span-3">
          <label class="mb-1 block text-sm font-medium text-slate-700">البحث بالاسم أو البريد</label>
          <input
            v-model="filters.name"
            type="search"
            placeholder="ابحث..."
            class="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div class="md:col-span-3">
          <label class="mb-1 block text-sm font-medium text-slate-700">القسم</label>
          <TreeSelect
            v-model="filters.department"
            :options="departments"
            placeholder="اختر القسم"
            show-clear
            filter
            filter-mode="lenient"
            filter-placeholder="ابحث في الوحدات..."
            class="user-treeselect w-full"
          >
            <template #value>
              <span v-if="filterDepartmentLabel" class="user-treeselect-value">{{ filterDepartmentLabel }}</span>
              <span v-else class="user-treeselect-placeholder">اختر القسم</span>
            </template>
          </TreeSelect>
        </div>

        <div v-if="isScopedView" class="md:col-span-3">
          <label class="mb-1 block text-sm font-medium text-slate-700">الدور</label>
          <select
            v-model="filters.role"
            class="user-rtl-select h-10 w-full rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">كل الأدوار</option>
            <option v-for="role in filterRoleOptions" :key="role.id" :value="role.name">
              {{ role.name }}
            </option>
          </select>
        </div>

        <div v-if="!isScopedView" class="md:col-span-3">
          <label class="mb-1 block text-sm font-medium text-slate-700">القاعدة</label>
          <select
            v-model="filters.baseId"
            class="user-rtl-select h-10 w-full rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">كل القواعد</option>
            <option v-for="base in bases" :key="base.id" :value="String(base.id)">
              {{ base.name_ar || base.name_en || base.name }}
            </option>
          </select>
        </div>

        <div :class="isScopedView ? 'md:col-span-3' : 'md:col-span-3'">
          <label class="mb-1 block text-sm font-medium text-slate-700">حالة مرسال</label>
          <select
            v-model="filters.ssoStatus"
            class="user-rtl-select h-10 w-full rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">الكل</option>
            <option value="pending">بانتظار التفعيل</option>
            <option value="linked">مرتبط</option>
            <option value="unlinked">غير مرتبط</option>
          </select>
        </div>
      </AppTableFilters>

      <AppDataGrid
        :column-defs="userColumnDefs"
        :row-data="filteredUsers"
        :loading="isLoading"
        loading-label="جاري تحميل المستخدمين…"
        pagination-mode="client"
        :per-page="25"
        :rows-per-page-options="[10, 25, 50, 100]"
        empty-message="لا يوجد مستخدمون مطابقون. أضف مستخدماً جديداً أو غيّر الفلاتر."
        row-selection="none"
        :animate-rows="false"
        @row-edit="editUser"
        @row-delete="onRowDelete"
      />
    </AppCard>
  </PageContainer>

  <VueSidePanel v-model="isPanelOpen" lock-scroll hide-close-btn :width="panelWidth" @closed="resetForm">
    <div class="flex h-full flex-col" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="submitUserForm">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">
                {{ isEditing ? 'تعديل مستخدم' : 'إضافة مستخدم' }}
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ isEditing ? 'تحديث بيانات المستخدم' : 'أدخل بيانات المستخدم الجديد' }}
              </p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="isPanelOpen = false">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <div v-if="showSsoActivationPanel" class="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p class="text-sm font-medium text-amber-900">حساب مرسال بانتظار التفعيل</p>
              <p class="mt-1 text-xs leading-6 text-amber-800">
                هذا المستخدم سجّل الدخول عبر مرسال. فعّل الحساب وعيّن الدور والقسم لإكمال الربط.
              </p>
              <label class="mt-3 flex cursor-pointer items-center gap-2 text-sm text-amber-900">
                <input
                  v-model="formData.activate_sso"
                  type="checkbox"
                  class="h-4 w-4 rounded border-amber-300 text-brand focus:ring-brand/20"
                  @change="clearValidationError('dep_id')"
                />
                <span>تفعيل حساب مرسال</span>
              </label>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">
                  الاسم الأول <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.firstname"
                  type="text"
                  placeholder="الاسم الأول"
                  :class="inputClass('firstname')"
                  @input="clearValidationError('firstname')"
                />
                <p v-if="validationErrors.firstname" class="mt-1 text-xs text-red-500">{{ validationErrors.firstname }}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">
                  اسم العائلة <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="formData.lastname"
                  type="text"
                  placeholder="اسم العائلة"
                  :class="inputClass('lastname')"
                  @input="clearValidationError('lastname')"
                />
                <p v-if="validationErrors.lastname" class="mt-1 text-xs text-red-500">{{ validationErrors.lastname }}</p>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                البريد الإلكتروني <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.email"
                type="text"
                placeholder="example@domain.com"
                dir="ltr"
                :class="inputClass('email')"
                @input="clearValidationError('email')"
              />
              <p v-if="validationErrors.email" class="mt-1 text-xs text-red-500">{{ validationErrors.email }}</p>
              <p v-else-if="isEditing" class="mt-1 text-xs text-slate-500">يمكن استخدام اسم المستخدم للحسابات القديمة</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                كلمة المرور
                <span v-if="!isEditing" class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.password"
                type="password"
                placeholder="كلمة المرور"
                :class="inputClass('password')"
                @input="clearValidationError('password')"
              />
              <p v-if="validationErrors.password" class="mt-1 text-xs text-red-500">{{ validationErrors.password }}</p>
              <p v-else-if="isEditing && formData.sso_pending" class="mt-1 text-xs text-slate-500">كلمة المرور اختيارية لحسابات مرسال</p>
              <p v-else-if="isEditing" class="mt-1 text-xs text-slate-500">اتركه فارغاً للإبقاء على كلمة المرور الحالية</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                الدور <span class="text-red-500">*</span>
              </label>
              <select v-model="formData.role" :class="[inputClass('role'), 'user-rtl-select']">
                <option value="">اختر الدور</option>
                <option v-for="role in roleOptionsForForm" :key="role.id" :value="role.name">
                  {{ role.name }}
                </option>
              </select>
              <p v-if="validationErrors.role" class="mt-1 text-xs text-red-500">{{ validationErrors.role }}</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                القسم
                <span v-if="requiresDepartmentForSave" class="text-red-500">*</span>
              </label>
              <TreeSelect
                :key="`form-dept-${formData.id || 'new'}-${deptTreeSelectKey}`"
                v-model="formData.dep_id_tree"
                :options="departments"
                placeholder="اختر القسم"
                show-clear
                filter
                filter-mode="lenient"
                filter-placeholder="ابحث في الوحدات..."
                class="user-treeselect w-full"
                :loading="departmentsLoading"
                @update:model-value="onFormDepartmentChange"
              >
                <template #value>
                  <span v-if="formDepartmentLabel" class="user-treeselect-value">{{ formDepartmentLabel }}</span>
                  <span v-else class="user-treeselect-placeholder">اختر القسم</span>
                </template>
              </TreeSelect>
              <p v-if="validationErrors.dep_id" class="mt-1 text-xs text-red-500">{{ validationErrors.dep_id }}</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">القاعدة الافتراضية</label>
              <select v-model="formData.default_base" class="user-rtl-select w-full rounded-lg border border-slate-200 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
                <option :value="null">اختر القاعدة</option>
                <option v-for="base in baseOptionsForForm" :key="base.id" :value="base.id">
                  {{ base.name_ar || base.name_en || base.name }}
                </option>
              </select>
              <p v-if="!usesFullBaseCatalog" class="mt-1 text-xs text-slate-500">
                تظهر القواعد المرتبطة بقسمك فقط. للمزيد، اطلب ربط قاعدة جديدة بقسمك من المسؤول.
              </p>
            </div>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              @click="isPanelOpen = false"
            >
              إلغاء
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? 'جاري الحفظ…' : (isEditing ? 'تحديث' : 'إنشاء') }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>
  <Toast />
</template>

<script>
import { fetchUsers, createUser, updateUser, deleteUser } from '../../api/users';
import { fetchBases, fetchDepartmentTree, fetchAllDepartments } from '../../api/organization';
import TreeSelect from 'primevue/treeselect';
import Toast from 'primevue/toast';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppDataGrid from '../../components/ui/AppDataGrid.vue';
import {
  buildActionColumn,
  pillBadgeRenderer,
  roleBadgeRenderer,
  ssoStatusBadgeRenderer,
  arabicTextComparator,
} from '../../lib/table/gridDefaults.js';
import {
  applyTreeSelectValue,
  collectDescendantDeptIds,
  extractDeptKey,
  findDepartmentLabel,
  normalizeDepartmentTree,
  toTreeSelectValue,
} from '../../lib/departmentTree.js';
import { getAuthRoleName } from '../../lib/auth-session';

const ROLE_OPTIONS = {
  superAdmin: [
    { id: 1, name: 'Super Admin' },
    { id: 2, name: 'Admin' },
    { id: 3, name: 'Local Admin' },
    { id: 4, name: 'Gate Pass Provider' },
    { id: 5, name: 'Gate Guard' },
    { id: 6, name: 'Reporting' },
  ],
  admin: [
    { id: 2, name: 'Admin' },
    { id: 3, name: 'Local Admin' },
    { id: 4, name: 'Gate Pass Provider' },
    { id: 5, name: 'Gate Guard' },
    { id: 6, name: 'Reporting' },
  ],
  localAdmin: [
    { id: 6, name: 'Reporting' },
    { id: 3, name: 'Local Admin' },
  ],
};

const defaultFilters = () => ({
  name: '',
  baseId: '',
  department: null,
  role: '',
  ssoStatus: '',
});

function formatUserDate(dateString) {
  if (!dateString) {
    return '—';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default {
  name: 'UserManagement',
  components: {
    Toast,
    TreeSelect,
    PageContainer,
    AppCard,
    AppDataGrid,
  },
  data() {
    return {
      isPanelOpen: false,
      isEditing: false,
      isSubmitting: false,
      isLoading: false,
      users: [],
      bases: [],
      departments: [],
      departmentsLoaded: false,
      departmentsLoading: false,
      userColumnDefs: [],
      debouncedNameQuery: '',
      nameFilterTimer: null,
      filterDeptIds: [],
      deptTreeSelectKey: 0,
      formDepartmentHint: '',
      depId: localStorage.getItem('dep_id'),
      filters: defaultFilters(),
      formData: {
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        default_base: null,
        role: '',
        dep_id: null,
        dep_id_tree: null,
        id: null,
        sso_pending: false,
        sso_linked: false,
        activate_sso: false,
      },
      validationErrors: {
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        role: '',
        dep_id: '',
      },
    };
  },
  computed: {
    currentRole() {
      return getAuthRoleName() || localStorage.getItem('roles') || '';
    },
    isSuperAdmin() {
      return this.currentRole === 'Super Admin';
    },
    isSuperAdminUsersPage() {
      return this.$route.name === 'Allusers';
    },
    usesFullBaseCatalog() {
      return this.isSuperAdmin || this.isSuperAdminUsersPage;
    },
    isScopedView() {
      return !this.isSuperAdmin;
    },
    canDelete() {
      return this.isSuperAdmin;
    },
    assignableRoles() {
      if (this.isSuperAdmin) {
        return ROLE_OPTIONS.superAdmin;
      }
      if (this.currentRole === 'Admin') {
        return ROLE_OPTIONS.admin;
      }
      return ROLE_OPTIONS.localAdmin;
    },
    filterRoleOptions() {
      return this.assignableRoles;
    },
    roleOptionsForForm() {
      const options = [...this.assignableRoles];
      const currentRole = this.formData.role;

      if (currentRole && !options.some((role) => role.name === currentRole)) {
        options.unshift({ id: 0, name: currentRole });
      }

      return options;
    },
    baseOptionsForForm() {
      const options = this.bases.map((base) => ({
        ...base,
        id: Number(base.id),
      }));

      const selectedId = this.normalizeBaseId(this.formData.default_base);
      if (selectedId && !options.some((base) => base.id === selectedId)) {
        const editingUser = this.users.find((user) => user.id === this.formData.id);
        const label = editingUser?.base && !['-', '—'].includes(editingUser.base)
          ? editingUser.base
          : `قاعدة #${selectedId}`;

        options.unshift({
          id: selectedId,
          name_ar: label,
          name_en: label,
        });
      }

      return options;
    },
    showDepartmentPicker() {
      return true;
    },
    departmentRequiredRoles() {
      return ['Admin', 'Local Admin', 'Reporting'];
    },
    showSsoActivationPanel() {
      return this.isEditing && this.formData.sso_pending && !this.formData.sso_linked;
    },
    requiresDepartmentForSave() {
      if (this.showSsoActivationPanel && this.formData.activate_sso) {
        return true;
      }

      return this.departmentRequiredRoles.includes(this.formData.role);
    },
    panelWidth() {
      return window.innerWidth < 640 ? '100%' : '600px';
    },
    pendingSsoCount() {
      return this.users.filter((user) => user.sso_pending).length;
    },
    pageDescription() {
      const totalLabel = `إجمالي ${this.users.length} ${this.users.length === 1 ? 'مستخدم' : 'مستخدمين'}`;

      if (this.pendingSsoCount === 0) {
        return totalLabel;
      }

      return `${totalLabel} · ${this.pendingSsoCount} بانتظار تفعيل مرسال`;
    },
    filteredUsers() {
      let list = this.users;

      const query = this.debouncedNameQuery;
      if (query) {
        list = list.filter((user) => {
          const haystack = `${user.firstname} ${user.lastname} ${user.email} ${user.department || ''}`.toLowerCase();
          return haystack.includes(query);
        });
      }

      if (this.filters.baseId) {
        list = list.filter((user) => String(user.default_base ?? '') === this.filters.baseId);
      }

      if (this.filterDeptIds.length) {
        const allowed = new Set(this.filterDeptIds.map((id) => Number(id)));
        list = list.filter((user) => user.dep_id && allowed.has(Number(user.dep_id)));
      }

      if (this.filters.role) {
        list = list.filter((user) => user.role === this.filters.role);
      }

      if (this.filters.ssoStatus === 'pending') {
        list = list.filter((user) => user.sso_pending);
      } else if (this.filters.ssoStatus === 'linked') {
        list = list.filter((user) => user.sso_linked);
      } else if (this.filters.ssoStatus === 'unlinked') {
        list = list.filter((user) => !user.sso_linked && !user.sso_pending);
      }

      return list;
    },
    filterDepartmentLabel() {
      const depId = extractDeptKey(this.filters.department);
      if (!depId) {
        return '';
      }

      return findDepartmentLabel(this.departments, depId);
    },
    formDepartmentLabel() {
      const depId = extractDeptKey(this.formData.dep_id_tree) || this.formData.dep_id;
      if (!depId) {
        return '';
      }

      return findDepartmentLabel(this.departments, depId) || this.formDepartmentHint;
    },
  },
  watch: {
    'formData.role'(newRole) {
      if (!this.departmentRequiredRoles.includes(newRole) && !this.formData.sso_pending) {
        this.formData.dep_id_tree = null;
        this.formData.dep_id = null;
      }
    },
    'filters.name'(value) {
      clearTimeout(this.nameFilterTimer);
      this.nameFilterTimer = setTimeout(() => {
        this.debouncedNameQuery = value.trim().toLowerCase();
      }, 200);
    },
    'filters.department'(value) {
      const deptId = extractDeptKey(value);
      this.filterDeptIds = deptId ? collectDescendantDeptIds(this.departments, deptId) : [];
    },
    isPanelOpen(open) {
      if (open) {
        this.ensureDepartmentsLoaded();
      }
    },
  },
  created() {
    this.userColumnDefs = this.buildUserColumnDefs();
  },
  mounted() {
    this.fetchData();
  },
  beforeUnmount() {
    clearTimeout(this.nameFilterTimer);
  },
  methods: {
    buildUserColumnDefs() {
      const cols = [
        { field: 'firstname', headerName: 'الاسم الأول', minWidth: 120 },
        { field: 'lastname', headerName: 'اسم العائلة', minWidth: 120 },
        {
          field: 'email',
          headerName: 'البريد الإلكتروني',
          minWidth: 180,
          cellStyle: { direction: 'ltr', textAlign: 'left' },
        },
        {
          field: 'department',
          headerName: 'القسم',
          minWidth: 200,
          flex: 1,
          cellRenderer: pillBadgeRenderer,
          valueFormatter: (params) => params.value || '—',
          comparator: arabicTextComparator,
        },
        {
          field: 'role',
          headerName: 'الدور',
          cellRenderer: roleBadgeRenderer,
          comparator: arabicTextComparator,
          minWidth: 140,
        },
        { field: 'base', headerName: 'القاعدة الافتراضية', cellRenderer: pillBadgeRenderer, minWidth: 150 },
        {
          field: 'sso_status',
          headerName: 'مرسال',
          valueGetter: (params) => (params.data?.sso_linked ? 'linked' : (params.data?.sso_pending ? 'pending' : 'none')),
          cellRenderer: ssoStatusBadgeRenderer,
          sortable: true,
          minWidth: 130,
        },
        {
          field: 'created',
          headerName: 'تاريخ الإنشاء',
          minWidth: 130,
          valueFormatter: (params) => formatUserDate(params.value),
          cellStyle: { direction: 'ltr', textAlign: 'left' },
        },
        buildActionColumn({ showDelete: this.canDelete }),
      ];

      return cols;
    },
    normalizeBaseId(value) {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      const parsed = Number(value);

      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    },

    inputClass(field) {
      return [
        'w-full rounded-lg border py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20',
        field === 'role' ? '' : 'px-3',
        this.validationErrors[field] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand',
      ];
    },

    clearFilters() {
      this.filters = defaultFilters();
      this.debouncedNameQuery = '';
      this.filterDeptIds = [];
    },


    async openAddUserPanel() {
      this.isEditing = false;
      this.resetForm();
      await this.openUserPanel();
    },

    async openUserPanel() {
      await this.ensureDepartmentsLoaded();
      this.isPanelOpen = true;
    },

    resetForm() {
      this.formDepartmentHint = '';
      this.formData = {
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        default_base: null,
        role: '',
        dep_id: null,
        dep_id_tree: null,
        id: null,
        sso_pending: false,
        sso_linked: false,
        activate_sso: false,
      };
      this.validationErrors = {
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        role: '',
        dep_id: '',
      };
    },

    clearValidationError(field) {
      this.validationErrors[field] = '';
    },

    validateForm() {
      let isValid = true;

      if (!this.formData.firstname.trim()) {
        this.validationErrors.firstname = 'الاسم الأول مطلوب';
        isValid = false;
      }

      if (!this.formData.lastname.trim()) {
        this.validationErrors.lastname = 'اسم العائلة مطلوب';
        isValid = false;
      }

      if (!this.formData.email.trim()) {
        this.validationErrors.email = 'البريد الإلكتروني مطلوب';
        isValid = false;
      } else if (
        !this.isEditing
        && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email.trim())
      ) {
        this.validationErrors.email = 'أدخل بريداً إلكترونياً صالحاً';
        isValid = false;
      }

      if (!this.isEditing && !this.formData.password) {
        this.validationErrors.password = 'كلمة المرور مطلوبة للمستخدم الجديد';
        isValid = false;
      } else if (this.formData.password && this.formData.password.length < 6) {
        this.validationErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        isValid = false;
      }

      if (!this.formData.role) {
        this.validationErrors.role = 'اختر الدور';
        isValid = false;
      }

      if (this.requiresDepartmentForSave && !this.resolveDepartmentId()) {
        this.validationErrors.dep_id = this.formData.activate_sso
          ? 'القسم مطلوب لتفعيل حساب مرسال'
          : 'القسم مطلوب لهذا الدور';
        isValid = false;
      }

      return isValid;
    },

    resolveDepartmentId() {
      const fromTree = extractDeptKey(this.formData.dep_id_tree);
      if (fromTree) {
        return parseInt(fromTree, 10);
      }

      if (this.formData.dep_id) {
        return parseInt(this.formData.dep_id, 10);
      }

      return null;
    },

    onFormDepartmentChange() {
      this.clearValidationError('dep_id');
      this.formDepartmentHint = '';
    },

    setDepartmentsTree(nodes) {
      this.departments = normalizeDepartmentTree(nodes);
    },

    async syncFormDepartmentSelection(depId) {
      this.deptTreeSelectKey += 1;
      await applyTreeSelectValue((value) => {
        this.formData.dep_id_tree = value;
      }, depId);
    },

    async submitUserForm() {
      if (!this.validateForm()) {
        this.$toast.add({
          severity: 'error',
          summary: 'خطأ في التحقق',
          detail: 'يرجى مراجعة الحقول المطلوبة',
          life: 3000,
        });
        return;
      }

      this.isSubmitting = true;

      try {
        const payload = { ...this.formData };
        const activatingSso = Boolean(payload.activate_sso);

        if (payload.password) {
          payload.passwd = payload.password;
        }
        delete payload.password;
        delete payload.dep_id_tree;
        delete payload.sso_pending;
        delete payload.sso_linked;

        if (!payload.activate_sso) {
          delete payload.activate_sso;
        }

        const depId = this.resolveDepartmentId();
        if (depId) {
          payload.dep_id = depId;
        } else if (this.isEditing) {
          payload.dep_id = null;
        } else if (!this.isSuperAdmin && this.depId) {
          payload.dep_id = parseInt(this.depId, 10);
        }

        if (this.isEditing) {
          await updateUser(payload);
        } else {
          await createUser(payload);
        }

        await this.fetchData();
        this.isPanelOpen = false;
        this.$toast.add({
          severity: 'success',
          summary: 'تم بنجاح',
          detail: this.isEditing
            ? (activatingSso ? 'تم تفعيل حساب مرسال' : 'تم تحديث المستخدم')
            : 'تم إنشاء المستخدم',
          life: 3000,
        });
      } catch (error) {
        console.error('API error:', error);
        this.$toast.add({
          severity: 'error',
          summary: 'خطأ',
          detail: error.response?.data?.message
          || Object.values(error.response?.data?.errors || {})?.[0]?.[0]
          || 'تعذر حفظ المستخدم',
          life: 5000,
        });
      } finally {
        this.isSubmitting = false;
      }
    },

    async editUser(user) {
      const fullUser = this.users.find((entry) => entry.id === user.id) ?? user;
      await this.ensureDepartmentsLoaded();

      this.validationErrors = {
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        role: '',
        dep_id: '',
      };

      const roleName = fullUser.role || '';
      this.formDepartmentHint = fullUser.department || '';
      this.formData = {
        firstname: fullUser.firstname || '',
        lastname: fullUser.lastname || '',
        email: fullUser.email || '',
        password: '',
        default_base: this.normalizeBaseId(fullUser.default_base),
        role: roleName,
        dep_id: fullUser.dep_id ?? null,
        dep_id_tree: null,
        id: fullUser.id,
        sso_pending: Boolean(fullUser.sso_pending),
        sso_linked: Boolean(fullUser.sso_linked),
        activate_sso: false,
      };
      this.isEditing = true;
      this.isPanelOpen = true;

      await this.$nextTick();
      await this.syncFormDepartmentSelection(fullUser.dep_id);
    },

    onRowDelete(user) {
      this.deleteUser(user.id);
    },

    deleteUser(id) {
      this.$dialog.confirm({
        type: 'warning',
        title: 'تأكيد الحذف',
        message: 'هل أنت متأكد من حذف هذا المستخدم؟',
        confirmLabel: 'حذف',
        cancelLabel: 'إلغاء',
        confirmVariant: 'danger',
        onConfirm: async () => {
          try {
            await deleteUser({ id });
            await this.fetchData();
            this.$toast.add({
              severity: 'success',
              summary: 'تم الحذف',
              detail: 'تم حذف المستخدم بنجاح',
              life: 3000,
            });
          } catch (error) {
            console.error('Error deleting user:', error);
            this.$toast.add({
              severity: 'error',
              summary: 'خطأ',
              detail: 'تعذر حذف المستخدم',
              life: 3000,
            });
          }
        },
      });
    },

    async ensureDepartmentsLoaded() {
      if (this.departmentsLoaded || this.departmentsLoading) {
        if (this.departmentsLoading) {
          await new Promise((resolve) => {
            const timer = setInterval(() => {
              if (!this.departmentsLoading) {
                clearInterval(timer);
                resolve();
              }
            }, 50);
          });
        }

        return;
      }

      this.departmentsLoading = true;

      try {
        if (this.isScopedView && this.depId) {
          const response = await fetchDepartmentTree(this.depId);
          this.setDepartmentsTree(response.data?.departments ?? []);
        } else {
          const response = await fetchAllDepartments();
          this.setDepartmentsTree(response.data?.departments ?? []);
        }

        this.departmentsLoaded = true;
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        this.departmentsLoading = false;
      }
    },

    async fetchData() {
      this.isLoading = true;

      try {
        const scopedParams = this.isScopedView && this.depId ? { depId: this.depId } : undefined;
        const basesParams = this.usesFullBaseCatalog
          ? undefined
          : (this.depId ? { depId: this.depId } : undefined);

        const requests = [
          fetchUsers(scopedParams),
          fetchBases(basesParams),
        ];

        if (this.isScopedView && this.depId) {
          requests.push(this.loadDepartmentsForFilter());
        } else {
          requests.push(fetchAllDepartments());
        }

        const responses = await Promise.all(requests);
        const [usersResponse, basesResponse, departmentsResponse] = responses;

        this.users = usersResponse.data;
        this.bases = basesResponse.data;
        this.setDepartmentsTree(departmentsResponse?.data?.departments ?? []);
        this.departmentsLoaded = true;
      } catch (error) {
        console.error('Error fetching data:', error);
        this.$toast.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر تحميل البيانات',
          life: 3000,
        });
      } finally {
        this.isLoading = false;
      }
    },

    async loadDepartmentsForFilter() {
      if (this.isScopedView && this.depId) {
        return fetchDepartmentTree(this.depId);
      }

      return fetchAllDepartments();
    },

  },
};
</script>

<style scoped>
.user-rtl-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  direction: rtl;
  text-align: right;
  padding-block: 0.5rem;
  padding-inline-start: 0.75rem;
  padding-inline-end: 2.5rem;
  background-color: #fff;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 0.75rem center;
  background-size: 0.875rem;
}

.user-rtl-select.h-10 {
  padding-block: 0;
  padding-inline-start: 0.75rem;
  padding-inline-end: 2.5rem;
}

.user-treeselect :deep(.p-treeselect) {
  width: 100%;
  min-height: 2.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  direction: rtl;
  align-items: stretch;
}

.user-treeselect :deep(.p-treeselect:not(.p-disabled):hover) {
  border-color: #cbd5e1;
}

.user-treeselect :deep(.p-treeselect:not(.p-disabled).p-focus),
.user-treeselect :deep(.p-treeselect:not(.p-disabled).p-inputwrapper-focus) {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand) 20%, transparent);
}

.user-treeselect :deep(.p-treeselect-label-container) {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.user-treeselect :deep(.p-treeselect-label) {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  padding: 0;
  overflow: hidden;
}

.user-treeselect :deep(.p-treeselect-trigger) {
  width: 2.5rem;
  flex-shrink: 0;
  border-inline-end: 1px solid #e2e8f0;
}

.user-treeselect :deep(.p-treeselect-trigger-icon) {
  width: 0.875rem;
  height: 0.875rem;
}

.user-treeselect-value,
.user-treeselect-placeholder {
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-align: right;
}

.user-treeselect-placeholder {
  color: #94a3b8;
}

.user-treeselect :deep(.p-treeselect-panel) {
  max-width: min(100vw - 2rem, 28rem);
  direction: rtl;
}
</style>
