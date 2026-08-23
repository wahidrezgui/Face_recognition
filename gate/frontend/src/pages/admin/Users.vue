<template>
    <PageContainer title="إدارة المستخدمين" :description="pageDescription">
        <template #actions>
            <AppButton @click="openAddUserPanel">
                <i class="pi pi-plus" aria-hidden="true" />
                إضافة مستخدم
            </AppButton>
        </template>

        <aside
            v-if="pendingSsoCount > 0"
            class="users-sso-banner"
            role="status"
            aria-live="polite"
        >
            <span class="users-sso-banner__icon" aria-hidden="true">
                <i class="pi pi-exclamation-circle" />
            </span>
            <div class="users-sso-banner__copy">
                <p class="users-sso-banner__title">
                    {{ pendingSsoCount }} حساب بانتظار تفعيل مرسال
                </p>
                <p class="users-sso-banner__hint">
                    افتح المستخدم من الجدول وعيّن الدور والقسم لإكمال الربط.
                </p>
            </div>
        </aside>

        <section class="users-filters-panel">
            <h2 class="users-filters-panel__title">
                <i class="pi pi-filter" aria-hidden="true" />
                البحـث
            </h2>

            <AppTableFilters :active="hasActiveFilters" @clear="clearFilters">
                <div class="md:col-span-3">
                    <label class="users-filter-label" for="users-filter-name"
                        >الاسم أو البريد</label
                    >
                    <input
                        id="users-filter-name"
                        v-model="filters.name"
                        type="search"
                        placeholder="ابحث بالاسم أو البريد…"
                        class="users-filter-input"
                    />
                </div>

                <div class="md:col-span-3">
                    <label
                        class="users-filter-label"
                        for="users-filter-department"
                        >القسم</label
                    >
                    <TreeSelect
                        id="users-filter-department"
                        v-model="filters.department"
                        :options="departments"
                        :disabled="filterLookupsLoading"
                        :placeholder="
                            filterLookupsLoading
                                ? 'جاري تحميل الأقسام…'
                                : 'اختر القسم'
                        "
                        show-clear
                        filter
                        filter-mode="lenient"
                        filter-placeholder="ابحث في الوحدات..."
                        class="user-treeselect w-full"
                    >
                        <template #value>
                            <span
                                v-if="filterDepartmentLabel"
                                class="user-treeselect-value"
                                >{{ filterDepartmentLabel }}</span
                            >
                            <span v-else class="user-treeselect-placeholder">{{
                                filterLookupsLoading
                                    ? "جاري التحميل…"
                                    : "اختر القسم"
                            }}</span>
                        </template>
                    </TreeSelect>
                </div>

                <div v-if="isScopedView" class="md:col-span-3">
                    <label class="users-filter-label" for="users-filter-role"
                        >الدور</label
                    >
                    <select
                        id="users-filter-role"
                        v-model="filters.role"
                        :disabled="filterLookupsLoading"
                        class="users-filter-input users-filter-select"
                    >
                        <option value="">كل الأدوار</option>
                        <option
                            v-for="role in filterRoleOptions"
                            :key="role.id"
                            :value="role.name"
                        >
                            {{ role.name }}
                        </option>
                    </select>
                </div>

                <div v-if="!isScopedView" class="md:col-span-3">
                    <label class="users-filter-label" for="users-filter-base"
                        >القاعدة</label
                    >
                    <select
                        id="users-filter-base"
                        v-model="filters.baseId"
                        :disabled="filterLookupsLoading"
                        class="users-filter-input users-filter-select"
                    >
                        <option value="">كل القواعد</option>
                        <option
                            v-for="base in bases"
                            :key="base.id"
                            :value="String(base.id)"
                        >
                            {{ base.name_ar || base.name_en || base.name }}
                        </option>
                    </select>
                </div>

                <div class="md:col-span-3">
                    <label class="users-filter-label" for="users-filter-sso"
                        >حساب مرسال</label
                    >
                    <select
                        id="users-filter-sso"
                        v-model="filters.ssoStatus"
                        class="users-filter-input users-filter-select"
                    >
                        <option value="">الكل</option>
                        <option value="pending">بانتظار التفعيل</option>
                        <option value="linked">مرتبط</option>
                        <option value="unlinked">غير مرتبط</option>
                    </select>
                </div>
            </AppTableFilters>
        </section>

        <p class="users-grid-hint" dir="rtl">
            <span class="users-grid-hint__item">
                <i class="pi pi-pencil" aria-hidden="true" />
                استخدم أيقونة التعديل في الجدول لتحديث المستخدم
            </span>
            <span class="users-grid-hint__sep" aria-hidden="true">·</span>
            <span class="users-grid-hint__item">
                <i class="pi pi-filter" aria-hidden="true" />
                الفلاتر تُطبَّق فوراً على القائمة
            </span>
        </p>

        <div v-if="!isLoading" class="users-results-bar" aria-live="polite">
            <span class="users-results-bar__count">{{ gridResultsLabel }}</span>
            <span v-if="hasActiveFilters" class="users-results-bar__badge"
                >فلاتر مفعّلة</span
            >
        </div>

        <AppDataGrid
            :column-defs="userColumnDefs"
            :row-data="filteredUsers"
            :loading="isLoading"
            loading-label="جاري تحميل المستخدمين…"
            pagination-mode="client"
            dom-layout="autoHeight"
            :per-page="25"
            :rows-per-page-options="[10, 25, 50, 100]"
            empty-message="لا يوجد مستخدمون مطابقون. أضف مستخدماً جديداً أو غيّر الفلاتر."
            row-selection="none"
            :animate-rows="false"
            @row-edit="editUser"
            @row-delete="onRowDelete"
        />
    </PageContainer>

    <VueSidePanel
        v-model="isPanelOpen"
        lock-scroll
        hide-close-btn
        :width="panelWidth"
        @closed="resetForm"
    >
        <div class="flex h-full flex-col" dir="rtl">
            <form
                novalidate
                class="flex h-full flex-col"
                @submit.prevent="submitUserForm"
            >
                <div
                    class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4"
                >
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">
                                {{
                                    isEditing ? "تعديل مستخدم" : "إضافة مستخدم"
                                }}
                            </h2>
                            <p class="mt-1 text-sm text-slate-500">
                                {{
                                    isEditing
                                        ? "تحديث بيانات المستخدم"
                                        : "أدخل بيانات المستخدم الجديد"
                                }}
                            </p>
                        </div>
                        <AppButton
                            variant="ghost"
                            size="sm"
                            class="!p-1 text-slate-400 hover:text-slate-600"
                            aria-label="إغلاق"
                            @click="isPanelOpen = false"
                        >
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div
                            v-if="showSsoActivationPanel"
                            class="rounded-xl border border-amber-200 bg-amber-50 p-4"
                        >
                            <p class="text-sm font-medium text-amber-900">
                                حساب مرسال بانتظار التفعيل
                            </p>
                            <p class="mt-1 text-xs leading-6 text-amber-800">
                                هذا المستخدم سجّل الدخول عبر مرسال. فعّل الحساب
                                وعيّن الدور والقسم لإكمال الربط.
                            </p>
                            <label
                                class="mt-3 flex cursor-pointer items-center gap-2 text-sm text-amber-900"
                            >
                                <input
                                    v-model="formData.activate_sso"
                                    type="checkbox"
                                    @change="clearValidationError('dep_id')"
                                />
                                <span>تفعيل حساب مرسال</span>
                            </label>
                        </div>

                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label
                                    class="mb-1 block text-sm font-medium text-slate-700"
                                >
                                    الاسم الأول
                                    <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="formData.firstname"
                                    type="text"
                                    placeholder="الاسم الأول"
                                    :class="inputClass('firstname')"
                                    @input="clearValidationError('firstname')"
                                />
                                <p
                                    v-if="validationErrors.firstname"
                                    class="mt-1 text-xs text-red-500"
                                >
                                    {{ validationErrors.firstname }}
                                </p>
                            </div>
                            <div>
                                <label
                                    class="mb-1 block text-sm font-medium text-slate-700"
                                >
                                    اسم العائلة
                                    <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="formData.lastname"
                                    type="text"
                                    placeholder="اسم العائلة"
                                    :class="inputClass('lastname')"
                                    @input="clearValidationError('lastname')"
                                />
                                <p
                                    v-if="validationErrors.lastname"
                                    class="mt-1 text-xs text-red-500"
                                >
                                    {{ validationErrors.lastname }}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label
                                class="mb-1 block text-sm font-medium text-slate-700"
                            >
                                اسم المستخدم <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formData.username"
                                type="text"
                                placeholder="example_user"
                                dir="ltr"
                                :class="inputClass('username')"
                                @input="clearValidationError('username')"
                            />
                            <p
                                v-if="validationErrors.username"
                                class="mt-1 text-xs text-red-500"
                            >
                                {{ validationErrors.username }}
                            </p>

                        </div>

                        <div>
                            <label
                                class="mb-1 block text-sm font-medium text-slate-700"
                            >
                                كلمة المرور
                                <span v-if="!isEditing" class="text-red-500"
                                    >*</span
                                >
                            </label>
                            <input
                                v-model="formData.password"
                                type="password"
                                placeholder="كلمة المرور"
                                :class="inputClass('password')"
                                @input="clearValidationError('password')"
                            />
                            <p
                                v-if="validationErrors.password"
                                class="mt-1 text-xs text-red-500"
                            >
                                {{ validationErrors.password }}
                            </p>
                            <p
                                v-else-if="isEditing && formData.sso_pending"
                                class="mt-1 text-xs text-slate-500"
                            >
                                كلمة المرور اختيارية لحسابات مرسال
                            </p>
                            <p
                                v-else-if="isEditing"
                                class="mt-1 text-xs text-slate-500"
                            >
                                اتركه فارغاً للإبقاء على كلمة المرور الحالية
                            </p>
                        </div>

                        <div>
                            <label
                                class="mb-1 block text-sm font-medium text-slate-700"
                            >
                                الدور <span class="text-red-500">*</span>
                            </label>
                            <select
                                v-model="formData.role"
                                :class="[inputClass('role'), 'user-rtl-select']"
                            >
                                <option value="">اختر الدور</option>
                                <option
                                    v-for="role in roleOptionsForForm"
                                    :key="role.id"
                                    :value="role.name"
                                >
                                    {{ role.name }}
                                </option>
                            </select>
                            <p
                                v-if="validationErrors.role"
                                class="mt-1 text-xs text-red-500"
                            >
                                {{ validationErrors.role }}
                            </p>
                        </div>

                        <div>
                            <label
                                class="mb-1 block text-sm font-medium text-slate-700"
                            >
                                القسم
                                <span
                                    v-if="requiresDepartmentForSave"
                                    class="text-red-500"
                                    >*</span
                                >
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
                                    <span
                                        v-if="formDepartmentLabel"
                                        class="user-treeselect-value"
                                        >{{ formDepartmentLabel }}</span
                                    >
                                    <span
                                        v-else
                                        class="user-treeselect-placeholder"
                                        >اختر القسم</span
                                    >
                                </template>
                            </TreeSelect>
                            <p
                                v-if="validationErrors.dep_id"
                                class="mt-1 text-xs text-red-500"
                            >
                                {{ validationErrors.dep_id }}
                            </p>
                        </div>

                        <div>
                            <label
                                class="mb-1 block text-sm font-medium text-slate-700"
                                >القاعدة الافتراضية</label
                            >
                            <select
                                v-model="formData.default_base"
                                class="user-rtl-select w-full rounded-lg border border-slate-200 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            >
                                <option :value="null">اختر القاعدة</option>
                                <option
                                    v-for="base in baseOptionsForForm"
                                    :key="base.id"
                                    :value="base.id"
                                >
                                    {{
                                        base.name_ar ||
                                        base.name_en ||
                                        base.name
                                    }}
                                </option>
                            </select>
                            <p
                                v-if="!usesFullBaseCatalog"
                                class="mt-1 text-xs text-slate-500"
                            >
                                تظهر القواعد المرتبطة بقسمك فقط. للمزيد، اطلب
                                ربط قاعدة جديدة بقسمك من المسؤول.
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4"
                >
                    <div class="flex justify-end gap-3">
                        <AppButton
                            variant="secondary"
                            @click="isPanelOpen = false"
                        >
                            إلغاء
                        </AppButton>
                        <AppButton type="submit" :disabled="isSubmitting">
                            <i
                                v-if="isSubmitting"
                                class="pi pi-spin pi-spinner"
                                aria-hidden="true"
                            />
                            {{
                                isSubmitting
                                    ? "جاري الحفظ…"
                                    : isEditing
                                      ? "تحديث"
                                      : "إنشاء"
                            }}
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>
</template>

