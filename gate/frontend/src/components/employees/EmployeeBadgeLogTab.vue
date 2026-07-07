<template>
  <div dir="rtl" class="overflow-x-auto rounded-lg border border-slate-200">
    <table class="min-w-full divide-y divide-slate-200 text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th class="px-4 py-3 text-right font-semibold text-slate-600">تاريخ الطباعة</th>
          <th class="px-4 py-3 text-right font-semibold text-slate-600">تاريخ انتهاء البطاقة</th>
          <th class="px-4 py-3 text-right font-semibold text-slate-600">طبع بواسطة</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 bg-white">
        <tr v-for="(entry, index) in logs" :key="`badge-log-${index}`">
          <td class="px-4 py-3 text-slate-600">{{ entry.date_printed }}</td>
          <td class="px-4 py-3">{{ entry.badge_expiry_date }}</td>
          <td class="px-4 py-3">{{ entry.created_by_name }}</td>
        </tr>
        <tr v-if="!logs.length">
          <td colspan="3" class="px-4 py-8 text-center text-slate-400">لا يوجد سجل طباعة للبطاقة</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'EmployeeBadgeLogTab',
  props: {
    logs: {
      type: Array,
      default: () => [],
    },
  },
};
</script>
