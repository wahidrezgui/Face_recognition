<template>
  <VueSidePanel
    :model-value="open"
    lock-scroll
    hide-close-btn
    width="680px"
    @update:model-value="$emit('update:open', $event)"
  >
    <div class="emp-detail-panel flex h-full flex-col bg-white" dir="rtl">
      <header class="flex-none border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-lg font-semibold text-slate-800">
              {{ panelTitle }}
            </h2>
            <p class="mt-0.5 text-sm text-slate-500">{{ panelSubtitle }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <AppButton
              v-if="isEdit && showPrintButton && canPrint"
              variant="accent"
              size="sm"
              @click="$emit('print')"
            >
              <i class="pi pi-print" aria-hidden="true" />
              طباعة البطاقة
            </AppButton>
            <AppButton
              variant="ghost"
              size="sm"
              class="!h-9 !w-9 !p-0"
              aria-label="إغلاق"
              @click="$emit('update:open', false)"
            >
              <i class="pi pi-times text-lg" aria-hidden="true" />
            </AppButton>
          </div>
        </div>

        <nav v-if="visibleTabs.length > 1" class="mt-4 flex gap-1 border-b border-slate-200" aria-label="أقسام الموظف">
          <AppButton
            v-for="tab in visibleTabs"
            :key="tab.id"
            variant="ghost"
            size="sm"
            class="emp-detail-tab"
            :class="{ 'emp-detail-tab--active': activeTab === tab.id }"
            @click="$emit('update:activeTab', tab.id)"
          >
            <i :class="tab.icon" aria-hidden="true" />
            {{ tab.label }}
          </AppButton>
        </nav>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-5">
        <div v-show="activeTab === 10">
          <fieldset :disabled="readOnly" class="min-w-0 border-0 p-0">
            <form :id="formId" novalidate @submit.prevent="onSubmit">
              <div class="mb-5 flex items-center gap-4">
                <img
                  :src="photoSrc"
                  alt=""
                  class="h-20 w-20 rounded-full border border-slate-200 object-cover"
                />
                <div class="min-w-0 flex-1">
                  <label class="emp-field-label">الصورة</label>
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    class="emp-field-input text-xs"
                    @change="$emit('file-change', $event)"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label class="emp-field-label">الجنس</label>
                  <Dropdown
                    v-model="guest.gender_id"
                    :options="gender"
                    option-label="name_ar"
                    option-value="id"
                    placeholder="اختر الجنس"
                    :class="EMPLOYEE_DROPDOWN_CLASS"
                  />
                </div>

                <div>
                  <label class="emp-field-label">فصيلة الدم</label>
                  <input
                    v-model="guest.bloodtype"
                    type="text"
                    name="bloodtype"
                    :class="fieldClass('bloodtype')"
                    placeholder="مثال: +B"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="emp-field-label">الاسم الكامل</label>
                  <input
                    v-model="guest.fullname_ar"
                    type="text"
                    name="fullname_ar"
                    :class="fieldClass('fullname_ar')"
                    placeholder="الاسم بالعربية"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="emp-field-label">الاسم بالإنجليزية</label>
                  <input
                    v-model="guest.fullname_en"
                    type="text"
                    name="fullname_en"
                    dir="ltr"
                    :class="fieldClass('fullname_en', true)"
                    placeholder="Full name in English"
                  />
                </div>

                <div>
                  <label class="emp-field-label">الرقم العسكري</label>
                  <input
                    v-model="guest.military_number"
                    type="text"
                    name="military_number"
                    dir="ltr"
                    :class="fieldClass('military_number', true)"
                    placeholder="الرقم العسكري"
                  />
                </div>

                <div>
                  <label class="emp-field-label">البطاقة الشخصية</label>
                  <input
                    v-model="guest.qid"
                    type="text"
                    name="qid"
                    dir="ltr"
                    :class="fieldClass('qid', true)"
                    placeholder="رقم البطاقة"
                  />
                </div>

                <div>
                  <label class="emp-field-label">رقم الهاتف</label>
                  <input
                    v-model="guest.phone_number"
                    type="text"
                    name="phone_number"
                    dir="ltr"
                    class="emp-field-input emp-field-input--ltr"
                    placeholder="رقم الهاتف"
                  />
                </div>

                <div>
                  <label class="emp-field-label">المهنة</label>
                  <input
                    v-model="guest.Job_En"
                    type="text"
                    name="Job_En"
                    :class="fieldClass('Job_En')"
                    placeholder="المهنة"
                  />
                </div>

                <div>
                  <label class="emp-field-label">الجنسية</label>
                  <Dropdown
                    v-model="guest.nationality_id"
                    :options="nationalities"
                    option-label="name_ar"
                    option-value="id"
                    placeholder="اختر الجنسية"
                    :class="EMPLOYEE_DROPDOWN_CLASS"
                  />
                </div>

                <div>
                  <label class="emp-field-label">الرتبة</label>
                  <TreeSelect
                    v-model="guest.rank_id"
                    :options="ranks"
                    placeholder="اختر الرتبة"
                    class="w-full"
                  />
                </div>

                <div v-if="!lockDepartment">
                  <label class="emp-field-label">الوحدة</label>
                  <TreeSelect
                    v-model="guest.dep_id"
                    :options="departments"
                    placeholder="اختر الوحدة"
                    show-clear
                    class="w-full"
                  />
                </div>

                <div>
                  <label class="emp-field-label">صلاحية البطاقة</label>
                  <input
                    v-model="guest.expiry_date"
                    type="date"
                    name="expiry_date"
                    :class="fieldClass('expiry_date')"
                  />
                </div>

                <div class="md:col-span-2">
                  <label class="emp-field-label">ملاحظات</label>
                  <input
                    v-model="guest.remarks"
                    type="text"
                    name="remarks"
                    :class="fieldClass('remarks')"
                    placeholder="ملاحظات إضافية"
                  />
                </div>
              </div>

              <input type="hidden" name="created_by_id" :value="accountId">
              <input v-if="isEdit" type="hidden" name="id" :value="guest.id">
              <input type="hidden" name="dep_parent_id" :value="guest.dep_parent_id || depId">
              <input v-if="isCreate" type="hidden" name="is_employee" :value="companyGuest ? 1 : 0">
              <input
                v-if="isCreate && lockDepartment && guest.dep_id"
                type="hidden"
                name="dep_id"
                :value="typeof guest.dep_id === 'object' ? Object.keys(guest.dep_id)[0] : guest.dep_id"
              >

              <hr class="my-6 border-slate-200">

              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 class="text-base font-semibold text-slate-800">الصلاحيات</h3>
                <Dropdown
                  v-model="guest.default_base"
                  :options="bases"
                  option-label="name_ar"
                  option-value="id"
                  placeholder="القاعدة الافتراضية"
                  :class="EMPLOYEE_DROPDOWN_CLASS"
                  style="min-width: 14rem"
                />
              </div>

              <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Card v-for="base in bases" :key="base.id" class="emp-base-card">
                  <template #title>
                    <span class="text-sm font-semibold">{{ base.name_ar }}</span>
                  </template>
                  <template #content>
                    <table class="w-full text-sm">
                      <tbody>
                        <tr v-for="zone in base.zones" :key="zone.id">
                          <td colspan="3" class="py-0.5">
                            <label
                              :for="`zone-${zone.id}`"
                              class="app-check-row"
                            >
                              <Checkbox
                                v-model="guest.selectedZones"
                                name="zoning[]"
                                :input-id="`zone-${zone.id}`"
                                :value="zone.id"
                              />
                              <span class="min-w-0 flex-1 font-medium text-slate-700">
                                {{ zone.name_ar || zone.name_en }}
                              </span>
                              <ZoneSwatch :zone="zone" size="sm" shape="circle" />
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </Card>
              </div>
            </form>
          </fieldset>
        </div>

        <div v-if="isEdit" v-show="activeTab === 11">
          <div class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">اليوم / التوقيت</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">العملية</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">القائمة</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">البوابة</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">بواسطة</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="(movement, index) in guest.movements || []" :key="`movement-${index}`">
                  <td class="px-4 py-3 text-slate-600">{{ movement.mvdate }}<br>{{ movement.mvtime }}</td>
                  <td class="px-4 py-3">
                    <span class="emp-movement-type">
                      <span
                        v-if="isMovementCheckIn(movement.mvtype_raw || movement.mvtype)"
                        class="emp-movement-type__icon emp-movement-type__icon--in"
                        title="دخول"
                        aria-hidden="true"
                      >
                        <i class="pi pi-arrow-down-left" />
                      </span>
                      <span
                        v-else-if="isMovementCheckOut(movement.mvtype_raw || movement.mvtype)"
                        class="emp-movement-type__icon emp-movement-type__icon--out"
                        title="خروج"
                        aria-hidden="true"
                      >
                        <i class="pi pi-arrow-up-right" />
                      </span>
                      <span>{{ movementTypeLabel(movement) }}</span>
                    </span>
                  </td>
                  <td class="px-4 py-3">{{ movement.base_name_ar }}</td>
                  <td class="px-4 py-3">{{ movement.gate_name_ar }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ movementCreatedByName(movement) }}</td>
                </tr>
                <tr v-if="!(guest.movements || []).length">
                  <td colspan="5" class="px-4 py-8 text-center text-slate-400">لا توجد عمليات مسجلة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="isEdit" v-show="activeTab === 12">
          <form v-if="!readOnly" class="mb-4 flex gap-2" @submit.prevent="$emit('add-car')">
            <input
              v-model="car.plate_number"
              type="text"
              required
              class="emp-field-input flex-1"
              placeholder="النوع - اللون - رقم اللوحة"
            />
            <AppButton type="submit" class="shrink-0">إضافة سيارة</AppButton>
          </form>

          <div class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">اللوحة</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">الحالة</th>
                  <th v-if="!readOnly" class="px-4 py-3 text-right font-semibold text-slate-600">إجراء</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="item in guest.cars || []" :key="item.id">
                  <td class="px-4 py-3 font-medium">{{ item.plate_number }}</td>
                  <td class="px-4 py-3">
                    <Tag v-if="item.active == 0" severity="warning" value="غير معتمدة" />
                    <Tag v-else severity="success" value="معتمدة" />
                  </td>
                  <td v-if="!readOnly" class="px-4 py-3">
                    <AppButton
                      variant="ghost"
                      size="sm"
                      class="!h-8 !w-8 !p-0 text-red-600 hover:text-red-700"
                      aria-label="حذف"
                      @click="$emit('delete-car', item.id)"
                    >
                      <i class="pi pi-trash" aria-hidden="true" />
                    </AppButton>
                  </td>
                </tr>
                <tr v-if="!(guest.cars || []).length">
                  <td :colspan="readOnly ? 2 : 3" class="px-4 py-8 text-center text-slate-400">لا توجد سيارات مسجلة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="isEdit" v-show="activeTab === 13">
          <EmployeeBadgeLogTab :logs="guest.badge_logs || []" />
        </div>
      </div>

      <footer v-if="activeTab === 10 && !readOnly" class="flex-none border-t border-slate-200 bg-slate-50 px-5 py-4">
        <div class="flex justify-end gap-3">
          <AppButton variant="secondary" @click="$emit('update:open', false)">
            إلغاء
          </AppButton>
          <AppButton type="submit" :form="formId">
            {{ isCreate ? 'تسجيل' : 'حفظ التعديلات' }}
          </AppButton>
        </div>
      </footer>
    </div>
  </VueSidePanel>
