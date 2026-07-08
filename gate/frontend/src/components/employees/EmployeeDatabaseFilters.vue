<template>
  <div class="emp-db-filters" dir="rtl">
    <section class="emp-db-filters__panel">
      <h2 class="emp-db-filters__title">
        <i class="pi pi-filter" aria-hidden="true" />
        بحث وتصفية
      </h2>

      <div>
        <AppTableFilters :active="hasActiveFilters" @clear="$emit('reset-filter')">
          <div class="md:col-span-2">
            <label class="emp-db-label" for="emp-filter-military">الرقم العسكري</label>
            <input
              id="emp-filter-military"
              :value="militaryNumber"
              type="search"
              class="emp-db-input"
              placeholder="أدخل الرقم العسكري"
              @input="$emit('update:militaryNumber', $event.target.value)"
            />
          </div>

          <div class="md:col-span-2">
            <label class="emp-db-label" for="emp-filter-name">الاسم</label>
            <input
              id="emp-filter-name"
              :value="fullnameAr"
              type="search"
              class="emp-db-input"
              placeholder="الاسم بالعربية"
              @input="$emit('update:fullnameAr', $event.target.value)"
            />
          </div>

          <div class="md:col-span-2">
            <label class="emp-db-label" for="emp-filter-civil-plate">رقم اللوحة</label>
            <input
              id="emp-filter-civil-plate"
              :value="plateNumber"
              type="search"
              class="emp-db-input"
              placeholder="رقم اللوحة المدنية"
              @input="$emit('update:plateNumber', $event.target.value)"
            />
          </div>

          <div class="md:col-span-2">
            <label class="emp-db-label" for="emp-filter-status">الحالة</label>
            <select
              id="emp-filter-status"
              :value="statusId"
              class="emp-db-input emp-db-input--select"
              @change="onStatusChange($event.target.value)"
            >
              <option v-for="option in statusOptions" :key="String(option.id)" :value="option.id">
                {{ option.label_ar }}
              </option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="emp-db-label" for="emp-filter-base">القواعد</label>
            <select
              id="emp-filter-base"
              :value="baseId"
              class="emp-db-input emp-db-input--select"
              @change="onBaseChange($event.target.value)"
            >
              <option value="">الكل</option>
              <option v-for="base in bases" :key="base.id" :value="base.id">
                {{ base.name_ar || base.name_en }}
              </option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="emp-db-label" for="emp-filter-zone">المناطق</label>
            <select
              id="emp-filter-zone"
              :value="zoneId"
              class="emp-db-input emp-db-input--select"
              @change="$emit('update:zoneId', $event.target.value)"
            >
              <option value="">الكل</option>
              <option v-for="zone in zoneOptions" :key="zone.id" :value="zone.id">
                {{ zone.name_ar || zone.name_en }}
              </option>
            </select>
          </div>
        </AppTableFilters>
      </div>
    </section>

    <section v-if="!readOnly && selectedCount > 0" class="emp-bulk-bar" aria-live="polite">
      <div class="emp-bulk-bar__info">
        <span class="emp-bulk-bar__badge">{{ selectedCount }}</span>
        <div>
          <p class="emp-bulk-bar__title">إجراءات جماعية</p>
          <p class="emp-bulk-bar__hint">تم تحديد {{ selectedCountLabel }} — اختر الإجراء المطلوب</p>
        </div>
      </div>

      <div class="emp-bulk-bar__actions">
        <AppButton variant="secondary" size="sm" @click="$emit('clear-selection')">
          <i class="pi pi-times" aria-hidden="true" />
          إلغاء التحديد
        </AppButton>
        <AppButton variant="danger" size="sm" @click="$emit('delete-selected')">
          <i class="pi pi-trash" aria-hidden="true" />
          حذف المحدد
        </AppButton>
        <AppButton v-if="bulkActions.canApprove" size="sm" @click="$emit('approve', 1)">
          <i class="pi pi-check" aria-hidden="true" />
          اعتماد المحدد
        </AppButton>
        <AppButton v-if="bulkActions.canUnapprove" size="sm" @click="$emit('approve', 0)">
          <i class="pi pi-replay" aria-hidden="true" />
          إلغاء الاعتماد
        </AppButton>
        <AppButton v-if="bulkActions.canPrint" variant="accent" size="sm" @click="$emit('bulk-print')">
          <i class="pi pi-print" aria-hidden="true" />
          طباعة البطاقة
        </AppButton>
        <AppButton v-if="bulkActions.canCollect" size="sm" @click="$emit('approve', 3)">
          <i class="pi pi-thumbs-up" aria-hidden="true" />
          تأكيد الاستلام
        </AppButton>
      </div>
    </section>
  </div>
</template>

<script>
import AppButton from '../ui/AppButton.vue';
import AppTableFilters from '../ui/AppTableFilters.vue';
import { EMPLOYEE_STATUS_FILTER_OPTIONS, employeeCountLabel } from '../../lib/employees/employeeFormUi';

export default {
  name: 'EmployeeDatabaseFilters',
  components: { AppButton, AppTableFilters },
  props: {
    militaryNumber: { type: String, default: '' },
    fullnameAr: { type: String, default: '' },
    plateNumber: { type: String, default: '' },
    statusId: { type: [String, Number], default: '' },
    baseId: { type: [String, Number], default: '' },
    zoneId: { type: [String, Number], default: '' },
    bases: { type: Array, default: () => [] },
    hasActiveFilters: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    selectedCount: { type: Number, default: 0 },
    bulkActions: {
      type: Object,
      default: () => ({
        canApprove: false,
        canUnapprove: false,
        canPrint: false,
        canCollect: false,
      }),
    },
  },
  emits: [
    'update:militaryNumber',
    'update:fullnameAr',
    'update:plateNumber',
    'update:statusId',
    'update:baseId',
    'update:zoneId',
    'reset-filter',
    'clear-selection',
    'delete-selected',
    'approve',
    'bulk-print',
  ],
  computed: {
    statusOptions() {
      return EMPLOYEE_STATUS_FILTER_OPTIONS;
    },
    selectedCountLabel() {
      return employeeCountLabel(this.selectedCount);
    },
    zoneOptions() {
      if (!this.baseId) {
        return this.bases.flatMap((base) => base.zones || []);
      }

      const base = this.bases.find((item) => String(item.id) === String(this.baseId));
      return base?.zones || [];
    },
  },
  methods: {
    onStatusChange(value) {
      this.$emit('update:statusId', value);
    },
    onBaseChange(value) {
      this.$emit('update:baseId', value);
      this.$emit('update:zoneId', '');
    },
  },
};
</script>

<style scoped>
.emp-db-filters__panel {
  margin-bottom: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 1rem 1.25rem;
}

.emp-db-filters__title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.emp-db-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #475569;
}

.emp-db-input {
  display: flex;
  height: 2.5rem;
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding-inline: 0.75rem;
  font-size: 0.875rem;
  color: #0f172a;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.emp-db-input:focus {
  border-color: var(--color-brand, var(--brand, #8b1538));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand, var(--brand, #8b1538)) 20%, transparent);
}

.emp-db-input--select {
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

.emp-bulk-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  margin-top: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.emp-bulk-bar__info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.emp-bulk-bar__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
}

.emp-bulk-bar__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e3a8a;
}

.emp-bulk-bar__hint {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: #475569;
}

.emp-bulk-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
