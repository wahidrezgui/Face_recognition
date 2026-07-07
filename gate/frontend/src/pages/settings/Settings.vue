<template>
    <PageContainer
        title="إعدادات التوقيت"
        description="وقت الدخول ووقت الخروج حسب الجنس والرتبة"
    >
        <div dir="rtl" class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            <AppCard title="اختيار الوحدة" subtitle="اختر الوحدة لإدارة أوقاتها" padding="lg">
                <div class="space-y-3">
                    <label class="block text-sm font-medium text-slate-700">الوحدة</label>
                    <TreeSelect
                        v-model="selectedDeptTree"
                        :options="departments"
                        placeholder="اختر الوحدة"
                        show-clear
                        filter
                        filter-mode="lenient"
                        filter-placeholder="ابحث في الوحدات..."
                        class="settings-treeselect w-full"
                        :loading="departmentsLoading"
                        @update:model-value="onDepartmentChange"
                    >
                        <template #value>
                            <span v-if="selectedDeptLabel" class="settings-treeselect-value">{{ selectedDeptLabel }}</span>
                            <span v-else class="settings-treeselect-placeholder">اختر الوحدة</span>
                        </template>
                    </TreeSelect>
                    <p v-if="selectedDeptLabel" class="text-xs text-slate-500">
                        الوحدة المحددة: {{ selectedDeptLabel }}
                    </p>
                </div>
            </AppCard>

            <AppCard
                class="2xl:col-span-2"
                title="أوقات الدخول والخروج"
                subtitle="حدّد أوقات الحضور والانصراف لكل رتبة وجنس"
                padding="lg"
            >
                <template #headerAction>
                    <AppButton
                        variant="ghost"
                        size="sm"
                        :disabled="!selectedDeptId"
                        @click="openCreateDialog"
                    >
                        <i class="pi pi-plus-circle" aria-hidden="true" />
                        إضافة توقيت
                    </AppButton>
                </template>

                <div v-if="!selectedDeptId" class="py-10 text-center text-sm text-slate-500">
                    اختر وحدة من القائمة على اليمين لعرض أوقاتها
                </div>

                <div v-else-if="isLoadingTimes" class="py-10 text-center text-sm text-slate-500">
                    <i class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
                    جاري تحميل البيانات…
                </div>

                <div v-else class="mt-4 overflow-x-auto rounded-lg">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="p-4 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                                    الجنس
                                </th>
                                <th scope="col" class="p-4 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                                    الرتبة
                                </th>
                                <th scope="col" class="p-4 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                                    التوقيت
                                </th>
                                <th scope="col" class="w-24 p-4" />
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 bg-white">
                            <tr v-if="times.length === 0">
                                <td colspan="4" class="p-8 text-center text-sm text-slate-500">
                                    لا توجد أوقات مسجّلة لهذه الوحدة
                                </td>
                            </tr>
                            <tr v-for="row in times" :key="row.id">
                                <td class="whitespace-nowrap p-4 text-sm font-semibold text-slate-900">
                                    {{ row.gender }}
                                </td>
                                <td class="whitespace-nowrap p-4 text-sm text-slate-600">
                                    {{ row.rank }}
                                </td>
                                <td class="whitespace-nowrap p-4 text-sm font-semibold text-slate-900">
                                    <Tag icon="pi pi-sign-in" severity="success" :value="row.start_time" class="ms-2" />
                                    <Tag icon="pi pi-sign-out" severity="info" :value="row.end_time" />
                                </td>
                                <td class="whitespace-nowrap p-4 text-sm">
                                    <div class="flex items-center gap-3">
                                        <AppButton variant="ghost" size="sm" class="!p-1 text-brand" title="تعديل" @click="openEditDialog(row.id)">
                                            <i class="pi pi-pencil" aria-hidden="true" />
                                        </AppButton>
                                        <AppButton variant="ghost" size="sm" class="!p-1 text-red-500 hover:text-red-700" title="حذف" @click="confirmDelete(row.id)">
                                            <i class="pi pi-trash" aria-hidden="true" />
                                        </AppButton>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </AppCard>
        </div>
    </PageContainer>

    <Dialog
        v-model:visible="createDialogOpen"
        modal
        header="إضافة توقيت"
        :style="{ width: '50rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        dir="rtl"
    >
        <form novalidate @submit.prevent="submitCreate">
            <div class="grid grid-cols-12 gap-x-4">
                <div class="col-span-6">
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                        الجنس <span class="text-red-500">*</span>
                    </label>
                    <Dropdown
                        v-model="createForm.gender_id"
                        :options="genderOptions"
                        option-label="name_ar"
                        option-value="id"
                        placeholder="اختر الجنس"
                        class="w-full"
                    />
                </div>
                <div class="col-span-6">
                    <label class="mb-1 block text-sm font-medium text-slate-700">الرتبة</label>
                    <Dropdown
                        v-model="createForm.rank_id"
                        :options="rankCategories"
                        option-label="name_ar"
                        option-value="id"
                        placeholder="اختر الرتبة"
                        class="w-full"
                    />
                </div>
            </div>

            <div class="mt-4 grid grid-cols-12 gap-x-4">
                <div class="col-span-4">
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                        وقت الدخول <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="createForm.start_time"
                        type="text"
                        placeholder="06:00"
                        dir="ltr"
                        class="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                </div>
                <div class="col-span-4">
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                        وقت الخروج <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="createForm.end_time"
                        type="text"
                        placeholder="13:00"
                        dir="ltr"
                        class="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                </div>
                <div class="col-span-4 flex items-end">
                    <AppButton type="submit" class="h-11 w-full">
                        حفظ
                    </AppButton>
                </div>
            </div>
        </form>
    </Dialog>

    <Dialog
        v-model:visible="editDialogOpen"
        modal
        header="تعديل التوقيت"
        :style="{ width: '50rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        dir="rtl"
    >
        <form novalidate @submit.prevent="submitEdit">
            <div class="grid grid-cols-12 gap-x-4">
                <div class="col-span-6">
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                        الجنس <span class="text-red-500">*</span>
                    </label>
                    <Dropdown
                        v-model="editForm.gender_id"
                        :options="genderOptions"
                        option-label="name_ar"
                        option-value="id"
                        placeholder="اختر الجنس"
                        class="w-full"
                    />
                </div>
                <div class="col-span-6">
                    <label class="mb-1 block text-sm font-medium text-slate-700">الرتبة</label>
                    <Dropdown
                        v-model="editForm.rank_id"
                        :options="rankCategories"
                        option-label="name_ar"
                        option-value="id"
                        placeholder="اختر الرتبة"
                        class="w-full"
                    />
                </div>
            </div>

            <div class="mt-4 grid grid-cols-12 gap-x-4">
                <div class="col-span-4">
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                        وقت الدخول <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="editForm.start_time"
                        type="text"
                        placeholder="06:00"
                        dir="ltr"
                        class="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                </div>
                <div class="col-span-4">
                    <label class="mb-1 block text-sm font-medium text-slate-700">
                        وقت الخروج <span class="text-red-500">*</span>
                    </label>
                    <input
                        v-model="editForm.end_time"
                        type="text"
                        placeholder="13:00"
                        dir="ltr"
                        class="flex h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                </div>
                <div class="col-span-4 flex items-end">
                    <AppButton type="submit" class="h-11 w-full">
                        تحديث
                    </AppButton>
                </div>
            </div>
        </form>
    </Dialog>