</template>

<script>
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import Card from 'primevue/card';
import TreeSelect from 'primevue/treeselect';
import Tag from 'primevue/tag';
import EmployeeBadgeLogTab from './EmployeeBadgeLogTab.vue';
import ZoneSwatch from '../zones/ZoneSwatch.vue';
import AppButton from '../ui/AppButton.vue';
import {
  EMPLOYEE_DROPDOWN_CLASS,
  employeePhotoSrc,
  isMovementCheckIn,
  isMovementCheckOut,
  movementTypeLabel,
  movementCreatedByName,
} from '../../lib/employees/employeeFormUi';

const ALL_TABS = [
  { id: 10, label: 'البيانات الشخصية', icon: 'pi pi-user' },
  { id: 12, label: 'السيارات', icon: 'pi pi-car' },
  { id: 11, label: 'آخر العمليات', icon: 'pi pi-history' },
  { id: 13, label: 'بطاقة الدخول', icon: 'pi pi-id-card' },
];

export default {
  name: 'EmployeeDetailPanel',
  components: {
    Dropdown,
    Checkbox,
    Card,
    TreeSelect,
    Tag,
    EmployeeBadgeLogTab,
    ZoneSwatch,
    AppButton,
  },
  props: {
    open: { type: Boolean, default: false },
    mode: {
      type: String,
      default: 'edit',
      validator: (value) => ['create', 'edit'].includes(value),
    },
    activeTab: { type: Number, default: 10 },
    guest: { type: Object, required: true },
    car: { type: Object, required: true },
    gender: { type: Array, default: () => [] },
    nationalities: { type: Array, default: () => [] },
    departments: { type: Array, default: () => [] },
    ranks: { type: Array, default: () => [] },
    bases: { type: Array, default: () => [] },
    accountId: { type: [String, Number], default: '' },
    depId: { type: [String, Number], default: '' },
    readOnly: { type: Boolean, default: false },
    showPrintButton: { type: Boolean, default: false },
    canPrint: { type: Boolean, default: true },
    lockDepartment: { type: Boolean, default: false },
    companyGuest: { type: Boolean, default: false },
    fieldValidity: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: [
    'update:open',
    'update:activeTab',
    'save',
    'create',
    'file-change',
    'add-car',
    'delete-car',
    'print',
  ],
  data() {
    return {
      EMPLOYEE_DROPDOWN_CLASS,
    };
  },
  computed: {
    isCreate() {
      return this.mode === 'create';
    },
    isEdit() {
      return this.mode === 'edit';
    },
    formId() {
      return this.isCreate ? 'formguest' : 'formeditguest';
    },
    photoSrc() {
      return employeePhotoSrc(this.guest);
    },
    panelTitle() {
      if (this.isCreate) {
        return 'إضافة موظف';
      }
      return this.guest.fullname_ar || this.guest.fullname_en || 'بيانات الموظف';
    },
    panelSubtitle() {
      if (this.isCreate) {
        return 'أدخل بيانات الموظف وصلاحيات الدخول';
      }
      return this.readOnly ? 'عرض البيانات' : 'تعديل البيانات والصلاحيات';
    },
    visibleTabs() {
      return this.isCreate ? ALL_TABS.filter((tab) => tab.id === 10) : ALL_TABS;
    },
  },
  methods: {
    isMovementCheckIn,
    isMovementCheckOut,
    movementTypeLabel,
    movementCreatedByName,
    fieldClass(field, ltr = false) {
      const base = ltr ? 'emp-field-input emp-field-input--ltr' : 'emp-field-input';
      const invalid = this.fieldValidity[field] === false;
      return invalid ? `${base} border-red-500 focus:border-red-500` : base;
    },
    onSubmit() {
      this.$emit(this.isCreate ? 'create' : 'save');
    },
  },
};
</script>

<style scoped>
.emp-detail-tab {
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  color: #64748b !important;
}

.emp-detail-tab--active {
  border-color: var(--brand, #8b1538) !important;
  color: var(--brand, #8b1538) !important;
}

.emp-field-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.emp-field-input {
  width: 100%;
  height: 2.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  color: #0f172a;
  outline: none;
}

.emp-field-input:focus {
  border-color: var(--brand, #8b1538);
  box-shadow: 0 0 0 2px rgba(139, 21, 56, 0.12);
}

.emp-field-input--ltr {
  text-align: left;
}

.emp-base-card :deep(.p-card-body) {
  padding: 0.75rem;
}

.emp-base-card :deep(.p-card-title) {
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.emp-movement-type {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.emp-movement-type__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  font-size: 0.7rem;
  line-height: 1;
}

.emp-movement-type__icon--in {
  background: #ecfdf5;
  color: #059669;
}

.emp-movement-type__icon--out {
  background: #fff1f2;
  color: #e11d48;
}
</style>

<style>
.emp-detail-panel .p-dropdown,
.emp-detail-panel .p-treeselect {
  width: 100%;
}
</style>
