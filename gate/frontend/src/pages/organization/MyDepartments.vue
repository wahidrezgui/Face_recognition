<template>
  <PageContainer
    title="الوحدات"
    :description="treeDescription"
  >
    <AppCard padding="lg">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <input
          v-model="treeFilter"
          type="search"
          placeholder="ابحث في الوحدات..."
          class="h-10 min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="expandAll"
        >
          <i class="pi pi-plus ms-1" aria-hidden="true" />
          توسيع الكل
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="collapseAll"
        >
          <i class="pi pi-minus ms-1" aria-hidden="true" />
          طي الكل
        </button>
      </div>

      <AppLoader v-if="isLoading" variant="inline" label="جاري تحميل الوحدات…" />

      <div v-else-if="departments.length === 0" class="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
        <i class="pi pi-sitemap mb-2 block text-3xl text-slate-300" aria-hidden="true" />
        لا توجد وحدات فرعية لعرضها.
      </div>

      <Tree
        v-else
        v-model:expanded-keys="expandedKeys"
        v-model:filter-value="treeFilter"
        :value="departments"
        filter
        filter-mode="lenient"
        filter-placeholder="ابحث..."
        class="w-full"
      >
        <template #default="{ node }">
          <div class="flex w-full items-center justify-between gap-3 py-1">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">
                {{ node.name_ar || node.name_en }}
              </p>
              <p v-if="node.name_ar && node.name_en" class="truncate text-xs text-slate-500" dir="ltr">
                {{ node.name_en }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"
                title="ربط القواعد"
                @click.stop="openAssignPanel(node)"
              >
                <i class="pi pi-map-marker" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand hover:bg-brand/10"
                title="إضافة وحدة فرعية"
                @click.stop="openCreatePanel(node.id)"
              >
                <i class="pi pi-plus" aria-hidden="true" />
              </button>
              <AppTableActions
                :show-delete="false"
                @edit="editDep(node.id)"
              />
            </div>
          </div>
        </template>
      </Tree>
    </AppCard>
  </PageContainer>

  <!-- Create unit -->
  <VueSidePanel v-model="isOpenedC" lock-scroll hide-close-btn :width="panelWidth" @closed="resetCreateForm">
    <div class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="addDepartment">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">إضافة وحدة</h2>
              <p class="mt-1 text-sm text-slate-500">إنشاء وحدة فرعية مع مستخدم تقارير</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="isOpenedC = false">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">
                الاسم بالإنجليزية <span class="text-red-500">*</span>
              </label>
              <input v-model="formDataDep.name_en" type="text" placeholder="Unit name" dir="ltr" :class="inputClass('name_en')" @input="clearValidationError('name_en')" />
              <p v-if="validationErrors.name_en" class="mt-1 text-xs text-red-500">{{ validationErrors.name_en }}</p>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
              <input v-model="formDataDep.name_ar" type="text" placeholder="اسم الوحدة" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>

            <hr class="border-slate-200" />

            <p class="text-sm font-semibold text-slate-800">مستخدم التقارير الافتراضي</p>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">الاسم الأول <span class="text-red-500">*</span></label>
                <input v-model="formDataDep.firstname" type="text" :class="inputClass('firstname')" @input="clearValidationError('firstname')" />
                <p v-if="validationErrors.firstname" class="mt-1 text-xs text-red-500">{{ validationErrors.firstname }}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">اسم العائلة <span class="text-red-500">*</span></label>
                <input v-model="formDataDep.lastname" type="text" :class="inputClass('lastname')" @input="clearValidationError('lastname')" />
                <p v-if="validationErrors.lastname" class="mt-1 text-xs text-red-500">{{ validationErrors.lastname }}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">البريد الإلكتروني <span class="text-red-500">*</span></label>
                <input v-model="formDataDep.email" type="text" dir="ltr" :class="inputClass('email')" @input="clearValidationError('email')" />
                <p v-if="validationErrors.email" class="mt-1 text-xs text-red-500">{{ validationErrors.email }}</p>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">كلمة المرور <span class="text-red-500">*</span></label>
                <input v-model="formDataDep.password" type="password" :class="inputClass('password')" @input="clearValidationError('password')" />
                <p v-if="validationErrors.password" class="mt-1 text-xs text-red-500">{{ validationErrors.password }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="isOpenedC = false">
              إلغاء
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? 'جاري الحفظ…' : 'حفظ' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>

  <!-- Edit unit -->
  <VueSidePanel v-model="isOpenedE" lock-scroll hide-close-btn :width="panelWidth">
    <div class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="editDepartment">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">تعديل وحدة</h2>
              <p class="mt-1 text-sm text-slate-500">تحديث بيانات الوحدة ومستخدم التقارير</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="isOpenedE = false">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالإنجليزية <span class="text-red-500">*</span></label>
              <input v-model="formEditDep.name_en" type="text" dir="ltr" :class="inputClass('name_en')" @input="clearValidationError('name_en')" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
              <input v-model="formEditDep.name_ar" type="text" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>

            <hr class="border-slate-200" />

            <p class="text-sm font-semibold text-slate-800">مستخدم التقارير</p>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">الاسم الأول <span class="text-red-500">*</span></label>
                <input v-model="formEditDep.user.firstname" type="text" :class="inputClass('firstname')" @input="clearValidationError('firstname')" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">اسم العائلة <span class="text-red-500">*</span></label>
                <input v-model="formEditDep.user.lastname" type="text" :class="inputClass('lastname')" @input="clearValidationError('lastname')" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">البريد الإلكتروني <span class="text-red-500">*</span></label>
                <input v-model="formEditDep.user.email" type="text" dir="ltr" :class="inputClass('email')" @input="clearValidationError('email')" />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">كلمة المرور</label>
                <input v-model="formEditDep.user.password" type="password" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                <p class="mt-1 text-xs text-slate-500">اتركه فارغاً للإبقاء على كلمة المرور الحالية</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="isOpenedE = false">
              إلغاء
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              <i v-if="isSubmitting" class="pi pi-spin pi-spinner ms-2" aria-hidden="true" />
              {{ isSubmitting ? 'جاري الحفظ…' : 'تحديث' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>

  <!-- Assign bases -->
  <VueSidePanel v-model="isOpenedAb" lock-scroll hide-close-btn :width="panelWidth">
    <div class="flex h-full flex-col bg-white" dir="rtl">
      <form novalidate class="flex h-full flex-col" @submit.prevent="assignBases">
        <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">ربط القواعد</h2>
              <p class="mt-1 text-sm text-slate-500">{{ assignUnitName }}</p>
            </div>
            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="isOpenedAb = false">
              <i class="pi pi-times text-xl" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div v-if="bases.length === 0" class="text-sm text-slate-500">لا توجد قواعد متاحة.</div>
          <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label
              v-for="base in bases"
              :key="base.id"
              class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Checkbox v-model="formAssignBase.selectedBases" :input-id="`base-${base.id}`" name="bases" :value="base.id" />
              <span>{{ base.name_ar || base.name_en }}</span>
            </label>
          </div>
        </div>

        <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="isOpenedAb = false">
              إلغاء
            </button>
            <button type="submit" :disabled="isSubmitting" class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
              حفظ
            </button>
          </div>
        </div>
      </form>
    </div>
  </VueSidePanel>

  <Toast />
</template>

<script>
import {
  fetchBases,
  fetchDepartment,
  fetchDepartmentTree,
  createDepartment,
  updateDepartment,
  assignBase,
} from '../../api/organization';
import Toast from 'primevue/toast';
import Checkbox from 'primevue/checkbox';
import Tree from 'primevue/tree';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppLoader from '../../components/shared/AppLoader.vue';

const emptyUser = () => ({
  firstname: '',
  lastname: '',
  email: '',
  password: '',
  id: 0,
});

const emptyValidation = () => ({
  name_en: '',
  firstname: '',
  lastname: '',
  email: '',
  password: '',
});

export default {
  name: 'MyDepartments',
  components: {
    Toast,
    Checkbox,
    Tree,
    PageContainer,
    AppCard,
    AppLoader,
  },
  data() {
    return {
      isLoading: false,
      isSubmitting: false,
      expandedKeys: {},
      treeFilter: '',
      departments: [],
      bases: [],
      depId: localStorage.getItem('dep_id'),
      assignUnitName: '',
      formAssignBase: {
        selectedBases: [],
        dep_id: null,
      },
      formDataDep: {
        name_en: '',
        name_ar: '',
        parent_id: null,
        firstname: '',
        lastname: '',
        email: '',
        password: '',
      },
      formEditDep: {
        name_en: '',
        name_ar: '',
        id: 0,
        user: emptyUser(),
      },
      validationErrors: emptyValidation(),
      isOpenedC: false,
      isOpenedE: false,
      isOpenedAb: false,
    };
  },
  computed: {
    panelWidth() {
      return window.innerWidth < 640 ? '100%' : '600px';
    },
    treeDescription() {
      const count = this.countNodes(this.departments);
      return count ? `إدارة ${count} وحدة ضمن هيكل وحدتك` : 'إدارة الوحدات الفرعية ضمن نطاق وحدتك';
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    countNodes(nodes) {
      if (!Array.isArray(nodes)) {
        return 0;
      }

      return nodes.reduce((total, node) => {
        const children = this.countNodes(node.children || []);
        return total + 1 + children;
      }, 0);
    },

    inputClass(field) {
      return [
        'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20',
        this.validationErrors[field] ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand',
      ];
    },

    clearValidationError(field) {
      this.validationErrors[field] = '';
    },

    expandAll() {
      for (const node of this.departments) {
        this.expandNode(node);
      }
      this.expandedKeys = { ...this.expandedKeys };
    },

    collapseAll() {
      this.expandedKeys = {};
    },

    expandNode(node) {
      if (node.children?.length) {
        this.expandedKeys[node.key] = true;
        for (const child of node.children) {
          this.expandNode(child);
        }
      }
    },

    resetCreateForm() {
      this.formDataDep = {
        name_en: '',
        name_ar: '',
        parent_id: this.depId,
        firstname: '',
        lastname: '',
        email: '',
        password: '',
      };
      this.validationErrors = emptyValidation();
    },

    openCreatePanel(parentId) {
      this.resetCreateForm();
      this.formDataDep.parent_id = parentId;
      this.isOpenedC = true;
    },

    openAssignPanel(node) {
      this.assignUnitName = node.name_ar || node.name_en || '';
      this.formAssignBase = {
        selectedBases: [],
        dep_id: node.id,
      };
      this.isOpenedAb = true;
    },

    validateCreateForm() {
      let isValid = true;
      this.validationErrors = emptyValidation();

      if (!this.formDataDep.name_en.trim()) {
        this.validationErrors.name_en = 'الاسم بالإنجليزية مطلوب';
        isValid = false;
      }
      if (!this.formDataDep.firstname.trim()) {
        this.validationErrors.firstname = 'الاسم الأول مطلوب';
        isValid = false;
      }
      if (!this.formDataDep.lastname.trim()) {
        this.validationErrors.lastname = 'اسم العائلة مطلوب';
        isValid = false;
      }
      if (!this.formDataDep.email.trim()) {
        this.validationErrors.email = 'البريد الإلكتروني مطلوب';
        isValid = false;
      }
      if (!this.formDataDep.password) {
        this.validationErrors.password = 'كلمة المرور مطلوبة';
        isValid = false;
      }

      return isValid;
    },

    validateEditForm() {
      let isValid = true;
      this.validationErrors = emptyValidation();

      if (!this.formEditDep.name_en?.trim()) {
        this.validationErrors.name_en = 'الاسم بالإنجليزية مطلوب';
        isValid = false;
      }
      if (!this.formEditDep.user?.firstname?.trim()) {
        this.validationErrors.firstname = 'الاسم الأول مطلوب';
        isValid = false;
      }
      if (!this.formEditDep.user?.lastname?.trim()) {
        this.validationErrors.lastname = 'اسم العائلة مطلوب';
        isValid = false;
      }
      if (!this.formEditDep.user?.email?.trim()) {
        this.validationErrors.email = 'البريد الإلكتروني مطلوب';
        isValid = false;
      }

      return isValid;
    },

    async addDepartment() {
      if (!this.validateCreateForm()) {
        this.$toast.add({ severity: 'error', summary: 'خطأ في التحقق', detail: 'يرجى مراجعة الحقول المطلوبة', life: 3000 });
        return;
      }

      this.isSubmitting = true;
      try {
        await createDepartment(this.formDataDep);
        await this.fetchData();
        this.isOpenedC = false;
        this.$toast.add({ severity: 'success', summary: 'تم بنجاح', detail: 'تم إنشاء الوحدة', life: 3000 });
      } catch (error) {
        console.error('API error:', error);
        this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر إنشاء الوحدة', life: 3000 });
      } finally {
        this.isSubmitting = false;
      }
    },

    async editDep(id) {
      try {
        const response = await fetchDepartment(id);
        const data = response.data;

        this.formEditDep = {
          ...data,
          user: data.user || emptyUser(),
        };
        this.validationErrors = emptyValidation();
        this.isOpenedE = true;
      } catch (error) {
        console.error('Error fetching department:', error);
        this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل بيانات الوحدة', life: 3000 });
      }
    },

    async editDepartment() {
      if (!this.validateEditForm()) {
        this.$toast.add({ severity: 'error', summary: 'خطأ في التحقق', detail: 'يرجى مراجعة الحقول المطلوبة', life: 3000 });
        return;
      }

      this.isSubmitting = true;
      try {
        await updateDepartment(this.formEditDep);
        await this.fetchData();
        this.isOpenedE = false;
        this.$toast.add({ severity: 'success', summary: 'تم بنجاح', detail: 'تم تحديث الوحدة', life: 3000 });
      } catch (error) {
        console.error('API error:', error);
        this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحديث الوحدة', life: 3000 });
      } finally {
        this.isSubmitting = false;
      }
    },

    async assignBases() {
      this.isSubmitting = true;
      try {
        await assignBase(this.formAssignBase);
        this.isOpenedAb = false;
        this.$toast.add({ severity: 'success', summary: 'تم بنجاح', detail: 'تم ربط القواعد', life: 3000 });
      } catch (error) {
        console.error('API error:', error);
        this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر ربط القواعد', life: 3000 });
      } finally {
        this.isSubmitting = false;
      }
    },

    async fetchData() {
      if (!this.depId) {
        this.departments = [];
        return;
      }

      this.isLoading = true;
      try {
        const [treeResponse, basesResponse] = await Promise.all([
          fetchDepartmentTree(this.depId),
          fetchBases({ depId: this.depId }),
        ]);

        this.departments = treeResponse.data.departments || [];
        this.bases = basesResponse.data || [];
        this.expandAll();
      } catch (error) {
        console.error(error);
        this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل الوحدات', life: 3000 });
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>
