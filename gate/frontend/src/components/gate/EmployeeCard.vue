<template>
  <div v-if="visible" class="flex flex-col gap-3">
    <div
      v-for="alert in displayAlerts"
      :key="alert.type + alert.message"
      class="rounded-xl px-3 py-2 text-sm font-semibold"
      :class="alertClass(alert.severity)"
      role="alert"
    >
      <i v-if="alert.severity === 'danger'" class="inline-block ms-1" aria-hidden="true">⚠</i>
      {{ alert.message }}
    </div>

    <div
      class="rounded-[18px] border-2 p-5 transition-all"
      :class="cardHighlightClass"
    >
      <div class="flex items-start gap-4">
        <div class="min-w-0 flex-1">
          <h3 class="mb-2 text-lg font-bold leading-snug text-[#002366]">
            {{ displayName }}
          </h3>
          <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[0.82em]">
            <p class="text-slate-500">
              الرقم العسكري:
              <strong class="text-slate-800">{{ displayMilitaryNumber || '—' }}</strong>
            </p>
            <!-- <p class="text-slate-500">
              الباركود:
              <strong class="font-mono text-slate-800" dir="ltr">{{ displayBarcode || '—' }}</strong>
            </p> -->
            <p class="text-slate-500">
              الرتبة:
              <strong class="text-slate-800">{{ displayRank || '—' }}</strong>
            </p>
            <p class="text-slate-500">
              فئة الرتبة:
              <strong class="text-slate-800">{{ displayRankCategory || '—' }}</strong>
            </p>
            <p class="col-span-2 text-slate-500">
              القسم:
              <strong class="text-slate-800">{{ displayDepartment || '—' }}</strong>
            </p>
          </div>
        </div>

        <div class="shrink-0 text-center">
          <img
            v-if="!photoFailed && data.photo"
            :src="photoSrc"
            class="h-[135px] w-[110px] rounded-[14px] border-[3px] border-white object-cover shadow-md"
            alt=""
            @error="onPhotoError"
          >
          <div
            v-else
            class="flex h-[135px] w-[110px] items-center justify-center rounded-[14px] bg-gradient-to-br from-slate-200 to-slate-100 text-4xl text-slate-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p v-if="lastMovementLabel" class="mt-2 flex items-center justify-center gap-1 text-[0.78em] text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ lastMovementLabel }}
          </p>
        </div>
      </div>

      <div v-if="manualMode" class="mt-3 grid grid-cols-2 gap-2">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700">تاريخ الحركة</span>
          <input
            :value="mvdate"
            type="date"
            :max="maxDate"
            class="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
            dir="ltr"
            @input="$emit('update:mvdate', $event.target.value)"
          >
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700">وقت الحركة</span>
          <input
            :value="mvtime"
            type="time"
            step="1"
            class="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm"
            dir="ltr"
            @input="$emit('update:mvtime', $event.target.value)"
          >
        </label>
      </div>
    </div>

    <div v-if="checked" class="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
      <p class="font-bold">تم التسجيل بنجاح</p>
    </div>

    <template v-if="manualMode && showSubmit && !checked">
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting && submittingType !== 'Check-In'"
          :aria-busy="submittingType === 'Check-In'"
          @click="$emit('submit', 'Check-In')"
        >
          <svg
            v-if="submittingType === 'Check-In'"
            class="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          تأكيد الدخول
        </button>
        <button
          type="button"
          class="flex h-14 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-base font-bold text-white shadow-md transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-200 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting && submittingType !== 'Check-Out'"
          :aria-busy="submittingType === 'Check-Out'"
          @click="$emit('submit', 'Check-Out')"
        >
          <svg
            v-if="submittingType === 'Check-Out'"
            class="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          تأكيد الخروج
        </button>
      </div>
      <div class="text-center">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          @click="$emit('cancel')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          إلغاء
        </button>
      </div>
    </template>
  </div>

  <div
    v-else
    class="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-slate-400"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
    <p class="text-sm">امسح البطاقة أو ابحث بالرقم العسكري</p>
  </div>
</template>

<script>
export default {
  name: 'EmployeeCard',
  props: {
    visible: { type: Boolean, default: false },
    data: { type: Object, default: () => ({}) },
    alerts: { type: Array, default: () => [] },
    expiry: { type: Boolean, default: false },
    checked: { type: Boolean, default: false },
    showSubmit: { type: Boolean, default: false },
    submitting: { type: Boolean, default: false },
    submittingType: { type: String, default: null },
    manualMode: { type: Boolean, default: false },
    mvdate: { type: String, default: '' },
    mvtime: { type: String, default: '' },
    maxDate: { type: String, default: '' },
  },
  emits: ['submit', 'cancel', 'update:mvdate', 'update:mvtime'],
  data() {
    return {
      photoFailed: false,
    };
  },
  computed: {
    displayAlerts() {
      if (this.alerts?.length) {
        return this.alerts;
      }
      const fallback = [];
      if (this.expiry && this.data.expiry_date) {
        fallback.push({
          type: 'expired',
          severity: 'danger',
          message: `بطاقة الدخول منتهية الصلاحية — تاريخ الانتهاء: ${this.data.expiry_date}`,
        });
      }
      if (this.data.remarks?.trim()) {
        fallback.push({
          type: 'remark',
          severity: 'warning',
          message: this.data.remarks.trim(),
        });
      }
      return fallback;
    },
    cardHighlightClass() {
      if (this.expiry) {
        return 'border-red-300 bg-red-50/40';
      }
      return 'border-sky-300 bg-sky-50/60';
    },
    displayName() {
      return this.data.fullname_ar || this.data.fullname_en || this.data.empl || '—';
    },
    displayRank() {
      return this.data.rank || this.data.rank_name_ar || '';
    },
    displayRankCategory() {
      return this.data.rank_category || '';
    },
    displayMilitaryNumber() {
      return this.data.military_number || '';
    },
    displayBarcode() {
      return this.data.qrcode || this.data.barcode || '';
    },
    displayDepartment() {
      return this.data.department || this.data.company_name || '';
    },
    lastMovementLabel() {
      if (this.data.last_movement_type === 'in') {
        return 'آخر حركة: دخول';
      }
      if (this.data.last_movement_type === 'out') {
        return 'آخر حركة: خروج';
      }
      return '';
    },
    photoSrc() {
      if (this.photoFailed || !this.data.photo) {
        return '/uploads/nopic.png';
      }
      return this.data.photo.startsWith('/') ? this.data.photo : `/${this.data.photo}`;
    },
  },
  watch: {
    data: {
      handler() {
        this.photoFailed = false;
      },
      deep: true,
    },
  },
  methods: {
    alertClass(severity) {
      if (severity === 'danger') {
        return 'border border-red-200 bg-red-50 text-red-800';
      }
      if (severity === 'warning') {
        return 'border border-amber-200 bg-amber-50 text-amber-900';
      }
      return 'border border-sky-200 bg-sky-50 text-sky-900';
    },
    onPhotoError() {
      this.photoFailed = true;
    },
  },
};
</script>
