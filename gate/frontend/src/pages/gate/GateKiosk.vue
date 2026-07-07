<template>
  <div class="gate-kiosk flex h-dvh flex-col overflow-hidden" dir="rtl">
  <div v-if="gate.offline || gate.pendingCount > 0" class="shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
    <span v-if="gate.offline">وضع عدم الاتصال — سيتم مزامنة التسجيلات عند عودة الشبكة.</span>
    <span v-else>تسجيلات بانتظار المزامنة: {{ gate.pendingCount }}</span>
  </div>

  <div v-if="directorySyncing && !directoryReady" class="shrink-0 border-b border-sky-200 bg-sky-50 px-4 py-1.5 text-center text-xs text-sky-900">
    جاري تحميل قائمة الموظفين...
  </div>

  <header class="gate-kiosk__header shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
      <AppButton variant="secondary" size="sm" @click="logout">
        خروج
      </AppButton>
      <div class="text-center">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">بوابة الدخول</p>
        <p class="text-base font-bold text-slate-800">{{ base || 'Gate' }}</p>
      </div>
      <div class="min-w-[4.5rem] text-left">
        <p class="text-xs text-slate-500">مرحباً</p>
        <p class="truncate text-sm font-bold text-slate-800">{{ username }}</p>
      </div>
    </div>
  </header>

  <main class="gate-kiosk__main flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 lg:p-8 xl:p-10">
    <div class="grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start xl:gap-8">
    <!-- Left: registration controls -->
    <div class="flex flex-col">
      <div class="flex flex-col overflow-visible rounded-2xl border border-slate-200/90 bg-white p-4 shadow-lg shadow-slate-300/30 lg:p-5">
      <div class="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-brand">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-slate-800">تسجيل الحركة</h1>
      </div>

      <!-- Base + Gate -->
      <div class="mb-3 grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            القاعدة
          </span>
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-700">
            {{ base || '...' }}
          </div>
        </label>
        <label class="block">
          <span class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
            البوابة
          </span>
          <div class="relative z-20 overflow-visible">
            <select
              v-model.number="formData.gate_id"
              class="gate-select relative z-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 ps-3 pe-10 text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted disabled:cursor-not-allowed disabled:bg-slate-100"
              :disabled="!gates.length"
              @change="syncManuelFields">
              <option v-if="!gates.length" disabled :value="null">لا توجد بوابات</option>
              <option v-for="g in gates" :key="g.id" :value="Number(g.id)">{{ g.name_ar }}</option>
            </select>
            <span class="pointer-events-none absolute inset-y-0 end-3 flex items-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </label>
      </div>

      <!-- Entry / Exit -->
      <div class="mb-3">
        <p class="mb-2 text-sm font-semibold text-slate-700">وضع التسجيل</p>
        <div class="flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition"
            :class="formData.mvtype === 'Check-In' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'"
            @click="setMovementType('Check-In')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4" /></svg>
            دخول
          </button>
          <button
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition"
            :class="formData.mvtype === 'Check-Out' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'"
            @click="setMovementType('Check-Out')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4" /></svg>
            خروج
          </button>
        </div>
      </div>

      <!-- Barcode / Military toggle -->
      <div class="mb-4 flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition"
          :class="inputMode === 'barcode' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'"
          @click="setInputMode('barcode')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            باركود
        </button>
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition"
          :class="inputMode === 'military' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'"
          @click="setInputMode('military')"
        >
          <span class="font-mono text-base">#</span>
          رقم عسكري
        </button>
      </div>

      <!-- Barcode scan zone (display only) -->
      <div
        v-if="inputMode === 'barcode'"
        class="mb-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition"
        :class="scanFocus === 'driver' ? 'border-brand bg-brand-muted/30' : 'border-slate-300 bg-slate-50'"
        @click="focusDriverScan"
      >
        <div class="mx-auto mb-3 flex h-6 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
        </div>
        <p class="text-sm font-medium text-slate-600">وجّه القارئ للمسح — لا يمكن الكتابة يدوياً</p>
        <p v-if="formData.qrcode" class="mt-1 font-mono text-xs text-slate-400">{{ maskedQrcode }}</p>
      </div>

      <!-- Military number search -->
      <div v-else-if="inputMode === 'military'" ref="militarySearchWrap" class="relative z-30 mb-2 overflow-visible">
        <label class="mb-1.5 block text-sm font-semibold text-slate-700">الرقم العسكري</label>
        <div class="relative">
          <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            ref="militaryInput"
            v-model="militarySearch"
            type="text"
            class="relative z-10 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
            placeholder="ابحث بالرقم العسكري أو الاسم..."
            autocomplete="off"
            @input="onMilitaryInput"
            @keydown="onMilitaryKeydown"
            @focus="onMilitaryFocus"
          >
          <button
            v-if="militarySearch"
            type="button"
            class="absolute inset-y-0 left-2 z-20 flex w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="مسح البحث"
            @mousedown.prevent="clearMilitarySearch"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <MilitarySearchPicker
          :open="militaryPickerOpen && militarySearch.trim().length >= 2"
          :loading="militarySearchLoading"
          :results="filteredGuests"
          :query="militarySearch.trim()"
          :anchor-rect="pickerAnchorRect"
          hint="نتائج البحث بالرقم العسكري أو الاسم"
          @select="selectGuest"
        />
      </div>

      <!-- Optional vehicle plate (both tabs) -->
      <div class="mb-3">
        <label class="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
          رقم السيارة
          <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">اختياري</span>
        </label>
        <div class="relative">
          <input
            ref="plateInput"
            v-model="formData.platenumber"
            type="text"
            class="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-base transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
            :class="[
              scanFocus === 'plate' ? 'border-brand ring-2 ring-brand-muted' : '',
              inputMode === 'barcode' ? 'cursor-pointer bg-slate-50' : 'bg-white'
            ]"
            :readonly="inputMode === 'barcode'"
            :placeholder="inputMode === 'barcode' ? 'امسح ملصق السيارة' : 'اكتب رقم السيارة'"
            autocomplete="off"
            maxlength="20"
            @input="onPlateInput"
            @focus="onPlateFocus"
            @blur="onPlateBlur"
            @keydown="onPlateKeydown"
          >
          <button
            v-if="formData.platenumber"
            type="button"
            class="absolute inset-y-0 left-2 flex w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="مسح رقم السيارة"
            @mousedown.prevent="clearRegistrationPlate(true)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
      </div>

      <p v-if="inputMode === 'barcode'" class="mb-2 text-center text-xs font-medium text-brand">
        القارئ يستمع إلى: {{ scanFocus === 'plate' ? 'رقم السيارة' : 'بطاقة السائق' }}
      </p>

      <!-- Hidden scanner input — always mounted for focus after auto-switch -->
      <input
        ref="scannerInput"
        v-model="scannerBuffer"
        type="text"
        class="sr-only"
        tabindex="-1"
        autocomplete="off"
        @keyup="onScannerKeyup"
      >

      <div v-if="error" class="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
        <p class="font-bold">خطأ</p>
        <p>لم يتم العثور على بيانات. يرجى مراجعة مكتب التصاريح.</p>
      </div>
      </div>
    </div>

    <!-- Right: employee preview + plate -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-col overflow-visible rounded-2xl border border-slate-200/90 bg-white p-4 shadow-lg shadow-slate-300/30 lg:p-5">
        <div>
          <EmployeeCard
            :visible="result"
            :data="data"
            :alerts="employeeAlerts"
            :expiry="expiry"
            :checked="checked"
            :show-submit="shouldShowSubmitButton"
            :manual-mode="inputMode === 'military'"
            :mvdate="formDataManuel.mvdate"
            :mvtime="formDataManuel.mvtime"
            :max-date="getCurrentDate()"
            @update:mvdate="formDataManuel.mvdate = $event"
            @update:mvtime="formDataManuel.mvtime = $event"
            @submit="submitManual"
            @cancel="onManualCancel"
          />
        </div>
      </div>

      <div class="shrink-0 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-lg shadow-slate-300/30">
        <h2 class="mb-2 text-xs font-bold text-slate-700">البحث بالسيارة العسكرية</h2>
        <div class="flex gap-2">
          <input
            ref="plateSearchInput"
            v-model="plate"
            type="text"
            maxlength="20"
            placeholder="رقم السيارة العسكرية"
            class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            @keyup.enter="goToPlateSearch"
          >
          <AppButton size="sm" @click="goToPlateSearch">
            بحث
          </AppButton>
        </div>
      </div>
    </div>
    </div>
  </main>

  <Transition name="toast-fade">
    <div
      v-if="toast.visible"
      class="gate-toast fixed top-4 left-1/2 z-[100] flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl"
      :class="toast.type === 'success'
        ? 'border-emerald-200/80 bg-white/95 text-emerald-900'
        : 'border-red-200/80 bg-white/95 text-red-900'"
      role="alert"
    >
      <div
        class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        :class="toast.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
        aria-hidden="true"
      >
        <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold">{{ toast.title }}</p>
        <p class="mt-0.5 text-sm leading-relaxed text-slate-600">{{ toast.message }}</p>
      </div>
      <AppButton variant="ghost" size="sm" class="!p-1 shrink-0 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="hideToast">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </AppButton>
    </div>
  </Transition>
  </div>
