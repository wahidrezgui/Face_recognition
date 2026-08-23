<template>
    <PageContainer
        title="صلاحيات الأدوار"
        description="إدارة صلاحيات الوصول للصفحات وعمليات CRUD وربط المستخدمين بالأدوار"
    >
        <AppCard padding="lg" class="mb-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div class="min-w-[240px]">
                    <label class="mb-2 block text-sm font-medium text-slate-700">الدور</label>
                    <Dropdown
                        v-model="selectedRoleId"
                        :options="roleOptions"
                        option-label="label"
                        option-value="value"
                        placeholder="اختر دوراً"
                        class="w-full"
                        @change="loadRoleDetail"
                    />
                </div>
                <div v-if="roleDetail && !roleDetail.locked" class="flex gap-2">
                    <AppButton
                        :disabled="saving || !selectedRoleId"
                        @click="savePermissions"
                    >
                        {{ saving ? 'جاري الحفظ...' : 'حفظ الصلاحيات' }}
                    </AppButton>
                </div>
            </div>
            <p v-if="roleDetail?.locked" class="mt-3 text-sm text-amber-700">
                دور مدير النظام يملك جميع الصلاحيات ولا يمكن تعديله من هنا.
            </p>
        </AppCard>

        <div v-if="loading" class="py-16 text-center text-slate-500">
            <i class="pi pi-spin pi-spinner text-2xl" />
        </div>

        <template v-else-if="roleDetail">
            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <AppCard title="صلاحيات الصفحات" subtitle="تحديد الصفحات التي يمكن للدور الوصول إليها" padding="lg">
                    <div class="max-h-[520px] space-y-2 overflow-y-auto pe-1">
                        <div
                            v-for="(route, key) in catalog.routes"
                            :key="key"
                            role="button"
                            tabindex="0"
                            class="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
                            :class="{ 'opacity-60 cursor-not-allowed': roleDetail.locked }"
                            @click="onRouteRowClick(key)"
                            @keydown.enter.prevent="onRouteRowClick(key)"
                            @keydown.space.prevent="onRouteRowClick(key)"
                        >
                            <span class="text-sm text-slate-800">{{ route.label_ar }}</span>
                            <span @click.stop>
                                <Checkbox
                                    :model-value="routeAccess[key] === true"
                                    :binary="true"
                                    :disabled="roleDetail.locked"
                                    @update:model-value="toggleRouteAccess(key, $event)"
                                />
                            </span>
                        </div>
                    </div>
                </AppCard>

                <AppCard title="صلاحيات CRUD ونطاق البيانات" subtitle="قراءة/كتابة ونطاق البيانات (الكل/ وحدة فقط)" padding="lg">
                    <div class="space-y-3">
                        <div
                            v-for="(resource, key) in catalog.resources"
                            :key="key"
                            class="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-3"
                        >
                            <span class="text-sm font-medium text-slate-800">{{ resource.label_ar }}</span>
                            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                <Dropdown
                                    v-model="resourceAccess[key]"
                                    :options="resourceLevelOptions"
                                    option-label="label"
                                    option-value="value"
                                    class="w-full sm:w-52"
                                    :disabled="roleDetail.locked"
                                    placeholder="صلاحية CRUD"
                                />
                                <Dropdown
                                    v-if="isScopableResource(key)"
                                    v-model="resourceScopeAccess[key]"
                                    :options="scopeLevelOptions"
                                    option-label="label"
                                    option-value="value"
                                    class="w-full sm:w-52"
                                    :disabled="roleDetail.locked"
                                    placeholder="نطاق البيانات"
                                />
                            </div>
                        </div>
                    </div>
                </AppCard>
            </div>

            <AppCard title="المستخدمون المرتبطون" subtitle="إضافة أو إزالة مستخدمين من هذا الدور" padding="lg" class="mt-6">
                <template #headerAction>
                    <AppButton
                        v-if="!roleDetail.locked"
                        variant="ghost"
                        size="sm"
                        @click="openAddUser"
                    >
                        <i class="pi pi-user-plus" /> إضافة مستخدم
                    </AppButton>
                </template>

                <div v-if="!roleDetail.users.length" class="py-8 text-center text-sm text-slate-500">
                    لا يوجد مستخدمون مرتبطون بهذا الدور.
                </div>

                <div v-else class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th class="px-3 py-2 text-start text-xs font-semibold uppercase text-slate-500">الاسم</th>
                                <th class="px-3 py-2 text-start text-xs font-semibold uppercase text-slate-500">البريد</th>
                                <th class="px-3 py-2 text-end text-xs font-semibold uppercase text-slate-500">إجراء</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            <tr v-for="user in roleDetail.users" :key="user.id">
                                <td class="px-3 py-2 text-sm text-slate-800">
                                    {{ user.firstname }} {{ user.lastname }}
                                </td>
                                <td class="px-3 py-2 text-sm text-slate-600">{{ user.username }}</td>
                                <td class="px-3 py-2 text-end">
                                    <AppButton
                                        v-if="!roleDetail.locked"
                                        variant="ghost"
                                        size="sm"
                                        class="text-red-600 hover:bg-red-50"
                                        @click="removeUser(user)"
                                    >
                                        إزالة
                                    </AppButton>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </AppCard>
        </template>

        <div
            v-if="addUserVisible"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            @click.self="addUserVisible = false"
        >
            <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
                <h3 class="mb-4 text-lg font-bold text-slate-900">إضافة مستخدم للدور</h3>
                <Dropdown
                    v-model="addUserId"
                    :options="availableUserOptions"
                    option-label="label"
                    option-value="value"
                    filter
                    placeholder="اختر مستخدماً"
                    class="w-full"
                />
                <div class="mt-6 flex justify-end gap-2">
                    <AppButton variant="secondary" @click="addUserVisible = false">
                        إلغاء
                    </AppButton>
                    <AppButton
                        :disabled="!addUserId || assigningUser"
                        @click="assignUser"
                    >
                        {{ assigningUser ? 'جاري الإضافة...' : 'إضافة' }}
                    </AppButton>
                </div>
            </div>
        </div>
    </PageContainer>