<script>
import {
    fetchUsers,
    fetchAssignableRoles,
    createUser,
    updateUser,
    deleteUser,
} from "../../api/users.js";
import {
    fetchBases,
    fetchDepartmentTree,
    fetchAllDepartments,
} from "../../api/organization.js";
import TreeSelect from "primevue/treeselect";
import PageContainer from "../../components/ui/PageContainer.vue";
import AppButton from "../../components/ui/AppButton.vue";
import AppDataGrid from "../../components/ui/AppDataGrid.vue";
import {
    buildActionColumn,
    pillBadgeRenderer,
    roleBadgeRenderer,
    ssoStatusBadgeRenderer,
    arabicTextComparator,
} from "../../lib/table/gridDefaults.js";
import {
    applyTreeSelectValue,
    collectDescendantDeptIds,
    extractDeptKey,
    findDepartmentLabel,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from "../../lib/departmentTree.js";
import {
    getResourceScope,
    isGlobalScope,
    roleRequiresDepartment,
} from "../../lib/auth-roles.js";

const defaultFilters = () => ({
    name: "",
    baseId: "",
    department: null,
    role: "",
    ssoStatus: "",
});

function formatUserDate(dateString) {
    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default {
    name: "UserManagement",
    components: {
        TreeSelect,
        PageContainer,
        AppButton,
        AppDataGrid,
    },
    data() {
        return {
            isPanelOpen: false,
            isEditing: false,
            isSubmitting: false,
            isLoading: false,
            filterLookupsLoading: false,
            filterLookupsLoaded: false,
            users: [],
            assignableRolesList: [],
            bases: [],
            departments: [],
            departmentsLoaded: false,
            userColumnDefs: [],
            debouncedNameQuery: "",
            nameFilterTimer: null,
            filterDeptIds: [],
            deptTreeSelectKey: 0,
            formDepartmentHint: "",
            depId: localStorage.getItem("dep_id"),
            filters: defaultFilters(),
            formData: {
                firstname: "",
                lastname: "",
                username: "",
                password: "",
                default_base: null,
                role: "",
                dep_id: null,
                dep_id_tree: null,
                id: null,
                sso_pending: false,
                sso_linked: false,
                activate_sso: false,
            },
            validationErrors: {
                firstname: "",
                lastname: "",
                username: "",
                password: "",
                role: "",
                dep_id: "",
            },
        };
    },
    computed: {
        assignableRoles() {
            return this.assignableRolesList;
        },
        filterRoleOptions() {
            return this.assignableRoles;
        },
        roleOptionsForForm() {
            const options = [...this.assignableRoles];
            const currentRole = this.formData.role;

            if (
                currentRole &&
                !options.some((role) => role.name === currentRole)
            ) {
                options.unshift({
                    id: 0,
                    name: currentRole,
                    requires_department: false,
                });
            }

            return options;
        },
        usersScope() {
            return getResourceScope("users");
        },
        usesFullBaseCatalog() {
            return isGlobalScope("users");
        },
        isScopedView() {
            return !isGlobalScope("users");
        },
        canDelete() {
            return isGlobalScope("users");
        },
        baseOptionsForForm() {
            const options = this.bases.map((base) => ({
                ...base,
                id: Number(base.id),
            }));

            const selectedId = this.normalizeBaseId(this.formData.default_base);
            if (selectedId && !options.some((base) => base.id === selectedId)) {
                const editingUser = this.users.find(
                    (user) => user.id === this.formData.id,
                );
                const label =
                    editingUser?.base && !["-", "—"].includes(editingUser.base)
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
        showSsoActivationPanel() {
            return (
                this.isEditing &&
                this.formData.sso_pending &&
                !this.formData.sso_linked
            );
        },
        requiresDepartmentForSave() {
            if (this.showSsoActivationPanel && this.formData.activate_sso) {
                return true;
            }

            return roleRequiresDepartment(
                this.formData.role,
                this.assignableRolesList,
            );
        },
        panelWidth() {
            return window.innerWidth < 640 ? "100%" : "600px";
        },
        pendingSsoCount() {
            return this.users.filter((user) => user.sso_pending).length;
        },
        pageDescription() {
            const totalLabel = `إجمالي ${this.users.length} ${this.users.length === 1 ? "مستخدم" : "مستخدمين"}`;

            if (this.pendingSsoCount === 0) {
                return totalLabel;
            }

            return `${totalLabel} · ${this.pendingSsoCount} بانتظار تفعيل مرسال`;
        },
        hasActiveFilters() {
            const { name, baseId, department, role, ssoStatus } = this.filters;

            return Boolean(
                name.trim() || baseId || department || role || ssoStatus,
            );
        },
        gridResultsLabel() {
            const total = this.users.length;
            const shown = this.filteredUsers.length;

            if (this.hasActiveFilters) {
                return `عرض ${shown} من ${total} مستخدم`;
            }

            return `${total} مستخدم`;
        },
        filteredUsers() {
            let list = this.users;

            const query = this.debouncedNameQuery;
            if (query) {
                list = list.filter((user) => {
                    const haystack =
                        `${user.firstname} ${user.lastname} ${user.username} ${user.department || ""}`.toLowerCase();
                    return haystack.includes(query);
                });
            }

            if (this.filters.baseId) {
                list = list.filter(
                    (user) =>
                        String(user.default_base ?? "") === this.filters.baseId,
                );
            }

            if (this.filterDeptIds.length) {
                const allowed = new Set(
                    this.filterDeptIds.map((id) => Number(id)),
                );
                list = list.filter(
                    (user) => user.dep_id && allowed.has(Number(user.dep_id)),
                );
            }

            if (this.filters.role) {
                list = list.filter((user) => user.role === this.filters.role);
            }

            if (this.filters.ssoStatus === "pending") {
                list = list.filter((user) => user.sso_pending);
            } else if (this.filters.ssoStatus === "linked") {
                list = list.filter((user) => user.sso_linked);
            } else if (this.filters.ssoStatus === "unlinked") {
                list = list.filter(
                    (user) => !user.sso_linked && !user.sso_pending,
                );
            }

            return list;
        },
        filterDepartmentLabel() {
            const depId = extractDeptKey(this.filters.department);
            if (!depId) {
                return "";
            }

            return findDepartmentLabel(this.departments, depId);
        },
        formDepartmentLabel() {
            const depId =
                extractDeptKey(this.formData.dep_id_tree) ||
                this.formData.dep_id;
            if (!depId) {
                return "";
            }

            return (
                findDepartmentLabel(this.departments, depId) ||
                this.formDepartmentHint
            );
        },
    },
    watch: {
        "formData.role"(newRole) {
            if (
                !roleRequiresDepartment(newRole, this.assignableRolesList) &&
                !this.formData.sso_pending
            ) {
                this.formData.dep_id_tree = null;
                this.formData.dep_id = null;
            }
        },
        "filters.name"(value) {
            clearTimeout(this.nameFilterTimer);
            this.nameFilterTimer = setTimeout(() => {
                this.debouncedNameQuery = value.trim().toLowerCase();
            }, 200);
        },
        "filters.department"(value) {
            const deptId = extractDeptKey(value);
            this.filterDeptIds = deptId
                ? collectDescendantDeptIds(this.departments, deptId)
                : [];
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
                {
                    field: "firstname",
                    headerName: "الاسم الأول",
                    minWidth: 120,
                },
                { field: "lastname", headerName: "اسم العائلة", minWidth: 120 },
                {
                    field: "username",
                    headerName: "اسم المستخدم",
                    minWidth: 180,
                    cellStyle: { direction: "ltr", textAlign: "left" },
                },
                {
                    field: "department",
                    headerName: "القسم",
                    minWidth: 200,
                    flex: 1,
                    cellRenderer: pillBadgeRenderer,
                    valueFormatter: (params) => params.value || "—",
                    comparator: arabicTextComparator,
                },
                {
                    field: "role",
                    headerName: "الدور",
                    cellRenderer: roleBadgeRenderer,
                    comparator: arabicTextComparator,
                    minWidth: 140,
                },
                {
                    field: "base",
                    headerName: "القاعدة الافتراضية",
                    cellRenderer: pillBadgeRenderer,
                    minWidth: 150,
                },
                {
                    field: "sso_status",
                    headerName: "مرسال",
                    valueGetter: (params) =>
                        params.data?.sso_linked
                            ? "linked"
                            : params.data?.sso_pending
                              ? "pending"
                              : "none",
                    cellRenderer: ssoStatusBadgeRenderer,
                    sortable: true,
                    minWidth: 130,
                },
                {
                    field: "created",
                    headerName: "تاريخ الإنشاء",
                    minWidth: 130,
                    valueFormatter: (params) => formatUserDate(params.value),
                    cellStyle: { direction: "ltr", textAlign: "left" },
                },
                buildActionColumn({ showDelete: this.canDelete }),
            ];

            return cols;
        },
        normalizeBaseId(value) {
            if (value === null || value === undefined || value === "") {
                return null;
            }

            const parsed = Number(value);

            return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        },

        inputClass(field) {
            return [
                "w-full rounded-lg border py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20",
                field === "role" ? "" : "px-3",
                this.validationErrors[field]
                    ? "border-red-500 focus:border-red-500"
                    : "border-slate-200 focus:border-brand",
            ];
        },

        clearFilters() {
            clearTimeout(this.nameFilterTimer);
            this.filters = defaultFilters();
            this.debouncedNameQuery = "";
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
            this.formDepartmentHint = "";
            this.formData = {
                firstname: "",
                lastname: "",
                username: "",
                password: "",
                default_base: null,
                role: "",
                dep_id: null,
                dep_id_tree: null,
                id: null,
                sso_pending: false,
                sso_linked: false,
                activate_sso: false,
            };
            this.validationErrors = {
                firstname: "",
                lastname: "",
                username: "",
                password: "",
                role: "",
                dep_id: "",
            };
        },

        clearValidationError(field) {
            this.validationErrors[field] = "";
        },

        validateForm() {
            let isValid = true;

            if (!this.formData.firstname.trim()) {
                this.validationErrors.firstname = "الاسم الأول مطلوب";
                isValid = false;
            }

            if (!this.formData.lastname.trim()) {
                this.validationErrors.lastname = "اسم العائلة مطلوب";
                isValid = false;
            }

            if (!this.formData.username.trim()) {
                this.validationErrors.username = "اسم المستخدم مطلوب";
                isValid = false;
            }

            if (!this.isEditing && !this.formData.password) {
                this.validationErrors.password =
                    "كلمة المرور مطلوبة للمستخدم الجديد";
                isValid = false;
            } else if (
                this.formData.password &&
                this.formData.password.length < 6
            ) {
                this.validationErrors.password =
                    "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
                isValid = false;
            }

            if (!this.formData.role) {
                this.validationErrors.role = "اختر الدور";
                isValid = false;
            }

            if (this.requiresDepartmentForSave && !this.resolveDepartmentId()) {
                this.validationErrors.dep_id = this.formData.activate_sso
                    ? "القسم مطلوب لتفعيل حساب مرسال"
                    : "القسم مطلوب لهذا الدور";
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
            this.clearValidationError("dep_id");
            this.formDepartmentHint = "";
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
                    severity: "error",
                    summary: "خطأ في التحقق",
                    detail: "يرجى مراجعة الحقول المطلوبة",
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
                } else if (!isGlobalScope("users") && this.depId) {
                    payload.dep_id = parseInt(this.depId, 10);
                }

                payload.default_base =
                    this.normalizeBaseId(payload.default_base) ?? 0;

                if (this.isEditing) {
                    await updateUser(payload);
                } else {
                    await createUser(payload);
                }

                await this.fetchData();
                this.isPanelOpen = false;
                this.$toast.add({
                    severity: "success",
                    summary: "تم بنجاح",
                    detail: this.isEditing
                        ? activatingSso
                            ? "تم تفعيل حساب مرسال"
                            : "تم تحديث المستخدم"
                        : "تم إنشاء المستخدم",
                    life: 3000,
                });
            } catch (error) {
                console.error("API error:", error);
                this.$toast.add({
                    severity: "error",
                    summary: "خطأ",
                    detail:
                        error.response?.data?.message ||
                        Object.values(
                            error.response?.data?.errors || {},
                        )?.[0]?.[0] ||
                        "تعذر حفظ المستخدم",
                    life: 5000,
                });
            } finally {
                this.isSubmitting = false;
            }
        },

        async editUser(user) {
            const fullUser =
                this.users.find((entry) => entry.id === user.id) ?? user;
            await this.ensureDepartmentsLoaded();

            this.validationErrors = {
                firstname: "",
                lastname: "",
                username: "",
                password: "",
                role: "",
                dep_id: "",
            };

            const roleName = fullUser.role || "";
            this.formDepartmentHint = fullUser.department || "";
            this.formData = {
                firstname: fullUser.firstname || "",
                lastname: fullUser.lastname || "",
                username: fullUser.username || "",
                password: "",
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
                type: "warning",
                title: "تأكيد الحذف",
                message: "هل أنت متأكد من حذف هذا المستخدم؟",
                confirmLabel: "حذف",
                cancelLabel: "إلغاء",
                confirmVariant: "danger",
                onConfirm: async () => {
                    try {
                        await deleteUser({ id });
                        await this.fetchData();
                        this.$toast.add({
                            severity: "success",
                            summary: "تم الحذف",
                            detail: "تم حذف المستخدم بنجاح",
                            life: 3000,
                        });
                    } catch (error) {
                        console.error("Error deleting user:", error);
                        this.$toast.add({
                            severity: "error",
                            summary: "خطأ",
                            detail: "تعذر حذف المستخدم",
                            life: 3000,
                        });
                    }
                },
            });
        },

        async ensureDepartmentsLoaded() {
            if (this.departmentsLoaded) {
                return;
            }

            await this.loadFilterLookups();
        },

        async waitForFilterLookups() {
            if (!this.filterLookupsLoading) {
                return;
            }

            await new Promise((resolve) => {
                const timer = setInterval(() => {
                    if (!this.filterLookupsLoading) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 50);
            });
        },

        async loadFilterLookups() {
            if (this.filterLookupsLoaded) {
                return;
            }

            if (this.filterLookupsLoading) {
                await this.waitForFilterLookups();
                return;
            }

            this.filterLookupsLoading = true;

            try {
                const basesParams = this.usesFullBaseCatalog
                    ? undefined
                    : this.depId
                      ? { depId: this.depId }
                      : undefined;

                const [rolesResponse, basesResponse, departmentsResponse] =
                    await Promise.all([
                        fetchAssignableRoles(),
                        fetchBases(basesParams),
                        this.loadDepartmentsForFilter(),
                    ]);

                this.assignableRolesList = rolesResponse.data?.roles ?? [];
                this.bases = basesResponse.data ?? [];
                this.setDepartmentsTree(
                    departmentsResponse?.data?.departments ?? [],
                );
                this.departmentsLoaded = true;
                this.filterLookupsLoaded = true;
            } catch (error) {
                console.error("Error loading user filter lookups:", error);
                this.$toast.add({
                    severity: "error",
                    summary: "خطأ",
                    detail: "تعذر تحميل خيارات التصفية",
                    life: 3000,
                });
            } finally {
                this.filterLookupsLoading = false;
            }
        },

        async fetchData() {
            this.isLoading = true;

            try {
                const scopedParams =
                    this.isScopedView && this.depId
                        ? { depId: this.depId }
                        : undefined;
                const usersResponse = await fetchUsers(scopedParams);
                this.users = usersResponse.data ?? [];
            } catch (error) {
                console.error("Error fetching users:", error);
                this.$toast.add({
                    severity: "error",
                    summary: "خطأ",
                    detail: "تعذر تحميل المستخدمين",
                    life: 3000,
                });
            } finally {
                this.isLoading = false;
            }

            this.loadFilterLookups();
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
.users-sso-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid #fcd34d;
    background: linear-gradient(135deg, #fffbeb 0%, #fff 100%);
}

.users-sso-banner__icon {
    display: flex;
    height: 2rem;
    width: 2rem;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: #fef3c7;
    color: #b45309;
}

.users-sso-banner__title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #92400e;
}

.users-sso-banner__hint {
    margin: 0.2rem 0 0;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #a16207;
}

.users-filters-panel {
    margin-bottom: 1rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 1rem 1.25rem;
}

.users-filters-panel__title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.85rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: #0f172a;
}

.users-filter-label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #475569;
}

.users-filter-input {
    display: flex;
    height: 2.5rem;
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding-inline: 0.75rem;
    font-size: 0.875rem;
    outline: none;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.users-filter-input:focus {
    border-color: var(--color-brand);
    box-shadow: 0 0 0 2px
        color-mix(in srgb, var(--color-brand) 20%, transparent);
}

.users-filter-input:disabled {
    cursor: not-allowed;
    background: #f8fafc;
    color: #94a3b8;
}

.users-filter-select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    direction: rtl;
    text-align: right;
    padding-inline-end: 2.5rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: left 0.75rem center;
    background-size: 0.875rem;
}

.users-grid-hint {
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

.users-grid-hint__item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}

.users-grid-hint__sep {
    color: #cbd5e1;
}

.users-results-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.55rem 0.85rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    font-size: 0.8125rem;
    color: #475569;
}

.users-results-bar__count {
    font-weight: 600;
    color: #0f172a;
}

.users-results-bar__badge {
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #b45309;
}

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
    box-shadow: 0 0 0 2px
        color-mix(in srgb, var(--color-brand) 20%, transparent);
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