</template>

<script>
import EmployeeCard from '../../components/gate/EmployeeCard.vue';
import MilitarySearchPicker from '../../components/gate/MilitarySearchPicker.vue';
import AppButton from '../../components/ui/AppButton.vue';
import { useGateCheck } from '../../composables/useGateCheck';
import { useAuth } from '../../composables/useAuth';
import { useEmployeeDirectory } from '../../composables/useEmployeeDirectory';
import { fetchBase, fetchBases } from '../../api/organization';
import { searchEmployees, fetchGatePreview } from '../../api/employees';
import {
    unlockGateAudio,
    playSuccessSound,
    playErrorSound,
    playAlertSound,
    playDakhoolSound,
    playKharoojSound,
} from '../../lib/gate-audio';
import { isDirectoryReady } from '../../lib/employee-directory';
import {
    formatGateError,
    plateTooLongMessage,
    PLATE_NUMBER_MAX_LENGTH,
} from '../../lib/gate-errors';

const SCAN_KEY_GAP_MS = 150;
const SCAN_SUBMIT_DELAY_MS = 400;

export default {
  name: 'GateKiosk',
  components: { EmployeeCard, MilitarySearchPicker, AppButton },
  setup() {
    const gate = useGateCheck();
    const { logout } = useAuth();
    const employeeDirectory = useEmployeeDirectory();
    return {
      gate,
      authLogout: logout,
      employeeDirectory,
      directoryReady: employeeDirectory.isReady,
      directorySyncing: employeeDirectory.isSyncing,
    };
  },
  data() {
    return {
      inputMode: 'barcode',
      scanFocus: 'driver',
      plateManuallyEntered: false,
      militarySearch: '',
      scannerBuffer: '',
      plate: '',
      data: {},
      employeeAlerts: [],
      checked: false,
      result: false,
      error: false,
      expiry: false,
      username: localStorage.getItem('user_name'),
      accountId: Number(localStorage.getItem('account_id')) || null,
      base: '',
      gates: [],
      formDataManuel: {
        mvdate: '',
        empl_id: null,
        mvtime: '',
        mvtype: 'Check-In',
        base_id: null,
        gate_id: null,
        platenumber: '',
        createdby_id: Number(localStorage.getItem('account_id')) || null,
      },
      formData: {
        emp_id: null,
        qrcode: '',
        mvtype: 'Check-In',
        base_id: null,
        gate_id: null,
        platenumber: '',
        createdby_id: Number(localStorage.getItem('account_id')) || null,
      },
      filteredGuests: [],
      militarySearchTimer: null,
      militarySearchLoading: false,
      militaryPickerOpen: false,
      loadingBase: false,
      pickerAnchorRect: null,
      hwScanBuffer: '',
      hwScanLocked: false,
      hwScanIntent: null,
      lastKeyAt: 0,
      hwScanTimer: null,
      toast: {
        visible: false,
        title: '',
        message: '',
        type: 'success',
      },
      toastTimer: null,
    };
  },
  computed: {
    shouldShowSubmitButton() {
      return this.inputMode === 'military' && this.result && !this.checked;
    },
    maskedQrcode() {
      if (!this.formData.qrcode) return '';
      const q = this.formData.qrcode;
      return q.length > 8 ? `${q.slice(0, 4)}…${q.slice(-4)}` : q;
    },
  },
  mounted() {
    this.fetchData();
    this.initAudio();
    this.initEmployeeDirectoryCache();
    this.formDataManuel.mvdate = this.getCurrentDate();
    this.formDataManuel.mvtime = this.getCurrentTime();
    this._onDocPointerDown = (event) => {
      if (!this.militaryPickerOpen) return;
      const wrap = this.$refs.militarySearchWrap;
      const picker = document.querySelector('.military-picker-root');
      if (wrap?.contains(event.target) || picker?.contains(event.target)) return;
      this.militaryPickerOpen = false;
    };
    document.addEventListener('mousedown', this._onDocPointerDown);
    this._onHardwareScanKeydown = (event) => {
      const handler = this.$options.methods?.handleHardwareScannerKeydown;
      if (typeof handler === 'function' && handler.call(this, event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('keydown', this._onHardwareScanKeydown, true);
    this.$nextTick(() => {
      if (this.inputMode === 'barcode') {
        this.focusDriverScan();
      }
    });
  },
  beforeUnmount() {
    if (this._onDocPointerDown) {
      document.removeEventListener('mousedown', this._onDocPointerDown);
    }
    if (this._onHardwareScanKeydown) {
      document.removeEventListener('keydown', this._onHardwareScanKeydown, true);
    }
    clearTimeout(this.militarySearchTimer);
    clearTimeout(this.hwScanTimer);
    clearTimeout(this.toastTimer);
  },
  methods: {
    initAudio() {
      unlockGateAudio();
    },

    async initEmployeeDirectoryCache() {
      try {
        await this.employeeDirectory.initEmployeeDirectory();
        if (!isDirectoryReady()) {
          await this.employeeDirectory.prefetchDirectory();
        }
      } catch (err) {
        console.error('Employee directory init failed:', err);
      }
    },
    playDakhoolSound,
    playKharoojSound,
    playSuccessSound,
    playErrorSound,
    playAlertSound,

    focusScanner() {
      if (this.inputMode !== 'barcode') return;
      this.$refs.scannerInput?.focus();
    },

    focusDriverScan() {
      this.setScanFocus('driver');
      this.focusScanner();
    },

    setScanFocus(target) {
      this.scanFocus = target;
    },

    syncPlateFields() {
      const value = (this.formData.platenumber || '').trim();
      this.formData.platenumber = value;
      this.formDataManuel.platenumber = value;
    },

    onPlateFocus() {
      if (this.formData.platenumber) {
        this.plateManuallyEntered = true;
        this.setScanFocus('driver');
        return;
      }
      this.plateManuallyEntered = false;
      this.setScanFocus('plate');
    },

    onPlateInput() {
      this.syncPlateFields();
      if (this.inputMode !== 'barcode') {
        this.plateManuallyEntered = true;
        return;
      }
      if (!this.hwScanLocked) {
        this.plateManuallyEntered = true;
        this.setScanFocus('driver');
        this.$nextTick(() => {
          this.$refs.plateInput?.blur();
          this.focusDriverScan();
        });
      }
    },

    onPlateBlur() {
      if (!this.hwScanLocked) {
        this.setScanFocus('driver');
      }
    },

    validatePlateBeforeSubmit() {
      const plate = (this.formData.platenumber || '').trim();
      if (plate.length > PLATE_NUMBER_MAX_LENGTH) {
        this.playErrorSound();
        this.showToast(plateTooLongMessage(), 'error');
        return false;
      }
      return true;
    },

    clearRegistrationPlate(refocusPlate = false) {
      this.formData.platenumber = '';
      this.formDataManuel.platenumber = '';
      this.plateManuallyEntered = false;
      if (refocusPlate) {
        this.setScanFocus('plate');
        this.$nextTick(() => this.$refs.plateInput?.focus());
      }
    },

    focusMilitaryInput() {
      this.setScanFocus('driver');
      this.$nextTick(() => this.$refs.militaryInput?.focus());
    },

    submitPlateScan(value) {
      const plate = String(value || '').replace(/\r|\n/g, '').trim();
      this.resetHardwareScan();
      if (!plate) return;
      if (plate.length > PLATE_NUMBER_MAX_LENGTH) {
        this.playErrorSound();
        this.showToast(plateTooLongMessage(), 'error');
        return;
      }
      this.formData.platenumber = plate;
      this.syncPlateFields();
      this.plateManuallyEntered = false;
      this.setScanFocus('driver');
      this.$nextTick(() => this.focusDriverScan());
    },

    isPlateScanMode() {
      return this.scanFocus === 'plate' && !this.plateManuallyEntered;
    },

    resolveScanIntent() {
      if (this.hwScanIntent) return this.hwScanIntent;
      return this.isPlateScanMode() ? 'plate' : 'driver';
    },

    beginHardwareScan(event, plateTarget) {
      const now = Date.now();
      if (!this.hwScanIntent) {
        this.hwScanIntent = plateTarget ? 'plate' : 'driver';
        if (this.hwScanIntent === 'plate') {
          this.$refs.plateInput?.blur();
        }
      }
      if (this.hwScanBuffer.length === 0) {
        this.hwScanBuffer = event.key;
      } else {
        this.hwScanBuffer += event.key;
      }
      this.lastKeyAt = now;
      this.hwScanLocked = true;
      if (this.hwScanIntent === 'driver') {
        this.switchToBarcodeForScan();
      }
      this.scheduleHardwareScanSubmit();
      return true;
    },

    submitHardwareScanBuffer() {
      if (!this.hwScanLocked || !this.hwScanBuffer.trim()) return;
      clearTimeout(this.hwScanTimer);
      const value = this.hwScanBuffer.trim();
      if (this.resolveScanIntent() === 'plate') {
        this.submitPlateScan(value);
      } else {
        this.submitBarcodeScan(value);
      }
    },

    isScannerBurst() {
      return (Date.now() - this.lastKeyAt) <= SCAN_KEY_GAP_MS;
    },

    isManualIdentifierField(target) {
      const militaryInput = this.$refs.militaryInput;
      return this.inputMode === 'military' && militaryInput && target === militaryInput;
    },

    isPlateInputField(target) {
      const plateInput = this.$refs.plateInput;
      return plateInput && target === plateInput;
    },

    isPlateSearchField(target) {
      const plateSearchInput = this.$refs.plateSearchInput;
      return plateSearchInput && target === plateSearchInput;
    },

    isHardwareScanBlockedTarget(target) {
      if (!target) return false;
      const tag = target.tagName?.toLowerCase();
      if (tag === 'select' || tag === 'textarea' || tag === 'button') return true;
      if (target.type === 'date' || target.type === 'time') return true;
      if (this.isPlateSearchField(target)) return true;
      if (this.isPlateInputField(target)) return false;
      if (this.$refs.militarySearchWrap?.contains(target) && target !== this.$refs.militaryInput) return false;
      return false;
    },

    resetHardwareScan() {
      this.hwScanBuffer = '';
      this.hwScanLocked = false;
      this.hwScanIntent = null;
    },

    switchToBarcodeForScan() {
      if (this.inputMode === 'barcode') return;
      this.inputMode = 'barcode';
      this.militarySearch = '';
      this.filteredGuests = [];
      this.militaryPickerOpen = false;
      this.militarySearchLoading = false;
      clearTimeout(this.militarySearchTimer);
      this.$nextTick(() => this.focusScanner());
    },

    submitBarcodeScan(value) {
      unlockGateAudio();
      this.switchToBarcodeForScan();
      if (this.result) {
        this.resetCardState();
      }
      const barcode = String(value || '').replace(/\r|\n/g, '').trim();
      this.resetHardwareScan();
      this.scannerBuffer = '';
      if (!barcode) return;
      this.formData.qrcode = barcode;
      this.processBarcodeScan();
    },

    scheduleHardwareScanSubmit() {
      clearTimeout(this.hwScanTimer);
      this.hwScanTimer = setTimeout(() => {
        this.submitHardwareScanBuffer();
      }, SCAN_SUBMIT_DELAY_MS);
    },

    handleHardwareScannerKeydown(event) {
      if (this.inputMode !== 'barcode') {
        return false;
      }
      if (this.isHardwareScanBlockedTarget(event.target)) {
        return false;
      }

      const now = Date.now();
      const isEnter = event.key === 'Enter' || event.keyCode === 13;
      const isChar = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
      const plateTarget = this.isPlateScanMode();
      const onPlate = this.isPlateInputField(event.target);

      if (isEnter) {
        if (this.hwScanLocked || this.hwScanBuffer.length > 0) {
          const value = this.hwScanBuffer
            || this.scannerBuffer
            || (this.inputMode === 'military' && this.resolveScanIntent() === 'driver' ? this.militarySearch : '');
          if (this.resolveScanIntent() === 'plate') {
            this.submitPlateScan(value);
          } else {
            this.submitBarcodeScan(value);
          }
          return true;
        }
        this.resetHardwareScan();
        return false;
      }

      if (!isChar) {
        return false;
      }

      if (onPlate && this.plateManuallyEntered && !this.hwScanLocked) {
        return false;
      }

      if (this.isManualIdentifierField(event.target) && !this.hwScanLocked) {
        return false;
      }

      if (this.hwScanLocked) {
        this.hwScanBuffer += event.key;
        this.lastKeyAt = now;
        this.scheduleHardwareScanSubmit();
        return true;
      }

      if (this.hwScanBuffer.length === 0) {
        return this.beginHardwareScan(event, plateTarget);
      }

      if ((now - this.lastKeyAt) <= SCAN_KEY_GAP_MS) {
        return this.beginHardwareScan(event, plateTarget);
      }

      if (this.hwScanBuffer.length > 0) {
        this.hwScanBuffer += event.key;
        this.lastKeyAt = now;
        this.hwScanLocked = true;
        if (!this.hwScanIntent) {
          this.hwScanIntent = plateTarget ? 'plate' : 'driver';
        }
        this.scheduleHardwareScanSubmit();
        return true;
      }

      this.resetHardwareScan();
      return false;
    },

    onPlateKeydown(event) {
      if (this.hwScanLocked) {
        event.preventDefault();
      }
    },

    onMilitaryKeydown(event) {
      if (this.hwScanLocked) {
        event.preventDefault();
      }
    },

    onMilitaryInput(event) {
      const value = event.target.value;
      if (value.includes('\n') || value.includes('\r')) {
        const barcode = value.replace(/\r|\n/g, '').trim();
        event.target.value = '';
        this.militarySearch = '';
        if (this.hwScanLocked || this.isScannerBurst()) {
          this.submitBarcodeScan(barcode);
        } else {
          this.onMilitarySearch();
        }
        return;
      }
      if (!this.hwScanLocked && !this.isScannerBurst() && value.trim()) {
        this.clearBarcodePreview();
      }
      this.onMilitarySearch();
    },

    setMovementType(type) {
      if (this.formData.mvtype === type) return;
      this.formData.mvtype = type;
      this.formDataManuel.mvtype = type;
      if (this.inputMode === 'military' && this.result && !this.checked) {
        this.error = false;
        return;
      }
      this.resetCardState();
    },

    setInputMode(mode) {
      this.inputMode = mode;
      this.resetCardState();
      this.resetHardwareScan();
      this.militarySearch = '';
      this.filteredGuests = [];
      this.militaryPickerOpen = false;
      this.scanFocus = 'driver';
      this.$nextTick(() => {
        if (mode === 'barcode') {
          this.focusDriverScan();
        } else {
          this.$refs.militaryInput?.focus();
        }
      });
    },

    syncManuelFields() {
      this.formDataManuel.gate_id = Number(this.formData.gate_id) || null;
      this.formDataManuel.base_id = Number(this.formData.base_id) || null;
      this.formDataManuel.mvtype = this.formData.mvtype;
    },

    buildManualPayload() {
      this.syncManuelFields();
      this.syncPlateFields();
      return {
        empl_id: Number(this.formDataManuel.empl_id),
        mvtype: this.formDataManuel.mvtype,
        base_id: Number(this.formDataManuel.base_id),
        gate_id: Number(this.formDataManuel.gate_id),
        mvdate: this.formDataManuel.mvdate,
        mvtime: this.formDataManuel.mvtime,
        platenumber: this.formDataManuel.platenumber || '',
        createdby_id: this.formDataManuel.createdby_id || this.accountId,
      };
    },

    resetCardState() {
      this.result = false;
      this.checked = false;
      this.error = false;
      this.expiry = false;
      this.data = {};
      this.employeeAlerts = [];
      this.formData.qrcode = '';
      this.formData.emp_id = null;
      this.scannerBuffer = '';
      this.formDataManuel.empl_id = null;
    },

    resetScanState() {
      this.resetCardState();
      this.militarySearch = '';
      this.filteredGuests = [];
      this.militaryPickerOpen = false;
    },

    onManualCancel() {
      this.resetScanState();
      this.focusMilitaryInput();
    },

    clearBarcodePreview() {
      if (!this.result && !this.checked) return;
      this.result = false;
      this.checked = false;
      this.error = false;
      this.expiry = false;
      this.data = {};
      this.employeeAlerts = [];
      this.formData.qrcode = '';
      this.formData.emp_id = null;
      this.scannerBuffer = '';
      this.formDataManuel.empl_id = null;
    },

    applyEmployeeCard(card) {
      this.data = card;
      this.employeeAlerts = card.alerts || [];
      this.expiry = Boolean(card.is_expired);
      this.formData.emp_id = card.emp_id;
      this.result = true;
      this.checked = false;
      this.error = false;

      if (this.expiry) {
        this.playAlertSound();
      }
    },

    async loadEmployeePreview(employeeId) {
      const { data } = await fetchGatePreview(employeeId, {
        base_id: this.formData.base_id,
      });
      this.applyEmployeeCard(data);
    },

    clearMilitarySearch() {
      this.militarySearch = '';
      this.filteredGuests = [];
      this.militaryPickerOpen = false;
      this.militarySearchLoading = false;
      clearTimeout(this.militarySearchTimer);
      this.onManualCancel();
    },

    getCurrentDate() {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    },
    getCurrentTime() {
      return new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
    },

    async fetchData() {
      this.loadingBase = true;
      try {
        const storedBaseId = localStorage.getItem('base_default');
        let baseResponse;

        if (storedBaseId && storedBaseId !== '0') {
          baseResponse = await fetchBase(storedBaseId);
        } else {
          const { data: bases } = await fetchBases();
          if (!bases?.length) {
            throw new Error('No bases configured');
          }
          baseResponse = await fetchBase(bases[0].id);
        }

        const baseData = baseResponse.data;
        this.base = baseData.name_ar;
        this.formData.base_id = Number(baseData.id);
        this.formDataManuel.base_id = Number(baseData.id);
        this.gates = baseData.gates || baseData.Gates || [];
        if (this.gates.length > 0) {
          this.formData.gate_id = Number(this.gates[0].id);
          this.formDataManuel.gate_id = Number(this.gates[0].id);
        } else {
          this.showToast('لا توجد بوابات مرتبطة بهذه القاعدة', 'error');
        }
      } catch (err) {
        console.error('Failed to load base/gates:', err);
        this.showToast('تعذر تحميل القاعدة والبوابات', 'error');
      } finally {
        this.loadingBase = false;
      }
    },

    updatePickerAnchorRect() {
      const el = this.$refs.militarySearchWrap;
      if (el) {
        this.pickerAnchorRect = el.getBoundingClientRect();
      }
    },

    onMilitaryFocus() {
      this.setScanFocus('driver');
      this.militaryPickerOpen = true;
      this.$nextTick(() => this.updatePickerAnchorRect());
    },

    onMilitarySearch() {
      clearTimeout(this.militarySearchTimer);
      const query = this.militarySearch.trim();
      this.militaryPickerOpen = true;
      this.updatePickerAnchorRect();
      if (query.length < 2) {
        this.filteredGuests = [];
        this.militarySearchLoading = false;
        return;
      }

      this.militarySearchTimer = setTimeout(async () => {
        if (isDirectoryReady()) {
          this.filteredGuests = this.employeeDirectory.searchLocal(query);
          this.militarySearchLoading = false;
          return;
        }

        this.militarySearchLoading = true;
        try {
          const { data } = await searchEmployees({
            q: query,
            scope: 'military',
            per_page: 25,
          });
          this.filteredGuests = (data.data || []).map((emp) => ({
            id: emp.id,
            military_number: emp.military_number,
            empl: emp.fullname_ar,
            fullname_ar: emp.fullname_ar,
            fullname_en: emp.fullname_en,
            photo: emp.photo,
            department: emp.department || emp.company_name || '',
            rank_name_ar: emp.rank_name_ar || '',
          }));
        } catch (err) {
          console.error('Military search failed:', err);
          this.filteredGuests = [];
        } finally {
          this.militarySearchLoading = false;
        }
      }, 150);
    },

    async selectGuest(guest) {
      this.formDataManuel.empl_id = guest.id;
      this.formData.emp_id = guest.id;
      this.militarySearch = guest.military_number
        ? `${guest.military_number} — ${guest.fullname_ar || guest.fullname_en || guest.empl}`
        : (guest.fullname_ar || guest.fullname_en || guest.empl || '');
      this.filteredGuests = [];
      this.militaryPickerOpen = false;

      if (!this.formDataManuel.mvdate) {
        this.formDataManuel.mvdate = this.getCurrentDate();
      }
      if (!this.formDataManuel.mvtime) {
        this.formDataManuel.mvtime = this.getCurrentTime();
      }
      this.syncManuelFields();

      try {
        await this.loadEmployeePreview(guest.id);
        if (!this.expiry) {
          this.formData.mvtype === 'Check-In' ? this.playDakhoolSound() : this.playKharoojSound();
        }
      } catch (err) {
        console.error('Gate preview failed:', err);
        this.error = true;
        this.showToast('تعذر تحميل بيانات الموظف', 'error');
      }
    },

    onScannerKeyup(e) {
      unlockGateAudio();
      if (e.key === 'Enter' || e.keyCode === 13) {
        this.formData.qrcode = this.scannerBuffer.trim();
        this.scannerBuffer = '';
        this.processBarcodeScan();
        return;
      }
      if (this.scannerBuffer.includes('N')) {
        this.formData.qrcode = this.scannerBuffer.replace(/N/g, '').trim();
        this.scannerBuffer = '';
        this.processBarcodeScan();
      }
    },

    async processBarcodeScan() {
      if (!this.formData.qrcode) return;
      await this.check(true);
      this.$nextTick(() => this.focusDriverScan());
    },

    async check(fromScanner = false) {
      if (this.gate.offline) {
        this.error = true;
        this.playErrorSound();
        this.showToast('لا يوجد اتصال — التحقق من البطاقة يتطلب شبكة', 'error');
        this.formData.qrcode = '';
        return;
      }

      if (!fromScanner && this.inputMode === 'barcode') {
        return;
      }

      if (!this.formData.qrcode.trim()) return;

      try {
        this.expiry = false;
        this.checked = false;
        this.error = false;

        const responseData = await this.gate.check(this.formData);
        this.applyEmployeeCard(responseData);

        if (this.expiry) {
          this.playAlertSound();
        } else {
          this.formData.mvtype === 'Check-In' ? this.playDakhoolSound() : this.playKharoojSound();
        }

        if (this.inputMode === 'barcode' || fromScanner) {
          await this.submitBarcode();
        }
      } catch (err) {
        console.error('Check Error:', err.response || err);
        this.error = true;
        this.playErrorSound();
        this.showToast('عذرًا، لا توجد بيانات، يرجى مراجعة مكتب التصاريح', 'error');
        this.formData.qrcode = '';
      }
    },

    async submitBarcode() {
      if (!this.validatePlateBeforeSubmit()) return;
      this.syncPlateFields();
      const payload = {
        emp_id: this.formData.emp_id,
        mvtype: this.formData.mvtype,
        base_id: this.formData.base_id,
        gate_id: this.formData.gate_id,
        platenumber: this.formData.platenumber || '',
        createdby_id: this.formData.createdby_id || this.accountId,
        qrcode: this.formData.qrcode,
      };

      try {
        const response = await this.gate.submit(payload);
        if (response.success) {
          this.checked = true;
          this.playSuccessSound();
          this.showToast(
            response.queued ? 'تم حفظ التسجيل بدون شبكة — سيتم المزامنة لاحقاً' : 'تم تسجيل البيانات بنجاح',
            'success'
          );
          this.scannerBuffer = '';
          this.formData.qrcode = '';
          this.clearRegistrationPlate();
          this.resetHardwareScan();
          this.$nextTick(() => this.focusDriverScan());
        }
      } catch (err) {
        this.playErrorSound();
        this.showToast(formatGateError(err), 'error');
      }
    },

    async submitManual(mvtype) {
      if (!this.validatePlateBeforeSubmit()) return;
      if (mvtype) {
        this.formData.mvtype = mvtype;
        this.formDataManuel.mvtype = mvtype;
      }
      if (!this.formDataManuel.empl_id) {
        this.playErrorSound();
        this.showToast('يرجى اختيار رقم عسكري', 'error');
        return;
      }
      if (!this.formDataManuel.base_id || !this.formData.gate_id) {
        this.playErrorSound();
        this.showToast('يرجى اختيار القاعدة والبوابة', 'error');
        return;
      }
      if (!this.formDataManuel.mvdate || !this.formDataManuel.mvtime) {
        this.playErrorSound();
        this.showToast('يرجى تحديد التاريخ والوقت', 'error');
        return;
      }

      const selected = new Date(`${this.formDataManuel.mvdate}T${this.formDataManuel.mvtime}`);
      if (selected > new Date()) {
        this.playErrorSound();
        this.showToast('التاريخ والوقت يجب أن يكونا في الماضي أو الحاضر', 'error');
        return;
      }

      try {
        await this.gate.checkManualEntry(this.buildManualPayload());
        this.checked = true;
        this.playSuccessSound();
        this.showToast('تم تسجيل البيانات بنجاح', 'success');
        this.resetScanState();
        this.clearRegistrationPlate();
        this.focusMilitaryInput();
      } catch (err) {
        this.playErrorSound();
        this.showToast(formatGateError(err), 'error');
      }
    },

    goToPlateSearch() {
      const platenumber = (this.plate || '').trim();
      if (!platenumber) {
        this.showToast('أدخل رقم اللوحة', 'error');
        return;
      }
      this.$router.push({ name: 'GatePlateSearch', query: { platenumber } });
    },

    async logout() {
      await this.authLogout();
      this.$router.push('/');
    },

    showToast(message, type = 'success', title = null) {
      clearTimeout(this.toastTimer);
      this.toast = {
        visible: true,
        title: title || (type === 'success' ? 'تم بنجاح' : 'تعذر التسجيل'),
        message,
        type,
      };
      this.toastTimer = setTimeout(() => this.hideToast(), type === 'error' ? 6000 : 3000);
    },
    hideToast() {
      clearTimeout(this.toastTimer);
      this.toast.visible = false;
    },
  },
};
</script>

<style scoped>
.gate-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: none;
}

.gate-kiosk {
  background:
    radial-gradient(circle at 20% 10%, rgba(14, 165, 233, 0.12), transparent 42%),
    radial-gradient(circle at 80% 90%, rgba(16, 185, 129, 0.1), transparent 38%),
    linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 48%, #dbeafe 100%);
}

.gate-kiosk__main {
  scrollbar-gutter: stable;
}

.gate-kiosk__panel {
  width: 100%;
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
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -0.75rem);
}
</style>
