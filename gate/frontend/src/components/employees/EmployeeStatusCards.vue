<template>
  <div class="emp-status-grid" dir="rtl">
    <div
      v-for="statu in statuses"
      :key="statu.id"
      class="emp-status-card"
    >
      <span class="emp-status-card__count">{{ statu.count }}</span>
      <span class="emp-status-card__body">
        <span class="emp-status-card__title">{{ statu.label_ar || statu.status }}</span>
        <span class="emp-status-card__subtitle">إجمالي الموظفين</span>
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EmployeeStatusCards',
  props: {
    statuses: { type: Array, default: () => [] },
  },
};
</script>

<style scoped>
.emp-status-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.65rem;
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .emp-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .emp-status-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.emp-status-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.65rem 0.75rem;
  text-align: right;
}

.emp-status-card__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.55rem;
  background: #64748b;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
}

.emp-status-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.emp-status-card__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #0f172a;
}

.emp-status-card__subtitle {
  font-size: 0.72rem;
  color: #94a3b8;
}
</style>
