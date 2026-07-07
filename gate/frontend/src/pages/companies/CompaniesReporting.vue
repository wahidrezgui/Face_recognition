<template>
  <CompanyReportPageShell
    preset-key="companiesReporting"
    search-mode="basic"
    title="Company Reporting"
    description="Basic company attendance reports"
  />
</template>

<script>
import CompanyReportPageShell from '../../components/reports/CompanyReportPageShell.vue';

export default {
  components: { CompanyReportPageShell },
};
</script>