</template>

<script>
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppButton from '../../components/ui/AppButton.vue';
import Checkbox from 'primevue/checkbox';
import Dropdown from 'primevue/dropdown';
import { useToast } from 'primevue/usetoast';
import api from '../../api/client';
import {
    assignUserToRole,
    fetchRoleAccess,
    fetchRoleAccessCatalog,
    fetchRolesAccess,
    removeUserFromRole,
    updateRolePermissions,
} from '../../api/roleAccess';

export default {
    name: 'RolePermissions',
    components: {
        PageContainer,
        AppCard,
        AppButton,
        Checkbox,
        Dropdown,
    },
    setup() {
        return { toast: useToast() };
    },
    data() {
        return {
            loading: false,
            saving: false,
            assigningUser: false,
            catalog: { routes: {}, resources: {} },
            roleOptions: [],
            selectedRoleId: null,
            roleDetail: null,
            routeAccess: {},
            resourceAccess: {},
            resourceScopeAccess: {},
            resourceLevelOptions: [
                { label: 'بدون وصول', value: 'none' },
                { label: 'قراءة فقط', value: 'read' },
                { label: 'قراءة وكتابة', value: 'write' },
            ],
            addUserVisible: false,
            addUserId: null,
            allUsers: [],
        };
    },
    computed: {
        scopeLevelOptions() {
            const levels = this.catalog.scope_levels ?? {};
            return [
                { label: 'بدون', value: 'none' },
                ...Object.entries(levels).map(([value, meta]) => ({
                    label: meta.label_ar ?? value,
                    value,
                })),
            ];
        },
        availableUserOptions() {
            const assignedIds = new Set((this.roleDetail?.users ?? []).map((user) => user.id));
            return this.allUsers
                .filter((user) => !assignedIds.has(user.id))
                .map((user) => ({
                    label: `${user.firstname} ${user.lastname} (${user.username})`,
                    value: user.id,
                }));
        },
    },
    async mounted() {
        await this.bootstrap();
    },
    methods: {
        async bootstrap() {
            this.loading = true;
            try {
                const [catalog, rolesPayload] = await Promise.all([
                    fetchRoleAccessCatalog(),
                    fetchRolesAccess(),
                ]);
                this.catalog = catalog;
                this.roleOptions = (rolesPayload.roles ?? []).map((role) => ({
                    label: `${role.name} (${role.users_count})`,
                    value: role.id,
                }));
                if (this.roleOptions.length) {
                    this.selectedRoleId = this.roleOptions[0].value;
                    await this.loadRoleDetail();
                }
            } catch (error) {
                this.toast.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: error?.response?.data?.message ?? 'تعذر تحميل صلاحيات الأدوار',
                    life: 4000,
                });
            } finally {
                this.loading = false;
            }
        },
        async loadRoleDetail() {
            if (!this.selectedRoleId) {
                return;
            }
            this.loading = true;
            try {
                const detail = await fetchRoleAccess(this.selectedRoleId);
                this.roleDetail = detail;
                this.applyAccessFromDetail(detail);
            } catch (error) {
                this.toast.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: error?.response?.data?.message ?? 'تعذر تحميل تفاصيل الدور',
                    life: 4000,
                });
            } finally {
                this.loading = false;
            }
        },
        buildRoutesPayload() {
            return Object.keys(this.catalog.routes || {})
                .filter((key) => this.routeAccess[key] === true);
        },
        isScopableResource(key) {
            return (this.catalog.scopable_resources ?? []).includes(key);
        },
        applyAccessFromDetail(detail) {
            const routes = {};
            const resources = {};
            const scopes = {};

            Object.keys(this.catalog.routes || {}).forEach((key) => {
                routes[key] = detail.route_permissions?.[key] === true;
            });

            Object.keys(this.catalog.resources || {}).forEach((key) => {
                resources[key] = detail.resource_permissions?.[key] ?? 'none';
            });

            (this.catalog.scopable_resources ?? []).forEach((key) => {
                scopes[key] = detail.resource_scopes?.[key] ?? 'none';
            });

            this.routeAccess = routes;
            this.resourceAccess = resources;
            this.resourceScopeAccess = scopes;
        },
        toggleRouteAccess(key, enabled) {
            this.routeAccess = {
                ...this.routeAccess,
                [key]: enabled === true,
            };
        },
        onRouteRowClick(key) {
            if (this.roleDetail?.locked) {
                return;
            }
            this.toggleRouteAccess(key, !(this.routeAccess[key] === true));
        },
        async savePermissions() {
            if (!this.selectedRoleId || this.roleDetail?.locked) {
                return;
            }
            this.saving = true;
            try {
                const detail = await updateRolePermissions(this.selectedRoleId, {
                    routes: this.buildRoutesPayload(),
                    resources: this.resourceAccess,
                    scopes: this.resourceScopeAccess,
                });
                this.roleDetail = detail;
                this.applyAccessFromDetail(detail);
                this.toast.add({
                    severity: 'success',
                    summary: 'تم الحفظ',
                    detail: 'تم تحديث صلاحيات الدور — المستخدمون المعنيون يحتاجون إعادة تسجيل الدخول',
                    life: 4000,
                });
            } catch (error) {
                const message = error?.response?.data?.message
                    ?? Object.values(error?.response?.data?.errors ?? {})?.flat()?.[0]
                    ?? 'تعذر حفظ الصلاحيات';
                this.toast.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: message,
                    life: 4000,
                });
            } finally {
                this.saving = false;
            }
        },
        async openAddUser() {
            this.addUserId = null;
            this.addUserVisible = true;
            if (this.allUsers.length) {
                return;
            }
            try {
                const { data } = await api.get('/api/users');
                this.allUsers = Array.isArray(data) ? data : [];
            } catch (error) {
                this.toast.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: error?.response?.data?.message ?? 'تعذر تحميل قائمة المستخدمين',
                    life: 4000,
                });
            }
        },
        async assignUser() {
            if (!this.addUserId || !this.selectedRoleId) {
                return;
            }
            this.assigningUser = true;
            try {
                const detail = await assignUserToRole(this.selectedRoleId, this.addUserId);
                this.roleDetail = detail;
                this.addUserVisible = false;
                this.refreshRoleOptionsCounts();
                this.toast.add({
                    severity: 'success',
                    summary: 'تمت الإضافة',
                    detail: 'تم ربط المستخدم بالدور',
                    life: 3000,
                });
            } catch (error) {
                const message = error?.response?.data?.message
                    ?? Object.values(error?.response?.data?.errors ?? {})?.flat()?.[0]
                    ?? 'تعذر إضافة المستخدم';
                this.toast.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: message,
                    life: 4000,
                });
            } finally {
                this.assigningUser = false;
            }
        },
        async removeUser(user) {
            if (!this.selectedRoleId || this.roleDetail?.locked) {
                return;
            }
            if (!window.confirm(`إزالة ${user.firstname} ${user.lastname} من دور ${this.roleDetail.role.name}؟`)) {
                return;
            }
            try {
                const detail = await removeUserFromRole(this.selectedRoleId, user.id);
                this.roleDetail = detail;
                this.refreshRoleOptionsCounts();
                this.toast.add({
                    severity: 'success',
                    summary: 'تمت الإزالة',
                    detail: 'تم إزالة المستخدم من الدور',
                    life: 3000,
                });
            } catch (error) {
                const message = error?.response?.data?.message
                    ?? Object.values(error?.response?.data?.errors ?? {})?.flat()?.[0]
                    ?? 'تعذر إزالة المستخدم';
                this.toast.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: message,
                    life: 4000,
                });
            }
        },
        refreshRoleOptionsCounts() {
            const count = this.roleDetail?.users?.length ?? 0;
            this.roleOptions = this.roleOptions.map((option) => {
                if (option.value !== this.selectedRoleId) {
                    return option;
                }
                const name = this.roleDetail?.role?.name ?? option.label.split(' (')[0];
                return { ...option, label: `${name} (${count})` };
            });
        },
    },
};
</script>
