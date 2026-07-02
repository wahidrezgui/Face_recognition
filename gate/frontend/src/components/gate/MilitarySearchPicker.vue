<template>
  <Teleport to="body">
    <div
      v-if="open && anchorRect"
      class="military-picker-root fixed z-[200] overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl ring-1 ring-slate-900/5"
      :style="pickerStyle"
      role="listbox"
      aria-live="polite"
      @mousedown.prevent
    >
      <div class="flex items-center justify-between border-b border-sky-50 bg-sky-50/80 px-4 py-2.5">
        <p class="text-xs font-semibold text-sky-800">
          {{ loading ? 'جاري البحث...' : hint }}
        </p>
        <span v-if="!loading && results.length" class="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
          {{ results.length }}
        </span>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
        <svg class="h-4 w-4 animate-spin text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>جاري البحث...</span>
      </div>

      <ul v-else-if="results.length" class="max-h-64 overflow-y-auto overscroll-contain">
        <li
          v-for="employee in results"
          :key="employee.id"
          role="option"
          class="group flex cursor-pointer items-center gap-3 border-b border-slate-50 px-4 py-3 transition last:border-b-0 hover:bg-sky-50/70"
          @mousedown.prevent="$emit('select', employee)"
        >
          <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-sm ring-1 ring-slate-200">
            <img
              :src="employee.photo ? `/${employee.photo}` : '/uploads/nopic.png'"
              :alt="employee.fullname_ar"
              class="h-full w-full object-cover"
              @error="($event.target).src = '/uploads/nopic.png'"
            >
          </div>
          <div class="min-w-0 flex-1 text-right">
            <p class="truncate text-sm font-bold text-slate-800 group-hover:text-sky-900">
              <span
                v-for="(part, index) in highlightParts(displayName(employee))"
                :key="'name-' + index"
                :class="part.match ? 'rounded bg-amber-200 px-0.5 text-amber-900' : ''"
              >{{ part.text }}</span>
            </p>
            <p class="mt-0.5 truncate text-xs text-slate-500">
              <span v-if="employee.rank_name_ar">{{ employee.rank_name_ar }}</span>
              <span v-if="employee.rank_name_ar && employee.department"> · </span>
              <span v-if="employee.department">{{ employee.department }}</span>
            </p>
          </div>
          <div class="shrink-0 rounded-xl bg-slate-100 px-2.5 py-1.5 font-mono text-sm font-bold text-slate-700 group-hover:bg-sky-100 group-hover:text-sky-800">
            <span
              v-for="(part, index) in highlightParts(employee.military_number)"
              :key="index"
              :class="part.match ? 'rounded bg-amber-200 px-0.5 text-amber-900' : ''"
            >{{ part.text }}</span>
          </div>
        </li>
      </ul>

      <div v-else class="px-4 py-8 text-center">
        <p class="text-sm font-medium text-slate-600">لا توجد نتائج مطابقة</p>
        <p class="mt-1 text-xs text-slate-400">جرّب الرقم العسكري أو الاسم</p>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'MilitarySearchPicker',
  props: {
    open: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    results: { type: Array, default: () => [] },
    query: { type: String, default: '' },
    hint: { type: String, default: 'اختر موظفاً من النتائج' },
    anchorRect: { type: Object, default: null },
  },
  emits: ['select'],
  computed: {
    pickerStyle() {
      if (!this.anchorRect) {
        return {};
      }
      return {
        top: `${this.anchorRect.bottom + 8}px`,
        left: `${this.anchorRect.left}px`,
        width: `${this.anchorRect.width}px`,
      };
    },
  },
  methods: {
    displayName(employee) {
      return employee.fullname_ar || employee.fullname_en || '—';
    },
    highlightParts(value) {
      const text = String(value ?? '');
      const needle = this.query.trim();
      if (!needle || !text) {
        return [{ text: text || '—', match: false }];
      }
      const lowerText = text.toLowerCase();
      const lowerNeedle = needle.toLowerCase();
      const index = lowerText.indexOf(lowerNeedle);
      if (index === -1) {
        return [{ text, match: false }];
      }
      return [
        { text: text.slice(0, index), match: false },
        { text: text.slice(index, index + needle.length), match: true },
        { text: text.slice(index + needle.length), match: false },
      ].filter((part) => part.text);
    },
  },
};
</script>
