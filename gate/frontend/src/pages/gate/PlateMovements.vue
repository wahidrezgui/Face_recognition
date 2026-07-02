<template>
  <div class="min-h-dvh bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100" dir="rtl">
    <header class="border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          @click="goBack"
        >
          رجوع للبوابة
        </button>
        <div class="text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">سجل الحركات</p>
          <p class="text-base font-bold text-slate-800">بحث بالسيارة العسكرية</p>
        </div>
        <div class="min-w-[5.5rem]" />
      </div>
    </header>

    <main class="mx-auto max-w-5xl p-4 lg:p-6">
      <div class="mb-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-lg shadow-slate-300/20">
        <form class="space-y-3" @submit.prevent="runSearch(1)">
          <div class="flex flex-col gap-2 sm:flex-row">
            <input
              v-model="filters.platenumber"
              type="text"
              maxlength="20"
              placeholder="رقم السيارة العسكرية"
              class="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-muted"
            >
            <button
              type="submit"
              class="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              :disabled="loading"
            >
              بحث
            </button>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-600">نوع الحركة</span>
              <select
                v-model="filters.mvtype"
                class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">الكل</option>
                <option value="Check-In">دخول</option>
                <option value="Check-Out">خروج</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-600">من تاريخ</span>
              <input
                v-model="filters.date_from"
                type="date"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                dir="ltr"
              >
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-600">إلى تاريخ</span>
              <input
                v-model="filters.date_to"
                type="date"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                dir="ltr"
              >
            </label>
          </div>
        </form>
      </div>

      <div v-if="errorMessage" class="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
        {{ errorMessage }}
      </div>

      <div v-if="searchedPlate" class="mb-3 flex items-center justify-between text-sm text-slate-600">
        <span>
          نتائج اللوحة:
          <strong class="font-mono text-slate-800" dir="ltr">{{ searchedPlate }}</strong>
        </span>
        <span>{{ total }} حركة</span>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-300/20">
        <div v-if="loading" class="px-4 py-12 text-center text-sm text-slate-500">
          جاري التحميل...
        </div>

        <div v-else-if="!rows.length && hasSearched" class="px-4 py-12 text-center text-sm text-slate-500">
          لا توجد حركات مسجلة لهذه اللوحة
        </div>

        <div v-else-if="!hasSearched" class="px-4 py-12 text-center text-sm text-slate-500">
          أدخل رقم اللوحة واضغط بحث
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-sm">
            <thead class="bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th class="px-3 py-2.5 text-right">التاريخ</th>
                <th class="px-3 py-2.5 text-right">الوقت</th>
                <th class="px-3 py-2.5 text-right">السائق</th>
                <th class="px-3 py-2.5 text-right">رقم عسكري</th>
                <th class="px-3 py-2.5 text-right">النوع</th>
                <th class="px-3 py-2.5 text-right">البوابة</th>
                <th class="px-3 py-2.5 text-right">القاعدة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50/80">
                <td class="px-3 py-2.5 whitespace-nowrap" dir="ltr">{{ row.mvdate }}</td>
                <td class="px-3 py-2.5 whitespace-nowrap" dir="ltr">{{ formatTime(row.mvtime) }}</td>
                <td class="px-3 py-2.5">{{ row.employee_ar || row.employee || '—' }}</td>
                <td class="px-3 py-2.5 font-mono" dir="ltr">{{ row.military_number || '—' }}</td>
                <td class="px-3 py-2.5">
                  <span
                    class="inline-flex rounded-lg px-2 py-0.5 text-xs font-bold"
                    :class="row.mvtype === 'Check-In' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
                  >
                    {{ row.mvtype === 'Check-In' ? 'دخول' : 'خروج' }}
                  </span>
                </td>
                <td class="px-3 py-2.5">{{ row.gate || '—' }}</td>
                <td class="px-3 py-2.5">{{ row.base || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="lastPage > 1"
          class="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm"
        >
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            :disabled="page <= 1 || loading"
            @click="runSearch(page - 1)"
          >
            السابق
          </button>
          <span class="text-slate-600">صفحة {{ page }} من {{ lastPage }}</span>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            :disabled="page >= lastPage || loading"
            @click="runSearch(page + 1)"
          >
            التالي
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { searchByPlate } from '../../api/employees';

export default {
  name: 'PlateMovements',
  data() {
    return {
      loading: false,
      hasSearched: false,
      searchedPlate: '',
      rows: [],
      total: 0,
      page: 1,
      lastPage: 1,
      perPage: 25,
      errorMessage: '',
      filters: {
        platenumber: '',
        mvtype: '',
        date_from: '',
        date_to: '',
      },
    };
  },
  mounted() {
    const query = this.$route.query;
    const plate = (query.platenumber || '').trim();
    if (plate) {
      this.filters.platenumber = plate;
      this.filters.mvtype = query.mvtype || '';
      this.filters.date_from = query.date_from || '';
      this.filters.date_to = query.date_to || '';
      this.runSearch(1);
    }
  },
  methods: {
    goBack() {
      this.$router.push({ name: 'Gate' });
    },

    formatTime(value) {
      if (!value) return '—';
      return String(value).slice(0, 8);
    },

    async runSearch(page = 1) {
      const platenumber = (this.filters.platenumber || '').trim();
      if (!platenumber) return;

      this.loading = true;
      this.page = page;
      this.errorMessage = '';
      try {
        const { data } = await searchByPlate({
          platenumber,
          mvtype: this.filters.mvtype || undefined,
          date_from: this.filters.date_from || undefined,
          date_to: this.filters.date_to || undefined,
          page,
          per_page: this.perPage,
        });

        this.hasSearched = true;
        this.searchedPlate = data.platenumber || platenumber;
        this.rows = data.data || [];
        this.total = data.total ?? this.rows.length;
        this.lastPage = data.last_page ?? 1;
        this.page = data.page ?? page;

        this.$router.replace({
          name: 'GatePlateSearch',
          query: {
            platenumber: this.searchedPlate,
            ...(this.filters.mvtype ? { mvtype: this.filters.mvtype } : {}),
            ...(this.filters.date_from ? { date_from: this.filters.date_from } : {}),
            ...(this.filters.date_to ? { date_to: this.filters.date_to } : {}),
          },
        });
      } catch {
        this.rows = [];
        this.total = 0;
        this.errorMessage = 'تعذّر تحميل السجل. حاول مرة أخرى.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
