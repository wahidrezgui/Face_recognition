export default {
    template: `
        <div class="custom-tooltip" v-bind:style="{ backgroundColor: color }">
            <p><span v-html="data.issues" /></p>
        </div>
      `,
    data: function () {
      return {
        color: '#55AA77',
        issues: null,
      };
    },
    beforeMount() {
      this.data = this.params.api.getDisplayedRowAtIndex(
        this.params.rowIndex
      ).data;
      this.color = this.params.color || '#ff0000';
    },
  };