<template>
  <VueSidePanel
    :model-value="open"
    lock-scroll
    hide-close-btn
    width="420px"
    @update:model-value="$emit('update:open', $event)"
  >
    <div class="flex h-full flex-col bg-white px-4 py-4 sm:px-5" dir="rtl">
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-800">تحميل بيانات الموظفين</h2>
          <p class="mt-1 text-sm text-slate-500">ارفع ملف CSV وطابق الأعمدة</p>
        </div>
        <AppButton variant="ghost" size="sm" class="!h-9 !w-9 !p-0" aria-label="إغلاق" @click="$emit('update:open', false)">
          <i class="pi pi-times text-lg" aria-hidden="true" />
        </AppButton>
      </div>

      <vue-csv-import
        :fields="importFields"
      >
        <vue-csv-toggle-headers />
        <vue-csv-input name="file" />
        <vue-csv-map :auto-match="true" />
        <div class="mt-6">
          <vue-csv-submit
            :url="importUrl"
            :config="{}"
            class="emp-import-submit"
            @click="$emit('imported')"
          >
            <AppButton type="button" class="w-full">
              <i class="pi pi-upload" aria-hidden="true" />
              استيراد الملف
            </AppButton>
          </vue-csv-submit>
        </div>
      </vue-csv-import>
    </div>
  </VueSidePanel>
</template>

<script>
import {
  VueCsvToggleHeaders,
  VueCsvSubmit,
  VueCsvMap,
  VueCsvInput,
  VueCsvImport,
} from 'vue-csv-import';
import AppButton from '../ui/AppButton.vue';

export default {
  name: 'EmployeeImportPanel',
  components: {
    VueCsvToggleHeaders,
    VueCsvSubmit,
    VueCsvMap,
    VueCsvInput,
    VueCsvImport,
    AppButton,
  },
  props: {
    open: { type: Boolean, default: false },
    depId: { type: [String, Number], default: '' },
    accountId: { type: [String, Number], default: '' },
  },
  emits: ['update:open', 'imported'],
  computed: {
    importFields() {
      return {
        gender_id: { required: true, label: 'Gender' },
        Job_En: { required: false, label: 'مهنة' },
        fullname_en: { required: false, label: 'Full Name' },
        fullname_ar: { required: true, label: 'الاسم الكامل' },
        qrcode: { required: true, label: 'Registration Number' },
      };
    },
    importUrl() {
      return `/api/employees/import?dep_id=${this.depId}&created_by_id=${encodeURIComponent(this.accountId ?? '')}`;
    },
  },
};
</script>

<style scoped>
.emp-import-submit {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
}
</style>
