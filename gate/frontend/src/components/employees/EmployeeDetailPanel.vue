<template>
  <VueSidePanel
    :model-value="open"
    lock-scroll
    hide-close-btn
    width="680px"
    @update:model-value="$emit('update:open', $event)"
  >
    <div class="flex h-full flex-col bg-white" dir="rtl">
      <header class="flex-none border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-lg font-semibold text-slate-800">
              {{ guest.fullname_ar || guest.fullname_en || 'بيانات الموظف' }}
            </h2>
            <p class="mt-0.5 text-sm text-slate-500">{{ readOnly ? 'عرض البيانات' : 'تعديل البيانات والصلاحيات' }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              v-if="showPrintButton && canPrint"
              type="button"
              class="emp-panel-btn emp-panel-btn--print"
              @click="$emit('print')"
            >
              <i class="pi pi-print" aria-hidden="true" />
              طباعة البطاقة
            </button>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="إغلاق"
              @click="$emit('update:open', false)"
            >
              <i class="pi pi-times text-lg" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav class="mt-4 flex gap-1 border-b border-slate-200" aria-label="أقسام الموظف">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="emp-detail-tab"
            :class="{ 'emp-detail-tab--active': activeTab === tab.id }"
            @click="$emit('update:activeTab', tab.id)"
          >
            <i :class="tab.icon" aria-hidden="true" />
            {{ tab.label }}
          </button>
        </nav>
      </header>

      <div class="flex-1 overflow-y-auto px-5 py-5">
        <div v-show="activeTab === 10">
          <fieldset :disabled="readOnly" class="min-w-0 border-0 p-0">
          <form id="formeditguest" novalidate @submit.prevent="$emit('save')">
            <div class="mb-5 flex items-center gap-4">
              <img
                v-if="!guest.photo"
                src="/uploads/nopic.png"
                alt=""
                class="h-20 w-20 rounded-full border border-slate-200 object-cover"
              />
              <img
                v-else
                :src="`/${guest.photo}`"
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
                  @change="$emit('file-change', 'photo')"
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
                <input v-model="guest.bloodtype" type="text" name="bloodtype" class="emp-field-input" placeholder="مثال: +B" />
              </div>

              <div class="md:col-span-2">
                <label class="emp-field-label">الاسم الكامل</label>
                <input v-model="guest.fullname_ar" type="text" name="fullname_ar" class="emp-field-input" placeholder="الاسم بالعربية" />
              </div>

              <div class="md:col-span-2">
                <label class="emp-field-label">الاسم بالإنجليزية</label>
                <input
                  v-model="guest.fullname_en"
                  type="text"
                  name="fullname_en"
                  dir="ltr"
                  class="emp-field-input emp-field-input--ltr"
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
                  class="emp-field-input emp-field-input--ltr"
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
                  class="emp-field-input emp-field-input--ltr"
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
                <input v-model="guest.Job_En" type="text" name="Job_En" class="emp-field-input" placeholder="المهنة" />
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
                <input v-model="guest.expiry_date" type="date" name="expiry_date" class="emp-field-input" />
              </div>

              <div class="md:col-span-2">
                <label class="emp-field-label">ملاحظات</label>
                <input v-model="guest.remarks" type="text" name="remarks" class="emp-field-input" placeholder="ملاحظات إضافية" />
              </div>
            </div>

            <input type="hidden" name="created_by" :value="userName">
            <input type="hidden" name="id" :value="guest.id">
            <input type="hidden" name="dep_parent_id" :value="guest.dep_parent_id || depId">

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
                        <td class="py-2 pe-2">
                          <Checkbox
                            v-model="guest.selectedZones"
                            name="zoning[]"
                            :input-id="`zone-${zone.id}`"
                            :value="zone.id"
                          />
                        </td>
                        <td class="py-2 font-medium text-slate-700">{{ zone.name_ar || zone.name_en }}</td>
                        <td class="py-2">
                          <ZoneSwatch :zone="zone" size="sm" shape="circle" />
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

        <div v-show="activeTab === 11">
          <div class="overflow-x-auto rounded-lg border border-slate-200">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">اليوم / التوقيت</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">العملية</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">القائمة</th>
                  <th class="px-4 py-3 text-right font-semibold text-slate-600">البوابة</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="(movement, index) in guest.movements || []" :key="`movement-${index}`">
                  <td class="px-4 py-3 text-slate-600">{{ movement.mvdate }}<br>{{ movement.mvtime }}</td>
                  <td class="px-4 py-3">{{ movement.mvtype }}</td>
                  <td class="px-4 py-3">{{ movement.base_name_ar }}</td>
                  <td class="px-4 py-3">{{ movement.gate_name_ar }}</td>
                </tr>
                <tr v-if="!(guest.movements || []).length">
                  <td colspan="4" class="px-4 py-8 text-center text-slate-400">لا توجد عمليات مسجلة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-show="activeTab === 12">
          <form v-if="!readOnly" class="mb-4 flex gap-2" @submit.prevent="$emit('add-car')">
            <input
              v-model="car.plate_number"
              type="text"
              required
              class="emp-field-input flex-1"
              placeholder="النوع - اللون - رقم اللوحة"
            />
            <button type="submit" class="emp-panel-btn emp-panel-btn--primary shrink-0">إضافة سيارة</button>
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
                    <button type="button" class="text-red-600 hover:text-red-700" @click="$emit('delete-car', item.id)">
                      <i class="pi pi-trash" aria-hidden="true" />
                      <span class="sr-only">حذف</span>
                    </button>
                  </td>
                </tr>
                <tr v-if="!(guest.cars || []).length">
                  <td :colspan="readOnly ? 2 : 3" class="px-4 py-8 text-center text-slate-400">لا توجد سيارات مسجلة</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-show="activeTab === 13">
          <EmployeeBadgeLogTab :logs="guest.badge_logs || []" />
        </div>
      </div>

      <footer v-if="activeTab === 10 && !readOnly" class="flex-none border-t border-slate-200 bg-slate-50 px-5 py-4">
        <div class="flex justify-end gap-3">
          <button type="button" class="emp-panel-btn emp-panel-btn--ghost" @click="$emit('update:open', false)">
            إلغاء
          </button>
          <button type="submit" form="formeditguest" class="emp-panel-btn emp-panel-btn--primary">
            حفظ التعديلات
          </button>
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
import {
  EMPLOYEE_DROPDOWN_CLASS,
} from '../../lib/employees/employeeFormUi';

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
  },
  props: {
    open: { type: Boolean, default: false },
    activeTab: { type: Number, default: 10 },
    guest: { type: Object, required: true },
    car: { type: Object, required: true },
    gender: { type: Array, default: () => [] },
    nationalities: { type: Array, default: () => [] },
    departments: { type: Array, default: () => [] },
    ranks: { type: Array, default: () => [] },
    bases: { type: Array, default: () => [] },
    userName: { type: String, default: '' },
    depId: { type: [String, Number], default: '' },
    readOnly: { type: Boolean, default: false },
    showPrintButton: { type: Boolean, default: false },
    canPrint: { type: Boolean, default: true },
    lockDepartment: { type: Boolean, default: false },
  },
  emits: [
    'update:open',
    'update:activeTab',
    'save',
    'file-change',
    'add-car',
    'delete-car',
    'print',
  ],
  data() {
    return {
      EMPLOYEE_DROPDOWN_CLASS,
      tabs: [
        { id: 10, label: 'البيانات الشخصية', icon: 'pi pi-user' },
        { id: 12, label: 'السيارات', icon: 'pi pi-car' },
        { id: 11, label: 'آخر العمليات', icon: 'pi pi-history' },
        { id: 13, label: 'بطاقة الدخول', icon: 'pi pi-id-card' },
      ],
    };
  },
};
</script>

<style scoped>
.emp-detail-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-bottom: 2px solid transparent;
  padding: 0.65rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
}

.emp-detail-tab--active {
  border-color: var(--brand, #8b1538);
  color: var(--brand, #8b1538);
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

.emp-panel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.875rem;
  font-weight: 600;
}

.emp-panel-btn--primary {
  background: var(--brand, #8b1538);
  color: #fff;
}

.emp-panel-btn--ghost {
  background: #fff;
  border-color: #e2e8f0;
  color: #475569;
}

.emp-panel-btn--print {
  gap: 0.35rem;
  background: #f59e0b;
  color: #fff;
}

.emp-panel-btn--print:hover {
  background: #d97706;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

<style>
.emp-detail-panel .p-dropdown,
.emp-detail-panel .p-treeselect {
  width: 100%;
}
</style>
