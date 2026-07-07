<template>
  <DepartmentPageShell empty-message="لا توجد وحدات لعرضها." />
</template>

<script>
import DepartmentPageShell from '../../components/organization/DepartmentPageShell.vue';

export default {
  name: 'Departments',
  components: { DepartmentPageShell },
};
</script>
