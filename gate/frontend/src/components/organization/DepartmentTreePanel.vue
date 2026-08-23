<template>
  <div class="dept-tree-panel">
    <AppLoader v-if="loading" variant="inline" :label="t('departments.tree.loading')" />

    <AppCard
      v-else-if="departments.length === 0"
      padding="lg"
    >
      <div class="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
        <i class="pi pi-sitemap mb-2 block text-3xl text-slate-300" aria-hidden="true" />
        {{ emptyMessage || t('departments.tree.emptyMessage') }}
      </div>
    </AppCard>

    <template v-else>
      <div
        v-if="organizationRoots.length > 1"
        class="dept-tree-panel__tabs"
        role="tablist"
      >
        <button
          v-for="root in organizationRoots"
          :key="rootKey(root)"
          type="button"
          role="tab"
          :aria-selected="isActiveRoot(root)"
          class="dept-tree-panel__tab"
          :class="{ 'dept-tree-panel__tab--active': isActiveRoot(root) }"
          @click="activeRootKey = rootKey(root)"
        >
          <i class="pi pi-sitemap" aria-hidden="true" />
          <span class="dept-tree-panel__tab-label">{{ nodeLabel(root, locale) }}</span>
          <span v-if="rootChildCount(root)" class="dept-tree-panel__tab-count">
            {{ rootChildCount(root) }}
          </span>
        </button>
      </div>

      <DepartmentHierarchySectionCard
        v-if="activeRoot"
        :key="rootKey(activeRoot)"
        :root-node="activeRoot"
        :can-delete="canDelete"
        :can-manage="canManage"
        class="dept-tree-panel__active-card"
        @create-child="$emit('create-child', $event)"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </template>
  </div>
</template>

<script>
import { useI18n } from 'vue-i18n';
import AppCard from '../ui/AppCard.vue';
import AppLoader from '../shared/AppLoader.vue';
import DepartmentHierarchySectionCard from './DepartmentHierarchySectionCard.vue';
import { extractOrganizationRoots, nodeLabel, countTreeNodes } from '../../lib/organization/departmentTreeHelpers';

export default {
  name: 'DepartmentTreePanel',
  components: {
    AppCard,
    AppLoader,
    DepartmentHierarchySectionCard,
  },
  props: {
    departments: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canManage: { type: Boolean, default: true },
    emptyMessage: { type: String, default: '' },
  },
  emits: [
    'create-child',
    'edit',
    'delete',
  ],
  setup() {
    const { t, locale } = useI18n();
    return { t, locale };
  },
  data() {
    return {
      activeRootKey: null,
    };
  },
  computed: {
    organizationRoots() {
      return extractOrganizationRoots(this.departments);
    },
    activeRoot() {
      if (!this.organizationRoots.length) {
        return null;
      }

      const matched = this.organizationRoots.find(
        (root) => this.rootKey(root) === this.activeRootKey,
      );

      return matched || this.organizationRoots[0];
    },
  },
  watch: {
    organizationRoots: {
      immediate: true,
      handler(roots) {
        const stillValid = roots.some((root) => this.rootKey(root) === this.activeRootKey);

        if (!stillValid) {
          this.activeRootKey = roots.length ? this.rootKey(roots[0]) : null;
        }
      },
    },
  },
  methods: {
    nodeLabel,
    rootKey(root) {
      return root?.key ?? root?.id ?? null;
    },
    rootChildCount(root) {
      return countTreeNodes(root?.children || []);
    },
    isActiveRoot(root) {
      return this.rootKey(root) === this.rootKey(this.activeRoot);
    },
  },
};
</script>

<style scoped>
.dept-tree-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.dept-tree-panel__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-bottom: 0.85rem;
}

.dept-tree-panel__tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.dept-tree-panel__tab:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.dept-tree-panel__tab--active {
  border-color: #8b1538;
  background: #8b1538;
  color: #fff;
}

.dept-tree-panel__tab-count {
  min-width: 1.3rem;
  height: 1.3rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  color: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dept-tree-panel__tab--active .dept-tree-panel__tab-count {
  background: rgba(255, 255, 255, 0.25);
}

.dept-tree-panel__active-card {
  flex: 1;
  min-height: 0;
}
</style>
