<template>
  <div class="emp-db-filters" dir="rtl">
    <section class="emp-db-filters__panel">
      <h2 class="emp-db-filters__title">
        <i class="pi pi-search" aria-hidden="true" />
        بحث وتصفية
      </h2>

      <form class="grid grid-cols-1 gap-3 md:grid-cols-12" @submit.prevent="$emit('filter')">
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
            class="emp-db-input"
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
            class="emp-db-input"
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
            class="emp-db-input"
            @change="$emit('update:zoneId', $event.target.value)"
          >
            <option value="">الكل</option>
            <option v-for="zone in zoneOptions" :key="zone.id" :value="zone.id">
              {{ zone.name_ar || zone.name_en }}
            </option>
          </select>
        </div>

        <div class="md:col-span-12 flex items-end justify-end gap-2">
          <button v-if="!isfiltered" type="submit" class="emp-db-btn emp-db-btn--primary">
            <i class="pi pi-search ms-1" aria-hidden="true" />
            بحث
          </button>
          <button v-else type="button" class="emp-db-btn emp-db-btn--ghost" @click="$emit('reset-filter')">
            <i class="pi pi-times ms-1" aria-hidden="true" />
            مسح الفلاتر
          </button>
        </div>
      </form>
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
        <button type="button" class="emp-db-btn emp-db-btn--ghost" @click="$emit('clear-selection')">
          <i class="pi pi-times ms-1" aria-hidden="true" />
          إلغاء التحديد
        </button>
        <button type="button" class="emp-db-btn emp-db-btn--danger" @click="$emit('delete-selected')">
          <i class="pi pi-trash ms-1" aria-hidden="true" />
          حذف المحدد
        </button>
        <button v-if="bulkActions.canApprove" type="button" class="emp-db-btn emp-db-btn--success" @click="$emit('approve', 1)">
          <i class="pi pi-check ms-1" aria-hidden="true" />
          اعتماد المحدد
        </button>
        <button v-if="bulkActions.canUnapprove" type="button" class="emp-db-btn emp-db-btn--success" @click="$emit('approve', 0)">
          <i class="pi pi-replay ms-1" aria-hidden="true" />
          إلغاء الاعتماد
        </button>
        <button v-if="bulkActions.canPrint" type="button" class="emp-db-btn emp-db-btn--warn" @click="$emit('bulk-print')">
          <i class="pi pi-print ms-1" aria-hidden="true" />
          طباعة البطاقة
        </button>
        <button v-if="bulkActions.canCollect" type="button" class="emp-db-btn emp-db-btn--primary" @click="$emit('approve', 3)">
          <i class="pi pi-thumbs-up ms-1" aria-hidden="true" />
          تأكيد الاستلام
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import { EMPLOYEE_STATUS_FILTER_OPTIONS, employeeCountLabel } from '../../lib/employees/employeeFormUi';

export default {
  name: 'EmployeeDatabaseFilters',
  props: {
    militaryNumber: { type: String, default: '' },
    fullnameAr: { type: String, default: '' },
    plateNumber: { type: String, default: '' },
    statusId: { type: [String, Number], default: '' },
    baseId: { type: [String, Number], default: '' },
    zoneId: { type: [String, Number], default: '' },
    bases: { type: Array, default: () => [] },
    isfiltered: { type: Boolean, default: false },
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
    'filter',
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
      this.$emit('filter');
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
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 1rem 1.25rem;
}

.emp-db-filters__title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.85rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #334155;
}

.emp-db-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.emp-db-input {
  width: 100%;
  height: 2.35rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0 0.75rem;
  font-size: 0.8125rem;
  color: #0f172a;
  outline: none;
}

.emp-db-input:focus {
  border-color: var(--brand, #8b1538);
  box-shadow: 0 0 0 2px rgba(139, 21, 56, 0.12);
}

.emp-db-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.35rem;
  padding: 0 0.85rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.emp-db-btn--primary {
  background: var(--brand, #8b1538);
  color: #fff;
}

.emp-db-btn--primary:hover {
  filter: brightness(0.95);
}

.emp-db-btn--ghost {
  background: #fff;
  border-color: #e2e8f0;
  color: #475569;
}

.emp-db-btn--success {
  background: #059669;
  color: #fff;
}

.emp-db-btn--danger {
  background: #dc2626;
  color: #fff;
}

.emp-db-btn--warn {
  background: #d97706;
  color: #fff;
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
