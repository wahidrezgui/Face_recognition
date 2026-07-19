<template>
  <div
    class="shrink-0 border-b px-4 py-1.5 text-center text-xs transition-colors"
    :class="barClass"
  >
    <div class="flex items-center justify-center gap-2">
      <span class="inline-flex h-2 w-2 shrink-0 rounded-full" :class="dotClass" />
      <span class="font-medium">{{ primaryText }}</span>
      <span v-if="pendingCount > 0 && connectionState !== 'syncing'" class="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold">
        {{ pendingCount }}
      </span>
    </div>
    <p v-if="secondaryText" class="mt-0.5 text-[10px] opacity-90">{{ secondaryText }}</p>
  </div>
</template>

<script>
export default {
  name: 'GateConnectivityBar',
  props: {
    connectionState: {
      type: String,
      default: 'online',
    },
    pendingCount: {
      type: Number,
      default: 0,
    },
    lastSyncAt: {
      type: String,
      default: null,
    },
    lastSyncResult: {
      type: Object,
      default: null,
    },
    syncError: {
      type: String,
      default: null,
    },
    offlineCached: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    barClass() {
      if (this.connectionState === 'syncing') {
        return 'border-sky-300 bg-sky-50 text-sky-900';
      }
      if (this.showSyncSuccess) {
        return 'border-emerald-300 bg-emerald-50 text-emerald-900';
      }
      if (this.syncError || (this.lastSyncResult?.failed?.length > 0)) {
        return 'border-rose-300 bg-rose-50 text-rose-900';
      }
      if (this.connectionState === 'offline') {
        return 'border-amber-300 bg-amber-50 text-amber-900';
      }
      if (this.pendingCount > 0) {
        return 'border-amber-200 bg-amber-50 text-amber-900';
      }
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    },
    dotClass() {
      if (this.connectionState === 'syncing') {
        return 'animate-pulse bg-sky-500';
      }
      if (this.connectionState === 'offline') {
        return 'bg-amber-500';
      }
      if (this.pendingCount > 0) {
        return 'bg-amber-500';
      }
      return 'bg-emerald-500';
    },
    showSyncSuccess() {
      const synced = this.lastSyncResult?.synced?.length ?? 0;
      const duplicates = this.lastSyncResult?.duplicates?.length ?? 0;
      return synced + duplicates > 0 && !this.syncError && this.connectionState === 'online';
    },
    primaryText() {
      if (this.connectionState === 'syncing') {
        return 'جاري المزامنة...';
      }
      if (this.connectionState === 'offline') {
        return 'غير متصل — التسجيلات تُحفظ محلياً';
      }
      if (this.showSyncSuccess) {
        const n = (this.lastSyncResult?.synced?.length ?? 0) + (this.lastSyncResult?.duplicates?.length ?? 0);
        return `تمت المزامنة بنجاح (${n})`;
      }
      if (this.lastSyncResult?.failed?.length > 0) {
        return `فشل مزامنة ${this.lastSyncResult.failed.length} — ستُعاد المحاولة`;
      }
      if (this.pendingCount > 0) {
        return `متصل — ${this.pendingCount} تسجيل بانتظار المزامنة`;
      }
      return 'متصل';
    },
    secondaryText() {
      if (this.offlineCached) {
        return 'جلسة محلية — المزامنة عند عودة الشبكة';
      }
      if (this.lastSyncAt && this.connectionState === 'online' && !this.showSyncSuccess) {
        return `آخر مزامنة: ${this.formatRelativeTime(this.lastSyncAt)}`;
      }
      if (this.connectionState === 'offline') {
        return 'بيانات الموظفين محلية — قد لا تتضمن تنبيهات المنطقة';
      }
      return '';
    },
  },
  methods: {
    formatRelativeTime(iso) {
      const diff = Date.now() - new Date(iso).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      const hours = Math.floor(minutes / 60);
      return `منذ ${hours} ساعة`;
    },
  },
};
</script>