</template>

<script>
import { fetchDepartmentTree } from '../../api/organization';
import { fetchRankCategories } from '../../api/lookups';
import {
    createCheckTime,
    deleteCheckTime,
    fetchCheckTimes,
    updateCheckTime,
} from '../../api/employees';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import TreeSelect from 'primevue/treeselect';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppButton from '../../components/ui/AppButton.vue';
import {
    applyTreeSelectValue,
    extractDeptKey,
    findDepartmentLabel,
    normalizeDepartmentTree,
} from '../../lib/departmentTree.js';
import { getAuthUser } from '../../lib/auth-session';

const GENDER_OPTIONS = [
    { id: 1, name_ar: 'ذكر', name_en: 'Male' },
    { id: 2, name_ar: 'أنثى', name_en: 'Female' },
];

function emptyCreateForm(depId) {
    return {
        dep_id: depId,
        gender_id: null,
        rank_id: null,
        start_time: '',
        end_time: '',
    };
}

export default {
    components: {
        Tag,
        Dropdown,
        Dialog,
        TreeSelect,
        PageContainer,
        AppCard,
        AppButton,
    },
    data() {
        const user = getAuthUser();

        return {
            userDepId: user?.dep_id ?? localStorage.getItem('dep_id'),
            departments: [],
            departmentsLoading: false,
            selectedDeptTree: null,
            selectedDeptId: null,
            rankCategories: [],
            times: [],
            isLoadingTimes: false,
            createDialogOpen: false,
            editDialogOpen: false,
            genderOptions: GENDER_OPTIONS,
            createForm: emptyCreateForm(null),
            editForm: {
                id: null,
                dep_id: null,
                gender_id: null,
                rank_id: null,
                start_time: '',
                end_time: '',
            },
        };
    },
    computed: {
        selectedDeptLabel() {
            return findDepartmentLabel(this.departments, this.selectedDeptId);
        },
    },
    async mounted() {
        await Promise.all([
            this.loadDepartments(),
            this.loadRankCategories(),
        ]);
        await this.autoSelectDepartment();
        await this.loadTimes();
    },
    methods: {
        async loadDepartments() {
            if (!this.userDepId) {
                return;
            }

            this.departmentsLoading = true;

            try {
                const response = await fetchDepartmentTree(this.userDepId);
                this.departments = normalizeDepartmentTree(response.data?.departments ?? []);
            } catch (error) {
                console.error('Error loading departments:', error);
                this.$toast?.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: 'تعذر تحميل الوحدات',
                    life: 3000,
                });
            } finally {
                this.departmentsLoading = false;
            }
        },

        async loadRankCategories() {
            try {
                const response = await fetchRankCategories();
                this.rankCategories = response.data ?? [];
            } catch (error) {
                console.error('Error loading rank categories:', error);
            }
        },

        findFirstChildDept(nodes) {
            if (!Array.isArray(nodes) || nodes.length === 0) {
                return null;
            }

            const root = nodes[0];

            if (root.children?.length) {
                return root.children[0].key;
            }

            return root.key;
        },

        async autoSelectDepartment() {
            const firstDeptId = this.findFirstChildDept(this.departments);
            if (!firstDeptId) {
                return;
            }

            await applyTreeSelectValue((value) => {
                this.selectedDeptTree = value;
            }, firstDeptId);

            this.selectedDeptId = parseInt(firstDeptId, 10);
        },

        onDepartmentChange() {
            const deptId = extractDeptKey(this.selectedDeptTree);
            this.selectedDeptId = deptId ? parseInt(deptId, 10) : null;
            this.loadTimes();
        },

        async loadTimes() {
            if (!this.selectedDeptId) {
                this.times = [];
                return;
            }

            this.isLoadingTimes = true;

            try {
                const response = await fetchCheckTimes(this.selectedDeptId);
                this.times = Array.isArray(response.data) ? response.data : [];
            } catch (error) {
                console.error('Error loading check times:', error);
                this.times = [];
                this.$toast?.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: 'تعذر تحميل أوقات الدخول والخروج',
                    life: 3000,
                });
            } finally {
                this.isLoadingTimes = false;
            }
        },

        openCreateDialog() {
            this.createForm = emptyCreateForm(this.selectedDeptId);
            this.createDialogOpen = true;
        },

        async submitCreate() {
            if (!this.createForm.gender_id || !this.createForm.start_time || !this.createForm.end_time) {
                this.$toast?.add({
                    severity: 'warn',
                    summary: 'تنبيه',
                    detail: 'يرجى تعبئة الحقول المطلوبة',
                    life: 3000,
                });
                return;
            }

            try {
                await createCheckTime(this.createForm);
                this.createDialogOpen = false;
                await this.loadTimes();
                this.$toast?.add({
                    severity: 'success',
                    summary: 'تم الحفظ',
                    detail: 'تمت إضافة التوقيت بنجاح',
                    life: 3000,
                });
            } catch (error) {
                console.error('Error creating check time:', error);
                this.$toast?.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: 'تعذر حفظ التوقيت',
                    life: 3000,
                });
            }
        },

        async openEditDialog(id) {
            try {
                const response = await fetchCheckTimes(this.selectedDeptId, { id });
                const row = response.data;
                this.editForm = {
                    id: row.id,
                    dep_id: row.dep_id,
                    gender_id: row.gender_id,
                    rank_id: row.rank_id,
                    start_time: row.start_time,
                    end_time: row.end_time,
                };
                this.editDialogOpen = true;
            } catch (error) {
                console.error('Error loading check time:', error);
                this.$toast?.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: 'تعذر تحميل بيانات التوقيت',
                    life: 3000,
                });
            }
        },

        async submitEdit() {
            try {
                await updateCheckTime(this.editForm);
                this.editDialogOpen = false;
                await this.loadTimes();
                this.$toast?.add({
                    severity: 'success',
                    summary: 'تم التحديث',
                    detail: 'تم تحديث التوقيت بنجاح',
                    life: 3000,
                });
            } catch (error) {
                console.error('Error updating check time:', error);
                this.$toast?.add({
                    severity: 'error',
                    summary: 'خطأ',
                    detail: 'تعذر تحديث التوقيت',
                    life: 3000,
                });
            }
        },

        confirmDelete(id) {
            this.$dialog.confirm({
                type: 'warning',
                title: 'تأكيد الحذف',
                message: 'هل أنت متأكد من حذف هذا التوقيت؟',
                confirmLabel: 'حذف',
                cancelLabel: 'إلغاء',
                confirmVariant: 'danger',
                onConfirm: async () => {
                    try {
                        await deleteCheckTime({ id });
                        await this.loadTimes();
                        this.$toast?.add({
                            severity: 'success',
                            summary: 'تم الحذف',
                            detail: 'تم حذف التوقيت بنجاح',
                            life: 3000,
                        });
                    } catch (error) {
                        console.error('Error deleting check time:', error);
                        this.$toast?.add({
                            severity: 'error',
                            summary: 'خطأ',
                            detail: 'تعذر حذف التوقيت',
                            life: 3000,
                        });
                    }
                },
            });
        },
    },
};
</script>

<style scoped>
.settings-treeselect :deep(.p-treeselect) {
    width: 100%;
    direction: rtl;
    text-align: right;
}

.settings-treeselect-placeholder {
    color: #94a3b8;
}

.settings-treeselect-value {
    color: #0f172a;
}
</style>
