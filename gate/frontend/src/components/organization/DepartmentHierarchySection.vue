<template>
  <section class="dept-hierarchy-section">
    <DepartmentTreeRows
      v-if="section.departmentChart"
      :nodes="[section.departmentChart]"
      :depth="0"
        :collapsed-keys="collapsedKeys"
        :can-delete="canDelete"
        :can-manage="canManage"
        @update:collapsed-keys="$emit('update:collapsedKeys', $event)"
      @create-child="$emit('create-child', $event)"
      @edit="$emit('edit', $event)"
      @delete="$emit('delete', $event)"
    />
  </section>
</template>

<script>
import DepartmentTreeRows from './DepartmentTreeRows.vue';

export default {
  name: 'DepartmentHierarchySection',
  components: {
    DepartmentTreeRows,
  },
  props: {
    section: { type: Object, required: true },
    collapsedKeys: { type: Object, default: () => ({}) },
    canDelete: { type: Boolean, default: false },
    canManage: { type: Boolean, default: true },
  },
  emits: [
    'update:collapsedKeys',
    'create-child',
    'edit',
    'delete',
  ],
};
</script>
