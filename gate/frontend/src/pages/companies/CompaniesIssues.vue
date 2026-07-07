<template>
  <CompanyReportPageShell
    preset-key="companiesIssues"
    search-mode="issues"
    title="Company Issues"
    description="Daily issues reports for companies"
  />
</template>

<script>
import CompanyReportPageShell from '../../components/reports/CompanyReportPageShell.vue';

export default {
  components: { CompanyReportPageShell },
};
</script>
